/* ============================================================
   ErgoGRO — Camada Cloud: StorageCloud v1.0
   ─────────────────────────────────────────────────────────
   Estratégia: Escrita dupla (Dual-write)

   • localStorage  continua como fonte PRIMÁRIA de leitura
     (síncrono, funciona offline, sem alteração nos módulos)
   • Firestore  recebe cópia assíncrona de cada escrita
     (fire-and-forget — nunca bloqueia a UI)
   • syncInicial()  ao abrir o app: baixa Firestore e mescla
     ao localStorage (mais recente pelo timestamp ganha)
   • migrarLocal()  sobe todos os dados locais ao Firestore
     (executar UMA VEZ no dispositivo que tem os dados)
   ─────────────────────────────────────────────────────────
   Rollback imediato: mude CLOUD_SYNC_ENABLED para false
   ─────────────────────────────────────────────────────────
   Dependência: firebase-pesquisa.js carregado ANTES deste
   (fornece as funções globais inicializarFirebase() e
    firebaseConfigurado())
   ─────────────────────────────────────────────────────────
   REGRAS FIRESTORE — cole no Firebase Console:
   (Projeto → Firestore Database → Regras)

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /ergogro_campanhas/{id}      { allow read, write: if true; }
       match /ergogro_respostas/{id}      { allow read, write: if true; }
       match /ergogro_empresas/{id}       { allow read, write: if true; }
       match /ergogro_projetos/{id}       { allow read, write: if true; }
       match /ergogro_setores/{id}        { allow read, write: if true; }
       match /ergogro_funcoes/{id}        { allow read, write: if true; }
       match /ergogro_setores_master/{id} { allow read, write: if true; }
       match /ergogro_funcoes_master/{id} { allow read, write: if true; }
       match /ergogro_avaliacoes/{id}     { allow read, write: if true; }
       match /ergogro_planos/{id}         { allow read, write: if true; }
       match /ergogro_psicossocial/{id}   { allow read, write: if true; }
       match /ergogro_consultas_aep/{id}  { allow read, write: if true; }
     }
   }
   ============================================================ */

/* ── Flag mestra de controle ─────────────────────────────────
   true  → sync ativo (comportamento normal)
   false → toda a camada cloud é ignorada sem apagar código
   Para rollback imediato: mude para false aqui              */
const CLOUD_SYNC_ENABLED = true;

/* ── Prefixo de log — filtre por '[Cloud]' no console ──────── */
const _CLOUD_LOG = '[ErgoGRO Cloud]';

/* ============================================================
   StorageCloud — API pública da camada cloud
   ============================================================ */
