/* ============================================================
   ErgoGRO — Integração Firebase: Pesquisa Psicossocial
   Firestore como backend para campanhas e respostas anônimas.

   CONFIGURAÇÃO (única vez):
   1. Acesse https://console.firebase.google.com
   2. Crie um projeto → Firestore Database (modo de teste)
   3. Adicione um app Web → copie as credenciais abaixo
   4. Cole as Regras Firestore (veja comentário REGRAS abaixo)

   REGRAS FIRESTORE (Console Firebase > Firestore > Regras):
   ─────────────────────────────────────────────────────────
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Pesquisa psicossocial anônima
       match /ergogro_campanhas/{id}      { allow read, write: if true; }
       match /ergogro_respostas/{id}      { allow read, write: if true; }
       // Estrutura de laudos (migração v4.2 — firebase-storage.js)
       match /ergogro_empresas/{id}       { allow read, write: if true; }
       match /ergogro_projetos/{id}       { allow read, write: if true; }
       match /ergogro_setores/{id}        { allow read, write: if true; }
       match /ergogro_funcoes/{id}        { allow read, write: if true; }
       match /ergogro_setores_master/{id} { allow read, write: if true; }
       match /ergogro_funcoes_master/{id} { allow read, write: if true; }
       match /ergogro_avaliacoes/{id}     { allow read, write: if true; }
       match /ergogro_planos/{id}         { allow read, write: if true; }
       match /ergogro_psicossocial/{id}   { allow read, write: if true; }
     }
   }
   ─────────────────────────────────────────────────────────
   ATENÇÃO: Para produção, implemente autenticação Firebase.
   ============================================================ */

/* ── Credenciais Firebase ─────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDwxzQuMPSI-jQA2D046u1oqqtzLrH5FiU',
  authDomain:        'ergogro-df0c3.firebaseapp.com',
  projectId:         'ergogro-df0c3',
  storageBucket:     'ergogro-df0c3.firebasestorage.app',
  messagingSenderId: '997977541961',
  appId:             '1:997977541961:web:2835fc82be02ce7f679e98',
  measurementId:     'G-B15S1SY4P8',
};

/* Salt fixo para hash de CPF — NÃO altere após o primeiro uso */
const _CPF_SALT = 'ergogro_psico_v1';

/* ─────────────────────────────────────────────────────────
   INICIALIZAÇÃO FIREBASE
───────────────────────────────────────────────────────── */

let _db  = null;
let _ok  = false;

function firebaseConfigurado() {
  return FIREBASE_CONFIG.apiKey !== 'SUA_API_KEY_AQUI';
}

function inicializarFirebase() {
  if (_ok) return true;
  if (!firebaseConfigurado()) return false;
  if (typeof firebase === 'undefined') return false;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    _ok = true;
    return true;
  } catch (e) {
    console.error('ErgoGRO Firebase:', e);
    return false;
  }
}

function _db_() {
  if (!inicializarFirebase()) throw new Error('Firebase não configurado. Preencha FIREBASE_CONFIG em js/firebase-pesquisa.js');
  return _db;
}

/* ─────────────────────────────────────────────────────────
   HASH DE CPF (SHA-256 + salt)
   CPF nunca é armazenado em texto puro.
───────────────────────────────────────────────────────── */

async function hashCPF(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11) throw new Error('CPF deve ter 11 dígitos');
  const dados  = new TextEncoder().encode(n + _CPF_SALT);
  const buffer = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function _mascaraCPF(n) {
  /* Exibe primeiros 3 e últimos 2 dígitos — identificável pelo RH, não reversível */
  return `${n.slice(0, 3)}.***.***-${n.slice(9, 11)}`;
}

