/* ============================================================
   ErgoGRO — Consulta AEP por Link
   ─────────────────────────────────────────────────────────
   Dois contextos de uso no mesmo arquivo:

   1. index.html (ergonomista)
      → ConsultaAEP.abrirConsulta(perfil)  — gera link Firestore
      → ConsultaAEP.importarRespostas()    — importa ao checklist

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

/* ── Gera token único ─────────────────────────────────────── */
function _gerarToken() {
  return 'cons_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/* ── Url base detectada em runtime ───────────────────────── */
function _urlBase() {
  const path = window.location.pathname.replace(/\/?(index|consulta)\.html$/, '/');
  return window.location.origin + path;
}

/* ══════════════════════════════════════════════════════════
   MODO ERGONOMISTA — usado em index.html
══════════════════════════════════════════════════════════ */
const ConsultaAEP = (() => {

  /* ── Cria documento Firestore e retorna o link ──────────── */
  async function _criarConsulta(perfil) {
    if (!inicializarFirebase()) throw new Error('Firebase não configurado');

    const av     = App.obterAvaliacaoAtual();
    if (!av) throw new Error('Nenhuma avaliação carregada');

    const proj   = av.projetoId  ? Storage.buscarProjeto(av.projetoId)  : null;
    const emp    = proj           ? Storage.buscarEmpresa(proj.empresaId) : null;
    const setor  = av.setorId    ? Storage.buscarSetor(av.setorId)      : null;
    const funcao = av.funcaoId   ? Storage.buscarFuncao(av.funcaoId)    : null;

    /* Monta lista de itens deste perfil, respeitando a ordem dos blocos */
    const idsAlvo = new Set(_PERFIL_ITENS[perfil] || []);
    const itens   = [];
    ModuloAEP.ORDEM_BLOCOS.forEach(blocoKey => {
      const bloco = ModuloAEP.BLOCOS[blocoKey];
      bloco.itens.forEach(item => {
        if (idsAlvo.has(item.id)) {
          itens.push({
            id: item.id, bloco: blocoKey,
            blocoTitulo: bloco.titulo, blocoIcone: bloco.icone,
            texto: item.texto,
          });
        }
      });
    });

    const token = _gerarToken();
    await firebase.firestore().collection(_COL_CONSULTAS).doc(token).set({
      token,
      avaliacaoId:  av.id,
      projetoId:    av.projetoId || '',
      perfil,
      perfilLabel:  _PERFIL_LABEL[perfil],
      empresaNome:  emp?.nome    || av.empresa?.nome || '',
      setorNome:    setor?.nome  || av.setor  || '',
      funcaoNome:   funcao?.nome || av.funcao || '',
      itens,
      status:       'pendente',
      criadaEm:     new Date().toISOString(),
      respondidaEm: null,
      respondidoPor: null,
      respostas:    {},
    });

    return `${_urlBase()}consulta.html?token=${token}`;
  }

  /* ── Botão enviar — abre modal com link ─────────────────── */
  async function abrirConsulta(perfil) {
    const btnId = `btn-consulta-${perfil}`;
    const btn   = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
      const link = await _criarConsulta(perfil);
      _mostrarModalLink(perfil, link);
    } catch (err) {
      App.mostrarToast('Erro ao gerar consulta: ' + err.message, 'erro');
    } finally {
      if (btn) {
        btn.disabled   = false;
        btn.textContent = `${_PERFIL_ICONE[perfil]} ${_PERFIL_LABEL[perfil]}`;
      }
    }
  }

  /* ── Importa respostas do Firestore para o checklist ──────── */
  async function importarRespostas() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!inicializarFirebase()) { App.mostrarToast('Firebase não configurado', 'erro'); return; }

    const btn = document.getElementById('btn-importar-consulta');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Verificando…'; }

    try {
      const snap = await firebase.firestore().collection(_COL_CONSULTAS)
        .where('avaliacaoId', '==', av.id)
        .where('status', '==', 'respondida')
        .get();

      if (snap.empty) {
        App.mostrarToast('Nenhuma resposta recebida ainda', 'info');
        return;
      }

      let totalImportados = 0;
      snap.forEach(docSnap => {
        const consulta = docSnap.data();
        Object.entries(consulta.respostas || {}).forEach(([itemId, resp]) => {
          const blocoKey = _getBlocoDeItem(itemId);
          if (!blocoKey) return;
          if (!av.aep)              av.aep = {};
          if (!av.aep[blocoKey])    av.aep[blocoKey] = {};
          const anterior = av.aep[blocoKey][itemId] || {};
          /* Só importa se ainda não respondido manualmente */
          if (!anterior.resposta) {
            av.aep[blocoKey][itemId] = {
              resposta:    resp.resposta,
              observacao:  resp.observacao || '',
              importadaDe: consulta.perfilLabel,
            };
            totalImportados++;
          }
        });
      });

      Storage.salvar(av);
      App.mostrarToast(`${totalImportados} respostas importadas — ${snap.size} consulta(s) processada(s)`, 'sucesso');
      ModuloAEP.trocarSecao('checklist');

    } catch (err) {
      App.mostrarToast('Erro ao importar: ' + err.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Importar Respostas'; }
    }
  }

  /* ── Verifica quantas consultas foram respondidas ──────── */
  async function verificarStatus() {
    const av = App.obterAvaliacaoAtual();
    if (!av || !inicializarFirebase()) return;

    try {
      const snap = await firebase.firestore().collection(_COL_CONSULTAS)
        .where('avaliacaoId', '==', av.id)
        .get();

      if (snap.empty) return;

      let pendentes = 0, respondidas = 0;
      snap.forEach(d => {
        const s = d.data().status;
        if (s === 'pendente') pendentes++;
        else respondidas++;
      });

      const badge = document.getElementById('consulta-status-badge');
      if (badge) {
        badge.textContent = respondidas
          ? `${respondidas} respondida(s) — clique em Importar`
          : `${pendentes} aguardando resposta`;
        badge.style.color = respondidas ? '#4caf50' : 'var(--texto-sec)';
      }
    } catch (e) { /* silencioso */ }
  }

  function _getBlocoDeItem(itemId) {
    for (const [blocoKey, bloco] of Object.entries(ModuloAEP.BLOCOS)) {
      if (bloco.itens.some(i => i.id === itemId)) return blocoKey;
    }
    return null;
  }

  /* ── Modal com link + copiar + WhatsApp ─────────────────── */
  function _mostrarModalLink(perfil, link) {
    document.getElementById('modal-consulta-aep')?.remove();
    const label  = _PERFIL_LABEL[perfil];
    const waMsg  = encodeURIComponent(`Olá! Preciso da sua colaboração para a Avaliação Ergonômica do posto de trabalho.\nPor favor, responda as perguntas abaixo — leva menos de 5 minutos:\n${link}`);
    const waLink = `https://wa.me/?text=${waMsg}`;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-consulta-aep" style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;
        display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--fundo-card);border:1px solid var(--borda);border-radius:var(--r3);
                    max-width:480px;width:100%;padding:24px">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:8px">
            📨 Consulta gerada — ${label}
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:16px">
            Envie o link para o responsável. Ele responde pelo celular, sem precisar de login.
            Quando ele terminar, clique em <strong>Importar Respostas</strong> no checklist.
          </p>
          <div style="background:var(--fundo);border:1px solid var(--borda);border-radius:var(--r2);
                      padding:10px 12px;font-size:11px;font-family:monospace;
                      word-break:break-all;margin-bottom:16px;color:var(--texto-sec);
                      user-select:all">
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

      body.innerHTML = _htmlFormulario(consulta);

      document.getElementById('form-consulta').addEventListener('submit', e => {
        e.preventDefault();
        _submeter(token, consulta);
      });

    } catch (err) {
      body.innerHTML = _htmlErro('Erro ao carregar', err.message);
    }
  }

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
        resposta:    val,
        observacao:  document.getElementById(`obs_${item.id}`)?.value?.trim() || '',
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
          <strong>${c.itens.length} itens</strong> a responder &nbsp;·&nbsp;
          Tempo estimado: <strong>${Math.ceil(c.itens.length * 0.5)} min</strong>
        </div>
      </div>

      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Responda com base na realidade do posto de trabalho. Em caso de dúvida, use <strong>N/A</strong> e adicione uma observação.</span>
      </div>

      <form id="form-consulta">
        ${itensHTML}

        <div class="card">
          <div class="grupo-campo" style="margin:0">
            <label for="consulta-nome">Seu nome <span style="color:var(--texto-sec);font-weight:400">(opcional)</span></label>
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
          ${c.respondidaEm ? ` em ${new Date(c.respondidaEm).toLocaleDateString('pt-BR')}` : ''}.
          <br>Obrigado pela colaboração!
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