const StorageCloud = (() => {

  /* ──────────────────────────────────────────────────────────
     MAPEAMENTO DE COLEÇÕES
     Cada entrada liga a chave do localStorage à coleção
     equivalente no Firestore.
  ────────────────────────────────────────────────────────── */

  /* Coleções com chave direta no localStorage */
  const MAPA_COLECOES = [
    { local: 'ergogro_empresas',       cloud: 'ergogro_empresas'       },
    { local: 'ergogro_projetos',       cloud: 'ergogro_projetos'       },
    { local: 'ergogro_setores',        cloud: 'ergogro_setores'        },
    { local: 'ergogro_funcoes',        cloud: 'ergogro_funcoes'        },
    { local: 'ergogro_setores_master', cloud: 'ergogro_setores_master' },
    { local: 'ergogro_funcoes_master', cloud: 'ergogro_funcoes_master' },
    { local: 'ergogro_avaliacoes',     cloud: 'ergogro_avaliacoes'     },
  ];

  /* Coleções derivadas — não têm chave própria no localStorage;
     são extraídas de ergogro_avaliacoes durante migrarLocal()    */
  const COL_PLANOS       = 'ergogro_planos';
  const COL_PSICOSSOCIAL = 'ergogro_psicossocial';

  /* ──────────────────────────────────────────────────────────
     UTILITÁRIOS INTERNOS
  ────────────────────────────────────────────────────────── */

  /* Retorna instância do Firestore com inicialização lazy.
     Se Firebase ainda não foi inicializado (ex.: chamada durante
     Storage.migrar() no boot), tenta inicializar agora.
     Lança erro apenas se realmente não houver como prosseguir. */
  function _getDb() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK não disponível');
    }
    /* Inicialização lazy — garante que o app Firebase existe */
    if (!firebase.apps || !firebase.apps.length) {
      if (typeof inicializarFirebase === 'function') {
        if (!inicializarFirebase()) {
          throw new Error('Firebase não inicializou — verifique FIREBASE_CONFIG');
        }
      } else {
        throw new Error('Firebase SDK não inicializado');
      }
    }
    return firebase.firestore();
  }

  /* Lê array do localStorage de forma silenciosa (nunca lança) */
  function _lerLocal(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || '[]'); }
    catch (e) {
      console.warn(`${_CLOUD_LOG} Erro ao ler "${chave}":`, e.message);
      return [];
    }
  }

  /* Grava array no localStorage de forma silenciosa (nunca lança) */
  function _gravarLocal(chave, lista) {
    try { localStorage.setItem(chave, JSON.stringify(lista)); }
    catch (e) {
      console.error(`${_CLOUD_LOG} Erro ao gravar "${chave}":`, e.message);
    }
  }

  /* Extrai timestamp de um objeto (suporta atualizadaEm e atualizadoEm).
     Retorna 0 se não encontrar, permitindo comparação segura.          */
  function _ts(obj) {
    const v = obj.atualizadaEm || obj.atualizadoEm || obj.criadaEm || obj.criadoEm || null;
    if (!v) return 0;
    try { return new Date(v).getTime(); } catch { return 0; }
  }

  /* Mescla documentos locais com documentos vindos da nuvem.
     Regra: documento com timestamp mais recente ganha.
     Documentos que existem APENAS no local são preservados
     (o Firestore nunca apaga dados locais).
     Retorna: { lista[], novos, atualizados }                 */
  function _mesclar(local, cloud) {
    const mapa = {};
    let novos = 0, atualizados = 0;

    /* Indexa todos os documentos locais pelo id */
    local.forEach(item => { if (item && item.id) mapa[item.id] = item; });

    /* Aplica documentos da nuvem sobre o mapa local */
    cloud.forEach(item => {
      if (!item || !item.id) return;

      if (!mapa[item.id]) {
        /* Documento novo — não existe localmente, adiciona */
        mapa[item.id] = item;
        novos++;
      } else {
        /* Conflito: compara timestamps — mais recente vence */
        if (_ts(item) > _ts(mapa[item.id])) {
          mapa[item.id] = item;
          atualizados++;
        }
        /* Se local é mais recente, mantém o local.
           Na Etapa 2 (dual-write), o local já terá subido
           ao Firestore antes, então isso raramente ocorre. */
      }
    });

    return { lista: Object.values(mapa), novos, atualizados };
  }

  /* ──────────────────────────────────────────────────────────
     OPERAÇÕES FIRESTORE PRIMITIVAS
  ────────────────────────────────────────────────────────── */

  /* Retorna o uid do usuário autenticado, ou null.
     Usado apenas para preencher 'criadoPor' (auditoria).     */
  function _getUid() {
    if (typeof Auth !== 'undefined' && Auth.isLogado()) return Auth.getUid();
    return null;
  }

  /* Baixa TODOS os documentos de uma coleção Firestore.
     Modelo de equipe compartilhada: sem filtro por usuário.
     Todos os membros autorizados veem todos os dados.         */
  async function _baixarColecao(nomeCol) {
    const snap = await _getDb().collection(nomeCol).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* Sobe um único documento ao Firestore usando set+merge.
     Injeta 'criadoPor' (uid do autor) para auditoria.
     Modelo equipe: não filtra por usuário — dados compartilhados. */
  async function _subirDoc(nomeCol, obj) {
    if (!obj || !obj.id) {
      console.warn(`${_CLOUD_LOG} Ignorado: objeto sem id em ${nomeCol}`);
      return;
    }
    const uid = _getUid();
    /* criadoPor: identifica quem criou (auditoria), não restringe acesso */
    const doc = (uid && !obj.criadoPor) ? { ...obj, criadoPor: uid } : obj;
    await _getDb().collection(nomeCol).doc(obj.id).set(doc, { merge: true });
  }

  /* Remove um documento do Firestore pelo id */
  async function _removerDoc(nomeCol, id) {
    if (!id) return;
    await _getDb().collection(nomeCol).doc(id).delete();
  }

  /* Envia um array de objetos para uma coleção Firestore usando
     batch writes (transação em lote).
     Divide automaticamente em lotes de 400 docs
     (limite do Firestore: 500 por batch).
     Retorna número total de documentos enviados.            */
  async function _enviarLote(nomeCol, lista) {
    if (!lista || lista.length === 0) return 0;
    const db = _getDb();
    let enviados = 0;
    const TAM = 400;

    for (let i = 0; i < lista.length; i += TAM) {
      const fatia = lista.slice(i, i + TAM);
      const batch = db.batch();

      fatia.forEach(item => {
        if (!item || !item.id) return;
        const ref = db.collection(nomeCol).doc(item.id);
        batch.set(ref, item, { merge: true });
        enviados++;
      });

      await batch.commit();
      const numLote = Math.floor(i / TAM) + 1;
      console.log(`${_CLOUD_LOG}   ${nomeCol}: lote ${numLote} enviado (${fatia.length} docs)`);
    }
    return enviados;
  }

  /* ──────────────────────────────────────────────────────────
     VERIFICAÇÃO DE PRÉ-REQUISITOS
     Lança erro descritivo se a camada cloud não pode operar.
  ────────────────────────────────────────────────────────── */
  function _verificarPreRequisitos() {
    if (!CLOUD_SYNC_ENABLED) {
      throw new Error('Sync desabilitado (CLOUD_SYNC_ENABLED = false)');
    }
    if (typeof firebaseConfigurado === 'function' && !firebaseConfigurado()) {
      throw new Error('Firebase não configurado — verifique FIREBASE_CONFIG em firebase-pesquisa.js');
    }
    /* inicializarFirebase() está definida em firebase-pesquisa.js */
    if (typeof inicializarFirebase === 'function') {
      if (!inicializarFirebase()) {
        throw new Error('Falha ao inicializar Firebase');
      }
    }
    /* Confirma que o SDK está acessível */
    _getDb(); /* lança se firebase não estiver disponível */
  }

  /* ============================================================
     SYNC INICIAL — SOMENTE LEITURA DO FIRESTORE
     ─────────────────────────────────────────────────────────
     Chamada por App.init() ao abrir o app.
     Baixa todos os dados do Firestore e mescla ao localStorage.

     Garantias:
     • Nunca remove dados do localStorage
     • Documento mais recente (timestamp) ganha conflito
     • Falha parcial em uma coleção não para as demais
     • Se Firebase estiver offline, app continua com dados locais
     • Retorna objeto de resultado para debug/re-render
     ─────────────────────────────────────────────────────────
     Retorna:
     { ok, motivo?, colecoes{}, erros[], ms, totalNovos, totalAt }
  ============================================================ */
  async function syncInicial() {
    const resultado = { ok: true, colecoes: {}, erros: [], ms: 0, totalNovos: 0, totalAt: 0 };
    const inicio = Date.now();

    /* Verifica pré-requisitos sem lançar para a UI */
    try { _verificarPreRequisitos(); }
    catch (e) {
      console.warn(`${_CLOUD_LOG} syncInicial ignorado: ${e.message}`);
      return { ...resultado, ok: false, motivo: e.message };
    }

    console.log(`${_CLOUD_LOG} ── Sync inicial ──────────────────────────────`);

    for (const { local, cloud } of MAPA_COLECOES) {
      try {
        /* Baixa documentos da coleção Firestore */
        let docNuvem = await _baixarColecao(cloud);

        /* Avaliações removidas localmente (liberar espaço) não devem
           voltar a cada sync — ficam só na nuvem até o usuário pedir
           explicitamente (ver Storage.removerLocalApenas). */
        if (local === 'ergogro_avaliacoes' && typeof Storage !== 'undefined') {
          const ocultos = Storage.idsOcultosLocal();
          if (ocultos.length > 0) docNuvem = docNuvem.filter(d => !ocultos.includes(d.id));
        }

        if (docNuvem.length === 0) {
          console.log(`${_CLOUD_LOG} ${cloud}: sem dados na nuvem`);
          resultado.colecoes[cloud] = { novos: 0, atualizados: 0, total: 0 };
          continue;
        }

        /* Mescla com dados locais */
        const docLocal = _lerLocal(local);
        const { lista, novos, atualizados } = _mesclar(docLocal, docNuvem);

        /* Só grava se houve diferença */
        if (novos > 0 || atualizados > 0) {
          _gravarLocal(local, lista);
          console.log(`${_CLOUD_LOG} ${cloud}: ✓ +${novos} novos, ~${atualizados} atualizados`);
          resultado.totalNovos += novos;
          resultado.totalAt    += atualizados;
        } else {
          console.log(`${_CLOUD_LOG} ${cloud}: ✓ já sincronizado (${docNuvem.length} docs)`);
        }

        resultado.colecoes[cloud] = { novos, atualizados, total: docNuvem.length };

      } catch (err) {
        /* Falha parcial — loga e continua com a próxima coleção */
        console.error(`${_CLOUD_LOG} ${cloud}: ✗ ${err.message}`);
        resultado.erros.push({ colecao: cloud, erro: err.message });
        resultado.ok = false;
      }
    }

    resultado.ms = Date.now() - inicio;
    console.log(
      `${_CLOUD_LOG} ── Concluído em ${resultado.ms}ms` +
      ` | +${resultado.totalNovos} novos` +
      ` | ~${resultado.totalAt} atualizados` +
      ` | ${resultado.erros.length} erro(s)`
    );
    return resultado;
  }

  /* ============================================================
     MIGRAR LOCAL → FIRESTORE
     ─────────────────────────────────────────────────────────
     Sobe todos os dados do localStorage para o Firestore.
     Executar UMA VEZ no dispositivo que possui os dados
     (ex.: Chrome com os dados originais de testes).

     Além das 7 coleções diretas, extrai e popula:
     • ergogro_planos      — de avaliacao.planoAcao[]
     • ergogro_psicossocial — de avaliacoes tipo=psicossocial

     Progresso visível no console via console.table().
  ============================================================ */
  async function migrarLocal() {
    try { _verificarPreRequisitos(); }
    catch (e) {
      console.error(`${_CLOUD_LOG} migrarLocal: ${e.message}`);
      return { ok: false, motivo: e.message };
    }

    console.log(`${_CLOUD_LOG} ── Migração local → Firestore ────────────────`);
    const resultado = { ok: true, colecoes: {}, total: 0 };
    const inicio = Date.now();
    const uid = _getUid();
    if (uid) console.log(`${_CLOUD_LOG} Migrando como: ${uid}`);

    /* ── 1. Coleções com chave direta no localStorage ─────── */
    for (const { local, cloud } of MAPA_COLECOES) {
      /* Injeta criadoPor para auditoria (não restringe acesso) */
      const listaRaw = _lerLocal(local);
      const lista = uid
        ? listaRaw.map(item => item.criadoPor ? item : { ...item, criadoPor: uid })
        : listaRaw;

      if (lista.length === 0) {
        console.log(`${_CLOUD_LOG} ${cloud}: vazio, pulando`);
        resultado.colecoes[cloud] = 0;
        continue;
      }

      try {
        const enviados = await _enviarLote(cloud, lista);
        resultado.colecoes[cloud] = enviados;
        resultado.total += enviados;
        console.log(`${_CLOUD_LOG} ${cloud}: ✓ ${enviados} docs migrados`);
      } catch (err) {
        console.error(`${_CLOUD_LOG} ${cloud}: ✗ ${err.message}`);
        resultado.colecoes[cloud] = `ERRO: ${err.message}`;
        resultado.ok = false;
        /* Continua migrando as demais coleções mesmo com erro */
      }
    }

    /* ── 2. ergogro_planos — extrai planoAcao[] das avaliações ── */
    try {
      const avaliacoes = _lerLocal('ergogro_avaliacoes');
      const planos = [];

      avaliacoes.forEach(av => {
        (av.planoAcao || []).forEach(acao => {
          if (!acao || !acao.id) return;
          /* Enriquece cada ação com contexto da avaliação */
          planos.push({
            ...acao,
            avaliacaoId: av.id,
            projetoId:   av.projetoId  || null,
            empresaId:   av.empresaId  || null,
            setorId:     av.setorId    || null,
            funcaoId:    av.funcaoId   || null,
            tipoAvaliacao: av.tipo     || null,
          });
        });
      });

      if (planos.length > 0) {
        const enviados = await _enviarLote(COL_PLANOS, planos);
        resultado.colecoes[COL_PLANOS] = enviados;
        resultado.total += enviados;
        console.log(`${_CLOUD_LOG} ${COL_PLANOS}: ✓ ${enviados} ações migradas`);
      } else {
        console.log(`${_CLOUD_LOG} ${COL_PLANOS}: nenhuma ação de plano encontrada`);
        resultado.colecoes[COL_PLANOS] = 0;
      }
    } catch (err) {
      console.error(`${_CLOUD_LOG} ${COL_PLANOS}: ✗ ${err.message}`);
      resultado.colecoes[COL_PLANOS] = `ERRO: ${err.message}`;
    }

    /* ── 3. ergogro_psicossocial — extrai de avaliações psicossociais ── */
    try {
      const avaliacoes = _lerLocal('ergogro_avaliacoes');
      const psicossociais = [];

      avaliacoes
        .filter(av => av.tipo === 'psicossocial' && (av.psicossocial || av.copsoq))
        .forEach(av => {
          /* Usa o mesmo id da avaliação para rastreabilidade */
          psicossociais.push({
            id:           av.id,
            avaliacaoId:  av.id,
            projetoId:    av.projetoId  || null,
            empresaId:    av.empresaId  || null,
            setorId:      av.setorId    || null,
            funcaoId:     av.funcaoId   || null,
            /* Dados específicos do módulo psicossocial */
            ...(av.psicossocial || {}),
            copsoq:       av.copsoq     || null,
            criadaEm:     av.criadaEm   || null,
            atualizadaEm: av.atualizadaEm || null,
          });
        });

      if (psicossociais.length > 0) {
        const enviados = await _enviarLote(COL_PSICOSSOCIAL, psicossociais);
        resultado.colecoes[COL_PSICOSSOCIAL] = enviados;
        resultado.total += enviados;
        console.log(`${_CLOUD_LOG} ${COL_PSICOSSOCIAL}: ✓ ${enviados} avaliações migradas`);
      } else {
        console.log(`${_CLOUD_LOG} ${COL_PSICOSSOCIAL}: nenhuma avaliação psicossocial encontrada`);
        resultado.colecoes[COL_PSICOSSOCIAL] = 0;
      }
    } catch (err) {
      console.error(`${_CLOUD_LOG} ${COL_PSICOSSOCIAL}: ✗ ${err.message}`);
      resultado.colecoes[COL_PSICOSSOCIAL] = `ERRO: ${err.message}`;
    }

    /* ── Relatório final ─────────────────────────────────── */
    resultado.ms = Date.now() - inicio;
    console.log(`${_CLOUD_LOG} ── Migração concluída em ${resultado.ms}ms | ${resultado.total} documentos`);
    console.table(resultado.colecoes);
    return resultado;
  }

  /* ============================================================
     PUSH — Sobe UM documento específico ao Firestore
     ─────────────────────────────────────────────────────────
     Usadas pelo storage.js na Etapa 2 (dual-write).
     Padrão de uso em storage.js após cada _gravar():

       if (typeof StorageCloud !== 'undefined' && CLOUD_SYNC_ENABLED)
         StorageCloud.pushEmpresa(e)
           .catch(err => console.warn(`${_CLOUD_LOG} push:`, err.message));

     O .catch() garante que falha no Firestore não quebra a UI.
  ============================================================ */

  async function pushEmpresa(obj)      { await _subirDoc('ergogro_empresas',       obj); }
  async function pushProjeto(obj)      { await _subirDoc('ergogro_projetos',        obj); }
  async function pushSetor(obj)        { await _subirDoc('ergogro_setores',         obj); }
  async function pushFuncao(obj)       { await _subirDoc('ergogro_funcoes',         obj); }
  async function pushSetorMaster(obj)  { await _subirDoc('ergogro_setores_master',  obj); }
  async function pushFuncaoMaster(obj) { await _subirDoc('ergogro_funcoes_master',  obj); }
  async function pushAvaliacao(obj)    { await _subirDoc('ergogro_avaliacoes',      obj); }

  /* pushPlano: envia uma ação do plano já enriquecida com
     avaliacaoId, projetoId etc. (montada pelo caller)       */
  async function pushPlano(obj)        { await _subirDoc(COL_PLANOS, obj); }

  /* ============================================================
     DELETE — Remove UM documento do Firestore
     ─────────────────────────────────────────────────────────
     Usadas pelo storage.js na Etapa 2 após cada excluir*().
  ============================================================ */

  async function deleteEmpresa(id)      { await _removerDoc('ergogro_empresas',       id); }
  async function deleteProjeto(id)      { await _removerDoc('ergogro_projetos',        id); }
  async function deleteSetor(id)        { await _removerDoc('ergogro_setores',         id); }
  async function deleteFuncao(id)       { await _removerDoc('ergogro_funcoes',         id); }
  async function deleteSetorMaster(id)  { await _removerDoc('ergogro_setores_master',  id); }
  async function deleteFuncaoMaster(id) { await _removerDoc('ergogro_funcoes_master',  id); }
  async function deleteAvaliacao(id)    { await _removerDoc('ergogro_avaliacoes',      id); }

  /* ============================================================
     STATUS — Debug e diagnóstico
     ─────────────────────────────────────────────────────────
     Uso no console do browser:
       console.log(StorageCloud.status())
       — mostra se cloud está ativo, Firebase configurado,
         rede disponível e quantos docs existem localmente.
  ============================================================ */
  function status() {
    const s = {
      cloudSyncEnabled:    CLOUD_SYNC_ENABLED,
      firebaseConfigurado: typeof firebaseConfigurado === 'function'
        ? firebaseConfigurado()
        : '⚠ função não encontrada (firebase-pesquisa.js carregado?)',
      online:  navigator.onLine,
      localStorage: {},
    };

    /* Contagem de documentos por chave local */
    MAPA_COLECOES.forEach(({ local }) => {
      s.localStorage[local] = _lerLocal(local).length;
    });

    return s;
  }

  /* ── API pública ────────────────────────────────────────── */
  return {
    /* Sincronização */
    syncInicial,
    migrarLocal,
    status,
    /* Push — dual-write (Etapa 2) */
    pushEmpresa,
    pushProjeto,
    pushSetor,
    pushFuncao,
    pushSetorMaster,
    pushFuncaoMaster,
    pushAvaliacao,
    pushPlano,
    /* Delete — dual-write (Etapa 2) */
    deleteEmpresa,
    deleteProjeto,
    deleteSetor,
    deleteFuncao,
    deleteSetorMaster,
    deleteFuncaoMaster,
    deleteAvaliacao,
  };
})();

/* Expõe StorageCloud no escopo global (window) explicitamente.
   Necessário pois scripts regulares com 'const' em modo estrito
   não anexam automaticamente ao objeto window.
   NÃO usar type="module" — quebraria o acesso global pelos outros scripts. */
window.StorageCloud = StorageCloud;
