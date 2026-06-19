/* ============================================================
   ErgoGRO — Consulta AEP por Link
   ─────────────────────────────────────────────────────────
   Dois contextos de uso no mesmo arquivo:

   1. index.html (ergonomista)
      → ConsultaAEP.abrirConsulta(perfil)  — gera link de projeto (cobre todas as funções)
      → ConsultaAEP.importarRespostas()    — importa ao checklist de cada avaliação

   2. consulta.html (respondente, sem login)
      → IIFE ao final — detecta token na URL e renderiza o form
   ============================================================ */

/* ── Coleções Firestore ───────────────────────────────────── */
const _COL_CONSULTAS = 'ergogro_consultas_aep';
const _COL_GRUPOS    = 'ergogro_grupos_aep';

/* ── Itens do checklist por perfil de respondente ─────────── */
const _PERFIL_ITENS = {
  /* Líder de Setor: opera e observa o dia a dia — ritmo, tarefas, autonomia, comunicação, suporte, reconhecimento, relações */
  lider: [
    'b01','b02','b03','b04',
    'c01','c02','c03',
    'd01','d02',
    'e01','e02','e03',
    'f01','f03','f04',
    'g01','g02','g03',
    'h01','h02','h04',
  ],
  /* RH: gestão de pessoas — jornada, políticas, integração, assédio, suporte, emocional, recursos humanos */
  rh: [
    'a01','a02','a04','a05',
    'c04',
    'd03','d04',
    'f02',
    'g02',
    'h03',
    'i02','i03',
    'j03','j04',
  ],
  /* Técnico/SESMT: conformidade técnica e segurança — jornada legal, segurança operacional, recursos físicos, exposição emocional */
  tecnico: [
    'a01','a03','a05',
    'b04',
    'd04',
    'e04',
    'i01',
    'j01','j02','j03',
  ],
};

const _PERFIL_LABEL = {
  lider:   'Líder de Setor',
  rh:      'Recursos Humanos (RH)',
  tecnico: 'Técnico de Segurança / SESMT',
};

const _PERFIL_ICONE = { lider: '👷', rh: '🧑‍💼', tecnico: '⚙️' };

/* ── Url base detectada em runtime ───────────────────────── */
function _urlBase() {
  const path = window.location.pathname.replace(/\/?(index|consulta)\.html$/, '/');
  return window.location.origin + path;
}

