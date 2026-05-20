/* ============================================================
   ErgoGRO — Módulo Admin: Pesquisa Psicossocial
   Gerencia campanhas de pesquisa dentro de um ProjetoLaudo.

   Seções:
   - campanhas   : lista de campanhas do projeto
   - criar       : formulário de nova campanha
   - participantes: importar lista de CPFs
   - monitor     : progresso em tempo real
   - relatorio   : relatório anônimo consolidado + por setor
   ============================================================ */

const ModuloPesquisaAdmin = (() => {

  let _secaoAtual      = 'campanhas';
  let _campanhaAberta  = null; /* campanha selecionada */
  let _monitorUnsubscribe = null;

  const SECOES = [
    { id: 'campanhas',     icone: '📋', label: 'Campanhas'    },
    { id: 'criar',         icone: '➕', label: 'Nova'         },
    { id: 'participantes', icone: '👥', label: 'Participantes' },
    { id: 'monitor',       icone: '📊', label: 'Progresso'    },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'    },
  ];

  const NIVEL_L = {
    favoravel:     { t: 'Favorável',     cls: 'badge-sucesso', barra: '#3fb950' },
    intermediario: { t: 'Intermediário', cls: 'badge-aviso',   barra: '#d29922' },
    desfavoravel:  { t: 'Desfavorável',  cls: 'badge-alto',    barra: '#f85149' },
    sem_dados:     { t: 'Sem dados',     cls: 'badge-na',      barra: '#8b949e' },
  };

  /* ── Banco de contextos de avaliação ─────────────────────── */
  const CONTEXTOS = [
    { id: 'legal',      texto: 'Cumprimento de requisito legal (NR-01 / NR-17 / PGR)' },
    { id: 'cipa',       texto: 'Demanda dos trabalhadores ou CIPA' },
    { id: 'gestao',     texto: 'Demanda da gestão / RH' },
    { id: 'renovacao',  texto: 'Renovação periódica (avaliação anterior)' },
    { id: 'acidente',   texto: 'Ocorrência de acidente ou incidente de trabalho' },
    { id: 'outro',      texto: 'Outro motivo' },
  ];

  /* ── Banco de recomendações por dimensão COPSOQ-III ─────── */
  const RECOMENDACOES = {
    demandas: [
      { id: 'r01', texto: 'Revisar o dimensionamento do quadro de pessoal e a distribuição de tarefas' },
      { id: 'r02', texto: 'Estabelecer pausas programadas e regulares durante a jornada de trabalho' },
      { id: 'r03', texto: 'Implementar gestão participativa da carga de trabalho por setor' },
      { id: 'r04', texto: 'Revisar metas, prazos e ritmo de produção com a equipe' },
    ],
    organizacao: [
      { id: 'r05', texto: 'Ampliar a autonomia dos trabalhadores na execução das atividades' },
      { id: 'r06', texto: 'Implementar reuniões periódicas de alinhamento e participação' },
      { id: 'r07', texto: 'Promover o significado e propósito das atividades realizadas' },
      { id: 'r08', texto: 'Melhorar a comunicação antecipada sobre mudanças organizacionais' },
    ],
    relacoes: [
      { id: 'r09', texto: 'Capacitar líderes em gestão humanizada e comunicação assertiva' },
      { id: 'r10', texto: 'Implementar programa de feedback regular entre chefia e equipe' },
      { id: 'r11', texto: 'Desenvolver ações de integração e melhoria do clima organizacional' },
      { id: 'r12', texto: 'Estabelecer política clara de resolução de conflitos interpessoais' },
    ],
    interface: [
      { id: 'r13', texto: 'Fortalecer a comunicação sobre estabilidade e segurança no emprego' },
      { id: 'r14', texto: 'Implementar ações de conciliação entre trabalho e vida pessoal/familiar' },
      { id: 'r15', texto: 'Revisar a jornada de trabalho e o volume de horas extras' },
    ],
    valores: [
      { id: 'r16', texto: 'Implementar política de transparência nas comunicações organizacionais' },
      { id: 'r17', texto: 'Estabelecer programa de reconhecimento e valorização dos trabalhadores' },
      { id: 'r18', texto: 'Revisar práticas de equidade, justiça e respeito no ambiente de trabalho' },
    ],
    saude: [
      { id: 'r19', texto: 'Implementar programa de promoção da saúde e bem-estar dos trabalhadores' },
      { id: 'r20', texto: 'Avaliar e melhorar as condições ergonômicas dos postos de trabalho' },
      { id: 'r21', texto: 'Oferecer suporte em saúde ocupacional e encaminhar casos identificados' },
      { id: 'r22', texto: 'Promover ações de prevenção ao esgotamento (burnout) e estresse ocupacional' },
    ],
  };

  const _fd = iso => {
    if (!iso) return '';
    try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; }
    catch { return iso; }
  };

  /* ── Renderiza o módulo de pesquisas ─────────────────────── */
  function renderizar() {
    _secaoAtual = 'campanhas';
    const el = document.getElementById('projeto-conteudo');
    if (!el) return;

    /* Verifica se Firebase está configurado */
    if (!firebaseConfigurado()) {
      el.innerHTML = _htmlFirebaseNaoConfigurado();
      return;
    }

    _renderizarShell();
    _renderizarConteudo('campanhas');
  }

  function _renderizarShell() {
    const el = document.getElementById('projeto-conteudo');
    const abasHTML = SECOES.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-sec-ps="${s.id}"
              onclick="ModuloPesquisaAdmin.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');

    el.innerHTML = `
      <nav class="subnav-abas" id="subnav-pesquisa" style="overflow-x:auto;-webkit-overflow-scrolling:touch">${abasHTML}</nav>
      <div id="ps-admin-conteudo"></div>
    `;
  }

  function trocarSecao(secao) {
    if (_monitorUnsubscribe) { _monitorUnsubscribe(); _monitorUnsubscribe = null; }
    _secaoAtual = secao;
    document.querySelectorAll('#subnav-pesquisa [data-sec-ps]').forEach(b => {
      b.classList.toggle('ativa', b.dataset.secPs === secao);
    });
    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('ps-admin-conteudo');
    if (!el) return;
    if      (secao === 'campanhas')     _listarCampanhas(el);
    else if (secao === 'criar')         el.innerHTML = _htmlFormCriar();
    else if (secao === 'participantes') {
      el.innerHTML = _campanhaAberta ? _htmlParticipantes() : _htmlSelecioneCampanha();
      /* Gera QR automaticamente se campanha já tem link disponível */
      if (_campanhaAberta?.id) setTimeout(_gerarQRCode, 50);
    }
    else if (secao === 'monitor')       _campanhaAberta ? _iniciarMonitor(el) : (el.innerHTML = _htmlSelecioneCampanha());
    else if (secao === 'relatorio')     _campanhaAberta ? _gerarRelatorio(el) : (el.innerHTML = _htmlSelecioneCampanha());
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: LISTA DE CAMPANHAS
  ══════════════════════════════════════════════════════════ */

  async function _listarCampanhas(el) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;

    el.innerHTML = '<div class="container"><div class="loading-inline">Carregando campanhas...</div></div>';

    try {
      const campanhas = await listarCampanhas(proj.id);

      const STATUS_L = { ativa: '🟢 Ativa', encerrada: '🔴 Encerrada', rascunho: '⚫ Rascunho' };

      const listaHTML = campanhas.length === 0
        ? `<div class="empty-state">
             <div class="empty-icon">📋</div>
             <p><strong>Nenhuma campanha criada.</strong></p>
             <p style="font-size:var(--txt-sm)">Crie a primeira campanha de pesquisa psicossocial para este projeto.</p>
           </div>`
        : campanhas.map(c => `
            <div class="item-projeto" style="cursor:pointer" onclick="ModuloPesquisaAdmin.abrirCampanha('${c.id}')">
              <div class="item-projeto-icon">📋</div>
              <div class="item-info">
                <div class="item-empresa">${c.nome}</div>
                <div class="item-meta">
                  <span>${STATUS_L[c.status] || c.status}</span>
                  ${c.prazo ? `<span>Prazo: ${_fd(c.prazo)}</span>` : ''}
                  <span>${c.totalRespostas || 0} resposta(s)</span>
                  ${c.totalAutorizados ? `<span>${c.totalAutorizados} autorizado(s)</span>` : ''}
                </div>
              </div>
              <div onclick="event.stopPropagation()">
                ${c.status === 'ativa'
                  ? `<button class="btn-icone" title="Encerrar" onclick="ModuloPesquisaAdmin.confirmarEncerramento('${c.id}')">🔒</button>`
                  : `<button class="btn-icone" title="Reativar" onclick="ModuloPesquisaAdmin.confirmarReativacao('${c.id}')">🔓</button>`}
              </div>
            </div>
          `).join('');

      el.innerHTML = `
        <div class="container">
          <div class="aviso-tecnico info" style="margin-top:var(--s4)">
            <span>ℹ️</span>
            <span>Esta pesquisa é apresentada aos trabalhadores como <strong>"Consulta sobre organização do trabalho e fatores psicossociais"</strong> — nunca como avaliação de saúde mental.</span>
          </div>

          <button class="btn-bloco" style="margin:var(--s4) 0" onclick="ModuloPesquisaAdmin.trocarSecao('criar')">
            + Nova Campanha de Pesquisa
          </button>

          <div style="font-weight:600;margin-bottom:var(--s3)">Campanhas (${campanhas.length})</div>
          ${listaHTML}
          <div style="height:var(--s6)"></div>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<div class="container"><div class="aviso-tecnico aviso" style="margin-top:var(--s4)"><span>⚠️</span><span>Erro ao carregar campanhas: ${e.message}</span></div></div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: CRIAR CAMPANHA
  ══════════════════════════════════════════════════════════ */

  function _htmlFormCriar() {
    const proj = App.obterProjetoAtual();
    const emp  = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
    const hoje = new Date().toISOString().slice(0, 10);
    const daqui30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

    return `
      <div class="container">
        <div style="font-size:var(--txt-xl);font-weight:700;margin:var(--s4) 0 var(--s5)">
          Nova Campanha de Pesquisa
        </div>

        <div class="card">
          <div class="grupo-campo">
            <label for="ps-nome-camp">Nome da Campanha</label>
            <input type="text" id="ps-nome-camp"
              placeholder="Ex.: Pesquisa Psicossocial 2026 — ${emp?.nome || 'Empresa'}"
              value="Pesquisa Psicossocial 2026${emp ? ' — ' + emp.nome : ''}">
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="ps-prazo">Prazo para Resposta</label>
              <input type="date" id="ps-prazo" value="${daqui30}" min="${hoje}">
            </div>
            <div class="grupo-campo">
              <label for="ps-min-setor">Mín. respostas por setor</label>
              <input type="number" id="ps-min-setor" value="5" min="3" max="20">
              <div class="campo-descricao">Setores com menos respostas não aparecem individualmente (LGPD).</div>
            </div>
          </div>

          <div class="grupo-campo">
            <label for="ps-descricao">Descrição / Contexto (opcional)</label>
            <textarea id="ps-descricao" rows="2"
              placeholder="Contexto da avaliação para o relatório técnico..."></textarea>
          </div>
        </div>

        <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
          <span>📊</span>
          <span>A campanha usará o banco padrão de <strong>${PerguntasPsicossociais.totalPerguntas()} perguntas</strong>
          em <strong>${PerguntasPsicossociais.DIMENSOES.length} dimensões</strong> (NR-01/NR-17).</span>
        </div>

        <button class="btn-bloco" onclick="ModuloPesquisaAdmin.salvarCampanha()">
          ✅ Criar Campanha
        </button>
        <div style="height:var(--s6)"></div>
      </div>
    `;
  }

  async function salvarCampanha() {
    const proj = App.obterProjetoAtual();
    const emp  = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
    if (!proj) return;

    const nome    = document.getElementById('ps-nome-camp')?.value?.trim();
    const prazo   = document.getElementById('ps-prazo')?.value;
    const minSet  = parseInt(document.getElementById('ps-min-setor')?.value || '5');
    const desc    = document.getElementById('ps-descricao')?.value?.trim();

    if (!nome) { App.mostrarToast('Informe o nome da campanha', 'erro'); return; }

    try {
      const id = await criarCampanha({
        projetoId:        proj.id,
        empresaId:        proj.empresaId,
        empresaNome:      emp?.nome || '',
        nome,
        prazo:            prazo || '',
        descricao:        desc || '',
        minRespostasSetor: minSet,
      });

      App.mostrarToast('Campanha criada! Agora importe a lista de CPFs.', 'sucesso');
      _campanhaAberta = { id, nome, projetoId: proj.id, status: 'ativa', totalRespostas: 0, minRespostasSetor: minSet };
      trocarSecao('participantes');
    } catch (e) {
      App.mostrarToast('Erro ao criar campanha: ' + e.message, 'erro');
    }
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: PARTICIPANTES (importar CPFs)
  ══════════════════════════════════════════════════════════ */

  function _htmlParticipantes() {
    const c = _campanhaAberta;
    return `
      <div class="container">
        <div style="font-size:var(--txt-md);font-weight:700;margin:var(--s4) 0 var(--s2)">
          👥 Participantes — ${c?.nome || 'Campanha'}
        </div>

        ${c?.totalAutorizados ? `
          <div class="aviso-box" style="background:var(--superficie);border-color:var(--sucesso);margin-bottom:var(--s4)">
            <span>✅</span>
            <span><strong>${c.totalAutorizados}</strong> CPFs já importados.</span>
          </div>
        ` : ''}

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s3)">Importar lista de CPFs</div>

          <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
            <span>ℹ️</span>
            <span>
              Cole abaixo um CPF por linha. Formato aceito:<br>
              <code style="font-size:var(--txt-xs)">CPF</code> ou <code style="font-size:var(--txt-xs)">CPF;SETOR</code><br>
              Exemplo: <code style="font-size:var(--txt-xs)">12345678901;Produção</code><br>
              Os CPFs são convertidos em código anônimo antes de salvar (LGPD).
            </span>
          </div>

          <div class="grupo-campo">
            <label for="ps-lista-cpf">Lista de CPFs</label>
            <textarea id="ps-lista-cpf" rows="10"
              placeholder="12345678901;Produção&#10;98765432100;Logística&#10;11122233344;Administrativo&#10;..."
              style="font-family:monospace;font-size:13px"></textarea>
          </div>

          <button class="btn btn-primario" style="width:100%" onclick="ModuloPesquisaAdmin.executarImportacaoCPFs()">
            📥 Importar e anonimizar CPFs
          </button>
        </div>

        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">Link da Pesquisa</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Compartilhe este link com os trabalhadores. Eles acessam pelo próprio celular.
          </p>
          ${_htmlLinkCampanha()}
        </div>

        <div style="height:var(--s6)"></div>
      </div>
    `;
  }

  function _htmlLinkCampanha() {
    const c   = _campanhaAberta;
    if (!c?.id) return '';

    /* URL base configurável — padrão: mesma origem do app */
    const base = window.PS_BASE_URL || window.location.origin + window.location.pathname.replace('index.html', '');
    const url  = `${base}pesquisa.html?c=${c.id}`;
    const urlEnc = encodeURIComponent(url);

    return `
      <div class="grupo-campo">
        <input type="text" id="ps-link-url" value="${url}" readonly
          style="font-size:12px;background:var(--superficie-alt)">
        <button class="btn btn-secundario" style="margin-top:var(--s2)" onclick="ModuloPesquisaAdmin.copiarLink()">
          📋 Copiar link
        </button>
      </div>

      <!-- QR Code -->
      <div style="margin-top:var(--s4);text-align:center">
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">QR Code para compartilhar:</div>
        <canvas id="ps-qrcode-canvas" style="border-radius:8px;background:#fff;padding:8px"></canvas>
        <div style="margin-top:var(--s2)">
          <button class="btn btn-secundario" onclick="ModuloPesquisaAdmin.baixarQR()">
            ⬇️ Salvar QR Code
          </button>
        </div>
      </div>
    `;
  }

  async function executarImportacaoCPFs() {
    if (!_campanhaAberta?.id) { App.mostrarToast('Selecione uma campanha', 'erro'); return; }

    const textarea = document.getElementById('ps-lista-cpf');
    if (!textarea?.value?.trim()) { App.mostrarToast('Cole a lista de CPFs', 'erro'); return; }

    const linhas = textarea.value.split('\n').filter(l => l.trim());
    const btn    = document.querySelector('#ps-admin-conteudo .btn.btn-primario');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Processando...'; }

    try {
      /* Chama a função global do firebase-pesquisa.js */
      const resultado = await importarCPFs(_campanhaAberta.id, linhas);
      _campanhaAberta.totalAutorizados = resultado.importados;

      App.mostrarToast(
        `${resultado.importados} CPF(s) importados.${resultado.erros.length ? ' ' + resultado.erros.length + ' inválido(s) ignorados.' : ''}`,
        'sucesso'
      );

      /* Re-renderiza a seção para mostrar o link / QR */
      const el = document.getElementById('ps-admin-conteudo');
      if (el) el.innerHTML = _htmlParticipantes();
      _gerarQRCode();
    } catch (e) {
      App.mostrarToast('Erro: ' + e.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Importar e anonimizar CPFs'; }
    }
  }

  function _gerarQRCode() {
    const canvas = document.getElementById('ps-qrcode-canvas');
    if (!canvas || !_campanhaAberta?.id) return;

    const base = window.PS_BASE_URL || window.location.origin + window.location.pathname.replace('index.html', '');
    const url  = `${base}pesquisa.html?c=${_campanhaAberta.id}`;

    /* Usa a API pública do QR Server para gerar o QR sem biblioteca */
    const img = document.createElement('img');
    img.src    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;
    img.alt    = 'QR Code da pesquisa';
    img.style  = 'width:200px;height:200px;border-radius:8px';
    img.id     = 'ps-qrcode-img';

    const parent = canvas.parentNode;
    parent.replaceChild(img, canvas);
  }

  function copiarLink() {
    const input = document.getElementById('ps-link-url');
    if (!input) return;
    navigator.clipboard.writeText(input.value)
      .then(() => App.mostrarToast('Link copiado!', 'sucesso'))
      .catch(() => {
        input.select();
        document.execCommand('copy');
        App.mostrarToast('Link copiado!', 'sucesso');
      });
  }

  function baixarQR() {
    const img = document.getElementById('ps-qrcode-img');
    if (!img) return;
    const a   = document.createElement('a');
    a.href     = img.src;
    a.download = `qr-pesquisa-${_campanhaAberta?.id?.slice(0,8) || 'ergogro'}.png`;
    a.target   = '_blank';
    a.click();
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: MONITORAMENTO
  ══════════════════════════════════════════════════════════ */

  function _iniciarMonitor(el) {
    const c = _campanhaAberta;
    if (!c?.id) return;

    el.innerHTML = `
      <div class="container">
        <div style="font-size:var(--txt-md);font-weight:700;margin:var(--s4) 0 var(--s2)">
          📊 Progresso — ${c.nome}
        </div>
        <div id="ps-monitor-conteudo">
          <div class="loading-inline">Aguardando dados...</div>
        </div>
        <div style="height:var(--s6)"></div>
      </div>
    `;

    /* Escuta mudanças em tempo real */
    _monitorUnsubscribe = monitorarProgresso(c.id, (campanha) => {
      const m = document.getElementById('ps-monitor-conteudo');
      if (!m) return;

      const resp  = campanha.totalRespostas   || 0;
      const total = campanha.totalAutorizados || 0;
      const pct   = total > 0 ? Math.round((resp / total) * 100) : 0;
      const prazo = campanha.prazo ? _fd(campanha.prazo) : '—';
      const STATUS = { ativa: '🟢 Ativa', encerrada: '🔴 Encerrada', rascunho: '⚫ Rascunho' };

      m.innerHTML = `
        <div class="card" style="margin-bottom:var(--s4)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3);margin-bottom:var(--s4)">
            <div style="text-align:center">
              <div style="font-size:36px;font-weight:700;color:var(--primaria)">${resp}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Respostas recebidas</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:36px;font-weight:700">${total || '—'}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Participantes autorizados</div>
            </div>
          </div>

          ${total > 0 ? `
            <div style="margin-bottom:var(--s2);font-size:var(--txt-sm);color:var(--texto-sec)">
              Taxa de participação: <strong>${pct}%</strong>
            </div>
            <div style="height:12px;background:var(--superficie-alt);border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${pct >= 70 ? 'var(--sucesso)' : pct >= 40 ? 'var(--aviso)' : 'var(--primaria)'};border-radius:999px;transition:width .4s"></div>
            </div>
          ` : ''}
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
            <span style="font-size:var(--txt-sm)">Status: <strong>${STATUS[campanha.status] || campanha.status}</strong></span>
            <span style="font-size:var(--txt-sm);color:var(--texto-sec)">Prazo: ${prazo}</span>
          </div>

          <div class="aviso-tecnico info">
            <span>🔒</span>
            <span>Respostas individuais nunca são exibidas. Apenas o consolidado anônimo está disponível.</span>
          </div>

          ${campanha.status === 'ativa' ? `
            <button class="btn btn-secundario" style="width:100%;margin-top:var(--s3)"
                    onclick="ModuloPesquisaAdmin.confirmarEncerramento('${campanha.id}')">
              🔒 Encerrar coleta
            </button>
          ` : `
            <button class="btn btn-secundario" style="width:100%;margin-top:var(--s3)"
                    onclick="ModuloPesquisaAdmin.confirmarReativacao('${campanha.id}')">
              🔓 Reabrir coleta
            </button>
          `}
        </div>

        ${resp > 0 ? `
          <button class="btn btn-primario" style="width:100%;margin-top:var(--s4)"
                  onclick="ModuloPesquisaAdmin.trocarSecao('relatorio')">
            📄 Ver Relatório
          </button>
        ` : `
          <div class="aviso-tecnico" style="margin-top:var(--s4)">
            <span>⏳</span>
            <span>Aguardando respostas. Esta página atualiza automaticamente.</span>
          </div>
        `}
      `;
    });
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO ANÔNIMO
  ══════════════════════════════════════════════════════════ */

  async function _gerarRelatorio(el) {
    const c = _campanhaAberta;
    if (!c?.id) return;

    el.innerHTML = `
      <div class="container">
        <div class="loading-inline" style="padding:var(--s6)">Gerando relatório...</div>
      </div>
    `;

    try {
      /* Carrega dados frescos — inclui interpretacaoTecnica salva */
      const [relatorio, campanha] = await Promise.all([
        calcularRelatorio(c.id, c.minRespostasSetor || 5),
        buscarCampanha(c.id),
      ]);
      el.innerHTML = _htmlRelatorio(relatorio, campanha || c);
      /* Pequeno delay garante que o canvas já está no DOM */
      setTimeout(() => _desenharRadar('ps-radar-chart', relatorio.consolidado), 200);
    } catch (e) {
      el.innerHTML = `
        <div class="container">
          <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
            <span>⚠️</span>
            <span>Erro ao gerar relatório: ${e.message}</span>
          </div>
        </div>
      `;
    }
  }

  function _htmlRelatorio(r, c) {
    const SCORE_COR = score => score >= 67 ? 'var(--sucesso)' : score >= 34 ? 'var(--aviso)' : 'var(--perigo)';
    const proj = App.obterProjetoAtual();
    const it   = c.interpretacaoTecnica || {};

    /* Pré-popula fatores críticos com dimensões desfavoráveis (somente na 1ª vez) */
    const criticosDefault = it.fatoresCriticos != null ? it.fatoresCriticos
      : r.consolidado.filter(d => d.nivel === 'desfavoravel').map(d => `• ${d.nome}`).join('\n');

    /* Consolidado por dimensão */
    const dimHTML = r.consolidado.map(d => {
      const info = NIVEL_L[d.nivel];
      const pct  = d.media ?? 0;
      return `
        <tr>
          <td style="font-size:var(--txt-sm)">${d.nome}</td>
          <td style="font-size:var(--txt-sm);color:var(--texto-sec)">${d.respondidas}/${d.totalPerguntas * (r.totalRespostas || 1)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:8px;background:var(--superficie-alt);border-radius:999px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${info.barra};border-radius:999px"></div>
              </div>
              <span style="font-size:var(--txt-xs);font-weight:700;min-width:28px">${d.media ?? '—'}</span>
            </div>
          </td>
          <td><span class="badge ${info.cls}" style="font-size:11px">${info.t}</span></td>
        </tr>
      `;
    }).join('');

    /* Por setor */
    const setorEntries = Object.entries(r.porSetor);
    const setorHTML = setorEntries.length === 0
      ? '<p style="color:var(--texto-sec);font-size:var(--txt-sm)">Nenhum setor com dados suficientes.</p>'
      : setorEntries.map(([nome, dados]) => {
          if (dados.insuficiente) {
            return `
              <div class="card" style="margin-bottom:var(--s3)">
                <div style="font-weight:600;margin-bottom:var(--s2)">📍 ${nome}</div>
                <div class="aviso-tecnico aviso" style="margin:0">
                  <span>🔒</span>
                  <span>${dados.total} resposta(s) — mínimo de ${dados.minimo} necessário para análise setorial. Dados incluídos no consolidado geral.</span>
                </div>
              </div>
            `;
          }

          const dimSetorHTML = dados.dimensoes.map(d => {
            const info = NIVEL_L[d.nivel];
            const pct  = d.media ?? 0;
            return `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--borda)">
                <span style="flex:1;font-size:var(--txt-sm)">${d.nome}</span>
                <div style="width:80px;height:6px;background:var(--superficie-alt);border-radius:999px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${info.barra};border-radius:999px"></div>
                </div>
                <span class="badge ${info.cls}" style="font-size:10px;min-width:80px;text-align:center">${info.t}</span>
              </div>
            `;
          }).join('');

          return `
            <div class="card" style="margin-bottom:var(--s3)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
                <div style="font-weight:600">📍 ${nome}</div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:var(--txt-xs);color:var(--texto-sec)">${dados.total} resp.</span>
                  ${dados.score != null ? `<span style="font-weight:700;color:${SCORE_COR(dados.score)}">${dados.score}/100</span>` : ''}
                </div>
              </div>
              ${dimSetorHTML}
            </div>
          `;
        }).join('');

    /* Fatores críticos e protetores */
    const criticos  = r.consolidado.filter(d => d.nivel === 'desfavoravel').map(d => d.nome);
    const protetores = r.consolidado.filter(d => d.nivel === 'favoravel').map(d => d.nome);

    /* Número do laudo e data para o rodapé */
    const _nrLaudo = `PS-${(c.empresaNome||'ERG').replace(/\s+/g,'').slice(0,4).toUpperCase()}-${new Date().getFullYear()}`;
    const _dataEmissao = _fd(r.geradoEm);
    const _responsavel = it.responsavel || proj?.responsavelTecnico || '';
    const _registro    = it.registro    || proj?.registroProfissional || '';
    const _contextoTxt = CONTEXTOS.find(x => x.id === it.contextoId)?.texto || 'Cumprimento de requisito legal (NR-01 / NR-17 / PGR)';

    return `
      <!-- ══ CSS DE IMPRESSÃO PADRÃO ENGENHALVES ══ -->
      <style>
        @media print {
          /* Configuração da página A4 */
          @page { size: A4 portrait; margin: 0; }

          /* Oculta elementos de tela */
          #app-header, #nav-principal, .subnav-abas,
          .nao-imprimir, .btn, #toast { display: none !important; }

          body {
            background: #fff !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9pt !important;
            line-height: 1.4 !important;
            margin: 0 !important;
          }

          /* ── Capa (página 1) ───────────────────── */
          .rpt-capa {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 297mm;
            padding: 20mm;
            text-align: center;
            page-break-after: always;
            background: #fff;
          }
          .rpt-capa-logo {
            font-size: 28pt;
            font-weight: 900;
            color: #1a3c6b;
            letter-spacing: -1px;
            margin-bottom: 8mm;
          }
          .rpt-capa-titulo {
            font-size: 18pt;
            font-weight: 700;
            color: #1a3c6b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4mm;
          }
          .rpt-capa-subtitulo {
            font-size: 10pt;
            color: #555;
            margin-bottom: 12mm;
          }
          .rpt-capa-tabela {
            width: 100%;
            max-width: 140mm;
            border-collapse: collapse;
            font-size: 9pt;
            margin: 0 auto 12mm;
          }
          .rpt-capa-tabela th {
            background: #1a3c6b;
            color: #fff;
            padding: 4pt 8pt;
            text-align: left;
            font-weight: 600;
            width: 45%;
          }
          .rpt-capa-tabela td {
            padding: 4pt 8pt;
            border: 1px solid #ccc;
            color: #222;
          }
          .rpt-capa-rodape {
            font-size: 8pt;
            color: #888;
            margin-top: auto;
            padding-top: 8mm;
            border-top: 1px solid #ccc;
            width: 100%;
            text-align: center;
          }

          /* ── Header fixo (páginas 2+) ──────────── */
          .rpt-header {
            display: flex !important;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 14mm;
            background: #fff;
            border-bottom: 2px solid #1a3c6b;
            padding: 0 12mm;
            align-items: center;
            justify-content: space-between;
            z-index: 9999;
          }
          .rpt-header-logo {
            font-size: 13pt;
            font-weight: 900;
            color: #1a3c6b;
            letter-spacing: -.5px;
          }
          .rpt-header-info {
            font-size: 7pt;
            color: #555;
            text-align: right;
            line-height: 1.5;
          }

          /* ── Footer fixo ───────────────────────── */
          .rpt-footer {
            display: flex !important;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: 10mm;
            background: #fff;
            border-top: 1px solid #ccc;
            padding: 0 12mm;
            align-items: center;
            justify-content: space-between;
            font-size: 7pt;
            color: #666;
            z-index: 9999;
          }

          /* ── Área de conteúdo ──────────────────── */
          .rpt-conteudo {
            margin: 18mm 12mm 14mm !important;
            padding: 0 !important;
          }

          /* ── Títulos de seção (barra azul) ─────── */
          .rpt-secao h3, .relatorio-secao h3 {
            background: #1a3c6b !important;
            color: #fff !important;
            padding: 5pt 9pt !important;
            font-size: 9pt !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: .5pt !important;
            margin: 0 0 6pt !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
          }

          /* ── Tabelas ────────────────────────────── */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
            margin-bottom: 6pt !important;
          }
          th {
            background: #1a3c6b !important;
            color: #fff !important;
            padding: 3pt 6pt !important;
            font-weight: 600 !important;
            text-align: left !important;
            border: 1px solid #1a3c6b !important;
          }
          td {
            padding: 3pt 6pt !important;
            border: 1px solid #ccc !important;
            color: #111 !important;
          }
          tr:nth-child(even) td { background: #f0f4f8 !important; }

          /* ── Cards e badges ─────────────────────── */
          .card {
            border: 1px solid #ccc !important;
            background: #fff !important;
            border-radius: 0 !important;
            padding: 8pt !important;
            margin-bottom: 6pt !important;
            color: #000 !important;
          }
          .badge { border: 1px solid #ccc !important; font-size: 7pt !important; padding: 1pt 4pt !important; }
          .badge-sucesso { background:#d4edda !important; color:#155724 !important; border-color:#c3e6cb !important; }
          .badge-aviso   { background:#fff3cd !important; color:#856404 !important; border-color:#ffeeba !important; }
          .badge-alto    { background:#f8d7da !important; color:#721c24 !important; border-color:#f5c6cb !important; }

          /* ── Análise técnica: inputs como texto ─ */
          .campo-tecnico {
            border: none !important;
            border-bottom: 1px solid #ccc !important;
            background: transparent !important;
            resize: none !important;
            color: #000 !important;
            padding: 2pt 0 !important;
            font-size: 8pt !important;
            width: 100% !important;
            font-family: Arial !important;
          }
          label input[type="radio"], label input[type="checkbox"] { display: none !important; }

          /* ── Canvas (radar) ─────────────────────── */
          canvas { max-width: 260px !important; height: auto !important; }

          /* ── Quebras de página ──────────────────── */
          .relatorio-secao { page-break-inside: avoid; margin-bottom: 8pt; }
          .rpt-capa { page-break-after: always; }

          /* Ocultar na tela */
          .rpt-capa, .rpt-header, .rpt-footer { display: none; }
        }

        @media screen {
          .rpt-capa, .rpt-header, .rpt-footer { display: none !important; }
        }
      </style>

      <!-- ── CAPA (visível só na impressão) ──── -->
      <div class="rpt-capa">
        <div class="rpt-capa-logo">ENGENHALVES</div>
        <div style="font-size:8pt;color:#888;margin-bottom:8mm">Centro de Engenharia &amp; Segurança LTDA</div>
        <div class="rpt-capa-titulo">Avaliação de Fatores Psicossociais</div>
        <div class="rpt-capa-subtitulo">
          Consulta sobre Organização do Trabalho e Fatores Psicossociais<br>
          COPSOQ-III Versão Curta (23 itens) · NR-01 / NR-17
        </div>
        <table class="rpt-capa-tabela">
          <tr><th>Empresa / Cliente</th><td>${c.empresaNome || '—'}</td></tr>
          <tr><th>Projeto</th><td>${c.nome || '—'}</td></tr>
          <tr><th>N° do Laudo</th><td>${_nrLaudo}</td></tr>
          <tr><th>Data de Emissão</th><td>${_dataEmissao}</td></tr>
          <tr><th>Responsável Técnico</th><td>${_responsavel || '—'}</td></tr>
          <tr><th>Registro Profissional</th><td>${_registro || '—'}</td></tr>
          <tr><th>Contexto da Avaliação</th><td>${_contextoTxt}</td></tr>
        </table>
        <div class="rpt-capa-rodape">
          ENGENHALVES — Centro de Engenharia &amp; Segurança LTDA | Documento de uso exclusivo do cliente
        </div>
      </div>

      <!-- ── HEADER FIXO (visível só na impressão) ── -->
      <div class="rpt-header">
        <div class="rpt-header-logo">ENGENHALVES</div>
        <div class="rpt-header-info">
          ${c.empresaNome || ''} · ${c.nome || 'Avaliação Psicossocial'}<br>
          ${_nrLaudo} · ${_dataEmissao}
        </div>
      </div>

      <!-- ── FOOTER FIXO (visível só na impressão) ── -->
      <div class="rpt-footer">
        <span>${_nrLaudo} | ENGENHALVES — Centro de Engenharia &amp; Segurança LTDA</span>
        <span>${_responsavel}${_registro ? ' · ' + _registro : ''} | ${_dataEmissao}</span>
      </div>

      <!-- ── CONTEÚDO DO RELATÓRIO ── -->
      <div class="rpt-conteudo container">
        <!-- Cabeçalho tela -->
        <div style="margin:var(--s4) 0 var(--s5);text-align:center">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">
            Avaliação de Fatores Psicossociais — NR-01 / NR-17
          </div>
          <div style="font-size:var(--txt-xl);font-weight:700">Relatório Técnico</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">${c.empresaNome || ''} · ${_dataEmissao}</div>
        </div>

        <!-- Ações -->
        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="window.print()">🖨️ Imprimir / PDF</button>
          <button class="btn btn-secundario" onclick="ModuloPesquisaAdmin.trocarSecao('monitor')">📊 Monitoramento</button>
        </div>

        <!-- Aviso técnico -->
        <div class="aviso-tecnico aviso" style="margin-bottom:var(--s5)">
          <span>⚠️</span>
          <span>Resultados referem-se ao <strong>grupo avaliado</strong>.
          Não constituem diagnóstico médico ou psicológico individual.
          Profissional habilitado é responsável pela interpretação.</span>
        </div>

        <!-- Indicadores de participação -->
        <div class="relatorio-secao">
          <h3>Participação</h3>
          <div class="card">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s3);text-align:center">
              <div>
                <div style="font-size:28px;font-weight:700;color:var(--primaria)">${r.totalRespostas}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Responderam</div>
              </div>
              <div>
                <div style="font-size:28px;font-weight:700">${r.totalAutorizados || '—'}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Autorizados</div>
              </div>
              <div>
                <div style="font-size:28px;font-weight:700;color:${r.taxaParticipacao >= 70 ? 'var(--sucesso)' : 'var(--aviso)'}">
                  ${r.taxaParticipacao != null ? r.taxaParticipacao + '%' : '—'}
                </div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Taxa de resposta</div>
              </div>
            </div>
            ${r.scoreGeral != null ? `
              <div style="margin-top:var(--s4);text-align:center">
                <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s2)">Score Geral (0–100)</div>
                <div style="font-size:48px;font-weight:700;color:${SCORE_COR(r.scoreGeral)}">${r.scoreGeral}</div>
                <div class="badge ${NIVEL_L[r.scoreGeral >= 67 ? 'favoravel' : r.scoreGeral >= 34 ? 'intermediario' : 'desfavoravel'].cls}" style="margin-top:var(--s2)">
                  ${NIVEL_L[r.scoreGeral >= 67 ? 'favoravel' : r.scoreGeral >= 34 ? 'intermediario' : 'desfavoravel'].t}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Gráfico radar COPSOQ-III -->
        <div class="relatorio-secao">
          <h3>Perfil Psicossocial — COPSOQ-III</h3>
          <div class="card" style="text-align:center;padding:var(--s4)">
            <canvas id="ps-radar-chart" width="380" height="380"
              style="display:block;margin:0 auto;max-width:100%"></canvas>
            <div style="display:flex;justify-content:center;gap:var(--s5);margin-top:var(--s3);flex-wrap:wrap">
              <span style="font-size:var(--txt-xs);color:#3fb950">● Favorável ≥ 67</span>
              <span style="font-size:var(--txt-xs);color:#d29922">● Intermediário 34–66</span>
              <span style="font-size:var(--txt-xs);color:#f85149">● Desfavorável ≤ 33</span>
            </div>
          </div>
        </div>

        <!-- Fatores críticos / protetores -->
        ${criticos.length > 0 ? `
          <div class="relatorio-secao">
            <h3>Dimensões Críticas (Desfavoráveis)</h3>
            <div class="card" style="background:var(--risco-alto-bg);border-color:var(--perigo)">
              <ul style="padding-left:var(--s5);display:flex;flex-direction:column;gap:var(--s2)">
                ${criticos.map(n => `<li style="font-size:var(--txt-sm)">${n}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        ${protetores.length > 0 ? `
          <div class="relatorio-secao">
            <h3>Dimensões Protetoras (Favoráveis)</h3>
            <div class="card" style="background:var(--risco-baixo-bg);border-color:var(--sucesso)">
              <ul style="padding-left:var(--s5);display:flex;flex-direction:column;gap:var(--s2)">
                ${protetores.map(n => `<li style="font-size:var(--txt-sm)">${n}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        <!-- Consolidado geral -->
        <div class="relatorio-secao">
          <h3>Resultado Consolidado por Dimensão</h3>
          <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
            <span>ℹ️</span>
            <span>Escala 0–100. Favorável ≥ 67 · Intermediário 34–66 · Desfavorável ≤ 33.</span>
          </div>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead>
                <tr>
                  <th>Dimensão</th>
                  <th>Respostas</th>
                  <th>Pontuação</th>
                  <th>Classificação</th>
                </tr>
              </thead>
              <tbody>${dimHTML}</tbody>
            </table>
          </div>
        </div>

        <!-- Por setor -->
        <div class="relatorio-secao">
          <h3>Análise por Setor</h3>
          <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
            <span>🔒</span>
            <span>Setores com menos de ${r.minRespostasSetor} respostas não são exibidos individualmente para proteger o anonimato (LGPD).</span>
          </div>
          ${setorHTML}
        </div>

        <!-- ══ ANÁLISE TÉCNICA DO PROFISSIONAL ══ -->
        <div class="relatorio-secao">
          <h3>
            Análise Técnica — Profissional Responsável
            <span id="ps-it-autosave" style="font-size:11px;color:var(--sucesso);font-weight:400;margin-left:8px"></span>
          </h3>

          <!-- 1. Contexto -->
          <div class="card">
            <div class="card-titulo" style="margin-bottom:var(--s3)">1. Contexto da Avaliação</div>
            <div style="display:flex;flex-direction:column;gap:var(--s2)">
              ${CONTEXTOS.map(ctx => `
                <label style="display:flex;align-items:center;gap:var(--s3);cursor:pointer;padding:var(--s2) 0">
                  <input type="radio" name="ps-it-contexto" value="${ctx.id}"
                    ${(it.contextoId === ctx.id) ? 'checked' : ''}
                    onchange="ModuloPesquisaAdmin.agendarAutoSave()">
                  <span style="font-size:var(--txt-sm)">${ctx.texto}</span>
                </label>
              `).join('')}
            </div>
            <div class="grupo-campo" style="margin-top:var(--s3)">
              <input type="text" id="ps-it-contexto-complemento" class="campo-tecnico"
                placeholder="Complemento ou observação (opcional)"
                oninput="ModuloPesquisaAdmin.agendarAutoSave()"
                value="${it.contextoComplemento || ''}">
            </div>
          </div>

          <!-- 2. Interpretação (auto-gerada) -->
          <div class="card" style="margin-top:var(--s4)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
              <div class="card-titulo">2. Interpretação Técnica Geral</div>
              <button class="btn btn-secundario nao-imprimir" style="font-size:var(--txt-xs);padding:4px 10px"
                onclick="ModuloPesquisaAdmin.gerarInterpretacao()">
                ↺ Gerar automático
              </button>
            </div>
            <textarea id="ps-it-interpretacao" class="campo-tecnico" rows="5"
              placeholder="Clique em 'Gerar automático' ou escreva a interpretação..."
              oninput="ModuloPesquisaAdmin.agendarAutoSave()"
            >${it.interpretacao || ''}</textarea>
          </div>

          <!-- 3. Fatores de risco (checklist automático) -->
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s3)">3. Fatores de Risco Identificados</div>
            <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)">
              Marcados automaticamente conforme resultado. Edite conforme sua análise.
            </p>
            <div style="display:flex;flex-direction:column;gap:var(--s2)" id="ps-it-riscos-lista">
              ${PerguntasPsicossociais.DIMENSOES.map(dim => {
                const res = r.consolidado.find(d => d.id === dim.id);
                const autoCheck = res?.nivel === 'desfavoravel';
                const jaSalvo  = it.fatoresRiscoIds?.includes(dim.id);
                const checked  = jaSalvo != null ? jaSalvo : autoCheck;
                const badge    = NIVEL_L[res?.nivel || 'sem_dados'];
                return `
                  <label style="display:flex;align-items:center;gap:var(--s3);cursor:pointer;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
                    <input type="checkbox" name="ps-it-risco" value="${dim.id}"
                      ${checked ? 'checked' : ''}
                      onchange="ModuloPesquisaAdmin.agendarAutoSave()">
                    <span style="flex:1;font-size:var(--txt-sm)">${dim.nome}</span>
                    <span class="badge ${badge.cls}" style="font-size:10px">${badge.t} ${res?.media != null ? '· ' + res.media : ''}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 4. Recomendações (banco por dimensão) -->
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s3)">4. Recomendações Técnicas</div>
            <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)">
              Selecione as recomendações aplicáveis. Agrupadas por dimensão.
            </p>
            ${Object.entries(RECOMENDACOES).map(([dimId, recs]) => {
              const dim  = PerguntasPsicossociais.DIMENSOES.find(d => d.id === dimId);
              const recsHTML = recs.map(rec => `
                <label style="display:flex;align-items:flex-start;gap:var(--s3);cursor:pointer;padding:var(--s2) 0;font-size:var(--txt-sm)">
                  <input type="checkbox" name="ps-it-rec" value="${rec.id}"
                    ${it.recomendacoesIds?.includes(rec.id) ? 'checked' : ''}
                    onchange="ModuloPesquisaAdmin.agendarAutoSave()"
                    style="margin-top:2px;flex-shrink:0">
                  <span>${rec.texto}</span>
                </label>
              `).join('');
              return `
                <div style="margin-bottom:var(--s4)">
                  <div style="font-size:var(--txt-xs);font-weight:700;color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--s2)">
                    ${dim?.nome || dimId}
                  </div>
                  ${recsHTML}
                </div>
              `;
            }).join('')}
            <div class="grupo-campo" style="margin-top:var(--s3)">
              <label style="font-size:var(--txt-xs);color:var(--texto-sec)">Recomendação adicional (opcional)</label>
              <textarea id="ps-it-rec-custom" class="campo-tecnico" rows="2"
                placeholder="Outras medidas específicas para esta empresa..."
                oninput="ModuloPesquisaAdmin.agendarAutoSave()"
              >${it.recomendacoesCustom || ''}</textarea>
            </div>
          </div>

          <!-- 5. Conclusão (texto livre) -->
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s3)">5. Conclusão Técnica</div>
            <textarea id="ps-it-conclusao" class="campo-tecnico" rows="4"
              placeholder="Conclusão técnica formal do profissional habilitado..."
              oninput="ModuloPesquisaAdmin.agendarAutoSave()"
            >${it.conclusao || ''}</textarea>
          </div>

          <!-- 6. Indica AET -->
          <div class="card" style="margin-top:var(--s4)">
            <label class="check-item" style="cursor:pointer">
              <input type="checkbox" id="ps-it-aet"
                ${it.necessitaAET ? 'checked' : ''}
                onchange="ModuloPesquisaAdmin.toggleAET();ModuloPesquisaAdmin.agendarAutoSave()">
              <div class="check-box">✓</div>
              <span style="font-weight:600">Indica necessidade de Análise Ergonômica do Trabalho (AET)</span>
            </label>
            <div id="ps-it-aet-div" style="${it.necessitaAET ? 'margin-top:var(--s3)' : 'display:none'}">
              <textarea id="ps-it-aet-just" class="campo-tecnico" rows="2"
                placeholder="Justifique a indicação de AET..."
                oninput="ModuloPesquisaAdmin.agendarAutoSave()"
              >${it.justificativaAET || ''}</textarea>
            </div>
          </div>

          <!-- Assinatura -->
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s3)">Responsável Técnico</div>
            <div class="linha-campos">
              <div class="grupo-campo">
                <label>Nome completo</label>
                <input type="text" id="ps-it-responsavel" class="campo-tecnico"
                  placeholder="Nome do profissional"
                  oninput="ModuloPesquisaAdmin.agendarAutoSave()"
                  value="${it.responsavel || proj?.responsavelTecnico || ''}">
              </div>
              <div class="grupo-campo">
                <label>Registro profissional</label>
                <input type="text" id="ps-it-registro" class="campo-tecnico"
                  placeholder="CREA, CRQ, CFT..."
                  oninput="ModuloPesquisaAdmin.agendarAutoSave()"
                  value="${it.registro || proj?.registroProfissional || ''}">
              </div>
            </div>
            <div class="grupo-campo">
              <label>Data de emissão</label>
              <input type="date" id="ps-it-data" class="campo-tecnico"
                oninput="ModuloPesquisaAdmin.agendarAutoSave()"
                value="${it.dataEmissao || new Date().toISOString().slice(0,10)}">
            </div>
          </div>

          <button class="btn btn-primario nao-imprimir" style="width:100%;margin:var(--s4) 0"
            onclick="ModuloPesquisaAdmin.salvarInterpretacaoTecnica()">
            💾 Salvar Análise Técnica
          </button>
        </div>

        <!-- Rodapé tela / impressão -->
        <div style="text-align:center;padding:var(--s6) 0;color:var(--texto-sec);font-size:var(--txt-xs);border-top:1px solid var(--borda);margin-top:var(--s4)">
          ErgoGRO · Consulta sobre Organização do Trabalho e Fatores Psicossociais<br>
          Instrumento: COPSOQ-III Versão Curta (Kristensen et al., 2019) · NR-01 / NR-17<br>
          Documento técnico — não substitui avaliação clínica individual<br>
          Gerado em ${_dataEmissao}
        </div>
      </div><!-- fim .rpt-conteudo -->
    `;
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */

  function _htmlSelecioneCampanha() {
    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>ℹ️</span>
          <span>Selecione uma campanha primeiro na aba <strong>Campanhas</strong>.</span>
        </div>
        <button class="btn btn-secundario" style="margin-top:var(--s4)" onclick="ModuloPesquisaAdmin.trocarSecao('campanhas')">
          ← Ir para Campanhas
        </button>
      </div>
    `;
  }

  function _htmlFirebaseNaoConfigurado() {
    return `
      <div class="container">
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚙️</span>
          <div>
            <strong>Firebase não configurado</strong><br>
            <p style="font-size:var(--txt-sm);margin-top:var(--s2)">
              O módulo de Pesquisa Psicossocial usa Firebase Firestore para sincronizar
              respostas entre dispositivos. Para ativar:
            </p>
            <ol style="font-size:var(--txt-sm);padding-left:var(--s5);margin-top:var(--s2);display:flex;flex-direction:column;gap:4px">
              <li>Acesse <strong>console.firebase.google.com</strong> e crie um projeto.</li>
              <li>Ative o <strong>Firestore Database</strong> (modo de teste).</li>
              <li>Adicione um app Web e copie as credenciais.</li>
              <li>Cole as credenciais em <code>js/firebase-pesquisa.js</code> na constante <code>FIREBASE_CONFIG</code>.</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Gráfico Radar COPSOQ-III (Canvas puro) ─────────────── */
  function _desenharRadar(canvasId, dimensoes) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;

    const ctx  = canvas.getContext('2d');
    const W    = canvas.width;
    const H    = canvas.height;
    const cx   = W / 2;
    const cy   = H / 2;
    const R    = Math.min(W, H) * 0.30;   /* raio do radar */
    const N    = dimensoes.length;
    const step = (2 * Math.PI) / N;
    const ini  = -Math.PI / 2;            /* começa pelo topo */

    /* Ponto em coordenadas polares */
    const pt = (i, r) => ({
      x: cx + r * Math.cos(ini + i * step),
      y: cy + r * Math.sin(ini + i * step),
    });

    ctx.clearRect(0, 0, W, H);
    /* Canvas transparente — fundo vem do card wrapper */

    /* Anéis de referência: 33, 67, 100 */
    [[100,'#30363d',null],[67,'#30363d','rgba(210,153,34,0.07)'],[33,'#30363d','rgba(248,81,73,0.08)']].forEach(([lv, stroke, fill]) => {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const p = pt(i, (lv / 100) * R);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    /* Rótulos dos anéis */
    [[33,'#f85149'],[67,'#d29922']].forEach(([lv, cor]) => {
      const p = pt(0, (lv / 100) * R);
      ctx.fillStyle = cor;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lv, p.x + 10, p.y + 3);
    });

    /* Eixos */
    for (let i = 0; i < N; i++) {
      const p = pt(i, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    /* Polígono dos dados */
    ctx.beginPath();
    dimensoes.forEach((d, i) => {
      const p = pt(i, ((d.media ?? 0) / 100) * R);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(31,111,235,0.22)';
    ctx.fill();
    ctx.strokeStyle = '#388bfd';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Pontos coloridos por nível */
    dimensoes.forEach((d, i) => {
      if (d.media == null) return;
      const p   = pt(i, (d.media / 100) * R);
      const cor = d.media >= 67 ? '#3fb950' : d.media >= 34 ? '#d29922' : '#f85149';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = cor;
      ctx.fill();
      ctx.strokeStyle = '#161b22';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    /* Rótulos externos */
    const ABREV = ['Demandas', 'Organização', 'Liderança', 'Interface', 'Valores', 'Saúde'];
    const labelR = R + 52;

    dimensoes.forEach((d, i) => {
      const angle = ini + i * step;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      const cor = d.media == null ? '#8b949e' : d.media >= 67 ? '#3fb950' : d.media >= 34 ? '#d29922' : '#f85149';

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c9d1d9';
      ctx.font = '11px sans-serif';
      ctx.fillText(ABREV[i] || d.nome.split(' ')[0], lx, ly - 8);

      ctx.fillStyle = cor;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(d.media != null ? d.media : '—', lx, ly + 8);
    });

    /* Score central */
    const scores = dimensoes.map(d => d.media).filter(s => s != null);
    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const cor = avg >= 67 ? '#3fb950' : avg >= 34 ? '#d29922' : '#f85149';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = cor;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(avg, cx, cy - 10);
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px sans-serif';
      ctx.fillText('geral', cx, cy + 8);
    }
  }

  /* ── Análise técnica: auto-save e save manual ───────────── */

  let _autoSaveTimer = null;

  function agendarAutoSave() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(salvarInterpretacaoTecnica, 1800);
  }

  function toggleAET() {
    const div = document.getElementById('ps-it-aet-div');
    const chk = document.getElementById('ps-it-aet');
    if (div) div.style.display = chk?.checked ? 'margin-top:var(--s3)' : 'none';
  }

  /* Gera parágrafo de interpretação automaticamente com base nos resultados */
  function gerarInterpretacao() {
    const camp = _campanhaAberta;
    if (!camp?.id) return;

    /* Lê os dados do relatório atual do DOM */
    const score = parseInt(document.querySelector('[style*="font-size:48px"]')?.textContent) || null;
    const criticos  = [...document.querySelectorAll('input[name="ps-it-risco"]:checked')]
      .map(el => PerguntasPsicossociais.DIMENSOES.find(d => d.id === el.value)?.nome).filter(Boolean);
    const total = parseInt(document.querySelector('[style*="font-size:36px"]')?.textContent) || 0;

    let nivel = score == null ? 'Intermediário' : score >= 67 ? 'Favorável' : score >= 34 ? 'Intermediário' : 'Desfavorável';
    let texto = `A avaliação dos fatores psicossociais pelo COPSOQ-III (versão curta, 23 itens) identificou score geral de ${score ?? '—'}/100 — nível ${nivel}. `;
    texto += `Participaram ${total} trabalhador(es) da consulta. `;

    if (criticos.length > 0) {
      texto += `As dimensões ${criticos.join(', ')} apresentaram resultado Desfavorável, indicando necessidade de intervenção prioritária. `;
    } else {
      texto += `Nenhuma dimensão apresentou resultado Desfavorável. `;
    }

    texto += `Os resultados referem-se ao grupo avaliado e devem ser interpretados em conjunto com as observações de campo e o contexto organizacional da empresa.`;

    const campo = document.getElementById('ps-it-interpretacao');
    if (campo) { campo.value = texto; agendarAutoSave(); }
  }

  async function salvarInterpretacaoTecnica() {
    if (!_campanhaAberta?.id) return;
    const get     = id => (document.getElementById(id)?.value ?? '').trim();
    const radios  = document.querySelector('input[name="ps-it-contexto"]:checked');
    const riscos  = [...document.querySelectorAll('input[name="ps-it-risco"]:checked')].map(el => el.value);
    const recs    = [...document.querySelectorAll('input[name="ps-it-rec"]:checked')].map(el => el.value);

    const dados = {
      contextoId:            radios?.value || '',
      contextoComplemento:   get('ps-it-contexto-complemento'),
      interpretacao:         get('ps-it-interpretacao'),
      fatoresRiscoIds:       riscos,
      recomendacoesIds:      recs,
      recomendacoesCustom:   get('ps-it-rec-custom'),
      conclusao:             get('ps-it-conclusao'),
      necessitaAET:          document.getElementById('ps-it-aet')?.checked || false,
      justificativaAET:      get('ps-it-aet-just'),
      responsavel:           get('ps-it-responsavel'),
      registro:              get('ps-it-registro'),
      dataEmissao:           get('ps-it-data'),
    };
    const btn = document.querySelector('.btn.btn-primario.nao-imprimir');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await salvarInterpretacao(_campanhaAberta.id, dados);
      App.mostrarToast('Análise técnica salva com sucesso', 'sucesso');
      const ind = document.getElementById('ps-it-autosave');
      if (ind) { ind.textContent = '✓ Salvo'; setTimeout(() => { if (ind) ind.textContent = ''; }, 3000); }
    } catch (e) {
      console.error('Erro ao salvar interpretação:', e);
      App.mostrarToast('Erro ao salvar. Verifique a conexão.', 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Análise Técnica'; }
    }
  }

  /* ── Ações públicas ──────────────────────────────────────── */

  function abrirCampanha(id) {
    /* Encontra a campanha na lista e define como ativa */
    const proj = App.obterProjetoAtual();
    if (!proj) return;

    listarCampanhas(proj.id).then(lista => {
      _campanhaAberta = lista.find(c => c.id === id) || { id };
      trocarSecao('monitor');
    }).catch(() => {
      _campanhaAberta = { id };
      trocarSecao('monitor');
    });
  }

  async function confirmarEncerramento(id) {
    if (!confirm('Encerrar esta campanha? Os trabalhadores não poderão mais responder.')) return;
    try {
      await encerrarCampanha(id); /* global de firebase-pesquisa.js */
      App.mostrarToast('Campanha encerrada', 'sucesso');
      trocarSecao('campanhas');
    } catch (e) { App.mostrarToast('Erro: ' + e.message, 'erro'); }
  }

  async function confirmarReativacao(id) {
    try {
      await reativarCampanha(id); /* global de firebase-pesquisa.js */
      App.mostrarToast('Campanha reativada', 'sucesso');
      trocarSecao('campanhas');
    } catch (e) { App.mostrarToast('Erro: ' + e.message, 'erro'); }
  }

  return {
    renderizar,
    trocarSecao,
    salvarCampanha,
    executarImportacaoCPFs,
    copiarLink,
    baixarQR,
    abrirCampanha,
    confirmarEncerramento,
    confirmarReativacao,
    agendarAutoSave,
    toggleAET,
    gerarInterpretacao,
    salvarInterpretacaoTecnica,
  };
})();
