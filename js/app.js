/* ============================================================
   ErgoGRO — Controlador Principal v4
   Entidade central: ProjetoLaudo.
   Fluxo: Empresa → Projeto de Laudo → Setores → Funções → Avaliações → Relatório Consolidado.
   ============================================================ */

const App = (() => {

  let _projetoAtual    = null;   /* ProjetoLaudo aberto */
  let _avaliacaoAtual  = null;   /* Avaliação aberta dentro de um projeto */
  let _projetoRascunho = null;   /* Projeto recém-criado aguardando definição de escopo */
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
       Auth.onAuthChange dispara imediatamente se já há sessão ativa. */
    if (typeof Auth !== 'undefined') {
      Auth.onAuthChange(usuario => {
        if (usuario) {
          _onLoginSucesso(usuario);
        } else {
          _mostrarTelaLogin();
        }
      });
    } else {
      /* Auth não disponível — carrega normalmente (modo offline) */
      navegarPara('dashboard');
      _sincronizarCloud();
    }
  }

  /* Chamado quando o usuário faz login com sucesso */
  function _onLoginSucesso(usuario) {
    _ocultarTelaLogin();
    _atualizarHeaderUsuario(usuario);
    navegarPara('dashboard');
    _sincronizarCloud();
  }

  /* Exibe a tela de login e oculta o app */
  function _mostrarTelaLogin() {
    const telaLogin = document.getElementById('tela-login');
    const appContent = document.getElementById('app-content');
    const header = document.getElementById('app-header');
    const nav = document.getElementById('nav-principal');
    if (telaLogin)  telaLogin.classList.remove('oculto');
    if (appContent) appContent.style.display = 'none';
    if (header)     header.style.display = 'none';
    if (nav)        nav.classList.add('oculto');
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

  /* Atualiza avatar e nome no header após login */
  function _atualizarHeaderUsuario(usuario) {
    const divUsuario = document.getElementById('header-usuario');
    const foto = document.getElementById('foto-usuario');
    if (!divUsuario) return;
    if (usuario) {
      divUsuario.classList.remove('oculto');
      if (foto) {
        foto.src   = usuario.photoURL || '';
        foto.alt   = usuario.displayName || 'Usuário';
        foto.title = usuario.displayName || usuario.email || '';
        foto.style.display = usuario.photoURL ? '' : 'none';
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
    else if (tela === 'empresas')   ModuloCadastro.renderizar();
    else if (tela === 'plano-geral')ModuloPlano.renderizarGeral();
    else if (tela === 'relatorios') ModuloRelatorios.renderizar();
    else if (tela === 'projeto')    ModuloProjeto.renderizar(secao || 'visao-geral');
    else if (tela === 'aep')        ModuloAEP.renderizar(secao || 'identificacao');
    else if (tela === 'fp')         ModuloFP.renderizar(secao || 'identificacao');
    else if (tela === 'aet')        ModuloAET.renderizar(secao || 'identificacao');
  }

  /* ── Dashboard — lista de projetos ──────────────────────── */
  function _renderizarDashboard() {
    const container = document.getElementById('tela-dashboard');
    const stats     = Storage.estatisticas();
    const projetos  = Storage.listarProjetos();
    const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };
    const TIPO_LABEL_P = { aep:'AEP', psicossocial:'Psicossocial', aet:'AET', integrado:'Integrado' };

    const listaHTML = projetos.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">📁</div>
           <p><strong>Nenhum projeto de laudo criado.</strong></p>
           <p style="font-size:var(--txt-sm)">Cadastre uma empresa e crie o primeiro projeto.</p>
         </div>`
      : projetos.map(p => {
          const emp = Storage.buscarEmpresa(p.empresaId);
          const avs = Storage.listarPorProjeto(p.id);
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
            </div>
          `;
        }).join('');

    container.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">
        <!-- Hero + stats -->
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
          <div class="card" style="text-align:center;padding:var(--s3);cursor:pointer" onclick="App.navegarPara('empresas')">
            <div style="font-size:22px;font-weight:700;color:var(--primaria)">${stats.empresas}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Empresa(s)</div>
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

        <!-- Novo projeto -->
        <button class="btn-bloco" onclick="App.abrirFormNovoProjeto()" style="margin-bottom:var(--s4)">
          + Novo Projeto de Laudo
        </button>

        <!-- Lista de projetos -->
        <div style="font-weight:600;margin-bottom:var(--s3)">
          Projetos de Laudo (${projetos.length})
        </div>
        ${listaHTML}
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

    /* Preenche o formulário de novo projeto */
    _preencherFormNovoProjeto();
  }

  function _preencherFormNovoProjeto() {
    const empresas = Storage.listarEmpresas();
    const optsEmp  = ['<option value="">Selecione a empresa...</option>']
      .concat(empresas.map(e => `<option value="${e.id}">${e.nome}</option>`))
      .join('');

    const form = document.getElementById('modal-np-form');
    if (!form) return;
    form.innerHTML = `
      <div class="grupo-campo">
        <label>Empresa / Cliente</label>
        <select id="np-empresa">${optsEmp}</select>
        <div class="campo-descricao">Não encontrou? <a href="#" onclick="App.navegarPara('empresas');return false">Cadastre a empresa primeiro</a>.</div>
      </div>
      <div class="grupo-campo">
        <label>Nome do Projeto / Dossiê</label>
        <input type="text" id="np-nome" placeholder="Ex.: AEP 2026 — Engenhalves">
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Tipo</label>
          <select id="np-tipo">
            <option value="aep">📋 AEP</option>
            <option value="psicossocial">🧠 Fatores Psicossociais</option>
            <option value="aet">🔬 AET</option>
            <option value="integrado">📊 Integrado</option>
          </select>
        </div>
        <div class="grupo-campo">
          <label>Data de Início</label>
          <input type="date" id="np-inicio" value="${new Date().toISOString().slice(0,10)}">
        </div>
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

  function abrirFormNovoProjeto() {
    document.getElementById('modal-novo-projeto').classList.remove('oculto');
    _preencherFormNovoProjeto();
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

    if (emProjeto) {
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
        navegarPara('dashboard');
      } else {
        navegarPara('dashboard');
      }
    });
  }

  function _salvarAutomatico() {
    if (_projetoAtual && document.getElementById('proj-nome')) {
      /* Auto-salva visão geral do projeto */
      ModuloProjeto.salvarVisaoGeral();
    }
    if (_avaliacaoAtual) {
      if (document.getElementById('av-data')) {
        ModuloIdentificacao.salvarSilencioso();
      }
      try { Storage.salvar(_avaliacaoAtual); } catch(e) {}
    }
    if (_projetoAtual) {
      try { Storage.salvarProjeto(_projetoAtual); } catch(e) {}
    }
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
    /* Projetos */
    abrirFormNovoProjeto, criarProjeto, abrirProjeto, obterProjetoAtual, confirmarExclusaoProjeto,
    /* Wizard de escopo (passo 2 da criação) */
    _importarSetoresSelecionados, _abrirProjetoEmBranco,
    /* Avaliações */
    abrirAvaliacao, obterAvaliacaoAtual, confirmarExclusao, voltarParaProjeto,
    /* Toast */
    mostrarToast,
    /* Auth */
    confirmarLogout
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
