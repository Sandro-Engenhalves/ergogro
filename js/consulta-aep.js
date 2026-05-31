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

/* ── Coleção Firestore ────────────────────────────────────── */
const _COL_CONSULTAS = 'ergogro_consultas_aep';

/* ── Itens do checklist por perfil de respondente ─────────── */
const _PERFIL_ITENS = {
  lider:   [
    'org_02','org_03','org_04','org_05',
    'car_03','car_04',
    'cog_01','cog_02','cog_03','cog_04','cog_05','cog_06','cog_07',
    'psi_01','psi_02','psi_03','psi_04','psi_05',
  ],
  rh:      ['org_01','org_08','psi_06'],
  tecnico: ['car_01','maq_02','maq_07','amb_01','amb_03','amb_05','amb_06'],
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

  /* Token determinístico: um por projeto × perfil */
  function _token(projetoId, perfil) {
    return `proj_${projetoId}_${perfil}`;
  }

  /* Monta lista de funções com os itens do perfil para todas as avaliações do projeto */
  function _montarFuncoes(projetoId, perfil) {
    const avaliacoes = Storage.listarPorProjeto(projetoId);
    const idsAlvo    = new Set(_PERFIL_ITENS[perfil] || []);
    return avaliacoes.map(av => {
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
        setorNome:   setor?.nome  || av.setor  || '',
        funcaoNome:  funcao?.nome || av.funcao || '',
        itens,
      } : null;
    }).filter(Boolean);
  }

  /* Cria ou atualiza o doc do projeto no Firestore preservando respostas existentes */
  async function _criarOuAtualizar(perfil) {
    if (!inicializarFirebase()) throw new Error('Firebase não configurado');
    const av = App.obterAvaliacaoAtual();
    if (!av)           throw new Error('Nenhuma avaliação carregada');
    if (!av.projetoId) throw new Error('Avaliação sem projeto associado');

    const projetoId = av.projetoId;
    const proj = Storage.buscarProjeto(projetoId);
    const emp  = proj ? Storage.buscarEmpresa(proj.empresaId) : null;

    const funcoes = _montarFuncoes(projetoId, perfil);
    if (!funcoes.length) throw new Error('Nenhuma avaliação cadastrada neste projeto');

    const token     = _token(projetoId, perfil);
    const ref       = firebase.firestore().collection(_COL_CONSULTAS).doc(token);
    const snapExist = await ref.get();

    /* Preserva respostas já recebidas ao regenerar */
    const respostasAntigas = snapExist.exists ? (snapExist.data().respostas || {}) : {};
    const totalItens = funcoes.reduce((s, f) => s + f.itens.length, 0);

    await ref.set({
      token, projetoId, perfil,
      perfilLabel:  _PERFIL_LABEL[perfil],
      empresaNome:  emp?.nome || '',
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
      _mostrarModalLink(perfil, link, funcoes.length);
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

      /* ── Docs novos (nível projeto) ── */
      const tokens = ['lider', 'rh', 'tecnico'].map(p => _token(av.projetoId, p));
      const snaps  = await Promise.all(tokens.map(t =>
        firebase.firestore().collection(_COL_CONSULTAS).doc(t).get()
      ));

      snaps.forEach(snap => {
        if (!snap.exists) return;
        const consulta  = snap.data();
        const respostas = consulta.respostas || {};

        Object.entries(respostas).forEach(([avaliacaoId, itemRespostas]) => {
          const targetAv = Storage.buscar(avaliacaoId);
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

    } catch (err) {
      App.mostrarToast('Erro ao importar: ' + err.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Importar Respostas'; }
    }
  }

  /* Verifica status dos 3 links do projeto */
  async function verificarStatus() {
    const av = App.obterAvaliacaoAtual();
    if (!av || !inicializarFirebase()) return;
    try {
      const tokens = ['lider', 'rh', 'tecnico'].map(p => _token(av.projetoId, p));
      const snaps  = await Promise.all(tokens.map(t =>
        firebase.firestore().collection(_COL_CONSULTAS).doc(t).get()
      ));

      let pendentes = 0, respondidas = 0;
      snaps.forEach(snap => {
        if (!snap.exists) return;
        if (snap.data().status === 'respondida') respondidas++;
        else pendentes++;
      });

      const badge = document.getElementById('consulta-status-badge');
      if (!badge || respondidas + pendentes === 0) return;
      badge.textContent = respondidas
        ? `${respondidas} perfil(s) respondido(s) — clique em Importar`
        : `${pendentes} link(s) gerado(s) — aguardando resposta`;
      badge.style.color = respondidas ? '#4caf50' : 'var(--texto-sec)';
    } catch (e) { /* silencioso */ }
  }

  function _getBlocoDeItem(itemId) {
    for (const [blocoKey, bloco] of Object.entries(ModuloAEP.BLOCOS)) {
      if (bloco.itens.some(i => i.id === itemId)) return blocoKey;
    }
    return null;
  }

  /* Modal com link + copiar + WhatsApp */
  function _mostrarModalLink(perfil, link, numFuncoes) {
    document.getElementById('modal-consulta-aep')?.remove();
    const label  = _PERFIL_LABEL[perfil];
    const waMsg  = encodeURIComponent(
      `Olá! Preciso da sua colaboração para a Avaliação Ergonômica.\n` +
      `Este link cobre ${numFuncoes} função(ões) — basta responder uma única vez:\n${link}`
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
            ✅ Cobre <strong>${numFuncoes} função(ões)</strong> do projeto —
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

  return { abrirConsulta, importarRespostas, verificarStatus, _copiarLink };
})();


/* ══════════════════════════════════════════════════════════
   MODO RESPONDENTE — executado em consulta.html
   (Detecta automaticamente pelo elemento #consulta-body)
══════════════════════════════════════════════════════════ */
(function () {
  if (!document.getElementById('consulta-body')) return;

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
    const body   = document.getElementById('consulta-body');

    if (!token) { body.innerHTML = _htmlErro('Link inválido', 'Este link não contém um código de consulta.'); return; }
    if (!inicializarFirebase()) { body.innerHTML = _htmlErro('Erro de conexão', 'Não foi possível conectar ao servidor.'); return; }

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
