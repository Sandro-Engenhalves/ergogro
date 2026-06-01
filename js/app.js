/* ============================================================
   ErgoGRO — Controlador Principal v4
   Entidade central: ProjetoLaudo.
   Fluxo: Empresa → Projeto de Laudo → Setores → Funções → Avaliações → Relatório Consolidado.
   ============================================================ */

const App = (() => {

  let _projetoAtual    = null;   /* ProjetoLaudo aberto */
  let _avaliacaoAtual  = null;   /* Avaliação aberta dentro de um projeto */
  let _projetoRascunho = null;   /* Projeto recém-criado aguardando definição de escopo */
  let _empresaAtual    = null;   /* Empresa/cliente em foco (contexto de navegação) */
  let _telaAtual       = 'dashboard';

  const TELAS_PRINCIPAIS = ['dashboard', 'empresas', 'plano-geral', 'relatorios'];
  const TIPO_SHELL  = { aep:'aep', psicossocial:'fp', aet:'aet' };
  const TIPO_LABEL  = { aep:'AEP', psicossocial:'Fat. Psicossociais', aet:'AET' };

  /* ── Inicialização ───────────────────────────────────────── */
  function init() {
    Storage.migrar();
    _configurarNavPrincipal();
    _configurarBotaoVoltar();

    /* Verifica autenticação antes de mostrar o app.
       Auth.onAuthChange(usuario, autorizado) dispara ao detectar sessão. */
    if (typeof Auth !== 'undefined') {
      Auth.onAuthChange((usuario, autorizado) => {
        if (!usuario) {
          _mostrarTelaLogin(false);
        } else if (!autorizado) {
          /* Logado mas não autorizado — mostra mensagem */
          _mostrarTelaLogin(true, usuario.email);
        } else {
          _onLoginSucesso(usuario);
        }
      });
    } else {
      navegarPara('dashboard');
      _sincronizarCloud();
    }
  }

  /* Chamado quando login + autorização OK */
  function _onLoginSucesso(usuario) {
    _ocultarTelaLogin();
    _atualizarHeaderUsuario(usuario);
    navegarPara('dashboard');
    _sincronizarCloud();
  }

  /* Exibe tela de login.
     naoAutorizado=true mostra mensagem de acesso negado.      */
  function _mostrarTelaLogin(naoAutorizado, email) {
    const telaLogin = document.getElementById('tela-login');
    const appContent = document.getElementById('app-content');
    const header = document.getElementById('app-header');
    const nav = document.getElementById('nav-principal');
    const msgNegado = document.getElementById('login-msg-negado');
    const emailNeg  = document.getElementById('login-email-negado');
    if (telaLogin)  telaLogin.classList.remove('oculto');
    if (appContent) appContent.style.display = 'none';
    if (header)     header.style.display = 'none';
    if (nav)        nav.classList.add('oculto');
    if (msgNegado)  msgNegado.style.display = naoAutorizado ? '' : 'none';
    if (emailNeg && email) emailNeg.textContent = email;
  }

  /* Oculta a tela de login e mostra o app */
  function _ocultarTelaLogin() {
    const telaLogin = document.getElementById('tela-login');
    const appContent = document.getElementById('app-content');
    const header = document.getElementById('app-header');
    if (telaLogin)  telaLogin.classList.add('oculto');
    if (appContent) appContent.style.display = '';
    if (header)     header.style.display = '';
  }

  /* Atualiza avatar + botão de usuários no header */
  function _atualizarHeaderUsuario(usuario) {
    const divUsuario  = document.getElementById('header-usuario');
    const foto        = document.getElementById('foto-usuario');
    const btnAdmin    = document.getElementById('btn-admin-usuarios');
    if (!divUsuario) return;
    if (usuario) {
      divUsuario.classList.remove('oculto');
      if (foto) {
        foto.src   = usuario.photoURL || '';
        foto.alt   = usuario.displayName || 'Usuário';
        foto.title = usuario.displayName || usuario.email || '';
        foto.style.display = usuario.photoURL ? '' : 'none';
      }
      /* Botão de gerenciar usuários: visível apenas para admin */
      if (btnAdmin) {
        btnAdmin.style.display = Auth.isAdminAtual() ? '' : 'none';
      }
    } else {
      divUsuario.classList.add('oculto');
    }
  }

  /* Confirma e executa logout */
  function confirmarLogout() {
    if (!confirm('Sair da sua conta?')) return;
    if (typeof Auth !== 'undefined') Auth.logout();
  }

  /* ── Painel de gerenciamento de usuários (admin only) ──── */
  function abrirPainelUsuarios() {
    if (!Auth.isAdminAtual()) return;
    const modal = document.getElementById('modal-usuarios');
    if (modal) {
      modal.classList.remove('oculto');
      _carregarListaUsuarios();
    }
  }

  function fecharPainelUsuarios() {
    document.getElementById('modal-usuarios')?.classList.add('oculto');
  }

  async function _carregarListaUsuarios() {
    const lista = document.getElementById('lista-usuarios');
    if (!lista) return;
    lista.innerHTML = '<p style="color:var(--texto-sec);font-size:var(--txt-sm)">Carregando...</p>';
    try {
      const emails = await Auth.listarEmails();
      lista.innerHTML = emails.map(email => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
          <span style="font-size:var(--txt-sm)">${email}</span>
          ${email !== Auth.getEmail() ? `
            <button class="btn btn-perigo btn-sm"
                    onclick="App.removerUsuario('${email}')">Remover</button>
          ` : '<span style="font-size:var(--txt-xs);color:var(--texto-sec)">você (admin)</span>'}
        </div>
      `).join('') || '<p style="color:var(--texto-sec);font-size:var(--txt-sm)">Nenhum usuário.</p>';
    } catch(e) {
      lista.innerHTML = `<p style="color:var(--perigo);font-size:var(--txt-sm)">${e.message}</p>`;
    }
  }

  async function adicionarUsuario() {
    const input = document.getElementById('input-novo-email');
    const email = input?.value?.trim();
    if (!email) return;
    const btn = document.getElementById('btn-add-usuario');
    if (btn) btn.disabled = true;
    try {
      await Auth.adicionarEmail(email);
      if (input) input.value = '';
      mostrarToast('Usuário adicionado', 'sucesso');
      _carregarListaUsuarios();
    } catch(e) {
      mostrarToast(e.message, 'erro');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function removerUsuario(email) {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    try {
      await Auth.removerEmail(email);
      mostrarToast('Acesso removido', 'sucesso');
      _carregarListaUsuarios();
    } catch(e) {
      mostrarToast(e.message, 'erro');
    }
  }

  function _sincronizarCloud() {
    if (typeof StorageCloud === 'undefined') return;
    if (typeof CLOUD_SYNC_ENABLED !== 'undefined' && !CLOUD_SYNC_ENABLED) return;

    StorageCloud.syncInicial()
      .then(resultado => {
        if (!resultado.ok) return;
        const temNovos = resultado.totalNovos > 0 || resultado.totalAt > 0;
        if (temNovos && _telaAtual === 'dashboard') {
          console.log('[App] Sync trouxe dados novos — atualizando dashboard');
          _renderizarDashboard();
        }
      })
      .catch(err => console.warn('[App] Sync cloud falhou (usando dados locais):', err.message));
  }

  /* ── Roteador central ─────────────────────────────────────── */
  function navegarPara(tela, secao) {
    document.querySelectorAll('.tela').forEach(el => el.classList.remove('ativa'));
    const telEl = document.getElementById(`tela-${tela}`);
    if (!telEl) return;
    telEl.classList.add('ativa');
    _telaAtual = tela;
    window.scrollTo({ top: 0 });

    const ePrincipal = TELAS_PRINCIPAIS.includes(tela);
    _atualizarNav(ePrincipal, tela);
    _atualizarHeader(tela, ePrincipal);

    if      (tela === 'dashboard')  _renderizarDashboard();
    else if (tela === 'empresa')    _renderizarContextoEmpresa();
    else if (tela === 'empresas')   ModuloCadastro.renderizar();
    else if (tela === 'plano-geral')ModuloPlano.renderizarGeral();
    else if (tela === 'relatorios') ModuloRelatorios.renderizar();
    else if (tela === 'projeto')    ModuloProjeto.renderizar(secao || 'visao-geral');
    else if (tela === 'aep')        ModuloAEP.renderizar(secao || 'identificacao');
    else if (tela === 'fp')         ModuloFP.renderizar(secao || 'identificacao');
    else if (tela === 'aet')        ModuloAET.renderizar(secao || 'identificacao');
  }

  /* ── Dashboard — lista de projetos ──────────────────────── */
  const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };
  const TIPO_LABEL_P = {
    aep:          'AEP',
    psicossocial: 'AFP',
    aep_afp:      'AEP + AFP',
    aet:          'AET Completo',
    integrado:    'Integrado',
  };

  function _htmlProjetoItem(lista) {
    if (lista.length === 0) return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p><strong>Nenhum projeto encontrado.</strong></p>
        <p style="font-size:var(--txt-sm)">Tente outros termos ou limpe os filtros.</p>
      </div>`;
    return lista.map(p => {
      const emp       = Storage.buscarEmpresa(p.empresaId);
      const avs       = Storage.listarPorProjeto(p.id);
      const acoesPend = avs.reduce((n, a) => n + (a.planoAcao?.filter(x => x.status==='pendente').length || 0), 0);
      return `
        <div class="item-projeto" onclick="App.abrirProjeto('${p.id}')">
          <div class="item-projeto-icon">📁</div>
          <div class="item-info">
            <div class="item-empresa">${p.nome || 'Projeto sem nome'}</div>
            <div class="item-meta">
              <span class="badge-tipo badge-tipo-${p.tipo==='integrado'?'aep':p.tipo}">${TIPO_LABEL_P[p.tipo]||p.tipo}</span>
              ${emp ? `<span>🏢 ${emp.nome}</span>` : ''}
              ${p.dataInicio ? `<span>${_fd(p.dataInicio)}</span>` : ''}
              <span class="badge ${p.status==='concluido'?'badge-sucesso':'badge-info'}">
                ${p.status==='concluido'?'Concluído':'Em andamento'}
              </span>
              <span style="font-size:var(--txt-xs);color:var(--texto-sec)">
                ${avs.length} av. · ${acoesPend} ações pend.
              </span>
            </div>
          </div>
          <div onclick="event.stopPropagation()">
            <button class="btn-icone" onclick="App.confirmarExclusaoProjeto('${p.id}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  function filtrarProjetos() {
    const busca  = (document.getElementById('dash-busca')?.value  || '').toLowerCase().trim();
    const tipo   =  document.getElementById('dash-tipo')?.value   || '';
    const status =  document.getElementById('dash-status')?.value || '';
    const todos  = Storage.listarProjetos();

    const filtrados = todos.filter(p => {
      if (tipo   && p.tipo !== tipo) return false;
      if (status && (status === 'concluido' ? p.status !== 'concluido' : p.status === 'concluido')) return false;
      if (busca) {
        const emp = Storage.buscarEmpresa(p.empresaId);
        const txt = ((p.nome || '') + ' ' + (emp?.nome || '')).toLowerCase();
        if (!txt.includes(busca)) return false;
      }
      return true;
    });

    const res = document.getElementById('dash-resultado');
    if (res) res.textContent = filtrados.length === todos.length
      ? `Projetos de Laudo (${todos.length})`
      : `${filtrados.length} de ${todos.length} projeto(s)`;

    const lista = document.getElementById('dashboard-lista');
    if (lista) lista.innerHTML = _htmlProjetoItem(filtrados);
  }

  function _htmlCardEmpresaDash(emp) {
    const projetos   = Storage.listarProjetos().filter(p => p.empresaId === emp.id);
    const avs        = projetos.reduce((n, p) => n + Storage.listarPorProjeto(p.id).length, 0);
    const emAndamento = projetos.filter(p => p.status !== 'concluido').length;
    return `
      <div class="item-projeto" onclick="App.abrirEmpresa('${emp.id}')">
        <div class="item-projeto-icon">🏢</div>
        <div class="item-info">
          <div class="item-empresa">${emp.nome}</div>
          <div class="item-meta">
            ${emp.cidade ? `<span>📍 ${emp.cidade}${emp.estado ? '/' + emp.estado : ''}</span>` : ''}
            <span>${projetos.length} projeto(s)</span>
            <span>${avs} avaliação(ões)</span>
            ${emAndamento > 0 ? `<span class="badge badge-info">${emAndamento} em andamento</span>` : ''}
          </div>
        </div>
        <div style="font-size:var(--txt-sm);color:var(--primaria);font-weight:600;white-space:nowrap">Abrir →</div>
      </div>`;
  }

  function _renderizarDashboard() {
    const container = document.getElementById('tela-dashboard');
    const stats     = Storage.estatisticas();

    container.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">
        <!-- Hero -->
        <div style="margin-bottom:var(--s5)">
          <div style="font-size:var(--txt-xl);font-weight:700;margin-bottom:var(--s1)">
            Ergo<span style="color:var(--primaria)">GRO</span>
          </div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            Plataforma de Laudos Técnicos Ergonômicos — NR-17 / GRO-PGR
          </div>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2);margin-bottom:var(--s5)">
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--primaria)">${stats.empresas}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Cliente(s)</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700">${stats.projetos}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Projeto(s)</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--info)">${stats.total}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Avaliações</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3);cursor:pointer" onclick="App.navegarPara('plano-geral')">
            <div style="font-size:22px;font-weight:700;color:var(--aviso)">${stats.acoesPendentes}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Ações Pend.</div>
          </div>
        </div>

        <!-- Acesso rápido -->
        <div style="display:flex;flex-direction:column;gap:var(--s3)">
          <button class="btn-bloco" onclick="App.navegarPara('empresas')">
            👥 Clientes
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)">
            <button class="btn btn-secundario" style="padding:var(--s4);font-size:var(--txt-base)"
                    onclick="App.navegarPara('plano-geral')">
              📌 Plano Geral
            </button>
            <button class="btn btn-secundario" style="padding:var(--s4);font-size:var(--txt-base)"
                    onclick="App.navegarPara('relatorios')">
              📋 Relatórios
            </button>
          </div>
          <button class="btn btn-secundario" style="padding:var(--s4);font-size:var(--txt-base)"
                  onclick="App.abrirModalLinksGrupo()">
            🔗 Links de Grupo (multi-CNPJ)
          </button>
        </div>
      </div>
    `;
  }

  /* ── Contexto de empresa (entre dashboard e projeto) ─────── */
  function abrirEmpresa(empresaId) {
    const emp = Storage.buscarEmpresa(empresaId);
    if (!emp) { mostrarToast('Empresa não encontrada', 'erro'); return; }
    _empresaAtual = emp;
    navegarPara('empresa');
  }

  function _renderizarContextoEmpresa() {
    const el = document.getElementById('tela-empresa');
    if (!el || !_empresaAtual) return;
    const emp     = _empresaAtual;
    const projetos = Storage.listarProjetos().filter(p => p.empresaId === emp.id);
    const avs      = projetos.reduce((n, p) => n + Storage.listarPorProjeto(p.id).length, 0);

    el.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">

        <!-- Info rápida da empresa -->
        <div class="card" style="margin-bottom:var(--s4)">
          ${emp.cnpj ? `<div style="font-size:var(--txt-sm);color:var(--texto-sec)">CNPJ: ${emp.cnpj}</div>` : ''}
          ${emp.cidade ? `<div style="font-size:var(--txt-sm);color:var(--texto-sec)">📍 ${emp.cidade}${emp.estado ? ' / ' + emp.estado : ''}</div>` : ''}
          <div style="display:flex;gap:var(--s4);margin-top:var(--s2)">
            <span style="font-size:var(--txt-sm)"><strong>${projetos.length}</strong> projeto(s)</span>
            <span style="font-size:var(--txt-sm)"><strong>${avs}</strong> avaliação(ões)</span>
          </div>
        </div>

        <!-- Novo projeto -->
        <button class="btn-bloco" onclick="App.abrirFormNovoProjeto('${emp.id}')" style="margin-bottom:var(--s4)">
          + Novo Projeto de Laudo
        </button>

        <!-- Busca rápida dentro da empresa -->
        <input type="search" id="emp-busca"
          placeholder="🔍  Buscar projeto..."
          oninput="App._filtrarProjetosEmpresa()"
          style="width:100%;padding:var(--s3) var(--s4);border-radius:var(--raio);
                 border:1px solid var(--borda);background:var(--superficie-alt);
                 color:var(--texto);font-size:var(--txt-sm);box-sizing:border-box;
                 margin-bottom:var(--s3)">

        <!-- Lista de projetos -->
        <div style="font-weight:600;margin-bottom:var(--s3)">
          Projetos (${projetos.length})
        </div>
        <div id="emp-projetos-lista">
          ${_htmlProjetoItem(projetos)}
        </div>

        <!-- Link para catálogo mestre -->
        <div style="margin-top:var(--s5);padding-top:var(--s4);border-top:1px solid var(--borda)">
          <button class="btn btn-secundario" onclick="App.navegarPara('empresas')">
            📋 Catálogo Mestre e Dados da Empresa
          </button>
        </div>

      </div>

      <!-- Modal: Novo Projeto -->
      <div class="modal-overlay oculto" id="modal-novo-projeto">
        <div class="modal-panel">
          <div class="modal-titulo">
            Novo Projeto de Laudo
            <button class="btn-icone" onclick="document.getElementById('modal-novo-projeto').classList.add('oculto')">✕</button>
          </div>
          <div id="modal-np-form"></div>
        </div>
      </div>
    `;

    _preencherFormNovoProjeto(emp.id);
  }

  function _filtrarProjetosEmpresa() {
    if (!_empresaAtual) return;
    const busca    = (document.getElementById('emp-busca')?.value || '').toLowerCase().trim();
    const projetos = Storage.listarProjetos().filter(p => p.empresaId === _empresaAtual.id);
    const filtrados = busca
      ? projetos.filter(p => (p.nome || '').toLowerCase().includes(busca))
      : projetos;
    const lista = document.getElementById('emp-projetos-lista');
    if (lista) lista.innerHTML = _htmlProjetoItem(filtrados);
  }

  function _preencherFormNovoProjeto(empresaId) {
    const form = document.getElementById('modal-np-form');
    if (!form) return;

    const empFixa = empresaId ? Storage.buscarEmpresa(empresaId) : null;

    /* Campo empresa: bloqueado quando vem do contexto da empresa */
    const empHTML = empFixa
      ? `<div class="grupo-campo">
           <label>Empresa / Cliente</label>
           <input type="text" value="${empFixa.nome}" readonly
                  style="opacity:.75;cursor:default">
           <input type="hidden" id="np-empresa" value="${empFixa.id}">
         </div>`
      : (() => {
          const empresas = Storage.listarEmpresas();
          const opts = ['<option value="">Selecione a empresa...</option>']
            .concat(empresas.map(e => `<option value="${e.id}">${e.nome}</option>`))
            .join('');
          return `<div class="grupo-campo">
            <label>Empresa / Cliente</label>
            <select id="np-empresa">${opts}</select>
            <div class="campo-descricao">Não encontrou? <a href="#" onclick="App.navegarPara('empresas');return false">Cadastre a empresa primeiro</a>.</div>
          </div>`;
        })();

    const tipoOpts = [
      {
        id: 'aep',
        emoji: '📋',
        titulo: 'AEP — Avaliação Ergonômica Preliminar',
        desc: 'Checklist NR-17 · Motor de criticidade automático · Relatório AEP',
      },
      {
        id: 'psicossocial',
        emoji: '🧠',
        titulo: 'AFP — Avaliação de Fatores Psicossociais',
        desc: 'Pesquisa COPSOQ-III anônima com trabalhadores · Relatório AFP consolidado por setor',
      },
      {
        id: 'aep_afp',
        emoji: '📋🧠',
        titulo: 'AEP + AFP — Ergonômico com Pesquisa Psicossocial',
        desc: 'Tudo do AEP + pesquisa COPSOQ-III anônima com trabalhadores · Relatórios AEP e AFP integrados',
      },
      {
        id: 'aet',
        emoji: '📋🧠🔬',
        titulo: 'AET Completo — Análise Ergonômica do Trabalho',
        desc: 'AEP + AFP + AET aprofundada · Indicado quando a AEP aponta necessidade de aprofundamento técnico',
      },
    ];

    form.innerHTML = `
      ${empHTML}
      <div class="grupo-campo">
        <label>Nome do Projeto / Dossiê</label>
        <input type="text" id="np-nome" placeholder="Ex.: AEP 2026 — Engenhalves">
      </div>

      <div class="grupo-campo">
        <label>Tipo de Projeto</label>
        <div style="display:flex;flex-direction:column;gap:var(--s2);margin-top:var(--s2)">
          ${tipoOpts.map((t, i) => `
            <div id="tipo-card-${t.id}"
                 onclick="App._selecionarTipo('${t.id}')"
                 style="padding:var(--s3) var(--s4);border-radius:var(--r3);cursor:pointer;transition:all .15s;
                        ${i === 0
                          ? 'border:2px solid #0D47A1;background:rgba(13,71,161,.07)'
                          : 'border:1px solid var(--borda);background:var(--fundo)'}">
              <div style="font-size:var(--txt-sm);font-weight:700;margin-bottom:4px">
                ${t.emoji} ${t.titulo}
              </div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">${t.desc}</div>
            </div>
          `).join('')}
        </div>
        <input type="hidden" id="np-tipo" value="aep">
      </div>

      <div class="grupo-campo">
        <label>Data de Início</label>
        <input type="date" id="np-inicio" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="grupo-campo">
        <label>Objetivo (opcional)</label>
        <textarea id="np-objetivo" rows="2" placeholder="Objetivo técnico do projeto..."></textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1" onclick="App.criarProjeto()">✅ Criar Projeto</button>
        <button class="btn btn-secundario" onclick="document.getElementById('modal-novo-projeto').classList.add('oculto')">Cancelar</button>
      </div>
    `;
  }

  function _selecionarTipo(tipo) {
    document.getElementById('np-tipo').value = tipo;
    ['aep', 'psicossocial', 'aep_afp', 'aet'].forEach(t => {
      const el = document.getElementById(`tipo-card-${t}`);
      if (!el) return;
      if (t === tipo) {
        el.style.border     = '2px solid #0D47A1';
        el.style.background = 'rgba(13,71,161,.07)';
      } else {
        el.style.border     = '1px solid var(--borda)';
        el.style.background = 'var(--fundo)';
      }
    });
  }

  function abrirFormNovoProjeto(empresaId) {
    const modal = document.getElementById('modal-novo-projeto');
    if (!modal) return;
    modal.classList.remove('oculto');
    _preencherFormNovoProjeto(empresaId || _empresaAtual?.id || '');
  }

  function criarProjeto() {
    const empresaId = document.getElementById('np-empresa')?.value;
    const nome      = document.getElementById('np-nome')?.value?.trim();
    const tipo      = document.getElementById('np-tipo')?.value || 'aep';
    const inicio    = document.getElementById('np-inicio')?.value;
    const objetivo  = document.getElementById('np-objetivo')?.value?.trim();

    if (!empresaId) { mostrarToast('Selecione uma empresa','erro'); return; }
    if (!nome)      { mostrarToast('Informe o nome do projeto','erro'); return; }

    const emp   = Storage.buscarEmpresa(empresaId);
    const proj  = Storage.criarProjeto(empresaId);
    proj.nome                 = nome;
    proj.tipo                 = tipo;
    proj.dataInicio           = inicio || new Date().toISOString().slice(0, 10);
    proj.objetivo             = objetivo || '';
    proj.responsavelTecnico   = emp?.responsavelTecnico   || '';
    proj.registroProfissional = emp?.registroProfissional || '';
    proj.cargoResponsavel     = emp?.cargo                || '';
    Storage.salvarProjeto(proj);
    _projetoRascunho = proj;

    /* Verifica se a empresa tem catálogo mestre para importar */
    const setoresMaster = Storage.listarSetoresMaster(empresaId);
    if (setoresMaster.length === 0) {
      /* Sem catálogo → abre o projeto diretamente */
      document.getElementById('modal-novo-projeto').classList.add('oculto');
      mostrarToast('Projeto criado. Adicione setores na aba Setores.', 'sucesso');
      abrirProjeto(proj.id);
      _projetoRascunho = null;
      return;
    }

    /* Exibe passo 2: definição de escopo */
    _mostrarPassoEscopo(setoresMaster);
  }

  /* Passo 2 do wizard: importar catálogo mestre */
  function _mostrarPassoEscopo(setoresMaster) {
    const form = document.getElementById('modal-np-form');
    if (!form) return;

    const checklistHTML = setoresMaster.map(s => {
      const fns = Storage.listarFuncoesMaster(s.id);
      return `
        <label class="check-item" style="cursor:pointer">
          <input type="checkbox" name="sel-setor-master" value="${s.id}" checked>
          <div class="check-box">✓</div>
          <div>
            <div style="font-weight:600">📍 ${s.nome}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              ${fns.length} função(ões)${fns.length > 0 ? ': '+fns.slice(0,3).map(f=>f.nome).join(', ')+(fns.length>3?'…':'') : ''}
            </div>
          </div>
        </label>
      `;
    }).join('');

    form.innerHTML = `
      <div style="font-size:var(--txt-sm);font-weight:600;color:var(--texto-sec);margin-bottom:var(--s3)">
        Passo 2 de 2 — Definir Escopo do Projeto
      </div>

      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>📋</span>
        <span>A empresa possui <strong>${setoresMaster.length} setor(es)</strong> no catálogo mestre.
        Os setores importados serão <strong>cópias independentes</strong> — alterações no projeto
        não afetam o cadastro mestre.</span>
      </div>

      <div class="grupo-campo">
        <label>Selecionar setores a incluir neste projeto:</label>
        <div style="margin-top:var(--s2)">${checklistHTML}</div>
      </div>

      <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-top:var(--s5)">
        <button class="btn btn-primario" style="flex:1"
                onclick="App._importarSetoresSelecionados()">
          📥 Importar Selecionados
        </button>
        <button class="btn btn-secundario"
                onclick="App._abrirProjetoEmBranco()">
          Começar em Branco
        </button>
      </div>
    `;
  }

  function _importarSetoresSelecionados() {
    if (!_projetoRascunho) return;
    const checkboxes = document.querySelectorAll('input[name="sel-setor-master"]:checked');
    const ids = Array.from(checkboxes).map(c => c.value);
    let importados = 0;
    if (ids.length > 0) {
      importados = Storage.importarDoMestre(_projetoRascunho.id, ids);
    }
    document.getElementById('modal-novo-projeto').classList.add('oculto');
    mostrarToast(`Projeto criado${importados > 0 ? ' com '+importados+' setor(es) importado(s)' : ''}`, 'sucesso');
    abrirProjeto(_projetoRascunho.id);
    _projetoRascunho = null;
  }

  function _abrirProjetoEmBranco() {
    if (!_projetoRascunho) return;
    document.getElementById('modal-novo-projeto').classList.add('oculto');
    mostrarToast('Projeto criado em branco. Adicione setores na aba Setores.', 'sucesso');
    abrirProjeto(_projetoRascunho.id);
    _projetoRascunho = null;
  }

  /* ── Acesso ao projeto ────────────────────────────────────── */
  function abrirProjeto(id) {
    const proj = Storage.buscarProjeto(id);
    if (!proj) { mostrarToast('Projeto não encontrado','erro'); return; }
    _projetoAtual = proj;
    /* Mantém o contexto de empresa para o botão Voltar */
    if (!_empresaAtual || _empresaAtual.id !== proj.empresaId) {
      _empresaAtual = Storage.buscarEmpresa(proj.empresaId) || null;
    }
    navegarPara('projeto', 'visao-geral');
  }

  function obterProjetoAtual() { return _projetoAtual; }

  function confirmarExclusaoProjeto(id) {
    const p   = Storage.buscarProjeto(id);
    const avs = Storage.listarPorProjeto(id).length;
    const msg = `Excluir projeto "${p?.nome}"?${avs > 0 ? ' Inclui '+avs+' avaliação(ões).' : ''} Esta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;
    Storage.excluirProjeto(id);
    mostrarToast('Projeto excluído','sucesso');
    _renderizarDashboard();
  }

  /* ── Acesso à avaliação ───────────────────────────────────── */
  function abrirAvaliacao(id) {
    const av = Storage.buscar(id);
    if (!av) { mostrarToast('Avaliação não encontrada','erro'); return; }
    _avaliacaoAtual = av;
    /* Garante que o projeto esteja carregado */
    if (av.projetoId && (!_projetoAtual || _projetoAtual.id !== av.projetoId)) {
      _projetoAtual = Storage.buscarProjeto(av.projetoId);
    }
    const shell = TIPO_SHELL[av.tipo] || 'aep';
    navegarPara(shell, 'identificacao');
  }

  function obterAvaliacaoAtual() { return _avaliacaoAtual; }

  function confirmarExclusao(id) {
    if (!confirm('Excluir esta avaliação? Esta ação não pode ser desfeita.')) return;
    Storage.excluir(id);
    mostrarToast('Avaliação excluída','sucesso');
    /* Volta para a aba de avaliações do projeto */
    voltarParaProjeto('avaliacoes');
  }

  function voltarParaProjeto(secao) {
    _avaliacaoAtual = null;
    if (_projetoAtual) {
      navegarPara('projeto', secao || 'avaliacoes');
    } else {
      navegarPara('dashboard');
    }
  }

  /* ── Nav principal ────────────────────────────────────────── */
  function _configurarNavPrincipal() {
    document.querySelectorAll('#nav-principal button[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        _salvarAutomatico();
        navegarPara(btn.dataset.nav);
      });
    });
  }

  function _atualizarNav(ePrincipal, telaAtiva) {
    const nav = document.getElementById('nav-principal');
    nav.classList.toggle('oculto', !ePrincipal);
    document.body.classList.toggle('sem-nav', !ePrincipal);
    if (ePrincipal) {
      nav.querySelectorAll('button[data-nav]').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.nav === telaAtiva);
      });
    }
  }

  /* ── Header ─────────────────────────────────────────────── */
  function _atualizarHeader(tela, ePrincipal) {
    const btnVoltar = document.getElementById('btn-voltar');
    const logo      = document.getElementById('logo-header');
    const titulo    = document.getElementById('titulo-header');
    const badge     = document.getElementById('header-badge');

    const emProjeto   = tela === 'projeto';
    const emAvaliacao = ['aep','fp','aet'].includes(tela);

    btnVoltar.classList.toggle('oculto', ePrincipal);
    logo.classList.toggle('oculto', !ePrincipal);

    if (tela === 'empresa') {
      titulo.textContent = _empresaAtual?.nome || 'Empresa';
      badge.innerHTML    = '';
    } else if (emProjeto) {
      const emp = _projetoAtual?.empresaId ? Storage.buscarEmpresa(_projetoAtual.empresaId) : null;
      titulo.textContent = _projetoAtual?.nome || 'Projeto';
      badge.innerHTML    = emp ? `<span style="font-size:var(--txt-xs);color:var(--texto-sec)">${emp.nome.split(' ')[0]}</span>` : '';
    } else if (emAvaliacao) {
      const tipo = _avaliacaoAtual?.tipo || 'aep';
      const f    = _avaliacaoAtual?.funcaoId ? Storage.buscarFuncao(_avaliacaoAtual.funcaoId) : null;
      titulo.textContent = f?.nome || _projetoAtual?.nome || '';
      badge.innerHTML    = `<span class="badge-tipo badge-tipo-${TIPO_SHELL[tipo]||tipo}">${TIPO_LABEL[tipo]}</span>`;
    } else {
      titulo.textContent = '';
      badge.innerHTML    = '';
    }
  }

  /* ── Botão voltar ─────────────────────────────────────────── */
  function _configurarBotaoVoltar() {
    document.getElementById('btn-voltar').addEventListener('click', () => {
      _salvarAutomatico();
      if (['aep','fp','aet'].includes(_telaAtual)) {
        voltarParaProjeto('avaliacoes');
      } else if (_telaAtual === 'projeto') {
        _avaliacaoAtual = null;
        _projetoAtual   = null;
        navegarPara(_empresaAtual ? 'empresa' : 'dashboard');
      } else if (_telaAtual === 'empresa') {
        _empresaAtual = null;
        navegarPara('dashboard');
      } else {
        navegarPara('dashboard');
      }
    });
  }

  function _salvarAutomatico() {
    if (_projetoAtual && document.getElementById('proj-nome')) {
      ModuloProjeto.salvarVisaoGeral();
    }
    if (_avaliacaoAtual) {
      if (_telaAtual === 'aep' && typeof ModuloAEP !== 'undefined') {
        try { ModuloAEP.salvarSecaoAtual(); } catch(e) {}
      } else if (document.getElementById('av-data')) {
        ModuloIdentificacao.salvarSilencioso();
      }
      try { Storage.salvar(_avaliacaoAtual); } catch(e) {}
    }
    if (_projetoAtual) {
      try { Storage.salvarProjeto(_projetoAtual); } catch(e) {}
    }
  }

  /* ── Modal Links de Grupo (multi-CNPJ) ─────────────────────── */

  function abrirModalLinksGrupo() {
    document.getElementById('modal-links-grupo')?.remove();

    const projetos = Storage.listarProjetos();
    if (!projetos.length) {
      mostrarToast('Nenhum projeto cadastrado', 'aviso');
      return;
    }

    /* Agrupa projetos por empresa */
    const porEmpresa = {};
    projetos.forEach(p => {
      if (!porEmpresa[p.empresaId]) {
        porEmpresa[p.empresaId] = { emp: Storage.buscarEmpresa(p.empresaId), lista: [] };
      }
      porEmpresa[p.empresaId].lista.push(p);
    });

    const empresasHTML = Object.values(porEmpresa).map(({ emp, lista }) => `
      <div style="margin-bottom:var(--s4)">
        <div style="font-size:var(--txt-xs);font-weight:700;color:var(--texto-sec);
                    margin-bottom:var(--s2);letter-spacing:.04em">
          ${emp?.nome || 'Empresa'}
          ${emp?.cnpj ? `<span style="font-weight:400;opacity:.7"> — ${emp.cnpj}</span>` : ''}
        </div>
        ${lista.map(p => {
          const avs = Storage.listarPorProjeto(p.id).length;
          return `
            <label style="display:flex;align-items:center;gap:var(--s2);padding:var(--s2) var(--s3);
                          cursor:pointer;border-radius:var(--r2);
                          border:1px solid var(--borda);margin-bottom:var(--s1);
                          background:var(--fundo)">
              <input type="checkbox" class="grupo-proj-check" value="${p.id}"
                     style="flex-shrink:0;width:16px;height:16px;cursor:pointer">
              <span style="flex:1">
                <span style="font-size:var(--txt-sm)">${p.nome || 'Projeto'}</span>
                <span style="font-size:var(--txt-xs);color:var(--texto-sec);margin-left:var(--s2)">
                  ${avs} av.
                </span>
              </span>
            </label>
          `;
        }).join('')}
      </div>
    `).join('');

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-links-grupo" style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;
        display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--fundo-card);border:1px solid var(--borda);border-radius:var(--r3);
                    max-width:480px;width:100%;padding:24px;max-height:92vh;
                    display:flex;flex-direction:column;gap:var(--s3)">

          <div style="font-size:var(--txt-base);font-weight:700">
            🔗 Gerar Links de Grupo
          </div>
          <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
            Selecione os projetos e o perfil. Será gerado <strong>um único link</strong>
            que cobre todas as empresas selecionadas.
          </div>

          <!-- Seleção de perfil -->
          <div>
            <div style="font-size:var(--txt-xs);font-weight:600;color:var(--texto-sec);
                        margin-bottom:var(--s2)">PERFIL DO RESPONDENTE:</div>
            <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
              ${[['rh','🧑‍💼 RH'],['tecnico','⚙️ Técnico/SESMT'],['lider','👷 Líder de Setor']].map(([val, label]) => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
                              padding:var(--s2) var(--s3);border-radius:var(--r2);
                              border:2px solid var(--borda);font-size:var(--txt-sm);font-weight:600;
                              background:var(--fundo)">
                  <input type="radio" name="grupo-perfil" value="${val}"
                         ${val === 'rh' ? 'checked' : ''}
                         style="flex-shrink:0">
                  ${label}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Botão selecionar todos -->
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-fantasma btn-sm" onclick="App._toggleTodosProjetos()">
              ☑️ Selecionar / limpar todos
            </button>
          </div>

          <!-- Lista de projetos com scroll -->
          <div style="overflow-y:auto;flex:1;min-height:100px;max-height:300px;
                      border:1px solid var(--borda);border-radius:var(--r2);
                      padding:var(--s3)">
            ${empresasHTML}
          </div>

          <!-- Botões de ação -->
          <div style="display:flex;gap:var(--s3)">
            <button class="btn btn-primario" style="flex:1"
                    onclick="App.gerarLinksGrupo()">
              🔗 Gerar Link
            </button>
            <button class="btn btn-secundario"
                    onclick="document.getElementById('modal-links-grupo').remove()">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `);
  }

  function _toggleTodosProjetos() {
    const checks = document.querySelectorAll('.grupo-proj-check');
    const algumMarcado = Array.from(checks).some(c => c.checked);
    checks.forEach(c => { c.checked = !algumMarcado; });
  }

  async function gerarLinksGrupo() {
    const checks  = document.querySelectorAll('.grupo-proj-check:checked');
    const ids     = Array.from(checks).map(c => c.value);
    const perfil  = document.querySelector('input[name="grupo-perfil"]:checked')?.value || 'rh';

    if (!ids.length) {
      mostrarToast('Selecione ao menos um projeto', 'aviso');
      return;
    }

    document.getElementById('modal-links-grupo')?.remove();
    await ConsultaAEP.abrirConsultaGrupo(perfil, ids);
  }

  /* ── Toast ─────────────────────────────────────────────────── */
  let _toastTimer = null;
  function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.className   = `visivel ${tipo}`;
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { toast.className = ''; }, 2800);
  }

  return {
    init, navegarPara,
    /* Empresas / clientes */
    abrirEmpresa, _filtrarProjetosEmpresa, _selecionarTipo,
    /* Projetos */
    abrirFormNovoProjeto, criarProjeto, abrirProjeto, obterProjetoAtual, confirmarExclusaoProjeto, filtrarProjetos,
    /* Wizard de escopo (passo 2 da criação) */
    _importarSetoresSelecionados, _abrirProjetoEmBranco,
    /* Avaliações */
    abrirAvaliacao, obterAvaliacaoAtual, confirmarExclusao, voltarParaProjeto,
    /* Toast */
    mostrarToast,
    /* Links de Grupo */
    abrirModalLinksGrupo, _toggleTodosProjetos, gerarLinksGrupo,
    /* Auth */
    confirmarLogout,
    /* Admin — gerenciamento de usuários */
    abrirPainelUsuarios, fecharPainelUsuarios, adicionarUsuario, removerUsuario
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