/* ══════════════════════════════════════════════════════════
   MODO ERGONOMISTA — usado em index.html
══════════════════════════════════════════════════════════ */
const ConsultaAEP = (() => {

  /* Token determinístico: um por projeto × perfil, ou por projeto × perfil × setor(es) quando o link é por setor */
  function _token(projetoId, perfil, setorIds) {
    if (!setorIds || !setorIds.length) return `proj_${projetoId}_${perfil}`;
    return `proj_${projetoId}_${perfil}_s${_hashStr([...setorIds].sort().join(','))}`;
  }

  /* Monta lista de funções com os itens do perfil para as avaliações do projeto.
     Se setorIds for informado, restringe às avaliações desses setores (link por setor). */
  function _montarFuncoes(projetoId, perfil, setorIds) {
    const avaliacoes = Storage.listarPorProjeto(projetoId);
    const idsAlvo     = new Set(_PERFIL_ITENS[perfil] || []);
    const filtroSetor = setorIds && setorIds.length ? new Set(setorIds) : null;
    return avaliacoes
      .filter(av => !filtroSetor || filtroSetor.has(av.setorId))
      .map(av => {
        const setor  = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
        const funcao = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
        const itens  = [];
        ModuloAEP.ORDEM_BLOCOS.forEach(blocoKey => {
          const bloco = ModuloAEP.BLOCOS[blocoKey];
          bloco.itens.forEach(item => {
            if (idsAlvo.has(item.id)) itens.push({
              id: item.id, bloco: blocoKey,
              blocoTitulo: bloco.titulo, blocoIcone: bloco.icone,
              texto: item.texto,
            });
          });
        });
        return itens.length ? {
          avaliacaoId: av.id,
          setorId:     av.setorId || null,
          setorNome:   setor?.nome  || av.setor  || '',
          funcaoNome:  funcao?.nome || av.funcao || '',
          itens,
        } : null;
      }).filter(Boolean);
  }

  /* Lista os setores do projeto que têm itens para o perfil — usado no seletor de link por setor */
  function _listarSetoresDisponiveis(projetoId, perfil) {
    const mapa = new Map();
    _montarFuncoes(projetoId, perfil).forEach(f => {
      if (!f.setorId) return;
      if (!mapa.has(f.setorId)) {
        mapa.set(f.setorId, { setorId: f.setorId, setorNome: f.setorNome || 'Sem nome', funcoes: 0, itens: 0 });
      }
      const reg = mapa.get(f.setorId);
      reg.funcoes++;
      reg.itens += f.itens.length;
    });
    return [...mapa.values()];
  }

  /* Hash djb2 curto, usado para gerar tokens determinísticos a partir de listas de ids */
  function _hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) ^ str.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(36);
  }

  /* Token de grupo: hash dos projetoIds ordenados + perfil → string curta */
  function _tokenGrupo(projetoIds, perfil) {
    return `grupo_${_hashStr([...projetoIds].sort().join(',') + '|' + perfil)}_${perfil}`;
  }

  /* Cria/atualiza o doc individual de um projetoId específico (sem depender de AvaliacaoAtual) */
  async function _criarTokenProjeto(projetoId, perfil) {
    const proj    = Storage.buscarProjeto(projetoId);
    const emp     = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
    const funcoes = _montarFuncoes(projetoId, perfil);
    if (!funcoes.length) return null;

    const token      = _token(projetoId, perfil);
    const ref        = firebase.firestore().collection(_COL_CONSULTAS).doc(token);
    const snapExist  = await ref.get();
    const respostasAntigas = snapExist.exists ? (snapExist.data().respostas || {}) : {};
    const totalItens = funcoes.reduce((s, f) => s + f.itens.length, 0);

    await ref.set({
      token, projetoId, perfil,
      perfilLabel:  _PERFIL_LABEL[perfil],
      empresaNome:  emp?.nome  || '',
      empresaCnpj:  emp?.cnpj  || '',
      funcoes, totalItens,
      status:       'pendente',
      criadaEm:     snapExist.exists ? snapExist.data().criadaEm : new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      respondidaEm: null, respondidoPor: null,
      respostas:    respostasAntigas,
    });

    return { projetoId, token, empresaNome: emp?.nome || '', empresaCnpj: emp?.cnpj || '', funcoes, totalItens };
  }

  /* Cria ou atualiza o doc do projeto no Firestore preservando respostas existentes.
     setorIds (opcional): restringe o link aos setores informados — permite dividir a
     consulta entre vários membros da equipe em empresas com muitos setores. */
  async function _criarOuAtualizar(perfil, setorIds) {
    if (!inicializarFirebase()) throw new Error('Firebase não configurado');
    const av = App.obterAvaliacaoAtual();
    if (!av)           throw new Error('Nenhuma avaliação carregada');
    if (!av.projetoId) throw new Error('Avaliação sem projeto associado');

    const projetoId = av.projetoId;
    const proj = Storage.buscarProjeto(projetoId);
    const emp  = proj ? Storage.buscarEmpresa(proj.empresaId) : null;

    const funcoes = _montarFuncoes(projetoId, perfil, setorIds);
    if (!funcoes.length) {
      throw new Error(setorIds?.length ? 'Nenhuma avaliação cadastrada nos setores selecionados' : 'Nenhuma avaliação cadastrada neste projeto');
    }

    const token     = _token(projetoId, perfil, setorIds);
    const ref       = firebase.firestore().collection(_COL_CONSULTAS).doc(token);
    const snapExist = await ref.get();

    /* Preserva respostas já recebidas ao regenerar */
    const respostasAntigas = snapExist.exists ? (snapExist.data().respostas || {}) : {};
    const totalItens = funcoes.reduce((s, f) => s + f.itens.length, 0);
    const setorNomes = [...new Set(funcoes.map(f => f.setorNome).filter(Boolean))];

    await ref.set({
      token, projetoId, perfil,
      perfilLabel:  _PERFIL_LABEL[perfil],
      empresaNome:  emp?.nome || '',
      setorIds:     setorIds && setorIds.length ? setorIds : [],
      setorNomes,
      funcoes, totalItens,
      status:       'pendente',
      criadaEm:     snapExist.exists ? snapExist.data().criadaEm : new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      respondidaEm: null, respondidoPor: null,
      respostas:    respostasAntigas,
    });

    return `${_urlBase()}consulta.html?token=${token}`;
  }

  /* Botão enviar — gera/atualiza link e abre modal */
  async function abrirConsulta(perfil) {
    const btnId = `btn-consulta-${perfil}`;
    const btn   = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
      const av      = App.obterAvaliacaoAtual();
      const link    = await _criarOuAtualizar(perfil);
      const funcoes = _montarFuncoes(av.projetoId, perfil);
      const proj    = Storage.buscarProjeto(av.projetoId);
      const emp     = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
      _mostrarModalLink(perfil, link, funcoes.length, emp?.nome || '', emp?.cnpj || '');
    } catch (err) {
      App.mostrarToast('Erro ao gerar consulta: ' + err.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = `${_PERFIL_ICONE[perfil]} ${_PERFIL_LABEL[perfil]}`; }
    }
  }

  /* Importa respostas do Firestore para os checklists de cada avaliação */
  async function importarRespostas() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!inicializarFirebase()) { App.mostrarToast('Firebase não configurado', 'erro'); return; }

    const btn = document.getElementById('btn-importar-consulta');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Verificando…'; }

    try {
      let totalImportados = 0;
      /* Blocos da avaliação atualmente aberta que receberam resposta nova — usado para
         pular automaticamente para uma aba com conteúdo (a aba ativa pode não ter nenhum
         item do perfil que respondeu, dando a falsa impressão de que nada foi importado) */
      const blocosAvAtual = new Set();

      /* ── Docs novos (nível projeto) — inclui link único e todos os links por setor ── */
      const snaps = await firebase.firestore().collection(_COL_CONSULTAS)
        .where('projetoId', '==', av.projetoId)
        .get();

      snaps.forEach(snap => {
        const consulta  = snap.data();
        const respostas = consulta.respostas || {};

        Object.entries(respostas).forEach(([avaliacaoId, itemRespostas]) => {
          /* Usa o objeto em memória quando for a avaliação atual para atualizar _avaliacaoAtual diretamente */
          const ehAvAtual = avaliacaoId === av.id;
          const targetAv  = ehAvAtual ? av : Storage.buscar(avaliacaoId);
          if (!targetAv) return;

          Object.entries(itemRespostas || {}).forEach(([itemId, resp]) => {
            const blocoKey = _getBlocoDeItem(itemId);
            if (!blocoKey) return;
            if (!targetAv.aep)             targetAv.aep = {};
            if (!targetAv.aep[blocoKey])   targetAv.aep[blocoKey] = {};
            if (!targetAv.aep[blocoKey][itemId]?.resposta) {
              targetAv.aep[blocoKey][itemId] = {
                resposta:    resp.resposta,
                observacao:  resp.observacao || '',
                importadaDe: consulta.perfilLabel,
              };
              totalImportados++;
              if (ehAvAtual) blocosAvAtual.add(blocoKey);
            }
          });
          Storage.salvar(targetAv);
        });
      });

      /* ── Docs antigos (nível avaliação) — compatibilidade ── */
      const oldSnap = await firebase.firestore().collection(_COL_CONSULTAS)
        .where('avaliacaoId', '==', av.id)
        .where('status', '==', 'respondida')
        .get();

      oldSnap.forEach(docSnap => {
        const consulta = docSnap.data();
        Object.entries(consulta.respostas || {}).forEach(([itemId, resp]) => {
          const blocoKey = _getBlocoDeItem(itemId);
          if (!blocoKey) return;
          if (!av.aep)           av.aep = {};
          if (!av.aep[blocoKey]) av.aep[blocoKey] = {};
          if (!av.aep[blocoKey][itemId]?.resposta) {
            av.aep[blocoKey][itemId] = {
              resposta:    resp.resposta,
              observacao:  resp.observacao || '',
              importadaDe: consulta.perfilLabel,
            };
            totalImportados++;
            blocosAvAtual.add(blocoKey);
          }
        });
      });
      if (!oldSnap.empty) Storage.salvar(av);

      if (totalImportados === 0) {
        App.mostrarToast('Nenhuma resposta recebida ainda', 'info');
        return;
      }
      App.mostrarToast(`${totalImportados} resposta(s) importada(s)`, 'sucesso');
      ModuloAEP.trocarSecao('checklist');

      /* Se a avaliação aberta recebeu respostas novas, mostra a primeira aba com conteúdo —
         a aba que já estava ativa pode não ter nenhum item do perfil que respondeu */
      const primeiroBloco = ModuloAEP.ORDEM_BLOCOS.find(b => blocosAvAtual.has(b));
      if (primeiroBloco) ModuloAEP.trocarBloco(primeiroBloco);

    } catch (err) {
      App.mostrarToast('Erro ao importar: ' + err.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Importar Respostas'; }
    }
  }

  /* Verifica status de todos os links do projeto (link único + links por setor) */
  async function verificarStatus() {
    const av = App.obterAvaliacaoAtual();
    if (!av || !inicializarFirebase()) return;
    try {
      const snaps = await firebase.firestore().collection(_COL_CONSULTAS)
        .where('projetoId', '==', av.projetoId)
        .get();

      let pendentes = 0, respondidas = 0;
      snaps.forEach(snap => {
        if (snap.data().status === 'respondida') respondidas++;
        else pendentes++;
      });

      const badge = document.getElementById('consulta-status-badge');
      if (!badge || respondidas + pendentes === 0) return;
      badge.textContent = respondidas
        ? `${respondidas} link(s) respondido(s) — clique em Importar`
        : `${pendentes} link(s) gerado(s) — aguardando resposta`;
      badge.style.color = respondidas ? '#4caf50' : 'var(--texto-sec)';
    } catch (e) { /* silencioso */ }
  }

  /* Gera links de grupo (multi-CNPJ) para um perfil */
  async function abrirConsultaGrupo(perfil, projetoIds) {
    if (!inicializarFirebase()) { App.mostrarToast('Firebase não configurado', 'erro'); return; }
    if (!projetoIds?.length)    { App.mostrarToast('Selecione ao menos um projeto', 'aviso'); return; }

    App.mostrarToast('Gerando links… aguarde', 'info');
    try {
      const projetos = [];
      for (const pid of projetoIds) {
        const r = await _criarTokenProjeto(pid, perfil);
        if (r) projetos.push(r);
      }
      if (!projetos.length) {
        App.mostrarToast('Nenhum projeto selecionado tem avaliações cadastradas', 'aviso');
        return;
      }

      const grupoToken = _tokenGrupo(projetoIds, perfil);
      await firebase.firestore().collection(_COL_GRUPOS).doc(grupoToken).set({
        grupoToken, perfil,
        perfilLabel:   _PERFIL_LABEL[perfil],
        projetos,
        totalProjetos: projetos.length,
        criadaEm:      new Date().toISOString(),
        atualizadaEm:  new Date().toISOString(),
      });

      const link = `${_urlBase()}consulta.html?grupo=${grupoToken}`;
      _mostrarModalGrupo(perfil, link, projetos);
    } catch (err) {
      App.mostrarToast('Erro ao gerar grupo: ' + err.message, 'erro');
    }
  }

  /* Modal com link do grupo + lista de empresas incluídas */
  function _mostrarModalGrupo(perfil, link, projetos) {
    document.getElementById('modal-grupo-aep')?.remove();
    const label  = _PERFIL_LABEL[perfil];
    const total  = projetos.length;
    const waMsg  = encodeURIComponent(
      `Olá! Preciso da sua colaboração para a Avaliação Ergonômica de ${total} empresa${total > 1 ? 's' : ''}.\n` +
      `Este link único cobre todas as empresas — basta acessar uma única vez:\n${link}`
    );
    const waLink = `https://wa.me/?text=${waMsg}`;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-grupo-aep" class="modal-overlay">
        <div class="modal-panel">

          <div class="modal-titulo">
            📨 ${label} — Link do Grupo (${total} empresa${total > 1 ? 's' : ''})
            <button class="btn-icone"
                    onclick="document.getElementById('modal-grupo-aep').remove()">✕</button>
          </div>

          <div style="font-size:var(--txt-xs);background:var(--superficie-alt);border-radius:var(--r2);
                      padding:var(--s2) var(--s3);margin-bottom:var(--s4);color:var(--texto-sec)">
            ✅ Um único link cobre <strong>todas as ${total} empresa${total > 1 ? 's' : ''}</strong> —
            envie <strong>uma única vez</strong> para o responsável.
          </div>

          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s2);font-weight:600">
            EMPRESAS INCLUÍDAS:
          </div>
          <div style="border:1px solid var(--borda);border-radius:var(--r2);
                      padding:var(--s2) var(--s3);margin-bottom:var(--s4);
                      max-height:140px;overflow-y:auto">
            ${projetos.map((p, i) => `
              <div style="font-size:var(--txt-xs);color:var(--texto-sec);padding:3px 0;
                          ${i < projetos.length - 1 ? 'border-bottom:1px solid var(--borda)' : ''}">
                <strong>${i + 1}.</strong> ${p.empresaNome}
                ${p.empresaCnpj ? `<span style="opacity:.7"> — ${p.empresaCnpj}</span>` : ''}
              </div>
            `).join('')}
          </div>

          <div style="border:1px solid var(--borda);border-radius:var(--r2);
                      padding:10px 12px;font-size:11px;font-family:monospace;
                      word-break:break-all;margin-bottom:var(--s4);
                      color:var(--texto-sec);user-select:all">
            ${link}
          </div>

          <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s3)">
            <button class="btn btn-primario" style="flex:1"
                    onclick="ConsultaAEP._copiarLink('${link.replace(/'/g, "\\'")}')">
              📋 Copiar Link
            </button>
            <a href="${waLink}" target="_blank" rel="noopener"
               style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
                      background:#25D366;color:#fff;font-weight:700;font-size:var(--txt-sm);
                      border-radius:var(--r2);padding:var(--s2) var(--s3);text-decoration:none;
                      border:none;cursor:pointer">
              💬 WhatsApp
            </a>
          </div>
          <button class="btn btn-secundario" style="width:100%"
                  onclick="document.getElementById('modal-grupo-aep').remove()">
            Fechar
          </button>

        </div>
      </div>
    `);
  }

  function _getBlocoDeItem(itemId) {
    for (const [blocoKey, bloco] of Object.entries(ModuloAEP.BLOCOS)) {
      if (bloco.itens.some(i => i.id === itemId)) return blocoKey;
    }
    return null;
  }

  /* Modal com link + copiar + WhatsApp */
  function _mostrarModalLink(perfil, link, numFuncoes, empresaNome, empresaCnpj) {
    document.getElementById('modal-consulta-aep')?.remove();
    const label     = _PERFIL_LABEL[perfil];
    const funcLabel = numFuncoes === 1 ? '1 função' : `${numFuncoes} funções`;
    const clienteInfo = [empresaNome, empresaCnpj ? `CNPJ: ${empresaCnpj}` : ''].filter(Boolean).join(' — ');
    const waMsg  = encodeURIComponent(
      `Olá! Preciso da sua colaboração para a Avaliação Ergonômica` +
      `${clienteInfo ? ` da ${clienteInfo}` : ''}.\n` +
      `Este link cobre ${funcLabel} — basta responder uma única vez:\n${link}`
    );
    const waLink = `https://wa.me/?text=${waMsg}`;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-consulta-aep" style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;
        display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--fundo-card);border:1px solid var(--borda);border-radius:var(--r3);
                    max-width:480px;width:100%;padding:24px">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:8px">
            📨 ${label} — Link do Projeto
          </div>
          <div style="font-size:var(--txt-xs);background:var(--superficie-alt);border-radius:var(--r2);
                      padding:var(--s2) var(--s3);margin-bottom:12px;color:var(--texto-sec)">
            ✅ Cobre <strong>${funcLabel}</strong> do projeto —
            envie <strong>uma única vez</strong> para o responsável.
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:16px">
            O respondente percorre todas as funções em sequência, sem precisar de login.
            Quando terminar, clique em <strong>Importar Respostas</strong>.
          </p>
          <div style="background:var(--fundo);border:1px solid var(--borda);border-radius:var(--r2);
                      padding:10px 12px;font-size:11px;font-family:monospace;
                      word-break:break-all;margin-bottom:16px;color:var(--texto-sec);user-select:all">
            ${link}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            <button class="btn btn-primario" style="flex:1"
                    onclick="ConsultaAEP._copiarLink('${link.replace(/'/g, "\\'")}')">
              📋 Copiar Link
            </button>
            <a href="${waLink}" target="_blank" rel="noopener"
               style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
                      background:#25D366;color:#fff;font-weight:700;font-size:var(--txt-sm);
                      border-radius:var(--r2);padding:var(--s2) var(--s3);text-decoration:none;
                      border:none;cursor:pointer">
              💬 WhatsApp
            </a>
          </div>
          <button class="btn btn-secundario" style="width:100%"
                  onclick="document.getElementById('modal-consulta-aep').remove()">
            Fechar
          </button>
        </div>
      </div>
    `);
  }

  function _copiarLink(link) {
    navigator.clipboard.writeText(link)
      .then(() => App.mostrarToast('Link copiado!', 'sucesso'))
      .catch(() => App.mostrarToast('Selecione e copie manualmente', 'aviso'));
  }

  /* ══════════════════════════════════════════════════════════
     LINK POR SETOR — divide a consulta entre vários membros da
     equipe (cada um recebe um link cobrindo só os setores dele)
  ══════════════════════════════════════════════════════════ */

  /* Abre o seletor: link único (comportamento atual) ou link por setor(es) */
  function abrirSeletorSetores(perfil) {
    const av = App.obterAvaliacaoAtual();
    if (!av || !av.projetoId) { App.mostrarToast('Avaliação sem projeto associado', 'erro'); return; }
    const setores = _listarSetoresDisponiveis(av.projetoId, perfil);
    _mostrarSeletorSetores(perfil, setores);
  }

  function _mostrarSeletorSetores(perfil, setores) {
    document.getElementById('modal-seletor-setores')?.remove();
    const label = _PERFIL_LABEL[perfil];
    const icone = _PERFIL_ICONE[perfil];

    const linhasSetores = setores.map(s => `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 4px;
                    border-bottom:1px solid var(--borda);cursor:pointer;font-size:var(--txt-sm)">
        <input type="checkbox" class="chk-setor-link" value="${s.setorId}" data-nome="${s.setorNome}"
               style="flex-shrink:0;width:16px;height:16px">
        <span style="flex:1">
          <strong>${s.setorNome}</strong>
          <span style="color:var(--texto-sec);font-size:var(--txt-xs)"> — ${s.funcoes} função(ões), ${s.itens} item(ns)</span>
        </span>
      </label>
    `).join('');

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-seletor-setores" style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;
        display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--fundo-card);border:1px solid var(--borda);border-radius:var(--r3);
                    max-width:520px;width:100%;padding:24px;max-height:90vh;overflow-y:auto">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:4px">
            ${icone} ${label} — Gerar Link
          </div>
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:16px">
            Em empresas com muitos setores, divida a tarefa entre vários membros da equipe
            gerando um link por setor (ou por grupo de setores) para cada pessoa.
          </div>

          <button class="btn btn-secundario" style="width:100%;margin-bottom:16px"
                  onclick="document.getElementById('modal-seletor-setores').remove();ConsultaAEP.abrirConsulta('${perfil}')">
            🔗 Link Único — cobre todos os setores
          </button>

          ${setores.length ? `
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;margin-bottom:8px">
              OU SELECIONE SETOR(ES) PARA UM LINK ESPECÍFICO:
            </div>
            <div style="border:1px solid var(--borda);border-radius:var(--r2);max-height:220px;overflow-y:auto;margin-bottom:12px">
              ${linhasSetores}
            </div>
            <button class="btn btn-primario" style="width:100%;margin-bottom:8px"
                    onclick="ConsultaAEP._gerarLinkSelecionados('${perfil}')">
              📨 Gerar Link para Setor(es) Selecionado(s)
            </button>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:12px">
              Após gerar, desmarque e selecione o próximo grupo de setores para criar outro link
              (um para cada membro da equipe).
            </div>
            <div id="links-setor-gerados-${perfil}"></div>
          ` : `
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:12px">
              Nenhum setor com itens cadastrados para este perfil.
            </div>
          `}

          <button class="btn btn-secundario" style="width:100%"
                  onclick="document.getElementById('modal-seletor-setores').remove()">
            Fechar
          </button>
        </div>
      </div>
    `);
  }

  /* Gera um link cobrindo só os setores marcados, sem fechar o seletor — permite gerar vários links em sequência */
  async function _gerarLinkSelecionados(perfil) {
    const checks = [...document.querySelectorAll('.chk-setor-link:checked')];
    if (!checks.length) { App.mostrarToast('Selecione ao menos um setor', 'aviso'); return; }

    const setorIds  = checks.map(c => c.value);
    const setorNomes = checks.map(c => c.dataset.nome).join(', ');

    try {
      const link = await _criarOuAtualizar(perfil, setorIds);
      checks.forEach(c => { c.checked = false; });

      const cont = document.getElementById(`links-setor-gerados-${perfil}`);
      if (!cont) return;
      cont.insertAdjacentHTML('beforeend', `
        <div style="border:1px solid var(--borda);border-radius:var(--r2);padding:10px 12px;
                    margin-bottom:8px;font-size:var(--txt-xs)">
          <div style="font-weight:600;margin-bottom:4px">✅ ${setorNomes}</div>
          <div style="font-family:monospace;word-break:break-all;color:var(--texto-sec);
                      margin-bottom:6px;user-select:all">${link}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secundario" style="font-size:var(--txt-xs);padding:4px 10px"
                    onclick="ConsultaAEP._copiarLink('${link.replace(/'/g, "\\'")}')">📋 Copiar</button>
            <a href="https://wa.me/?text=${encodeURIComponent(`Olá! Preciso da sua colaboração na Avaliação Ergonômica do(s) setor(es) ${setorNomes}:\n${link}`)}"
               target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:4px;background:#25D366;color:#fff;
                      font-weight:700;border-radius:var(--r2);padding:4px 10px;text-decoration:none">
              💬 WhatsApp
            </a>
          </div>
        </div>
      `);
    } catch (err) {
      App.mostrarToast('Erro ao gerar link: ' + err.message, 'erro');
    }
  }

  return {
    abrirConsulta, importarRespostas, verificarStatus, _copiarLink, abrirConsultaGrupo,
    abrirSeletorSetores, _gerarLinkSelecionados,
  };
})();