function validarCPF(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const calc = (len) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(n[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r >= 10 ? 0 : r;
  };
  return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
}

/* ─────────────────────────────────────────────────────────
   CAMPANHAS
───────────────────────────────────────────────────────── */

async function criarCampanha(dados) {
  const ref = await _db_().collection('ergogro_campanhas').add({
    ...dados,
    status:         'ativa',
    totalRespostas: 0,
    totalAutorizados: 0,
    cpfsAutorizados: [],
    criadaEm:       firebase.firestore.FieldValue.serverTimestamp(),
    atualizadaEm:   firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function buscarCampanha(id) {
  const doc = await _db_().collection('ergogro_campanhas').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function listarCampanhas(projetoId) {
  const snap = await _db_().collection('ergogro_campanhas')
    .where('projetoId', '==', projetoId)
    .get();
  /* Ordenação em JS — evita índice composto no Firestore */
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.criadaEm?.seconds ?? 0;
      const tb = b.criadaEm?.seconds ?? 0;
      return tb - ta; /* desc */
    });
}

async function atualizarCampanha(id, campos) {
  await _db_().collection('ergogro_campanhas').doc(id).update({
    ...campos,
    atualizadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function encerrarCampanha(id) {
  return atualizarCampanha(id, { status: 'encerrada' });
}

async function reativarCampanha(id) {
  return atualizarCampanha(id, { status: 'ativa' });
}

/* ─────────────────────────────────────────────────────────
   LISTA DE CPFs AUTORIZADOS
   Formato de entrada: uma linha por CPF
   Aceita: "CPF" ou "CPF;SETOR" ou "CPF,SETOR"
───────────────────────────────────────────────────────── */

async function importarCPFs(campanhaId, linhas) {
  const validos = [];
  const erros   = [];

  for (const linha of linhas) {
    const raw   = linha.trim();
    if (!raw) continue;
    const partes = raw.split(/[;,\t]/);
    const cpfRaw = (partes[0] || '').trim();
    const setor  = (partes[1] || '').trim();
    const n      = cpfRaw.replace(/\D/g, '');

    if (n.length !== 11) { erros.push(cpfRaw || linha); continue; }

    try {
      const hash = await hashCPF(n);
      validos.push({ hash, setor, cpfMascarado: _mascaraCPF(n) });
    } catch { erros.push(cpfRaw); }
  }

  if (validos.length === 0) throw new Error('Nenhum CPF válido encontrado');

  await atualizarCampanha(campanhaId, {
    cpfsAutorizados:  validos,
    totalAutorizados: validos.length,
  });

  return { importados: validos.length, erros };
}

/* Verifica se CPF está autorizado e retorna dados de controle */
async function verificarCPF(campanhaId, cpf) {
  if (!validarCPF(cpf)) return { autorizado: false, motivo: 'cpf_invalido' };

  const campanha = await buscarCampanha(campanhaId);
  if (!campanha)                      return { autorizado: false, motivo: 'campanha_nao_encontrada' };
  if (campanha.status === 'encerrada') return { autorizado: false, motivo: 'encerrada' };

  const hash   = await hashCPF(cpf);
  const lista  = campanha.cpfsAutorizados || [];

  /* Se não há lista de CPFs, acesso aberto (campanha sem controle) */
  if (lista.length === 0) return { autorizado: true, setor: '', hash, campanha };

  const entrada = lista.find(e => e.hash === hash);
  if (!entrada) return { autorizado: false, motivo: 'nao_autorizado', hash };
  return { autorizado: true, setor: entrada.setor || '', hash, campanha };
}

/* ─────────────────────────────────────────────────────────
   RESPOSTAS (armazenadas sem qualquer dado identificável)
   cpfHash: controle de unicidade — não permite reverter ao CPF
   setor:   para análise setorial anônima
───────────────────────────────────────────────────────── */

async function buscarRespostaPorHash(campanhaId, cpfHash) {
  const snap = await _db_().collection('ergogro_respostas')
    .where('campanhaId', '==', campanhaId)
    .where('cpfHash', '==', cpfHash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function criarOuCarregarResposta(campanhaId, cpfHash, setor) {
  const existente = await buscarRespostaPorHash(campanhaId, cpfHash);
  if (existente) return existente;

  const nova = {
    campanhaId,
    cpfHash,          /* SHA-256 do CPF — controle de unicidade, não reversível */
    setor: setor || '',
    respostas: {},
    status: 'rascunho',
    iniciadaEm:    firebase.firestore.FieldValue.serverTimestamp(),
    atualizadaEm:  firebase.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await _db_().collection('ergogro_respostas').add(nova);

  /* Incrementa contador apenas para rascunhos novos */
  await _db_().collection('ergogro_campanhas').doc(campanhaId).update({
    totalRespostas: firebase.firestore.FieldValue.increment(1),
  });

  return { id: ref.id, ...nova };
}

async function salvarRascunho(respostaId, respostasAtuais) {
  await _db_().collection('ergogro_respostas').doc(respostaId).update({
    respostas:    respostasAtuais,
    atualizadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function finalizarResposta(respostaId, respostasFinais) {
  await _db_().collection('ergogro_respostas').doc(respostaId).update({
    respostas:     respostasFinais,
    status:        'finalizada',
    finalizadaEm:  firebase.firestore.FieldValue.serverTimestamp(),
    atualizadaEm:  firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/* ─────────────────────────────────────────────────────────
   RELATÓRIO ANÔNIMO
   Lê apenas {respostas, setor} — sem hash, sem PII
───────────────────────────────────────────────────────── */

async function carregarRespostasAnonimas(campanhaId) {
  const snap = await _db_().collection('ergogro_respostas')
    .where('campanhaId', '==', campanhaId)
    .where('status', '==', 'finalizada')
    .get();
  /* Retorna APENAS respostas + setor — sem cpfHash */
  return snap.docs.map(d => {
    const { respostas, setor } = d.data();
    return { respostas: respostas || {}, setor: setor || '' };
  });
}

async function calcularRelatorio(campanhaId, minRespostasSetor = 5) {
  const [respostas, campanha] = await Promise.all([
    carregarRespostasAnonimas(campanhaId),
    buscarCampanha(campanhaId),
  ]);

  /* Agrega todas as respostas (média por pergunta) */
  function agregar(lista) {
    const soma = {}, conta = {};
    lista.forEach(({ respostas: r }) => {
      Object.entries(r).forEach(([id, v]) => {
        if (v != null) { soma[id] = (soma[id] || 0) + Number(v); conta[id] = (conta[id] || 0) + 1; }
      });
    });
    const media = {};
    Object.keys(soma).forEach(k => { media[k] = soma[k] / conta[k]; });
    return media;
  }

  /* Consolidado geral */
  const consolidado = PerguntasPsicossociais.calcularDimensoes(agregar(respostas));
  const scoreGeral  = PerguntasPsicossociais.calcularScoreGeral(agregar(respostas));

  /* Por setor — apenas quando há respostas suficientes */
  const setores  = [...new Set(respostas.map(r => r.setor).filter(Boolean))];
  const porSetor = {};

  setores.forEach(setor => {
    const lista = respostas.filter(r => r.setor === setor);
    if (lista.length < minRespostasSetor) {
      /* Protege anonimato: não exibe análise setorial individualizada */
      porSetor[setor] = {
        insuficiente: true,
        total:        lista.length,
        minimo:       minRespostasSetor,
      };
    } else {
      porSetor[setor] = {
        insuficiente: false,
        total:        lista.length,
        dimensoes:    PerguntasPsicossociais.calcularDimensoes(agregar(lista)),
        score:        PerguntasPsicossociais.calcularScoreGeral(agregar(lista)),
      };
    }
  });

  return {
    totalRespostas:    respostas.length,
    totalAutorizados:  campanha?.totalAutorizados  || 0,
    taxaParticipacao:  campanha?.totalAutorizados
      ? Math.round((respostas.length / campanha.totalAutorizados) * 100)
      : null,
    scoreGeral,
    consolidado,
    porSetor,
    minRespostasSetor,
    geradoEm: new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────
   PENDENTES — quem ainda não respondeu
   Compara hashes autorizados vs. hashes que têm resposta.
───────────────────────────────────────────────────────── */

async function listarPendentes(campanhaId) {
  const campanha = await buscarCampanha(campanhaId);
  if (!campanha) throw new Error('Campanha não encontrada');

  const autorizados = campanha.cpfsAutorizados || [];
  if (autorizados.length === 0) return [];

  /* Busca todos os registros de resposta da campanha (rascunho ou finalizado) */
  const snap = await _db_().collection('ergogro_respostas')
    .where('campanhaId', '==', campanhaId)
    .get();

  const respondidos = new Set(snap.docs.map(d => d.data().cpfHash));

  return autorizados
    .filter(p => !respondidos.has(p.hash))
    .map(p => ({
      cpfMascarado: p.cpfMascarado || '***.***.***-**',
      setor:        p.setor || '(sem setor)',
    }))
    .sort((a, b) => (a.setor).localeCompare(b.setor));
}

/* ─────────────────────────────────────────────────────────
   INTERPRETAÇÃO TÉCNICA (salva junto à campanha)
───────────────────────────────────────────────────────── */

async function salvarInterpretacao(campanhaId, dados) {
  await _db_().collection('ergogro_campanhas').doc(campanhaId).update({
    interpretacaoTecnica: dados,
    atualizadaEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/* ─────────────────────────────────────────────────────────
   MONITORAMENTO EM TEMPO REAL (para o painel admin)
───────────────────────────────────────────────────────── */

function monitorarProgresso(campanhaId, callback) {
  if (!inicializarFirebase()) return () => {};
  return _db.collection('ergogro_campanhas').doc(campanhaId)
    .onSnapshot(doc => {
      if (doc.exists) callback({ id: doc.id, ...doc.data() });
    });
}