/* ══════════════════════════════════════════════════════════
   MODO RESPONDENTE — executado em consulta.html
   (Detecta automaticamente pelo elemento #consulta-body)
══════════════════════════════════════════════════════════ */
(function () {
  if (!document.getElementById('consulta-body')) return;

  /* Estado do modo grupo (persiste entre empresas) */
  let _grupoState = null;

  /* Toast mínimo para página sem App */
  function _toast(msg, tipo) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.className   = `toast toast-${tipo} visivel`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'toast'; }, 3500);
  }

  async function _init() {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const grupo  = params.get('grupo');
    const body   = document.getElementById('consulta-body');

    if (!token && !grupo) { body.innerHTML = _htmlErro('Link inválido', 'Este link não contém um código de consulta.'); return; }
    if (!inicializarFirebase()) { body.innerHTML = _htmlErro('Erro de conexão', 'Não foi possível conectar ao servidor.'); return; }

    /* Modo grupo: multi-CNPJ */
    if (grupo) { await _initGrupo(grupo); return; }

    try {
      const snap = await firebase.firestore().collection(_COL_CONSULTAS).doc(token).get();
      if (!snap.exists) { body.innerHTML = _htmlErro('Consulta não encontrada', 'Link inválido ou expirado.'); return; }

      const consulta = snap.data();
      if (consulta.status === 'respondida') { body.innerHTML = _htmlJaRespondida(consulta); return; }

      /* Fluxo novo (multi-função) ou antigo (função única) */
      if (consulta.funcoes) {
        body.innerHTML = _htmlFormularioMulti(consulta);
        document.getElementById('form-consulta').addEventListener('submit', e => {
          e.preventDefault();
          _submeterMulti(token, consulta);
        });
      } else {
        body.innerHTML = _htmlFormulario(consulta);
        document.getElementById('form-consulta').addEventListener('submit', e => {
          e.preventDefault();
          _submeter(token, consulta);
        });
      }

    } catch (err) {
      body.innerHTML = _htmlErro('Erro ao carregar', err.message);
    }
  }

  /* ── Envio multi-função ─────────────────────────────────── */
  async function _submeterMulti(token, consulta) {
    const btn = document.getElementById('btn-submit-consulta');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando…'; }

    const respondidoPor = document.getElementById('consulta-nome')?.value?.trim() || '';
    const respostas     = {};
    let incompleto      = false;

    consulta.funcoes.forEach(funcao => {
      respostas[funcao.avaliacaoId] = {};
      funcao.itens.forEach(item => {
        const val = document.querySelector(`input[name="resp_${funcao.avaliacaoId}_${item.id}"]:checked`)?.value;
        if (!val) { incompleto = true; return; }
        respostas[funcao.avaliacaoId][item.id] = {
          resposta:   val,
          observacao: document.getElementById(`obs_${funcao.avaliacaoId}_${item.id}`)?.value?.trim() || '',
        };
      });
    });

    if (incompleto) {
      _toast('Responda todos os itens antes de enviar', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar Respostas'; }
      return;
    }

    try {
      await firebase.firestore().collection(_COL_CONSULTAS).doc(token).update({
        respostas,
        status:       'respondida',
        respondidaEm: new Date().toISOString(),
        respondidoPor,
      });
      document.getElementById('consulta-body').innerHTML = _htmlSucessoMulti(consulta);
    } catch (err) {
      _toast('Erro ao enviar: ' + err.message, 'erro');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar Respostas'; }
    }
  }

  /* ── Envio função única (compatibilidade docs antigos) ───── */
  async function _submeter(token, consulta) {
    const btn = document.getElementById('btn-submit-consulta');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando…'; }

    const respondidoPor = document.getElementById('consulta-nome')?.value?.trim() || '';
    const respostas     = {};
    let incompleto      = false;

    consulta.itens.forEach(item => {
      const val = document.querySelector(`input[name="resp_${item.id}"]:checked`)?.value;
      if (!val) { incompleto = true; return; }
      respostas[item.id] = {
        resposta:   val,
        observacao: document.getElementById(`obs_${item.id}`)?.value?.trim() || '',
      };
    });

    if (incompleto) {
      _toast('Responda todos os itens antes de enviar', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar Respostas'; }
      return;
    }

    try {
      await firebase.firestore().collection(_COL_CONSULTAS).doc(token).update({
        respostas,
        status:       'respondida',
        respondidaEm: new Date().toISOString(),
        respondidoPor,
      });
      document.getElementById('consulta-body').innerHTML = _htmlSucesso(consulta);
    } catch (err) {
      _toast('Erro ao enviar: ' + err.message, 'erro');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar Respostas'; }
    }
  }

  /* ── Modo grupo (multi-CNPJ) ─────────────────────────── */

  async function _initGrupo(grupoToken) {
    const body = document.getElementById('consulta-body');
    try {
      const snap = await firebase.firestore().collection(_COL_GRUPOS).doc(grupoToken).get();
      if (!snap.exists) { body.innerHTML = _htmlErro('Grupo não encontrado', 'Link inválido ou expirado.'); return; }
      const grupo = snap.data();
      _grupoState  = { grupoToken, grupo, projetoIdx: 0, respondidoPor: '' };
      _renderizarProjetoGrupo();
    } catch (err) {
      body.innerHTML = _htmlErro('Erro ao carregar', err.message);
    }
  }

  function _renderizarProjetoGrupo() {
    const body = document.getElementById('consulta-body');
    body.innerHTML = _htmlFormularioGrupo(_grupoState.grupo, _grupoState.projetoIdx);
    document.getElementById('form-consulta-grupo').addEventListener('submit', e => {
      e.preventDefault();
      _submeterProjetoGrupo();
    });
    window.scrollTo({ top: 0 });
  }

  async function _submeterProjetoGrupo() {
    const { grupo, projetoIdx } = _grupoState;
    const proj = grupo.projetos[projetoIdx];
    const btn  = document.getElementById('btn-submit-grupo');
    const isUltimo = projetoIdx >= grupo.projetos.length - 1;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando…'; }

    /* Captura nome apenas na primeira empresa */
    const nome = document.getElementById('consulta-nome')?.value?.trim() || '';
    if (projetoIdx === 0) _grupoState.respondidoPor = nome;

    const respostas  = {};
    let incompleto   = false;

    proj.funcoes.forEach(funcao => {
      respostas[funcao.avaliacaoId] = {};
      funcao.itens.forEach(item => {
        const val = document.querySelector(`input[name="resp_${funcao.avaliacaoId}_${item.id}"]:checked`)?.value;
        if (!val) { incompleto = true; return; }
        respostas[funcao.avaliacaoId][item.id] = {
          resposta:   val,
          observacao: document.getElementById(`obs_${funcao.avaliacaoId}_${item.id}`)?.value?.trim() || '',
        };
      });
    });

    if (incompleto) {
      _toast('Responda todos os itens antes de continuar', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = isUltimo ? '✅ Concluir' : `→ Próxima Empresa (${projetoIdx + 2} de ${grupo.projetos.length})`; }
      return;
    }

    try {
      await firebase.firestore().collection(_COL_CONSULTAS).doc(proj.token).update({
        respostas,
        status:        'respondida',
        respondidaEm:  new Date().toISOString(),
        respondidoPor: _grupoState.respondidoPor,
      });

      _grupoState.projetoIdx++;
      if (_grupoState.projetoIdx >= grupo.projetos.length) {
        document.getElementById('consulta-body').innerHTML = _htmlSucessoGrupo(grupo);
      } else {
        _renderizarProjetoGrupo();
      }
    } catch (err) {
      _toast('Erro ao enviar: ' + err.message, 'erro');
      if (btn) { btn.disabled = false; btn.textContent = isUltimo ? '✅ Concluir' : `→ Próxima Empresa (${projetoIdx + 2} de ${grupo.projetos.length})`; }
    }
  }

  function _htmlFormularioGrupo(grupo, projetoIdx) {
    const proj       = grupo.projetos[projetoIdx];
    const total      = grupo.projetos.length;
    const isUltimo   = projetoIdx === total - 1;
    const funcoes    = proj.funcoes || [];
    const totalItens = funcoes.reduce((s, f) => s + f.itens.length, 0);

    let offsetGlobal = 0;
    const gruposHTML = funcoes.map((funcao, fi) => {
      const offset   = offsetGlobal;
      offsetGlobal  += funcao.itens.length;

      const itensHTML = funcao.itens.map((item, idx) => `
        <div class="card" style="margin-bottom:var(--s3)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s2);font-weight:600">
            ${item.blocoIcone || ''} ${item.blocoTitulo} — Item ${offset + idx + 1} de ${totalItens}
          </div>
          <div style="font-size:var(--txt-sm);font-weight:500;line-height:1.55;margin-bottom:var(--s3)">
            ${item.texto}
          </div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)">
            ${[['sim','✓ SIM','#4caf50'],['nao','✗ NÃO','#f44336'],['na','— N/A','#888']].map(([val, label, cor]) => `
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:80px;
                            background:var(--fundo);border:2px solid var(--borda);border-radius:var(--r2);
                            padding:var(--s2) var(--s3);font-size:var(--txt-sm);font-weight:700;
                            color:${cor};transition:border-color .15s"
                     onclick="this.style.borderColor='${cor}'">
                <input type="radio" name="resp_${funcao.avaliacaoId}_${item.id}" value="${val}"
                       style="accent-color:${cor};flex-shrink:0">
                ${label}
              </label>
            `).join('')}
          </div>
          <div class="grupo-campo" style="margin:0">
            <input type="text" id="obs_${funcao.avaliacaoId}_${item.id}"
                   placeholder="Observação ou justificativa (opcional)"
                   style="font-size:var(--txt-xs)">
          </div>
        </div>
      `).join('');

      return `
        <div style="background:var(--superficie-alt);border-left:3px solid var(--primario);
                    border-radius:var(--r2);padding:var(--s3) var(--s4);
                    margin:var(--s5) 0 var(--s3)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;
                      letter-spacing:.04em;margin-bottom:2px">
            FUNÇÃO ${fi + 1} DE ${funcoes.length}
          </div>
          <div style="font-size:var(--txt-base);font-weight:700">${funcao.funcaoNome || 'Função'}</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            Setor: ${funcao.setorNome || '—'} &nbsp;·&nbsp; ${funcao.itens.length} item(ns)
          </div>
        </div>
        ${itensHTML}
      `;
    }).join('');

    const btnLabel = isUltimo ? '✅ Concluir' : `→ Próxima Empresa (${projetoIdx + 2} de ${total})`;

    return `
      <!-- Barra de progresso do grupo -->
      <div style="background:var(--fundo);border-bottom:1px solid var(--borda);
                  padding:var(--s3) var(--s4);margin-bottom:var(--s3)">
        <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s1)">
          Empresa ${projetoIdx + 1} de ${total} — ${grupo.perfilLabel}
        </div>
        <div style="background:var(--borda);border-radius:99px;height:5px;overflow:hidden">
          <div style="background:var(--primario);height:100%;
                      width:${Math.round(((projetoIdx + 1) / total) * 100)}%;
                      transition:width .3s"></div>
        </div>
      </div>

      <div class="card" style="border-color:var(--primario);margin-bottom:var(--s4)">
        <div style="font-size:var(--txt-lg);font-weight:700;margin-bottom:var(--s1)">
          📋 ${proj.empresaNome || 'Empresa'}
        </div>
        ${proj.empresaCnpj ? `<div style="font-size:var(--txt-xs);color:var(--texto-sec)">CNPJ: ${proj.empresaCnpj}</div>` : ''}
        <div style="margin-top:var(--s3);padding:var(--s2) var(--s3);background:var(--fundo);
                    border-radius:var(--r2);font-size:var(--txt-xs);color:var(--texto-sec)">
          Destinado a: <strong>${grupo.perfilLabel}</strong> &nbsp;·&nbsp;
          <strong>${funcoes.length} função(ões)</strong> &nbsp;·&nbsp;
          <strong>${totalItens} itens</strong> &nbsp;·&nbsp;
          Tempo estimado: <strong>${Math.ceil(totalItens * 0.5)} min</strong>
        </div>
      </div>

      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Responda com base na realidade de cada posto de trabalho.
        Em caso de dúvida, use <strong>N/A</strong> e adicione uma observação.</span>
      </div>

      <form id="form-consulta-grupo">
        ${gruposHTML}

        ${projetoIdx === 0 ? `
        <div class="card" style="margin-top:var(--s5)">
          <div class="grupo-campo" style="margin:0">
            <label for="consulta-nome">Seu nome
              <span style="color:var(--texto-sec);font-weight:400">(opcional)</span>
            </label>
            <input type="text" id="consulta-nome" placeholder="Nome do respondente">
          </div>
        </div>` : ''}

        <button id="btn-submit-grupo" type="submit" class="btn-bloco" style="margin-top:var(--s4)">
          ${btnLabel}
        </button>
        <div style="height:var(--s6)"></div>
      </form>
    `;
  }

  function _htmlSucessoGrupo(grupo) {
    return `
      <div class="card" style="text-align:center;padding:var(--s6)">
        <div style="font-size:3rem;margin-bottom:var(--s3)">🎉</div>
        <div style="font-weight:700;font-size:var(--txt-base);margin-bottom:var(--s2)">
          Todas as empresas respondidas!
        </div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
          Obrigado pela colaboração.<br>
          Suas respostas cobriram <strong>${grupo.totalProjetos || grupo.projetos?.length || ''} empresa${(grupo.totalProjetos || grupo.projetos?.length) > 1 ? 's' : ''}</strong>
          e serão incorporadas às avaliações.<br><br>
          Você já pode fechar esta página.
        </div>
      </div>
    `;
  }

  /* ── Templates HTML ───────────────────────────────────── */

  function _htmlFormularioMulti(c) {
    const funcoes    = c.funcoes || [];
    const totalItens = funcoes.reduce((s, f) => s + f.itens.length, 0);

    /* Conta offset global de itens para numeração contínua */
    let offsetGlobal = 0;
    const gruposHTML = funcoes.map((funcao, fi) => {
      const offset    = offsetGlobal;
      offsetGlobal   += funcao.itens.length;

      const itensHTML = funcao.itens.map((item, idx) => `
        <div class="card" style="margin-bottom:var(--s3)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s2);font-weight:600">
            ${item.blocoIcone || ''} ${item.blocoTitulo} — Item ${offset + idx + 1} de ${totalItens}
          </div>
          <div style="font-size:var(--txt-sm);font-weight:500;line-height:1.55;margin-bottom:var(--s3)">
            ${item.texto}
          </div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)">
            ${[['sim','✓ SIM','#4caf50'],['nao','✗ NÃO','#f44336'],['na','— N/A','#888']].map(([val, label, cor]) => `
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:80px;
                            background:var(--fundo);border:2px solid var(--borda);border-radius:var(--r2);
                            padding:var(--s2) var(--s3);font-size:var(--txt-sm);font-weight:700;
                            color:${cor};transition:border-color .15s"
                     onclick="this.style.borderColor='${cor}'">
                <input type="radio" name="resp_${funcao.avaliacaoId}_${item.id}" value="${val}"
                       style="accent-color:${cor};flex-shrink:0">
                ${label}
              </label>
            `).join('')}
          </div>
          <div class="grupo-campo" style="margin:0">
            <input type="text" id="obs_${funcao.avaliacaoId}_${item.id}"
                   placeholder="Observação ou justificativa (opcional)"
                   style="font-size:var(--txt-xs)">
          </div>
        </div>
      `).join('');

      return `
        <div style="background:var(--superficie-alt);border-left:3px solid var(--primario);
                    border-radius:var(--r2);padding:var(--s3) var(--s4);
                    margin:var(--s5) 0 var(--s3)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;
                      letter-spacing:.04em;margin-bottom:2px">
            FUNÇÃO ${fi + 1} DE ${funcoes.length}
          </div>
          <div style="font-size:var(--txt-base);font-weight:700">${funcao.funcaoNome || 'Função'}</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            Setor: ${funcao.setorNome || '—'} &nbsp;·&nbsp; ${funcao.itens.length} item(ns)
          </div>
        </div>
        ${itensHTML}
      `;
    }).join('');

    return `
      <div class="card" style="border-color:var(--primario);margin-bottom:var(--s4)">
        <div style="font-size:var(--txt-lg);font-weight:700;margin-bottom:var(--s2)">
          📋 Consulta Ergonômica AEP
        </div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
          <strong>Empresa:</strong> ${c.empresaNome || '—'}
          ${c.setorNomes?.length ? `<br><strong>Setor(es):</strong> ${c.setorNomes.join(', ')}` : ''}
        </div>
        <div style="margin-top:var(--s3);padding:var(--s2) var(--s3);background:var(--fundo);
                    border-radius:var(--r2);font-size:var(--txt-xs);color:var(--texto-sec)">
          Destinado a: <strong>${c.perfilLabel}</strong> &nbsp;·&nbsp;
          <strong>${funcoes.length} função(ões)</strong> &nbsp;·&nbsp;
          <strong>${totalItens} itens</strong> &nbsp;·&nbsp;
          Tempo estimado: <strong>${Math.ceil(totalItens * 0.5)} min</strong>
        </div>
      </div>

      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Responda com base na realidade de cada posto de trabalho.
        Em caso de dúvida, use <strong>N/A</strong> e adicione uma observação.</span>
      </div>

      <form id="form-consulta">
        ${gruposHTML}

        <div class="card" style="margin-top:var(--s5)">
          <div class="grupo-campo" style="margin:0">
            <label for="consulta-nome">Seu nome
              <span style="color:var(--texto-sec);font-weight:400">(opcional)</span>
            </label>
            <input type="text" id="consulta-nome" placeholder="Nome do respondente">
          </div>
        </div>

        <button id="btn-submit-consulta" type="submit" class="btn-bloco" style="margin-top:var(--s4)">
          ✅ Enviar Respostas
        </button>
        <div style="height:var(--s6)"></div>
      </form>
    `;
  }

  /* Formulário função única (docs antigos) */
  function _htmlFormulario(c) {
    const itensHTML = c.itens.map((item, idx) => `
      <div class="card" style="margin-bottom:var(--s3)">
        <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s2);font-weight:600">
          ${item.blocoIcone || ''} ${item.blocoTitulo} — Item ${idx + 1} de ${c.itens.length}
        </div>
        <div style="font-size:var(--txt-sm);font-weight:500;line-height:1.55;margin-bottom:var(--s3)">
          ${item.texto}
        </div>
        <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)">
          ${[['sim','✓ SIM','#4caf50'],['nao','✗ NÃO','#f44336'],['na','— N/A','#888']].map(([val, label, cor]) => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:80px;
                          background:var(--fundo);border:2px solid var(--borda);border-radius:var(--r2);
                          padding:var(--s2) var(--s3);font-size:var(--txt-sm);font-weight:700;
                          color:${cor};transition:border-color .15s"
                   onclick="this.style.borderColor='${cor}'">
              <input type="radio" name="resp_${item.id}" value="${val}"
                     style="accent-color:${cor};flex-shrink:0">
              ${label}
            </label>
          `).join('')}
        </div>
        <div class="grupo-campo" style="margin:0">
          <input type="text" id="obs_${item.id}"
                 placeholder="Observação ou justificativa (opcional)"
                 style="font-size:var(--txt-xs)">
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="border-color:var(--primario);margin-bottom:var(--s4)">
        <div style="font-size:var(--txt-lg);font-weight:700;margin-bottom:var(--s2)">
          📋 Consulta Ergonômica AEP
        </div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
          <strong>Empresa:</strong> ${c.empresaNome || '—'}<br>
          <strong>Setor:</strong> ${c.setorNome || '—'} &nbsp;·&nbsp;
          <strong>Função:</strong> ${c.funcaoNome || '—'}
        </div>
        <div style="margin-top:var(--s3);padding:var(--s2) var(--s3);background:var(--fundo);
                    border-radius:var(--r2);font-size:var(--txt-xs);color:var(--texto-sec)">
          Destinado a: <strong>${c.perfilLabel}</strong> &nbsp;·&nbsp;
          <strong>${c.itens.length} itens</strong> &nbsp;·&nbsp;
          Tempo estimado: <strong>${Math.ceil(c.itens.length * 0.5)} min</strong>
        </div>
      </div>

      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Responda com base na realidade do posto de trabalho.
        Em caso de dúvida, use <strong>N/A</strong> e adicione uma observação.</span>
      </div>

      <form id="form-consulta">
        ${itensHTML}
        <div class="card">
          <div class="grupo-campo" style="margin:0">
            <label for="consulta-nome">Seu nome
              <span style="color:var(--texto-sec);font-weight:400">(opcional)</span>
            </label>
            <input type="text" id="consulta-nome" placeholder="Nome do respondente">
          </div>
        </div>
        <button id="btn-submit-consulta" type="submit" class="btn-bloco" style="margin-top:var(--s4)">
          ✅ Enviar Respostas
        </button>
        <div style="height:var(--s6)"></div>
      </form>
    `;
  }

  function _htmlJaRespondida(c) {
    return `
      <div class="card" style="text-align:center;padding:var(--s6)">
        <div style="font-size:3rem;margin-bottom:var(--s3)">✅</div>
        <div style="font-weight:700;font-size:var(--txt-base);margin-bottom:var(--s2)">Consulta já respondida</div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
          ${c.respondidoPor ? `Respondida por <strong>${c.respondidoPor}</strong>` : 'Respostas já registradas'}
          ${c.respondidaEm ? ` em ${new Date(c.respondidaEm).toLocaleDateString('pt-BR')}` : ''}.<br>
          Obrigado pela colaboração!
        </div>
      </div>`;
  }

  function _htmlSucessoMulti(c) {
    return `
      <div class="card" style="text-align:center;padding:var(--s6)">
        <div style="font-size:3rem;margin-bottom:var(--s3)">🎉</div>
        <div style="font-weight:700;font-size:var(--txt-base);margin-bottom:var(--s2)">Respostas enviadas!</div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
          Obrigado por responder a consulta ergonômica.<br>
          Suas respostas cobriram <strong>${c.funcoes?.length || ''} função(ões)</strong>
          e serão incorporadas à avaliação.<br><br>
          Você já pode fechar esta página.
        </div>
      </div>`;
  }

  function _htmlSucesso(c) {
    return `
      <div class="card" style="text-align:center;padding:var(--s6)">
        <div style="font-size:3rem;margin-bottom:var(--s3)">🎉</div>
        <div style="font-weight:700;font-size:var(--txt-base);margin-bottom:var(--s2)">Respostas enviadas!</div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
          Obrigado por responder a consulta ergonômica.<br>
          As informações serão incorporadas à avaliação de
          <strong>${c.funcaoNome || 'seu posto de trabalho'}</strong>.<br><br>
          Você já pode fechar esta página.
        </div>
      </div>`;
  }

  function _htmlErro(titulo, msg) {
    return `
      <div class="card" style="text-align:center;padding:var(--s6)">
        <div style="font-size:3rem;margin-bottom:var(--s3)">⚠️</div>
        <div style="font-weight:700;font-size:var(--txt-base);margin-bottom:var(--s2)">${titulo}</div>
        <div style="font-size:var(--txt-sm);color:var(--texto-sec)">${msg}</div>
      </div>`;
  }

  /* ── Inicializa ───────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
