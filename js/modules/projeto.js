/* ============================================================
   ErgoGRO — Módulo: Projeto de Laudo
   Módulo central da v4. Um Projeto de Laudo é um dossiê técnico
   que consolida todas as avaliações (AEP, FP, AET) de um cliente.

   Seções do projeto:
   - visao-geral  : dados do projeto e empresa
   - setores      : setores e funções do projeto (CRUD)
   - avaliacoes   : avaliações vinculadas + criação
   - plano        : plano de ação consolidado
   - relatorio    : relatório técnico consolidado
   ============================================================ */

const ModuloProjeto = (() => {

  let _secaoAtual = 'visao-geral';
  let _empresaImpressaoProj = 'engenhalves';
  let _nrProjetoAtual = '';
  let _afpCampanhaCache = null; /* { id, minRespostas } — preenchido ao renderizar relatório */

  /* Wizard interno para criar avaliação */
  let _wiz = { setorId: null, funcaoId: null, tipo: null };

  const SECOES = [
    { id: 'visao-geral',    icone: '📁', label: 'Projeto'       },
    { id: 'setores',        icone: '📍', label: 'Setores'       },
    { id: 'avaliacoes',     icone: '📋', label: 'Avaliações'    },
    { id: 'pesquisas',      icone: '🧠', label: 'Pesquisas'     },
    { id: 'consolidacao',   icone: '🔬', label: 'Consolidação'  },
    { id: 'plano',          icone: '📌', label: 'Plano'         },
    { id: 'relatorio',      icone: '📄', label: 'Relatório'     },
  ];

  const TIPO_LABEL = {
    aep:          'AEP',
    psicossocial: 'AFP',
    aep_afp:      'AEP + AFP',
    aet:          'AET Completo',
    integrado:    'Integrado',
  };
  const TIPO_ICON = { aep:'📋', psicossocial:'🧠', aep_afp:'📋🧠', aet:'📋🧠🔬', integrado:'📊' };
  const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

  /* ── SVG brandmark Engenhalves ───────────────────────────── */
  const _SVG_EP = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${w}" height="${h}" style="flex-shrink:0">
    <path fill="#0D47A1" d="M500 115C287.2 115 115 287.2 115 500S287.2 885 500 885c129.1 0 243.4-63.7 313.2-161.4H641.8C600.5 748.7 551.8 762 500 762c-144.7 0-262-117.3-262-262s117.3-262 262-262c51.8 0 100.5 13.3 141.8 38.4h171.4C743.4 178.7 629.1 115 500 115z"/>
    <path fill="#0D47A1" d="M300 333H732L795 426H300Z"/>
    <path fill="#0D47A1" d="M248 454H752L695 546H248Z"/>
    <path fill="#0D47A1" d="M300 574H795L732 667H300Z"/>
  </svg>`;

  /* ── Config de marca (Engenhalves / Kalprevi) ─────────── */
  const _EMPRESAS_PROJ = {
    engenhalves: {
      barraTopoTexto: 'ENGENHALVES — Centro de Engenharia e Segurança LTDA',
      capaLogo: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
             width="80" height="80" style="display:block;margin:0 auto 4mm">
          <path fill="#0D47A1" d="M500 115C287.2 115 115 287.2 115 500S287.2 885 500 885c129.1 0 243.4-63.7 313.2-161.4H641.8C600.5 748.7 551.8 762 500 762c-144.7 0-262-117.3-262-262s117.3-262 262-262c51.8 0 100.5 13.3 141.8 38.4h171.4C743.4 178.7 629.1 115 500 115z"/>
          <path fill="#0D47A1" d="M300 333H732L795 426H300Z"/>
          <path fill="#0D47A1" d="M248 454H752L695 546H248Z"/>
          <path fill="#0D47A1" d="M300 574H795L732 667H300Z"/>
        </svg>
        <div style="font-size:20pt;font-weight:900;color:#0D47A1;letter-spacing:3px;line-height:1">ENGENHALVES</div>
        <div style="font-size:7pt;color:#666;letter-spacing:1.5px;margin-top:2mm;text-transform:uppercase">Centro de Engenharia e Segurança LTDA</div>`,
      headerLogo: () => `
        ${_SVG_EP(28, 28)}
        <div>
          <div style="font-size:11pt;font-weight:900;color:#0D47A1;letter-spacing:1px;line-height:1">ENGENHALVES</div>
          <div style="font-size:6pt;color:#777;letter-spacing:.5px">CENTRO DE ENGENHARIA E SEGURANÇA LTDA</div>
        </div>`,
      rodape: (nr) => `ENGENHALVES — Centro de Engenharia &amp; Segurança LTDA<br>
        Estrada Braulina Pigatto, 2320, CEP 84607-303 — Bom Jesus, União da Vitória - PR<br>
        (42) 99928-8177 &nbsp;|&nbsp; atendimento@engenhalves.com.br<br>
        <span style="font-size:7pt">Documento técnico de uso exclusivo do cliente &middot; ${nr}</span>`,
    },
    kalprevi: {
      barraTopoTexto: 'KALPREVI — Soluções Ocupacionais LTDA',
      capaLogo: () => `
        <div style="text-align:center">
          <img src="Kalprevi/logo%20kalprevi.jpg" alt="KALPREVI"
               style="height:18mm;width:auto;max-width:120mm;display:block;margin:0 auto 3mm">
          <div style="font-size:7pt;color:#666;letter-spacing:1.5px;text-transform:uppercase">Soluções Ocupacionais LTDA</div>
        </div>`,
      headerLogo: () => `
        <img src="Kalprevi/logo%20kalprevi.jpg" alt="KALPREVI"
             style="height:9mm;width:auto;max-width:50mm;display:block">`,
      rodape: (nr) => `KALPREVI SOLUÇÕES OCUPACIONAIS LTDA &nbsp;|&nbsp; CNPJ: 58.682.679/0001-26<br>
        Rua Costa Carvalho, 880, Centro — União da Vitória - PR<br>
        (42) 3529-0522 &nbsp;|&nbsp; contato@kalprevi.com.br<br>
        <span style="font-size:7pt">Documento técnico de uso exclusivo do cliente &middot; ${nr}</span>`,
    },
  };

  /* Tipos que incluem a pesquisa psicossocial (AFP) */
  const _TIPOS_COM_AFP = new Set(['aep_afp', 'aet', 'integrado', 'psicossocial']);

  /* ── Renderiza o shell do projeto ────────────────────────── */
  function renderizar(secao) {
    _secaoAtual = secao || _secaoAtual;
    const tela  = document.getElementById('tela-projeto');
    const proj  = App.obterProjetoAtual();
    const temAFP = _TIPOS_COM_AFP.has(proj?.tipo);

    const soAFP = proj?.tipo === 'psicossocial';
    const secoesFiltradas = SECOES.filter(s => {
      if (s.id === 'pesquisas')    return temAFP;
      if (s.id === 'consolidacao') return temAFP; /* só projetos com AFP têm consolidação */
      if (s.id === 'avaliacoes')   return !soAFP; /* AFP puro não tem avaliações AEP */
      return true;
    });

    const abasHTML = secoesFiltradas.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-secao="${s.id}"
              onclick="ModuloProjeto.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');
    tela.innerHTML = `
      <nav class="subnav-abas" id="subnav-projeto">${abasHTML}</nav>
      <div id="projeto-conteudo"></div>
    `;
    _renderizarConteudo(_secaoAtual);
  }

  function trocarSecao(secao) {
    _salvarSecaoAtual();
    _secaoAtual = secao;
    document.querySelectorAll('#subnav-projeto .aba-bloco').forEach(b => {
      b.classList.toggle('ativa', b.dataset.secao === secao);
    });
    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('projeto-conteudo');
    if (!el) return;
    if      (secao === 'visao-geral')  el.innerHTML = _htmlVisaoGeral();
    else if (secao === 'setores')      el.innerHTML = _htmlSetores();
    else if (secao === 'avaliacoes')   el.innerHTML = _htmlAvaliacoes();
    else if (secao === 'pesquisas')    ModuloPesquisaAdmin.renderizar();
    else if (secao === 'consolidacao') ModuloConsolidacao.renderizar(el);
    else if (secao === 'plano')        el.innerHTML = _htmlPlano();
    else if (secao === 'relatorio')    _renderizarRelatorio(el);
  }

  function _salvarSecaoAtual() {
    if (_secaoAtual === 'visao-geral') _salvarVisaoGeralSilencioso();
    const proj = App.obterProjetoAtual();
    if (proj) try { Storage.salvarProjeto(proj); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: VISÃO GERAL
  ══════════════════════════════════════════════════════════ */

  const _PERFIL_KEY = 'ergogro_perfil_tecnico';

  function _carregarPerfil() {
    try {
      const salvo = JSON.parse(localStorage.getItem(_PERFIL_KEY) || '{}');
      if (salvo.responsavelTecnico) return salvo;
      /* Busca nos projetos existentes se ainda não há perfil salvo */
      const projetos = Storage.listarProjetos();
      const comResp  = projetos.filter(p => p.responsavelTecnico)
                               .sort((a, b) => (b.atualizadoEm || '') > (a.atualizadoEm || '') ? 1 : -1);
      if (comResp.length) {
        const p = comResp[0];
        return { responsavelTecnico: p.responsavelTecnico, registroProfissional: p.registroProfissional, cargoResponsavel: p.cargoResponsavel };
      }
      return salvo;
    } catch { return {}; }
  }
  function _salvarPerfil(p) {
    if (p.responsavelTecnico) localStorage.setItem(_PERFIL_KEY, JSON.stringify(p));
  }

  function _htmlVisaoGeral() {
    const proj = App.obterProjetoAtual();
    if (!proj) return '';
    const emp    = Storage.buscarEmpresa(proj.empresaId);
    const perfil = _carregarPerfil();
    const respVal  = proj.responsavelTecnico   || perfil.responsavelTecnico   || '';
    const regVal   = proj.registroProfissional || perfil.registroProfissional || '';
    const cargoVal = proj.cargoResponsavel     || perfil.cargoResponsavel     || '';

    return `
      <div class="container">
        <!-- Empresa vinculada -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">
            🏢 Empresa Cliente
            <button class="btn btn-fantasma btn-sm" style="margin-left:auto"
                    onclick="App.navegarPara('empresas')">✏️ Editar</button>
          </div>
          ${emp ? `
            <div style="font-size:var(--txt-base);font-weight:600">${emp.nome}</div>
            <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s1)">
              ${emp.cnpj||''} ${emp.cidade ? '· '+emp.cidade+(emp.estado?'/'+emp.estado:'') : ''}
            </div>
          ` : `<div class="aviso-tecnico aviso" style="margin:0">
            <span>⚠️</span><span>Nenhuma empresa vinculada.</span>
          </div>`}
        </div>

        <!-- Dados do projeto -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📁 Dados do Projeto</div>

          <div class="grupo-campo">
            <label for="proj-nome">Nome do Projeto / Dossiê</label>
            <input type="text" id="proj-nome" placeholder="Ex.: AEP 2026 — Engenhalves"
                   value="${proj.nome || ''}">
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-tipo">Tipo do Projeto</label>
              <select id="proj-tipo">
                <option value="aep"          ${proj.tipo==='aep'?'selected':''}>📋 AEP — Avaliação Ergonômica Preliminar</option>
                <option value="aep_afp"      ${proj.tipo==='aep_afp'?'selected':''}>📋🧠 AEP + AFP — Ergonômico com Psicossocial</option>
                <option value="psicossocial" ${proj.tipo==='psicossocial'?'selected':''}>🧠 Fatores Psicossociais</option>
                <option value="aet"          ${proj.tipo==='aet'?'selected':''}>🔬 AET — Análise Ergonômica do Trabalho</option>
                <option value="integrado"    ${proj.tipo==='integrado'?'selected':''}>📊 Integrado (AEP + FP + AET)</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="proj-status">Status</label>
              <select id="proj-status">
                <option value="em_andamento" ${proj.status!=='concluido'?'selected':''}>🔄 Em andamento</option>
                <option value="concluido"    ${proj.status==='concluido'?'selected':''}>✅ Concluído</option>
              </select>
            </div>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-inicio">Data de Início</label>
              <input type="date" id="proj-inicio" value="${proj.dataInicio || ''}">
            </div>
            <div class="grupo-campo">
              <label for="proj-fim">Data de Conclusão</label>
              <input type="date" id="proj-fim" value="${proj.dataFim || ''}">
            </div>
          </div>

          <div class="grupo-campo">
            <label for="proj-objetivo" style="display:flex;align-items:center;gap:var(--s2)">
              Objetivo do Projeto
              <button id="btn-objetivo-ia"
                      onclick="ModuloProjeto.gerarObjetivoIA()"
                      title="Gerar com IA"
                      style="font-size:var(--txt-xs);padding:2px 8px;border-radius:var(--r2);
                             border:1px solid var(--borda);background:var(--fundo);
                             color:var(--texto-sec);cursor:pointer;margin-left:auto">
                🤖 Gerar
              </button>
            </label>
            <textarea id="proj-objetivo" rows="3"
              placeholder="Descreva o objetivo técnico do projeto de laudo..."
            >${proj.objetivo || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="proj-obs">Observações Gerais</label>
            <textarea id="proj-obs" rows="2"
              placeholder="Contexto, demandas específicas do cliente, restrições..."
            >${proj.observacoesGerais || ''}</textarea>
          </div>
        </div>

        <!-- Responsável técnico -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📋 Responsável Técnico</div>
          <div class="grupo-campo">
            <label for="proj-responsavel">Nome</label>
            <input type="text" id="proj-responsavel" placeholder="Nome completo"
                   value="${respVal}">
          </div>
          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-registro">Registro Profissional</label>
              <input type="text" id="proj-registro" placeholder="CREA, CRQ, CRP..."
                     value="${regVal}">
            </div>
            <div class="grupo-campo">
              <label for="proj-cargo">Cargo</label>
              <select id="proj-cargo">
                <option value="">Selecione...</option>
                ${['Engenheiro de Segurança do Trabalho','Técnico de Segurança do Trabalho','Ergonomista','Médico do Trabalho','Psicólogo do Trabalho','Fisioterapeuta do Trabalho','Outro']
                  .map(c => `<option ${cargoVal===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloProjeto.salvarVisaoGeral()">💾 Salvar Projeto</button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  async function gerarObjetivoIA() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;

    const executar = async () => {
      const emp = proj.empresaId ? Storage.buscarEmpresa(proj.empresaId) : null;
      const TIPO_NOME = {
        aep:          'Avaliação Ergonômica Preliminar (AEP) conforme NR-17',
        psicossocial: 'Avaliação de Fatores Psicossociais (AFP / COPSOQ)',
        aep_afp:      'Avaliação Ergonômica Preliminar + Fatores Psicossociais',
        aet:          'Análise Ergonômica do Trabalho (AET)',
        integrado:    'Programa Ergonômico Integrado (AEP + AFP + AET)',
      };
      const btn = document.getElementById('btn-objetivo-ia');
      if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
      try {
        const prompt = `Você é um engenheiro de segurança do trabalho. Redija o objetivo técnico para um projeto de laudo ergonômico com as seguintes características:

Tipo de projeto: ${TIPO_NOME[proj.tipo] || proj.tipo}
Empresa / Cliente: ${emp?.nome || 'não informado'}
Atividade da empresa: ${emp?.atividadePrincipal || emp?.cnae || 'não informado'}

Escreva 2 a 3 frases técnicas objetivas, em estilo de laudo de engenharia, descrevendo o objetivo do projeto. Inicie diretamente com o conteúdo técnico, sem introductions. Retorne APENAS o texto, sem formatação especial.`;

        const texto = await ClaudeVision.gerarTextoIA(prompt, 512);
        const campo = document.getElementById('proj-objetivo');
        if (campo && texto) campo.value = texto;
        App.mostrarToast('Objetivo gerado — revise e ajuste', 'sucesso');
      } catch (err) {
        App.mostrarToast('Erro ao gerar objetivo: ' + err.message, 'erro');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🤖 Gerar'; }
      }
    };

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(executar);
    } else {
      await executar();
    }
  }

  async function gerarConclusaoIA() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;

    const executar = async () => {
      const btn   = document.getElementById('btn-gerar-conclusao-proj');
      const campo = document.getElementById('proj-conclusao');
      if (!campo) return;
      const textoAnterior = campo.value;
      campo.value    = '⏳ Gerando com IA…';
      campo.disabled = true;
      if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
      try {
        const emp     = proj.empresaId ? Storage.buscarEmpresa(proj.empresaId) : null;
        const avs     = Storage.listarPorProjeto(proj.id);
        const avsAEP  = avs.filter(a => a.tipo === 'aep');
        const TIPO_NOME = {
          aep: 'AEP — Avaliação Ergonômica Preliminar',
          aep_afp: 'AEP + AFP — Ergonômico com Psicossocial',
          psicossocial: 'AFP — Fatores Psicossociais',
          aet: 'AET — Análise Ergonômica do Trabalho',
          integrado: 'Integrado (AEP + AFP + AET)',
        };
        const nivelPt = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };

        let ctx = `Empresa: ${emp?.nome || proj.nome}\n`;
        ctx += `Tipo de projeto: ${TIPO_NOME[proj.tipo] || proj.tipo}\n`;
        if (proj.objetivo) ctx += `Objetivo: ${proj.objetivo}\n`;

        if (avsAEP.length) {
          ctx += `\nFunções avaliadas (${avsAEP.length}):\n`;
          avsAEP.forEach(av => {
            const score = ModuloAEP.MOTOR_AEP.calcularScore(av);
            const nivel = av.aep?.analise?.nivelRiscoGeral || ModuloAEP.MOTOR_AEP.sugerirNivel(score.valor);
            const aet   = av.aep?.analise?.indicaAET ? ' [Indica AET]' : '';
            ctx += `  • ${av.funcao || '—'} (${av.setor || '—'}): Score ${score.valor}/100, Nível ${nivelPt[nivel] || nivel}${aet}\n`;
          });
          const comAET = avsAEP.filter(a => a.aep?.analise?.indicaAET).length;
          if (comAET) ctx += `Funções com indicação de AET: ${comAET}\n`;
        }

        const prompt = `Você é um engenheiro de segurança do trabalho. Redija a conclusão técnica consolidada para o relatório ergonômico do projeto abaixo. A conclusão deve: (1) sintetizar os principais achados de todas as funções avaliadas, (2) indicar o nível geral de risco do projeto, (3) mencionar funções críticas ou que necessitam AET se houver, (4) recomendar providências prioritárias, (5) registrar a necessidade de revisão periódica conforme NR-01 e NR-17. Use linguagem técnica de laudo de engenharia, em 3 a 5 parágrafos.

DADOS DO PROJETO:
${ctx}

Retorne APENAS o texto da conclusão, sem introdução, sem formatação especial, sem marcadores.`;

        const texto = await ClaudeVision.gerarTextoIA(prompt, 1024);
        campo.value = texto;
        onConclusaoChange(texto);
        App.mostrarToast('Conclusão gerada — revise e ajuste se necessário', 'sucesso');
      } catch (err) {
        campo.value = textoAnterior;
        App.mostrarToast('Erro ao gerar: ' + err.message, 'erro');
      } finally {
        campo.disabled = false;
        if (btn) { btn.disabled = false; btn.textContent = '🤖 Gerar com IA'; }
      }
    };

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(executar);
    } else {
      await executar();
    }
  }

  function salvarVisaoGeral() {
    _salvarVisaoGeralSilencioso();
    const proj = App.obterProjetoAtual();
    if (proj) try { Storage.salvarProjeto(proj); App.mostrarToast('Projeto salvo', 'sucesso'); } catch(e) {}
  }

  function _salvarVisaoGeralSilencioso() {
    const proj = App.obterProjetoAtual();
    if (!proj || !document.getElementById('proj-nome')) return;
    const get = id => (document.getElementById(id)||{}).value?.trim() || '';
    proj.nome                 = get('proj-nome');
    proj.tipo                 = get('proj-tipo') || 'aep';
    proj.status               = get('proj-status') || 'em_andamento';
    proj.dataInicio           = get('proj-inicio');
    proj.dataFim              = get('proj-fim');
    proj.objetivo             = get('proj-objetivo');
    proj.observacoesGerais    = get('proj-obs');
    proj.responsavelTecnico   = get('proj-responsavel');
    proj.registroProfissional = get('proj-registro');
    proj.cargoResponsavel     = get('proj-cargo');
    _salvarPerfil({ responsavelTecnico: proj.responsavelTecnico, registroProfissional: proj.registroProfissional, cargoResponsavel: proj.cargoResponsavel });
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: SETORES E FUNÇÕES
  ══════════════════════════════════════════════════════════ */

  function _htmlSetores() {
    const proj    = App.obterProjetoAtual();
    const setores = Storage.listarSetores(proj.id);

    const listaHTML = setores.length === 0
      ? `<div class="empty-state" style="padding:var(--s5)">
           <div class="empty-icon">📍</div>
           <p>Nenhum setor cadastrado neste projeto.</p>
           <p style="font-size:var(--txt-sm)">Adicione setores para organizar as avaliações por área.</p>
         </div>`
      : setores.map(s => _htmlCardSetor(s)).join('');

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>📍</span>
          <span>Estes setores e funções pertencem ao <strong>projeto atual</strong>.
          Alterações aqui <strong>não modificam</strong> o catálogo mestre da empresa.
          Para editar o catálogo mestre, acesse <strong>Empresas</strong>.</span>
        </div>

        <button class="btn-bloco" onclick="ModuloProjeto.abrirFormSetor()" style="margin:var(--s3) 0">
          + Adicionar Setor
        </button>

        <div id="lista-setores-projeto">${listaHTML}</div>
      </div>

      <!-- Modal setor -->
      <div class="modal-overlay oculto" id="modal-proj-setor">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-ps-titulo">Novo Setor</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-proj-setor')">✕</button>
          </div>
          <div id="modal-ps-form"></div>
        </div>
      </div>

      <!-- Modal função -->
      <div class="modal-overlay oculto" id="modal-proj-funcao">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-pf-titulo">Nova Função</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-proj-funcao')">✕</button>
          </div>
          <div id="modal-pf-form"></div>
        </div>
      </div>
    `;
  }

  function _htmlCardSetor(s) {
    const funcoes  = Storage.listarFuncoes(s.id);
    const numAvs   = Storage.listar().filter(a => a.setorId === s.id).length;

    return `
      <div class="card" style="margin-bottom:var(--s4)" id="card-set-${s.id}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s3)">
          <div>
            <div style="font-size:var(--txt-base);font-weight:700">📍 ${s.nome}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:2px">
              ${funcoes.length} função(ões) · ${numAvs} avaliação(ões)
            </div>
            ${s.descricaoAmbiente ? `<div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s1)">${s.descricaoAmbiente.slice(0,80)}${s.descricaoAmbiente.length>80?'…':''}</div>` : ''}
          </div>
          <div style="display:flex;gap:var(--s2)">
            <button class="btn btn-fantasma btn-sm" onclick="ModuloProjeto.abrirFormSetor('${s.id}')">✏️</button>
            <button class="btn btn-perigo btn-sm" onclick="ModuloProjeto.excluirSetor('${s.id}')">🗑️</button>
          </div>
        </div>

        <!-- Funções -->
        <div style="border-top:1px solid var(--borda);padding-top:var(--s3)">
          ${funcoes.length === 0
            ? `<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhuma função.</p>`
            : funcoes.map(f => `
                <div class="item-funcao">
                  <div style="flex:1">
                    <div style="font-size:var(--txt-sm);font-weight:600">👷 ${f.nome}</div>
                    <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                      ${f.numTrabalhadores ? f.numTrabalhadores+' trab.' : ''}
                      ${f.turno ? '· '+f.turno : ''}
                      ${f.grupoHomogeneo ? '· GHE: '+f.grupoHomogeneo : ''}
                    </div>
                  </div>
                  <button class="btn btn-fantasma btn-sm" onclick="ModuloProjeto.abrirFormFuncao('${s.id}','${f.id}')">✏️</button>
                  <button class="btn btn-perigo btn-sm" onclick="ModuloProjeto.excluirFuncao('${f.id}')">🗑️</button>
                </div>
              `).join('')}
          <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s2);font-size:var(--txt-xs)"
                  onclick="ModuloProjeto.abrirFormFuncao('${s.id}')">
            + Adicionar Função
          </button>
        </div>
      </div>
    `;
  }

  function abrirFormSetor(setorId) {
    const proj = App.obterProjetoAtual();
    const s    = setorId ? Storage.buscarSetor(setorId) : Storage.criarSetor(proj.id);
    document.getElementById('modal-ps-titulo').textContent = setorId ? 'Editar Setor' : 'Novo Setor';
    document.getElementById('modal-ps-form').innerHTML = `
      <div class="grupo-campo">
        <label>Nome do Setor / Área</label>
        <input type="text" id="ps-nome" placeholder="Ex.: Produção, Administrativo" value="${s.nome||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição do Ambiente</label>
        <textarea id="ps-amb" rows="3" placeholder="Descreva o ambiente de trabalho...">${s.descricaoAmbiente||''}</textarea>
      </div>
      <div class="grupo-campo">
        <label>Observações</label>
        <textarea id="ps-obs" rows="2" placeholder="Observações adicionais...">${s.observacoes||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1" onclick="ModuloProjeto.salvarSetor('${s.id}','${proj.id}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloProjeto.fecharModal('modal-proj-setor')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-proj-setor').classList.remove('oculto');
  }

  function salvarSetor(id, projetoId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const s   = Storage.buscarSetor(id) || { id };
    s.nome              = get('ps-nome');
    s.projetoId         = projetoId;
    s.descricaoAmbiente = get('ps-amb');
    s.observacoes       = get('ps-obs');
    if (!s.nome) { App.mostrarToast('Informe o nome do setor','erro'); return; }
    Storage.salvarSetor(s);
    fecharModal('modal-proj-setor');
    App.mostrarToast('Setor salvo','sucesso');
    trocarSecao('setores');
  }

  function excluirSetor(id) {
    const s = Storage.buscarSetor(id);
    const avs = Storage.listar().filter(a => a.setorId === id).length;
    if (!confirm(`Excluir setor "${s?.nome}"${avs>0?' e suas '+avs+' avaliação(ões)':''}?`)) return;
    Storage.listar().filter(a => a.setorId === id).forEach(a => Storage.excluir(a.id));
    Storage.excluirSetor(id);
    App.mostrarToast('Setor excluído','sucesso');
    trocarSecao('setores');
  }

  function abrirFormFuncao(setorId, funcaoId) {
    const proj = App.obterProjetoAtual();
    const f    = funcaoId ? Storage.buscarFuncao(funcaoId) : Storage.criarFuncao(proj.id, setorId);
    document.getElementById('modal-pf-titulo').textContent = funcaoId ? 'Editar Função' : 'Nova Função';
    document.getElementById('modal-pf-form').innerHTML = `
      <div class="grupo-campo">
        <label>Nome da Função / Cargo</label>
        <input type="text" id="pf-nome" placeholder="Ex.: Operador de Prensa" value="${f.nome||''}">
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Nº de Trabalhadores (GHE)</label>
          <input type="number" id="pf-num" min="1" placeholder="Ex.: 12" value="${f.numTrabalhadores||''}">
        </div>
        <div class="grupo-campo">
          <label>Turno</label>
          <select id="pf-turno">
            <option value="">Selecione...</option>
            ${['Diurno','Vespertino','Noturno','12x36','Misto'].map(t=>`<option ${f.turno===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grupo-campo">
        <label>Grupo Homogêneo (GHE)</label>
        <input type="text" id="pf-ghe" placeholder="Ex.: GHE-01" value="${f.grupoHomogeneo||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição da Atividade</label>
        <textarea id="pf-desc" rows="3" placeholder="Principais tarefas realizadas...">${f.descricaoAtividade||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1"
                onclick="ModuloProjeto.salvarFuncao('${f.id}','${setorId}','${proj.id}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloProjeto.fecharModal('modal-proj-funcao')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-proj-funcao').classList.remove('oculto');
  }

  function salvarFuncao(id, setorId, projetoId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const f   = Storage.buscarFuncao(id) || { id };
    f.nome               = get('pf-nome');
    f.setorId            = setorId;
    f.projetoId          = projetoId;
    f.numTrabalhadores   = get('pf-num');
    f.turno              = get('pf-turno');
    f.grupoHomogeneo     = get('pf-ghe');
    f.descricaoAtividade = get('pf-desc');
    if (!f.nome) { App.mostrarToast('Informe o nome da função','erro'); return; }
    Storage.salvarFuncao(f);
    fecharModal('modal-proj-funcao');
    App.mostrarToast('Função salva','sucesso');
    trocarSecao('setores');
  }

  function excluirFuncao(id) {
    const f = Storage.buscarFuncao(id);
    if (!confirm(`Excluir função "${f?.nome}"?`)) return;
    Storage.excluirFuncao(id);
    App.mostrarToast('Função excluída','sucesso');
    trocarSecao('setores');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: AVALIAÇÕES
  ══════════════════════════════════════════════════════════ */

  function _htmlAvaliacoes() {
    const proj    = App.obterProjetoAtual();
    const avs     = Storage.listarPorProjeto(proj.id);
    const setores = Storage.listarSetores(proj.id);

    /* Agrupa avaliações por setor → função */
    const grupos = {};
    setores.forEach(s => {
      const funcoes = Storage.listarFuncoes(s.id);
      grupos[s.id]  = { setor: s, funcoes: {}, avsSoltas: [] };
      funcoes.forEach(f => { grupos[s.id].funcoes[f.id] = { funcao: f, avs: [] }; });
    });
    avs.forEach(av => {
      if (av.setorId && grupos[av.setorId]) {
        if (av.funcaoId && grupos[av.setorId].funcoes[av.funcaoId]) {
          grupos[av.setorId].funcoes[av.funcaoId].avs.push(av);
        } else {
          grupos[av.setorId].avsSoltas.push(av);
        }
      }
    });

    const listaHTML = Object.values(grupos).map(g => {
      const funcoesHTML = Object.values(g.funcoes).map(fg => {
        const avsFun = fg.avs.map(av => _htmlItemAv(av)).join('');
        return `
          <div class="item-funcao-avs">
            <div style="font-size:var(--txt-sm);font-weight:600;color:var(--texto-sec);margin-bottom:var(--s2)">
              👷 ${fg.funcao.nome}
              ${fg.funcao.numTrabalhadores ? `<span style="font-weight:400"> · ${fg.funcao.numTrabalhadores} trab.</span>` : ''}
            </div>
            ${avsFun || '<p style="font-size:var(--txt-xs);color:var(--texto-sec);padding:var(--s1) 0">Nenhuma avaliação</p>'}
            <button class="btn btn-fantasma" style="width:100%;font-size:var(--txt-xs);margin-top:var(--s2)"
                    onclick="ModuloProjeto.abrirWizardAv('${g.setor.id}','${fg.funcao.id}')">
              + Adicionar Avaliação
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="card" style="margin-bottom:var(--s4)">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:var(--s3)">
            📍 ${g.setor.nome}
          </div>
          ${funcoesHTML || '<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhuma função neste setor.</p>'}
          ${g.avsSoltas.map(av => _htmlItemAv(av)).join('')}
        </div>
      `;
    }).join('');

    /* Avaliações sem setor vinculado (legadas) */
    const avsSemSetor = avs.filter(av => !av.setorId || !grupos[av.setorId]);
    const legadasHTML = avsSemSetor.length > 0
      ? `<div class="card" style="margin-bottom:var(--s4)">
           <div style="font-weight:700;margin-bottom:var(--s3)">📋 Avaliações sem setor definido</div>
           ${avsSemSetor.map(av => _htmlItemAv(av)).join('')}
         </div>`
      : '';

    const vazioHTML = setores.length === 0 && avs.length === 0
      ? `<div class="empty-state" style="padding:var(--s6)">
           <div class="empty-icon">📊</div>
           <p>Nenhuma avaliação neste projeto.</p>
           <p style="font-size:var(--txt-sm)">Primeiro adicione setores e funções na aba <strong>Setores</strong>,
           depois crie as avaliações aqui.</p>
         </div>`
      : '';

    return `
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--s4);margin-bottom:var(--s4)">
          <div>
            <div style="font-weight:600">${avs.length} avaliação(ões)</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              AEP: ${avs.filter(a=>a.tipo==='aep').length} ·
              Psicossocial: ${avs.filter(a=>a.tipo==='psicossocial').length} ·
              AET: ${avs.filter(a=>a.tipo==='aet').length}
            </div>
          </div>
          <button class="btn btn-primario btn-sm" onclick="ModuloProjeto.abrirWizardAv()">
            + Nova Avaliação
          </button>
        </div>

        ${listaHTML}
        ${legadasHTML}
        ${vazioHTML}
      </div>

      <!-- Modal wizard de nova avaliação -->
      <div class="modal-overlay oculto" id="modal-nova-av">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-nav-titulo">Nova Avaliação</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-nova-av')">✕</button>
          </div>
          <div id="modal-nav-form"></div>
        </div>
      </div>
    `;
  }

  /* Verifica quais perfis de respondente já importaram respostas para esta avaliação */
  function _respondentesQueResponderam(av) {
    const res = { lider: false, rh: false, tecnico: false };
    if (!av?.aep) return res;
    const labels = {
      lider:   'Líder de Setor',
      rh:      'Recursos Humanos (RH)',
      tecnico: 'Técnico de Segurança / SESMT',
    };
    Object.values(av.aep).forEach(bloco => {
      if (!bloco || typeof bloco !== 'object') return;
      Object.values(bloco).forEach(resp => {
        if (!resp?.importadaDe) return;
        Object.entries(labels).forEach(([perfil, label]) => {
          if (resp.importadaDe === label) res[perfil] = true;
        });
      });
    });
    return res;
  }

  function _htmlItemAv(av) {
    const funcao    = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
    const indicaAET = av.tipo === 'aep' && (av.aep?.analise?.indicaAET || av.relatorio?.necessitaAET || false);

    let respondentesHtml = '';
    if (av.tipo === 'aep') {
      const resp = _respondentesQueResponderam(av);
      respondentesHtml = `
        <div class="item-respondentes">
          <span class="badge-respondente ${resp.lider   ? 'respondido' : 'pendente'}">👷 Líder</span>
          <span class="badge-respondente ${resp.rh      ? 'respondido' : 'pendente'}">🧑‍💼 RH</span>
          <span class="badge-respondente ${resp.tecnico ? 'respondido' : 'pendente'}">⚙️ Técnico</span>
        </div>`;
    }

    return `
      <div class="item-avaliacao" style="margin-bottom:var(--s2)"
           onclick="App.abrirAvaliacao('${av.id}')">
        <div class="item-icon">${TIPO_ICON[av.tipo]||'📋'}</div>
        <div class="item-info">
          <div class="item-empresa" style="font-size:var(--txt-sm)">
            <span class="badge-tipo badge-tipo-${av.tipo}">${TIPO_LABEL[av.tipo]||av.tipo}</span>
            ${funcao ? ' · '+funcao.nome : ''}
            ${indicaAET ? ' <span style="color:#f44336;font-size:var(--txt-xs);font-weight:700">⚠ AET indicada</span>' : ''}
          </div>
          <div class="item-meta">
            ${av.dataAvaliacao ? `<span>${_fd(av.dataAvaliacao)}</span>` : ''}
            <span class="badge ${av.status==='concluida'?'badge-sucesso':'badge-info'}">
              ${av.status==='concluida'?'Concluída':'Em andamento'}
            </span>
          </div>
          ${respondentesHtml}
        </div>
        <div onclick="event.stopPropagation()" style="display:flex;gap:var(--s1);align-items:center">
          ${indicaAET ? `<button
            style="font-size:var(--txt-xs);padding:3px 8px;border-radius:var(--raio);border:none;background:#b71c1c;color:#fff;cursor:pointer;white-space:nowrap"
            onclick="ModuloProjeto.iniciarAETdaAEP('${av.id}')">🔬 Iniciar AET</button>` : ''}
          <button class="btn-icone" onclick="App.confirmarExclusao('${av.id}')">🗑️</button>
        </div>
      </div>
    `;
  }

  function iniciarAETdaAEP(aepAvId) {
    const aepAv = Storage.buscar(aepAvId);
    if (!aepAv) { App.mostrarToast('AEP não encontrada', 'erro'); return; }
    const proj = App.obterProjetoAtual();
    if (!proj) { App.mostrarToast('Projeto não carregado', 'erro'); return; }

    /* Verifica se já existe AET para este setor/função no projeto */
    const avs = Storage.listarPorProjeto(proj.id);
    const aetExistente = avs.find(a =>
      a.tipo === 'aet' && a.setorId === aepAv.setorId && a.funcaoId === aepAv.funcaoId
    );
    if (aetExistente) {
      App.mostrarToast('Abrindo AET já existente para esta função', 'info');
      App.abrirAvaliacao(aetExistente.id);
      return;
    }

    /* Cria nova AET pré-vinculada à AEP */
    const novaAET = Storage.criarAvaliacao('aet', proj.id, aepAv.setorId, aepAv.funcaoId);
    novaAET.aetOrigemAEPId = aepAvId;
    if (!novaAET.aet) novaAET.aet = {};
    const justif = aepAv.aep?.analise?.justificativaAET || '';
    novaAET.aet.solicitante        = 'propria_iniciativa';
    novaAET.aet.motivoSolicitacao  = 'AET indicada pela Avaliação Ergonômica Preliminar (AEP) realizada nesta função.';
    if (justif) novaAET.aet.demandaApresentada = justif;
    Storage.salvar(novaAET);
    App.mostrarToast('AET criada com base na AEP', 'sucesso');
    App.abrirAvaliacao(novaAET.id);
  }

  /* Wizard de criação de avaliação (dentro do projeto) */
  function abrirWizardAv(setorId, funcaoId) {
    const proj = App.obterProjetoAtual();
    _wiz = { setorId: setorId || null, funcaoId: funcaoId || null, tipo: null };
    _renderizarWizardAv(proj);
    document.getElementById('modal-nova-av').classList.remove('oculto');
  }

  /* Tipos de projeto que definem o tipo de avaliação automaticamente */
  const _TIPO_AV_AUTO = {
    aep:          'aep',
    aep_afp:      'aep',
    integrado:    'aep',  /* legado — trata como aep_afp */
    psicossocial: 'aep',  /* segurança — nunca deveria criar avaliação por função, mas se chegar aqui usa AEP */
    /* aet: usuário escolhe entre AEP e AET */
  };

  function _renderizarWizardAv(proj) {
    const el = document.getElementById('modal-nav-form');
    if (!el) return;

    const setores  = Storage.listarSetores(proj.id);
    const tipoProj = proj?.tipo || 'aep';
    /* Projetos de tipo único têm 2 passos; AET tem 3 */
    const totalPassos = _TIPO_AV_AUTO[tipoProj] ? 2 : 3;

    if (!_wiz.setorId) {
      /* Passo 1: setor */
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 1 de ${totalPassos} — Selecione o setor:
        </div>
        ${setores.map(s => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetSetor('${s.id}')">
            <div>
              <div style="font-weight:600">📍 ${s.nome}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                ${Storage.listarFuncoes(s.id).length} função(ões)
              </div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        ${setores.length === 0 ? `<div class="aviso-tecnico aviso"><span>⚠️</span><span>Nenhum setor. Vá à aba <strong>Setores</strong> para adicionar.</span></div>` : ''}
      `;
    } else if (!_wiz.funcaoId) {
      /* Passo 2: função */
      const funcoes = Storage.listarFuncoes(_wiz.setorId);
      const set = Storage.buscarSetor(_wiz.setorId);
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 2 de ${totalPassos} — Setor: <strong>${set?.nome}</strong> · Selecione a função:
        </div>
        ${funcoes.map(f => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetFuncao('${f.id}')">
            <div>
              <div style="font-weight:600">👷 ${f.nome}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                ${f.numTrabalhadores ? f.numTrabalhadores+' trab.' : ''} ${f.turno ? '· '+f.turno : ''}
              </div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        ${funcoes.length === 0 ? `<div class="aviso-tecnico aviso"><span>⚠️</span><span>Nenhuma função neste setor.</span></div>` : ''}
        <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s3)"
                onclick="ModuloProjeto._wizVoltarSetor()">← Voltar</button>
      `;
    } else if (!_wiz.tipo) {
      /* Se o projeto determina o tipo automaticamente, cria sem mostrar passo 3 */
      const tipoAuto = _TIPO_AV_AUTO[tipoProj];
      if (tipoAuto) { _wizSetTipo(tipoAuto); return; }

      /* Passo 3: tipo — só para AET / integrado */
      const funcao = Storage.buscarFuncao(_wiz.funcaoId);
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 3 de 3 — <strong>${funcao?.nome}</strong> · Tipo de análise:
        </div>
        ${[
          { tipo:'aep', icone:'📋', titulo:'AEP', desc:'Avaliação Ergonômica Preliminar — primeira etapa obrigatória' },
          { tipo:'aet', icone:'🔬', titulo:'AET', desc:'Análise Ergonômica do Trabalho — aprofundamento indicado pela AEP' },
        ].map(op => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetTipo('${op.tipo}')">
            <div>
              <div style="font-weight:600">${op.icone} ${op.titulo}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">${op.desc}</div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s3)"
                onclick="ModuloProjeto._wizVoltarFuncao()">← Voltar</button>
      `;
    }
  }

  function _wizSetSetor(id)  { _wiz.setorId = id; _renderizarWizardAv(App.obterProjetoAtual()); }

  function _wizSetFuncao(id) {
    _wiz.funcaoId = id;
    const proj    = App.obterProjetoAtual();
    const tipoAuto = _TIPO_AV_AUTO[proj?.tipo];
    if (tipoAuto) {
      /* Projeto de tipo único — cria a avaliação diretamente, sem passo 3 */
      _wizSetTipo(tipoAuto);
      return;
    }
    _renderizarWizardAv(proj);
  }

  function _wizVoltarSetor() { _wiz.setorId = null; _wiz.funcaoId = null; _renderizarWizardAv(App.obterProjetoAtual()); }
  function _wizVoltarFuncao(){ _wiz.funcaoId = null; _renderizarWizardAv(App.obterProjetoAtual()); }

  function _wizSetTipo(tipo) {
    _wiz.tipo = tipo;
    fecharModal('modal-nova-av');
    const proj = App.obterProjetoAtual();
    const av   = Storage.criarAvaliacao(tipo, proj.id, _wiz.setorId, _wiz.funcaoId);
    Storage.salvar(av);
    App.abrirAvaliacao(av.id);
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: PLANO DE AÇÃO (consolidado do projeto)
  ══════════════════════════════════════════════════════════ */

  function _htmlPlano() {
    const proj = App.obterProjetoAtual();
    const avs  = Storage.listarPorProjeto(proj.id);

    /* Consolida planoAcao de todas as avaliações do projeto */
    const todasAcoes = [];
    avs.forEach(av => {
      const setor  = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
      const funcao = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
      (av.planoAcao || []).forEach(acao => {
        todasAcoes.push({ ...acao, _avId: av.id, _tipo: av.tipo,
          _setor: setor?.nome || '', _funcao: funcao?.nome || '' });
      });
    });

    /* Ações psicossociais (nível projeto) */
    const acoesPsi = proj.planoAcaoPsicossocial || [];
    const aprovadosPsiCount = (proj.consolidacaoPsicossocial?.riscosConsolidados || []).filter(r => r.decisao === 'aprovado').length;

    /* Não retorna cedo — sempre mostra o formulário de nova ação */

    const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
    const _fdl = iso => _fd(iso);

    const porPrioridade = (lista, p) => lista.filter(a => a.prioridade === p);
    const altas  = porPrioridade(todasAcoes, 'alta');
    const medias = porPrioridade(todasAcoes, 'media');
    const baixas = porPrioridade(todasAcoes, 'baixa');
    const concl  = todasAcoes.filter(a => a.status === 'concluido').length;

    const ORIGEM_L = { aep_motor: '⚙️ AEP auto', afp_medidas: '🧠 AFP', manual: '✏️ Manual' };
    const MEDIDA_OPTS = ['','engenharia','administrativa','organizacional','epi'];
    const MEDIDA_L = { engenharia:'Engenharia', administrativa:'Administrativa', organizacional:'Organizacional', epi:'EPI/EPC' };

    const listaHTML = todasAcoes.map(acao => `
      <div class="item-plano prioridade-${acao.prioridade}" id="item-acao-${acao.id}">
        <div class="item-plano-header">
          <div style="flex:1">
            <div class="item-plano-titulo">${acao.descricao}</div>
            <div class="item-plano-meta" style="flex-wrap:wrap;gap:4px">
              <span class="status-chip status-${acao.status}">${STATUS_L[acao.status]||acao.status}</span>
              <span class="badge-tipo badge-tipo-${acao._tipo}">${TIPO_LABEL[acao._tipo]||acao._tipo}</span>
              ${acao.origem ? `<span style="font-size:10px;opacity:.7">${ORIGEM_L[acao.origem]||acao.origem}</span>` : ''}
              ${acao._setor ? `<span>📍 ${acao._setor}</span>` : ''}
              ${acao._funcao ? `<span>👷 ${acao._funcao}</span>` : ''}
            </div>
          </div>
          <button onclick="ModuloProjeto.excluirAcao('${acao._avId}','${acao.id}')"
                  title="Excluir" style="flex-shrink:0;padding:4px 8px;border-radius:var(--r2);
                  border:1px solid var(--borda);background:transparent;color:var(--texto-sec);cursor:pointer">
            🗑️
          </button>
        </div>

        <!-- Campos editáveis inline -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-top:var(--s3)">
          <div class="grupo-campo" style="margin:0">
            <label style="font-size:10px">Responsável</label>
            <input type="text" value="${acao.responsavel || ''}" placeholder="Nome / setor"
                   style="font-size:var(--txt-xs)"
                   onchange="ModuloProjeto.salvarCampoAcao('${acao._avId}','${acao.id}','responsavel',this.value)">
          </div>
          <div class="grupo-campo" style="margin:0">
            <label style="font-size:10px">Prazo</label>
            <input type="date" value="${acao.prazo || ''}"
                   style="font-size:var(--txt-xs)"
                   onchange="ModuloProjeto.salvarCampoAcao('${acao._avId}','${acao.id}','prazo',this.value)">
          </div>
          <div class="grupo-campo" style="margin:0">
            <label style="font-size:10px">Tipo de Medida</label>
            <select style="font-size:var(--txt-xs)"
                    onchange="ModuloProjeto.salvarCampoAcao('${acao._avId}','${acao.id}','medida',this.value)">
              ${MEDIDA_OPTS.map(m => `<option value="${m}" ${acao.medida===m?'selected':''}>${m ? MEDIDA_L[m]||m : 'Selecione…'}</option>`).join('')}
            </select>
          </div>
          <div class="grupo-campo" style="margin:0">
            <label style="font-size:10px">Prioridade</label>
            <select style="font-size:var(--txt-xs)"
                    onchange="ModuloProjeto.salvarCampoAcao('${acao._avId}','${acao.id}','prioridade',this.value)">
              ${['alta','media','baixa'].map(p => `<option value="${p}" ${acao.prioridade===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Status -->
        <div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">
          ${['pendente','em_andamento','concluido'].map(s => `
            <button class="btn btn-sm ${acao.status===s?'btn-primario':'btn-secundario'}"
                    onclick="ModuloProjeto.alterarStatusAcao('${acao._avId}','${acao.id}','${s}')">
              ${STATUS_L[s]}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div class="container">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2);margin-top:var(--s4);margin-bottom:var(--s5)">
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--perigo)">${altas.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Alta Prior.</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--aviso)">${medias.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Média Prior.</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--sucesso)">${concl}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Concluídas</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700">${todasAcoes.length + acoesPsi.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Total</div>
          </div>
        </div>

        <!-- Ações Psicossociais -->
        ${aprovadosPsiCount > 0 ? `
        <div class="card" style="margin-bottom:var(--s4)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3)">
            <div class="card-titulo" style="margin:0">🧠 Ações Psicossociais (${acoesPsi.length}/${aprovadosPsiCount} geradas)</div>
            <button class="btn btn-secundario btn-sm" onclick="ModuloProjeto.gerarAcoesPsicossocial()">
              ${acoesPsi.length < aprovadosPsiCount ? '⚡ Gerar do Psicossocial' : '🔄 Atualizar do Psicossocial'}
            </button>
          </div>
          ${acoesPsi.length === 0 ? `
          <p style="font-size:var(--txt-xs);color:var(--texto-sec)">
            Você tem ${aprovadosPsiCount} risco(s) psicossocial(is) aprovado(s) na Consolidação.
            Clique em "Gerar do Psicossocial" para criar as ações correspondentes.
          </p>` : `
          ${acoesPsi.map(acao => {
            const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
            return `<div class="item-plano prioridade-${acao.prioridade}" id="item-acao-psi-${acao.id}">
              <div class="item-plano-header">
                <div style="flex:1">
                  ${acao.risco ? `<div style="font-size:10px;color:var(--texto-sec);margin-bottom:4px">🧠 ${acao.risco}</div>` : ''}
                  <div class="item-plano-titulo">${acao.descricao}</div>
                  <div class="item-plano-meta">
                    <span class="status-chip status-${acao.status}">${STATUS_L[acao.status]||acao.status}</span>
                    <span class="badge-tipo badge-tipo-psicossocial">AFP</span>
                    ${acao.responsavel ? `<span>👤 ${acao.responsavel}</span>` : ''}
                    ${acao.prazo ? `<span>📅 ${acao.prazo}</span>` : ''}
                  </div>
                </div>
                <button onclick="ModuloProjeto.excluirAcaoPsi('${acao.id}')"
                        title="Excluir" style="flex-shrink:0;padding:4px 8px;border-radius:var(--r2);border:1px solid var(--borda);background:transparent;color:var(--texto-sec);cursor:pointer">
                  🗑️
                </button>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2);margin-top:var(--s3)">
                <div class="grupo-campo" style="margin:0">
                  <label style="font-size:10px">Responsável</label>
                  <input type="text" value="${acao.responsavel||''}" placeholder="Nome / setor" style="font-size:var(--txt-xs)"
                         onchange="ModuloProjeto.salvarCampoAcaoPsi('${acao.id}','responsavel',this.value)">
                </div>
                <div class="grupo-campo" style="margin:0">
                  <label style="font-size:10px">Prazo</label>
                  <input type="date" value="${acao.prazo||''}" style="font-size:var(--txt-xs)"
                         onchange="ModuloProjeto.salvarCampoAcaoPsi('${acao.id}','prazo',this.value)">
                </div>
              </div>
              <div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">
                ${['pendente','em_andamento','concluido'].map(s => `
                  <button class="btn btn-sm ${acao.status===s?'btn-primario':'btn-secundario'}"
                          onclick="ModuloProjeto.alterarStatusAcaoPsi('${acao.id}','${s}')">
                    ${STATUS_L[s]}
                  </button>
                `).join('')}
              </div>
            </div>`;
          }).join('')}`}
        </div>` : ''}

        <!-- Nova ação manual -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">➕ Nova Ação Manual</div>
          <div class="grupo-campo">
            <label>Descrição da ação</label>
            <textarea id="nova-acao-descricao" rows="2" placeholder="Descreva a ação corretiva ou preventiva..."></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
            <div class="grupo-campo" style="margin:0">
              <label>Responsável</label>
              <input type="text" id="nova-acao-resp" placeholder="Nome / setor">
            </div>
            <div class="grupo-campo" style="margin:0">
              <label>Prazo</label>
              <input type="date" id="nova-acao-prazo">
            </div>
            <div class="grupo-campo" style="margin:0">
              <label>Prioridade</label>
              <select id="nova-acao-prio">
                <option value="alta">Alta</option>
                <option value="media" selected>Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div class="grupo-campo" style="margin:0">
              <label>Tipo de Medida</label>
              <select id="nova-acao-medida">
                <option value="">Selecione…</option>
                <option value="engenharia">Engenharia</option>
                <option value="administrativa">Administrativa</option>
                <option value="organizacional">Organizacional</option>
                <option value="epi">EPI/EPC</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primario" style="margin-top:var(--s3);width:100%"
                  onclick="ModuloProjeto.adicionarAcaoManual()">
            ➕ Adicionar ao Plano
          </button>
        </div>

        ${todasAcoes.length === 0 ? `
          <div class="aviso-tecnico info" style="margin-top:var(--s4)">
            <span>💡</span>
            <span>Para gerar ações automaticamente: acesse uma <strong>Avaliação AEP → aba Análise → 📋 Gerar Plano de Ação</strong>,
            ou <strong>Avaliação AFP → aba Análise → 📋 Gerar Plano de Ação</strong>.
            As ações aparecerão consolidadas aqui.</span>
          </div>` : listaHTML}
      </div>
    `;
  }

  function salvarCampoAcao(avId, acaoId, campo, valor) {
    const av = Storage.buscar(avId);
    if (!av) return;
    const acao = (av.planoAcao || []).find(a => a.id === acaoId);
    if (acao) { acao[campo] = valor; Storage.salvar(av); }
    const avAtual = App.obterAvaliacaoAtual();
    if (avAtual?.id === avId) {
      const a2 = (avAtual.planoAcao || []).find(a => a.id === acaoId);
      if (a2) a2[campo] = valor;
    }
  }

  function excluirAcao(avId, acaoId) {
    const av = Storage.buscar(avId);
    if (!av) return;
    av.planoAcao = (av.planoAcao || []).filter(a => a.id !== acaoId);
    Storage.salvar(av);
    const avAtual = App.obterAvaliacaoAtual();
    if (avAtual?.id === avId) avAtual.planoAcao = av.planoAcao;
    /* Remove o item do DOM sem re-renderizar tudo */
    document.getElementById(`item-acao-${acaoId}`)?.remove();
    App.mostrarToast('Ação removida', 'sucesso');
  }

  function adicionarAcaoManual() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const descricao = document.getElementById('nova-acao-descricao')?.value?.trim();
    if (!descricao) { App.mostrarToast('Preencha a descrição da ação', 'aviso'); return; }

    /* Adiciona na primeira avaliação do projeto (ou cria lista genérica no projeto) */
    const avs = Storage.listarPorProjeto(proj.id);
    const av  = avs[0];
    if (!av) { App.mostrarToast('Projeto sem avaliações — crie uma avaliação primeiro', 'aviso'); return; }

    if (!av.planoAcao) av.planoAcao = [];
    av.planoAcao.push({
      id:          Storage.gerarId('acao'),
      descricao,
      prioridade:  document.getElementById('nova-acao-prio')?.value  || 'media',
      prazo:       document.getElementById('nova-acao-prazo')?.value || '',
      responsavel: document.getElementById('nova-acao-resp')?.value?.trim() || '',
      medida:      document.getElementById('nova-acao-medida')?.value || '',
      status:      'pendente',
      origem:      'manual',
      criadaEm:    new Date().toISOString(),
    });
    Storage.salvar(av);
    App.mostrarToast('Ação adicionada ao plano', 'sucesso');
    _renderizarConteudo('plano');
  }

  function alterarStatusAcao(avId, acaoId, novoStatus) {
    const av = Storage.buscar(avId);
    if (!av) return;
    const acao = av.planoAcao?.find(a => a.id === acaoId);
    if (acao) { acao.status = novoStatus; Storage.salvar(av); }
    /* Também atualiza avaliação em memória se for a atual */
    const avAtual = App.obterAvaliacaoAtual();
    if (avAtual?.id === avId) {
      const a2 = avAtual.planoAcao?.find(a => a.id === acaoId);
      if (a2) a2.status = novoStatus;
    }
    App.mostrarToast('Status atualizado','sucesso');
    trocarSecao('plano');
  }

  /* ── Ações psicossociais (nível projeto) ────────────────── */
  function gerarAcoesPsicossocial() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const aprovados = (proj.consolidacaoPsicossocial?.riscosConsolidados || []).filter(r => r.decisao === 'aprovado');
    if (!aprovados.length) { App.mostrarToast('Nenhum risco psicossocial aprovado na Consolidação', 'aviso'); return; }
    if (!proj.planoAcaoPsicossocial) proj.planoAcaoPsicossocial = [];
    let n = 0;
    aprovados.forEach(r => {
      const estrategia = r.estrategia?.trim() || '';
      const acaoPlano  = r.acaoPlano?.trim() || '';
      const descricao  = acaoPlano || estrategia || `Implementar medidas de controle: ${r.titulo}`;
      const existing   = proj.planoAcaoPsicossocial.find(a => a.origemId === r.id);
      if (existing) {
        /* Atualiza descrição se acaoPlano ou estratégia foram preenchidos depois */
        if (acaoPlano) existing.descricao = acaoPlano;
        else if (estrategia) existing.descricao = estrategia;
        return;
      }
      proj.planoAcaoPsicossocial.push({
        id:         Storage.gerarId('psi'),
        origemId:   r.id,
        risco:      r.titulo,
        descricao,
        prioridade: 'media',
        prazo:      '',
        responsavel:'',
        status:     'pendente',
        criadaEm:   new Date().toISOString(),
      });
      n++;
    });
    Storage.salvarProjeto(proj);
    if (n) {
      App.mostrarToast(`${n} ação(ões) psicossocial(is) gerada(s)`, 'sucesso');
    } else {
      App.mostrarToast('Plano atualizado com as estratégias da Consolidação', 'sucesso');
    }
    _renderizarConteudo('plano');
  }

  function alterarStatusAcaoPsi(acaoId, novoStatus) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const acao = (proj.planoAcaoPsicossocial || []).find(a => a.id === acaoId);
    if (acao) { acao.status = novoStatus; Storage.salvarProjeto(proj); }
    App.mostrarToast('Status atualizado', 'sucesso');
    _renderizarConteudo('plano');
  }

  function salvarCampoAcaoPsi(acaoId, campo, valor) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const acao = (proj.planoAcaoPsicossocial || []).find(a => a.id === acaoId);
    if (acao) { acao[campo] = valor; Storage.salvarProjeto(proj); }
  }

  function excluirAcaoPsi(acaoId) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    proj.planoAcaoPsicossocial = (proj.planoAcaoPsicossocial || []).filter(a => a.id !== acaoId);
    Storage.salvarProjeto(proj);
    document.getElementById(`item-acao-psi-${acaoId}`)?.remove();
    App.mostrarToast('Ação removida', 'sucesso');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO CONSOLIDADO
  ══════════════════════════════════════════════════════════ */

  async function _renderizarRelatorio(el) {
    el.innerHTML = '<div class="container" style="padding-top:var(--s6)"><div class="loading-inline">Gerando relatório...</div></div>';

    const proj  = App.obterProjetoAtual();
    const isAFP = proj && _TIPOS_COM_AFP.has(proj.tipo);

    let afpDados = null;
    if (isAFP && typeof listarCampanhas === 'function') {
      try {
        const campanhas     = await listarCampanhas(proj.id);
        const comRespostas  = campanhas
          .filter(c => c.totalRespostas > 0)
          .sort((a, b) => ((b.criadoEm || '') > (a.criadoEm || '') ? 1 : -1));
        if (comRespostas.length > 0) {
          const c = comRespostas[0];
          const [relatorio, campanha] = await Promise.all([
            calcularRelatorio(c.id, c.minRespostasSetor || 5),
            buscarCampanha(c.id),
          ]);
          afpDados = { relatorio, campanha: campanha || c };
          _afpCampanhaCache = { id: c.id, minRespostas: c.minRespostasSetor || 5 };
          ModuloPesquisaAdmin.definirCacheRelatorio(relatorio, campanha || c);
        }
      } catch (e) {
        console.warn('AFP: erro ao carregar dados da pesquisa —', e.message);
      }
    }

    el.innerHTML = _htmlRelatorio(afpDados);
    window.addEventListener('beforeprint', _sincronizarMarcaProjeto);
  }

  function _htmlRelatorio(afpDados, soAEP = false) {
    const proj    = App.obterProjetoAtual();
    const emp     = Storage.buscarEmpresa(proj.empresaId);
    const setores = Storage.listarSetores(proj.id);
    const avs     = Storage.listarPorProjeto(proj.id);
    _nrProjetoAtual = `LAUDO-${(emp?.nome||proj.nome||'ERG').replace(/\s+/g,'').slice(0,4).toUpperCase()}-${new Date().getFullYear()}`;
    const _dataEmissao = _fd(new Date().toISOString().slice(0,10));

    /* ── Flags de tipo ── */
    const isAEP   = ['aep','aep_afp','integrado'].includes(proj.tipo);
    const isAFP   = ['psicossocial','aep_afp','integrado'].includes(proj.tipo);
    const isAFP_r = isAFP && !soAEP; /* AFP relevante para este modo de impressão */
    const isMisto = ['aep_afp','integrado'].includes(proj.tipo);
    const avsAEP  = avs.filter(av => av.tipo === 'aep');
    const avsFP   = avs.filter(av => av.tipo === 'psicossocial');

    /* ── Totais gerais ── */
    const totalAlt   = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.alto  || 0), 0);
    const totalMed   = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.medio || 0), 0);
    const totalBx    = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.baixo || 0), 0);
    const totalAcoes = avs.reduce((n, a) => n + (a.planoAcao?.length || 0), 0);
    const totalTrab  = setores.reduce((n, s) =>
      n + Storage.listarFuncoes(s.id).reduce((m, f) => m + (parseInt(f.numTrabalhadores) || 0), 0), 0);

    /* ── Numeração dinâmica de seções ── */
    let _n = 1;
    const secID      = _n++;
    const secObj     = proj.objetivo ? _n++ : null;
    const secMet     = _n++;
    const secCar     = _n++;
    const secResAEP   = isAEP && avsAEP.length > 0 ? _n++ : null;
    const temDadosAFP = isAFP_r && (afpDados?.relatorio?.totalRespostas > 0);
    const secResAFP   = temDadosAFP ? _n++ : null;
    const aprovadosPsi   = (proj.consolidacaoPsicossocial?.riscosConsolidados || []).filter(r => r.decisao === 'aprovado');
    const acoesPsi       = proj.planoAcaoPsicossocial || [];
    const secRiscoPsi    = aprovadosPsi.length > 0 ? _n++ : null;
    const temOrientacoes = aprovadosPsi.some(r => r.estrategia || r.textoGRO);
    const secOrientacoes = temOrientacoes ? _n++ : null;
    const secPlano       = _n++;
    const secConc    = _n++;
    const secAssin   = _n++;

    /* ── Metodologia por tipo ── */
    const metodoMap = {
      aep:          'A Avaliação Ergonômica Preliminar (AEP) foi conduzida conforme a metodologia preconizada pela NR-17 (Portaria MTP n.º 1.467/2023) por meio de visita técnica in loco. A avaliação consistiu na aplicação do Checklist NR-17 organizado em blocos temáticos (organização do trabalho, movimentação de cargas, mobiliário, máquinas/equipamentos, ambiente físico, exigências cognitivas e fatores psicossociais), com identificação e classificação de não conformidades segundo a Matriz de Risco Ergonômico GRO/PGR, análise das exposições ergonômicas e cálculo do Score de Criticidade por posto de trabalho.',
      psicossocial: 'A Avaliação de Fatores Psicossociais (AFP) foi conduzida por meio da pesquisa COPSOQ-III Brasil (versão reduzida), aplicada de forma anônima e coletiva ao grupo de trabalhadores. Os resultados foram consolidados por dimensão psicossocial e classificados como Favorável, Intermediário ou Desfavorável. Conforme preceito ético, os resultados não permitem a individualização de respostas, sendo apresentados exclusivamente em nível de grupo.',
      aep_afp:      'A avaliação integrada AEP + AFP combinou duas metodologias complementares: (1) Avaliação Ergonômica Preliminar com aplicação do Checklist NR-17 por posto de trabalho, cálculo do Score de Criticidade e classificação de riscos conforme Matriz GRO/PGR; e (2) pesquisa COPSOQ-III Brasil aplicada de forma anônima ao grupo de trabalhadores, com resultados consolidados em nível de setor.',
      aet:          'A Análise Ergonômica do Trabalho (AET) foi realizada mediante observação sistemática das atividades, análise da tarefa prescrita e real, avaliação das condições físicas, cognitivas e organizacionais do trabalho, com emissão de recomendações técnicas de intervenção ergonômica.',
      integrado:    'A avaliação integrada compreendeu a Avaliação Ergonômica Preliminar (AEP), a Avaliação de Fatores Psicossociais (AFP/COPSOQ-III) e a Análise Ergonômica do Trabalho (AET), integrando as condições físicas, psicossociais e organizacionais em uma abordagem sistêmica da ergonomia.',
    };

    /* ── Normas aplicáveis ── */
    const normasRows = [
      { n: 'NR-17 — Ergonomia',                    r: 'Portaria MTP n.º 1.467/2023' },
      { n: 'NR-01 — Disposições Gerais / GRO-PGR', r: 'Portaria MTPS n.º 3.214/1978 · Portaria MTPS n.º 6.730/2020' },
      ...(isAFP_r ? [{ n: 'COPSOQ-III Brasil (versão reduzida)', r: 'Ferramenta de Avaliação de Fatores Psicossociais', cls: 'rpt-secao-afp' }] : []),
      { n: 'Manual de Aplicação da NR-17',          r: 'Secretaria de Inspeção do Trabalho — SIT/MTb' },
      { n: 'ABNT NBR ISO 9241-210',                 r: 'Ergonomia da interação humano-sistema' },
    ].map(({n, r, cls}) => `<tr${cls ? ` class="${cls}"` : ''}><td style="font-weight:600;width:50%">${n}</td><td style="text-align:left">${r}</td></tr>`).join('');

    /* ── Tabela de escopo: setores / funções ── */
    const tabelaEscopo = setores.flatMap(s => {
      const funcs = Storage.listarFuncoes(s.id);
      if (!funcs.length) return [`<tr>
        <td style="font-weight:600">${s.nome}</td>
        <td colspan="4" style="color:var(--texto-sec);font-size:var(--txt-xs)">Sem funções cadastradas</td>
      </tr>`];
      return funcs.map((f, i) => {
        const avsF    = avs.filter(a => a.funcaoId === f.id);
        const tiposAv = [...new Set(avsF.map(a => TIPO_LABEL[a.tipo] || a.tipo))].join(', ');
        const tdSetor = i === 0
          ? `<td rowspan="${funcs.length}" style="font-weight:600;vertical-align:middle;border-right:2px solid #0D47A1">${s.nome}</td>`
          : '';
        return `<tr>${tdSetor}
          <td style="text-align:left">${f.nome}</td>
          <td style="text-align:center">${f.numTrabalhadores || '—'}</td>
          <td style="text-align:left;font-size:var(--txt-xs)">${f.atividadesPrincipais?.slice(0, 70) || '—'}</td>
          <td style="text-align:center;font-size:var(--txt-xs)">${tiposAv || '—'}</td>
        </tr>`;
      });
    }).join('');

    /* ── Resultados AEP por função ── */
    const NIVEL_COR = { baixo: '#4caf50', medio: '#ff9800', alto: '#f44336', critico: '#b71c1c' };
    const PRIO_L    = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
    const HIER_L    = { eliminacao: 'Eliminação', reducao: 'Redução', administrativo: 'Administrativo', monitoramento: 'Monitoramento' };
    const linhasAEP = avsAEP.map(av => {
      const s         = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
      const f         = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
      const riscos    = ModuloAEP.calcularRiscoGeral(av);
      const score     = ModuloAEP.MOTOR_AEP.calcularScore(av);
      const nivel     = av.aep?.analise?.nivelRiscoGeral || ModuloAEP.MOTOR_AEP.sugerirNivel(score.valor);
      const prior     = av.aep?.analise?.prioridadeIntervencao || '';
      const ncs       = ModuloAEP.obterNaoConformes(av);
      const ncAlt     = ncs.filter(nc => nc.risco === 'alto').length;
      const ncMed     = ncs.filter(nc => nc.risco === 'medio').length;
      const corSc     = score.valor > 60 ? '#f44336' : score.valor > 30 ? '#ff9800' : '#4caf50';
      const nivelStr  = nivel ? nivel.charAt(0).toUpperCase() + nivel.slice(1) : '—';
      const indicaAET = av.aep?.analise?.indicaAET || av.relatorio?.necessitaAET || false;
      const justifAET = av.aep?.analise?.justificativaAET || av.relatorio?.justificativaAET || '';
      return `<tr>
        <td style="font-weight:600;text-align:left">${f?.nome || '—'}</td>
        <td style="text-align:left">${s?.nome || '—'}</td>
        <td style="text-align:center">${f?.numTrabalhadores || '—'}</td>
        <td style="text-align:center;font-weight:700;color:${corSc}">${score.valor}</td>
        <td style="text-align:center;font-weight:700;color:${NIVEL_COR[nivel] || '#888'}">${nivelStr}</td>
        <td style="text-align:center">${ncAlt > 0 ? `<span style="color:#f44336;font-weight:700">${ncAlt}</span>` : '0'}</td>
        <td style="text-align:center">${ncMed > 0 ? `<span style="color:#ff9800;font-weight:700">${ncMed}</span>` : '0'}</td>
        <td style="font-size:var(--txt-xs)">${prior ? PRIO_L[prior] || prior : '—'}</td>
        <td style="text-align:center;font-weight:700;color:${indicaAET ? '#f44336' : '#4caf50'}">${indicaAET ? '⚠ Sim' : '—'}</td>
        <td style="font-size:var(--txt-xs)">${_fd(av.dataAvaliacao)}</td>
      </tr>`;
    }).join('');

    /* Funções que requerem AET — para o bloco de destaque */
    const funcoesComAET = avsAEP
      .filter(av => av.aep?.analise?.indicaAET || av.relatorio?.necessitaAET)
      .map(av => ({
        funcao:  av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null,
        setor:   av.setorId  ? Storage.buscarSetor(av.setorId)   : null,
        justif:  av.aep?.analise?.justificativaAET || av.relatorio?.justificativaAET || '',
      }));
    const blocoAET = funcoesComAET.length > 0 ? `
      <div style="border:2px solid #f44336;border-radius:6px;padding:var(--s3) var(--s4);margin-top:var(--s3);background:#fff5f5">
        <div style="font-weight:700;color:#f44336;margin-bottom:var(--s2);font-size:var(--txt-sm)">
          ⚠ Funções que Indicam Necessidade de AET (${funcoesComAET.length})
        </div>
        ${funcoesComAET.map(item => `
          <div style="display:flex;gap:var(--s2);padding:var(--s2) 0;border-bottom:1px solid #fdd;font-size:var(--txt-sm)">
            <span style="flex:1;font-weight:600">${item.funcao?.nome || '—'}</span>
            <span style="color:var(--texto-sec);font-size:var(--txt-xs)">${item.setor?.nome || ''}</span>
          </div>
          ${item.justif ? `<div style="font-size:var(--txt-xs);color:#555;padding:2px 0 var(--s2) var(--s2)">${item.justif}</div>` : ''}
        `).join('')}
      </div>` : '';

    /* ── Resultados AFP por avaliação ── */
    const NIVEL_AFP = {
      favoravel:     { t: 'Favorável',     c: '#4caf50' },
      intermediario: { t: 'Intermediário', c: '#ff9800' },
      desfavoravel:  { t: 'Desfavorável',  c: '#f44336' },
      sem_dados:     { t: 'Sem dados',     c: '#888'    },
    };
    const linhasAFP = avsFP.map(av => {
      const s   = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
      const f   = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
      const ps  = av.psicossocial || {};
      const g   = ps.grupoAvaliado || {};
      const res = ModuloCOPSOQ?.calcularResultados?.(av) || {};
      const dims = Object.entries(res);
      const nFav   = dims.filter(([, v]) => v.nivel === 'favoravel').length;
      const nInt   = dims.filter(([, v]) => v.nivel === 'intermediario').length;
      const nDesf  = dims.filter(([, v]) => v.nivel === 'desfavoravel').length;
      const criticos = dims.filter(([, v]) => v.nivel === 'desfavoravel').map(([d]) => d).join(', ');
      return `<tr>
        <td style="font-weight:600">${g.descricao || f?.nome || s?.nome || '—'}</td>
        <td>${s?.nome || '—'}</td>
        <td style="text-align:center">${g.numParticipantes || f?.numTrabalhadores || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#4caf50">${nFav}</td>
        <td style="text-align:center;font-weight:700;color:#ff9800">${nInt}</td>
        <td style="text-align:center;font-weight:700;color:#f44336">${nDesf}</td>
        <td style="font-size:var(--txt-xs)">${criticos || '—'}</td>
        <td style="font-size:var(--txt-xs)">${_fd(g.dataColeta || av.dataAvaliacao)}</td>
      </tr>`;
    }).join('');

    /* ── Dados AFP vindos da pesquisa (Firestore) ── */
    const afpR = afpDados?.relatorio;
    const NIVEL_AFP_COR = { favoravel: '#4caf50', intermediario: '#ff9800', desfavoravel: '#f44336', sem_dados: '#888' };
    const NIVEL_AFP_T   = { favoravel: 'Favorável', intermediario: 'Intermediário', desfavoravel: 'Desfavorável', sem_dados: 'Sem dados' };
    const dimAFPLinhas  = (afpR?.consolidado || []).map(d => `<tr>
      <td style="font-weight:600;text-align:left">${d.nome}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:10px;border-radius:999px;min-width:60px;background:linear-gradient(to right,${NIVEL_AFP_COR[d.nivel]||'#888'} ${d.media??0}%,#e0e0e0 ${d.media??0}%);-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
          <span style="font-weight:700;min-width:28px;text-align:right">${d.media ?? '—'}</span>
        </div>
      </td>
      <td style="text-align:center;font-weight:700;color:${NIVEL_AFP_COR[d.nivel] || '#888'}">${NIVEL_AFP_T[d.nivel] || '—'}</td>
    </tr>`).join('');
    const afpSetorEntries = Object.entries(afpR?.porSetor || {});
    const afpSetorLinhas  = afpSetorEntries.map(([nome, dados]) => {
      if (dados.insuficiente) {
        return `<tr><td style="font-weight:600">${nome}</td><td style="text-align:center;color:var(--texto-sec)">${dados.total}</td><td colspan="3" style="font-size:var(--txt-xs);color:var(--texto-sec)">Insuficiente (mín. ${dados.minimo})</td></tr>`;
      }
      const nFav  = dados.dimensoes.filter(d => d.nivel === 'favoravel').length;
      const nInt  = dados.dimensoes.filter(d => d.nivel === 'intermediario').length;
      const nDesf = dados.dimensoes.filter(d => d.nivel === 'desfavoravel').length;
      return `<tr>
        <td style="font-weight:600">${nome}</td>
        <td style="text-align:center">${dados.total}</td>
        <td style="text-align:center;font-weight:700;color:#4caf50">${nFav}</td>
        <td style="text-align:center;font-weight:700;color:#ff9800">${nInt}</td>
        <td style="text-align:center;font-weight:700;color:#f44336">${nDesf}</td>
      </tr>`;
    }).join('');

    /* (variável legada mantida para compatibilidade) */
    const nSec = proj.objetivo ? { esc: 3, plano: 4, conc: 5 } : { esc: 2, plano: 3, conc: 4 };

    /* ── Retorna HTML completo ── */
    return `
      <!-- ══ CSS DE IMPRESSÃO PADRÃO ENGENHALVES ══ -->
      <style>
        @media print {
          @page {
            size: A4 portrait;
            margin: 18mm 12mm 18mm;
            @bottom-center {
              content: "Página " counter(page);
              font-size: 7pt;
              color: #555;
              font-family: Arial, Helvetica, sans-serif;
            }
          }
          @page :first {
            margin: 0 12mm;
            @bottom-center { content: none; }
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #app-header, #nav-principal, .subnav-abas,
          .nao-imprimir, .btn, #toast { display: none !important; }
          body { background:#fff !important; color:#000 !important; font-family:Arial,Helvetica,sans-serif !important; font-size:9pt !important; line-height:1.4 !important; margin:0 !important; }
          .container { max-width:100% !important; width:100% !important; padding:0 !important; margin:0 !important; }
          .rpt-capa { display:flex !important; flex-direction:column; justify-content:space-between; align-items:stretch; min-height:297mm; padding:0; text-align:center; page-break-after:always; break-after:always; background:#fff; }
          .rpt-capa-barra-topo { background:#0D47A1; color:#fff; padding:10pt 16pt; font-size:8pt; font-weight:700; letter-spacing:1pt; text-transform:uppercase; text-align:center; }
          .rpt-capa-corpo { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; padding:10mm 20mm 8mm; }
          .rpt-capa-titulo { font-size:22pt; font-weight:900; color:#0D47A1; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4mm; line-height:1.2; }
          .rpt-capa-subtitulo { font-size:10pt; color:#555; margin-bottom:12mm; letter-spacing:.3pt; }
          .rpt-capa-linha { width:40mm; height:2px; background:#0D47A1; margin:0 auto 10mm; }
          .rpt-capa-tabela { width:100%; max-width:130mm; border-collapse:collapse; font-size:9pt; text-align:left; }
          .rpt-capa-tabela td { padding:4pt 8pt; border:none !important; border-bottom:1px solid #e0e0e0 !important; background:transparent !important; color:#222; }
          .rpt-capa-td-label { font-weight:700; color:#0D47A1 !important; width:44%; }
          .rpt-capa-barra-rodape { background:#0D47A1; color:#fff; padding:8pt 16pt; font-size:8pt; text-align:center; line-height:1.6; }
          .rpt-sumario { page-break-after:always; break-after:always; padding:0; }
          .rpt-sumario-titulo { display:block !important; font-size:14pt; font-weight:900; color:#fff !important; background:#0D47A1 !important; padding:8pt 12pt !important; text-transform:uppercase; letter-spacing:3pt; margin:0 0 10mm !important; }
          .rpt-sumario-item { display:flex !important; align-items:baseline !important; padding:5pt 14pt !important; font-size:10pt; color:#111; border:none !important; background:transparent !important; }
          .rpt-sumario-item:nth-child(even) { background:#f5f7fa !important; }
          .rpt-sumario-num { font-weight:700; color:#0D47A1 !important; min-width:24pt; flex-shrink:0; }
          .rpt-sumario-nome { flex-shrink:0; white-space:nowrap; }
          .rpt-sumario-pontilhado { flex:1; border-bottom:1pt dotted #bbb; margin:0 8pt 3pt; }
          .rpt-sumario-pag { color:#555; min-width:18pt; text-align:right; flex-shrink:0; }
          .rpt-sumario-sep { height:2pt; background:#0D47A1 !important; border:none !important; margin:4pt 0 !important; display:block !important; }
          .so-imprimir { display:block !important; }
          .nao-imprimir { display:none !important; }
          .rpt-header { display:flex !important; height:14mm; background:#fff; border-bottom:2px solid #0D47A1; padding:0; align-items:center; justify-content:space-between; margin-bottom:8pt; }
          .rpt-header-logo { display:flex; align-items:center; gap:6pt; }
          .rpt-header-info { font-size:7pt; color:#555; text-align:right; line-height:1.5; }
          .rpt-footer { display:block !important; border-top:1px solid #0D47A1; margin-top:6pt; padding-top:6pt; font-size:7.5pt; color:#444; text-align:center; line-height:1.6; page-break-before:avoid !important; page-break-inside:avoid !important; break-inside:avoid !important; }
          .rpt-secao h3, .relatorio-secao h3 { background:#0D47A1 !important; color:#fff !important; padding:5pt 9pt !important; font-size:9pt !important; font-weight:700 !important; text-transform:uppercase !important; letter-spacing:.5pt !important; margin:0 0 12pt !important; border-radius:0 !important; page-break-after:avoid !important; }
          table { width:100% !important; border-collapse:collapse !important; font-size:8pt !important; margin-bottom:6pt !important; }
          th { background:#0D47A1 !important; color:#fff !important; padding:3pt 6pt !important; font-weight:600 !important; text-align:left !important; border:1px solid #0D47A1 !important; }
          .tabela-simples th { color:#fff !important; }
          th:not(:first-child) { text-align:center; }
          td { padding:3pt 6pt !important; border:1px solid #ccc !important; color:#111; }
          td:not(:first-child) { text-align:center; }
          tr:nth-child(even) td { background:#f0f4f8 !important; }
          .card { border:none !important; border-bottom:1px solid #e8e8e8 !important; background:#fff !important; border-radius:0 !important; padding:8pt 0 !important; margin-bottom:8pt !important; color:#000 !important; }
          .badge { border:1px solid #ccc !important; font-size:7pt !important; padding:1pt 4pt !important; }
          .badge-alto { background:#f8d7da !important; color:#721c24 !important; border-color:#f5c6cb !important; }
          .badge-medio { background:#fff3cd !important; color:#856404 !important; border-color:#ffeeba !important; }
          .badge-baixo { background:#d4edda !important; color:#155724 !important; border-color:#c3e6cb !important; }
          textarea::placeholder, input::placeholder { color:transparent !important; }
          textarea { border:none !important; background:transparent !important; resize:none !important; color:#000 !important; width:100% !important; font-family:Arial !important; font-size:8pt !important; }
          div:empty { display:none !important; }
          .card { page-break-inside:avoid !important; break-inside:avoid !important; }
          tr { page-break-inside:avoid !important; break-inside:avoid !important; }
          .relatorio-secao h3 { page-break-after:avoid !important; break-after:avoid !important; }
          .rpt-capa { page-break-after:always; break-after:always; }
          .rpt-capa, .rpt-header, .rpt-footer { display:none; }
          label input[type="checkbox"], label input[type="radio"] { display:none !important; }
          /* Texto justificado */
          p, li { text-align:justify !important; }
          /* Remove barra de rolagem horizontal na impressão */
          div { overflow:visible !important; }
          /* Último bloco de conteúdo não força quebra de página */
          .relatorio-secao:last-of-type { page-break-after:avoid !important; break-after:avoid !important; }
          /* Modos de impressão seletivos */
          body.rpt-modo-aep  .rpt-secao-afp { display:none !important; }
          body.rpt-modo-afp  .rpt-secao-aep { display:none !important; }
          /* Metodologia seletiva */
          .rpt-met-aep, .rpt-met-afp, .rpt-met-mix { display:none !important; }
          body.rpt-modo-aep .rpt-met-aep { display:block !important; }
          body.rpt-modo-afp .rpt-met-afp { display:block !important; }
          body.rpt-modo-hibrido .rpt-met-mix { display:block !important; }
        }
        @media screen {
          .rpt-capa, .rpt-sumario { display:none !important; }
          .so-imprimir { display:none !important; }
          /* Mostrar apenas texto combinado na tela */
          .rpt-met-aep, .rpt-met-afp { display:none !important; }
        }
      </style>

      <!-- ── CAPA ─────────────────────────────────────────── -->
      <div class="rpt-capa">
        <div class="rpt-capa-barra-topo" id="proj-capa-barra-topo">
          ENGENHALVES — Centro de Engenharia e Segurança LTDA
        </div>
        <div class="rpt-capa-corpo">
          <div id="proj-capa-logo-area" style="text-align:center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
                 width="80" height="80" style="display:block;margin:0 auto 4mm">
              <path fill="#0D47A1" d="M500 115C287.2 115 115 287.2 115 500S287.2 885 500 885c129.1 0 243.4-63.7 313.2-161.4H641.8C600.5 748.7 551.8 762 500 762c-144.7 0-262-117.3-262-262s117.3-262 262-262c51.8 0 100.5 13.3 141.8 38.4h171.4C743.4 178.7 629.1 115 500 115z"/>
              <path fill="#0D47A1" d="M300 333H732L795 426H300Z"/>
              <path fill="#0D47A1" d="M248 454H752L695 546H248Z"/>
              <path fill="#0D47A1" d="M300 574H795L732 667H300Z"/>
            </svg>
            <div style="font-size:20pt;font-weight:900;color:#0D47A1;letter-spacing:3px;line-height:1">ENGENHALVES</div>
            <div style="font-size:7pt;color:#666;letter-spacing:1.5px;margin-top:2mm;text-transform:uppercase">Centro de Engenharia e Segurança LTDA</div>
          </div>
          <div style="text-align:center">
            <div class="rpt-capa-titulo">${proj.nome || 'Laudo Técnico Ergonômico'}</div>
            <div class="rpt-capa-subtitulo">Relatório Técnico Consolidado — NR-17 &middot; GRO-PGR</div>
            <div class="rpt-capa-linha"></div>
          </div>
          <table class="rpt-capa-tabela" style="margin-bottom:8mm">
            <tr><td class="rpt-capa-td-label">Empresa / Cliente</td><td>${emp?.nome || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">CNPJ</td><td>${emp?.cnpj || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Cidade / Estado</td><td>${[emp?.cidade, emp?.estado].filter(Boolean).join('/') || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Data de Emissão</td><td>${_dataEmissao}</td></tr>
            <tr><td class="rpt-capa-td-label">Responsável Técnico</td><td>${proj.responsavelTecnico || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Registro Profissional</td><td>${proj.registroProfissional || '—'}</td></tr>
          </table>
        </div>
        <div class="rpt-capa-barra-rodape">
          Documento gerado em ${_dataEmissao} &mdash; Confidencial &nbsp;|&nbsp; ${_nrProjetoAtual}
        </div>
      </div>

      <!-- ── SUMÁRIO ───────────────────────────────────────── -->
      <div class="rpt-sumario so-imprimir">
        <div class="rpt-sumario-titulo">Sumário</div>
        <div>
          ${(()=>{
            const _si = (n, nome, pag, cls) => `<div class="rpt-sumario-item${cls ? ' '+cls : ''}"><span class="rpt-sumario-num">${n}.</span><span class="rpt-sumario-nome">${nome}</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">${pag}</span></div>`;
            let rows = _si(secID, 'Identificação do Projeto', 3);
            if (secObj)    rows += _si(secObj,    'Objetivo', 3);
            rows += _si(secMet, 'Metodologia e Fundamentação Legal', 4);
            rows += _si(secCar, 'Caracterização do Ambiente de Trabalho', 5);
            if (secResAEP) rows += _si(secResAEP, 'Resultados — Avaliações Ergonômicas (AEP)', 6, 'rpt-secao-aep');
            if (secResAFP)   rows += _si(secResAFP, 'Resultados — Avaliações Psicossociais (AFP)', secResAEP ? 7 : 6, 'rpt-secao-afp');
            if (secRiscoPsi)    rows += _si(secRiscoPsi, 'Riscos Psicossociais Identificados', (secResAEP||secResAFP) ? 8 : 7, 'rpt-secao-afp');
            if (secOrientacoes) rows += _si(secOrientacoes, 'Orientações de Controle Psicossocial', (secResAEP||secResAFP) ? 9 : 8, 'rpt-secao-afp');
            const _pgPlano = (secResAEP||secResAFP||secRiscoPsi) ? 10 : 6;
            const _pgConc  = _pgPlano + 1;
            const _pgAssin = _pgConc + 1;
            rows += '<div class="rpt-sumario-sep"></div>' + _si(secPlano, 'Plano de Ação', _pgPlano);
            rows += '<div class="rpt-sumario-sep"></div>' + _si(secConc, 'Conclusão Técnica', _pgConc);
            rows += _si(secAssin, 'Assinatura', _pgAssin);
            return rows;
          })()}
        </div>
      </div>

      <!-- ── CONTEÚDO ──────────────────────────────────────── -->
      <div class="container">

        <!-- Header de impressão -->
        <div class="rpt-header so-imprimir">
          <div class="rpt-header-logo" id="proj-header-logo-area">
            ${_SVG_EP(28, 28)}
            <div>
              <div style="font-size:11pt;font-weight:900;color:#0D47A1;letter-spacing:1px;line-height:1">ENGENHALVES</div>
              <div style="font-size:6pt;color:#777;letter-spacing:.5px">CENTRO DE ENGENHARIA E SEGURANÇA LTDA</div>
            </div>
          </div>
          <div class="rpt-header-info">
            ${proj.nome || 'Laudo Técnico'} — Relatório Consolidado<br>
            ${emp?.nome || ''} · ${_dataEmissao}<br>
            ${_nrProjetoAtual}
          </div>
        </div>

        <!-- Cabeçalho de tela -->
        <div class="nao-imprimir" style="margin:var(--s4) 0 var(--s5);text-align:center">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">Projeto de Laudo Técnico</div>
          <div style="font-size:var(--txt-xl);font-weight:700">${proj.nome || 'Laudo Técnico'}</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">${emp?.nome || ''} · ${_fd(proj.dataInicio)}</div>
        </div>

        <!-- Botões de impressão (variam conforme tipo do projeto) -->
        <div class="nao-imprimir" style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s5)">
          ${isMisto ? `
            <div style="display:flex;flex-direction:column;gap:var(--s1)">
              <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600">ENGENHALVES</div>
              <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                ${isAEP ? `<button class="btn btn-primario btn-sm" onclick="ModuloProjeto.imprimir('engenhalves','aep')">🖨️ Relatório AEP</button>` : ''}
                ${isAFP ? `<button class="btn btn-primario btn-sm" onclick="ModuloProjeto.imprimir('engenhalves','afp')">🖨️ Relatório AFP</button>` : ''}
                <button class="btn btn-primario btn-sm" onclick="ModuloProjeto.imprimir('engenhalves','hibrido')">🖨️ Relatório Híbrido</button>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--s1)">
              <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600">KALPREVI</div>
              <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                ${isAEP ? `<button class="btn btn-sm" style="background:#1a5c2a;color:#fff" onclick="ModuloProjeto.imprimir('kalprevi','aep')">🖨️ Relatório AEP</button>` : ''}
                ${isAFP ? `<button class="btn btn-sm" style="background:#1a5c2a;color:#fff" onclick="ModuloProjeto.imprimir('kalprevi','afp')">🖨️ Relatório AFP</button>` : ''}
                <button class="btn btn-sm" style="background:#1a5c2a;color:#fff" onclick="ModuloProjeto.imprimir('kalprevi','hibrido')">🖨️ Relatório Híbrido</button>
              </div>
            </div>
          ` : `
            <button class="btn btn-primario" onclick="ModuloProjeto.imprimir('engenhalves')">🖨️ Engenhalves</button>
            <button class="btn btn-primario" onclick="ModuloProjeto.imprimir('kalprevi')" style="background:#1a5c2a">🖨️ Kalprevi</button>
          `}
          <button class="btn btn-secundario" onclick="ModuloProjeto.exportarProjeto()">📤 Exportar Projeto</button>
        </div>

        <!-- Resumo de riscos (tela) -->
        <div class="relatorio-resumo-risco nao-imprimir">
          <div class="resumo-risco-card alto"><div class="numero">${totalAlt}</div><div class="label">Risco Alto</div></div>
          <div class="resumo-risco-card medio"><div class="numero">${totalMed}</div><div class="label">Risco Médio</div></div>
          <div class="resumo-risco-card baixo"><div class="numero">${totalBx}</div><div class="label">Risco Baixo</div></div>
        </div>

        <!-- 1. Identificação do Projeto -->
        <div class="relatorio-secao">
          <h3>${secID}. Identificação do Projeto</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <tbody>
                <tr><td style="font-weight:600;width:40%">Empresa / Cliente</td><td style="text-align:left">${emp?.nome || '—'}</td></tr>
                <tr><td style="font-weight:600">CNPJ</td><td style="text-align:left">${emp?.cnpj || '—'}</td></tr>
                <tr><td style="font-weight:600">Endereço</td><td style="text-align:left">${emp?.endereco || '—'}</td></tr>
                <tr><td style="font-weight:600">Cidade / Estado</td><td style="text-align:left">${[emp?.cidade, emp?.estado].filter(Boolean).join(' / ') || '—'}</td></tr>
                <tr><td style="font-weight:600">Projeto / Dossiê</td><td style="text-align:left">${proj.nome || '—'}</td></tr>
                <tr><td style="font-weight:600">Tipo de Avaliação</td><td style="text-align:left">${{ aep:'AEP — Avaliação Ergonômica Preliminar', psicossocial:'AFP — Avaliação de Fatores Psicossociais', aep_afp:'AEP + AFP — Ergonômico com Pesquisa Psicossocial', aet:'AET — Análise Ergonômica do Trabalho', integrado:'Integrado (AEP + AFP + AET)' }[proj.tipo] || proj.tipo || '—'}</td></tr>
                <tr><td style="font-weight:600">N° do Laudo</td><td style="text-align:left">${_nrProjetoAtual}</td></tr>
                <tr><td style="font-weight:600">Data de Emissão</td><td style="text-align:left">${_dataEmissao}</td></tr>
                <tr><td style="font-weight:600">Período de Avaliação</td><td style="text-align:left">${_fd(proj.dataInicio) || '—'}${proj.dataFim ? ' a ' + _fd(proj.dataFim) : ''}</td></tr>
                <tr><td style="font-weight:600">Responsável Técnico</td><td style="text-align:left">${proj.responsavelTecnico || '—'}</td></tr>
                <tr><td style="font-weight:600">Registro Profissional</td><td style="text-align:left">${proj.registroProfissional || '—'} ${proj.cargoResponsavel ? '· ' + proj.cargoResponsavel : ''}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Objetivo (condicional) -->
        ${proj.objetivo ? `
        <div class="relatorio-secao">
          <h3>${secObj}. Objetivo</h3>
          <div class="card"><p style="font-size:var(--txt-sm);white-space:pre-wrap">${proj.objetivo}</p></div>
        </div>` : ''}

        <!-- Seção: Metodologia e Fundamentação Legal -->
        <div class="relatorio-secao">
          <h3>${secMet}. Metodologia e Fundamentação Legal</h3>
          <div class="card" style="margin-bottom:var(--s3)">
            ${isMisto && !soAEP ? `
              <p class="rpt-met-aep" style="font-size:var(--txt-sm);line-height:1.6">${metodoMap.aep}</p>
              <p class="rpt-met-afp" style="font-size:var(--txt-sm);line-height:1.6">${metodoMap.psicossocial}</p>
              <p class="rpt-met-mix" style="font-size:var(--txt-sm);line-height:1.6">${metodoMap.aep_afp}</p>
            ` : `
              <p style="font-size:var(--txt-sm);line-height:1.6">${soAEP ? metodoMap.aep : (metodoMap[proj.tipo] || metodoMap.aep)}</p>
            `}
          </div>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Norma / Referência</th><th>Descrição / Portaria</th></tr></thead>
              <tbody>${normasRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Seção: Caracterização do Ambiente de Trabalho -->
        <div class="relatorio-secao">
          <h3>${secCar}. Caracterização do Ambiente de Trabalho</h3>
          <div class="card" style="margin-bottom:var(--s3)">
            ${_li('Empresa / Cliente', emp?.nome || '—')}
            ${_li('Atividade / CNAE', emp?.cnae || emp?.atividadePrincipal || '—')}
            ${_li('Total de Setores Avaliados', setores.length)}
            ${_li('Total de Funções Avaliadas', setores.reduce((n, s) => n + Storage.listarFuncoes(s.id).length, 0))}
            ${_li('Total de Trabalhadores Expostos', totalTrab > 0 ? totalTrab : '—')}
            ${_li('Total de Avaliações Realizadas', avs.length)}
            ${isAEP ? _li('Não Conformidades — Risco Alto',  totalAlt > 0 ? totalAlt : '0') : ''}
            ${isAEP ? _li('Não Conformidades — Risco Médio', totalMed > 0 ? totalMed : '0') : ''}
            ${isAFP_r && afpDados ? _li('Pesquisa AFP — Respondentes', afpR.totalRespostas + (afpR.totalAutorizados ? ` de ${afpR.totalAutorizados} (${afpR.taxaParticipacao ?? '—'}%)` : '')) : ''}
          </div>
          ${setores.length > 0 ? `
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Setor</th><th style="text-align:left">Função</th><th style="text-align:center">Trab.</th><th style="text-align:left">Atividades</th><th style="text-align:center">Tipo de Avaliação</th></tr></thead>
              <tbody>${tabelaEscopo}</tbody>
            </table>
          </div>` : '<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhum setor cadastrado.</p>'}
        </div>

        <!-- Seção: Resultados AEP por Função -->
        ${secResAEP ? `
        <div class="relatorio-secao rpt-secao-aep">
          <h3>${secResAEP}. Resultados — Avaliações Ergonômicas (AEP)</h3>
          <div class="card" style="margin-bottom:var(--s3)">
            <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin:0">
              Score de Criticidade: 0–30 = Baixo · 31–60 = Médio · &gt;60 = Alto/Crítico.
              NC Alto = não conformidades de risco alto · NC Médio = risco médio.
            </p>
          </div>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Função</th><th style="text-align:left">Setor</th><th style="text-align:center">Trab.</th><th style="text-align:center">Score</th><th style="text-align:center">Nível de Risco</th><th style="text-align:center">NC Alto</th><th style="text-align:center">NC Médio</th><th style="text-align:center">Prioridade</th><th style="text-align:center">AET?</th><th style="text-align:center">Data</th></tr></thead>
              <tbody>${linhasAEP || '<tr><td colspan="10" style="text-align:center;color:var(--texto-sec)">Nenhuma avaliação AEP encontrada</td></tr>'}</tbody>
            </table>
          </div>
          ${blocoAET}
        </div>` : ''}

        <!-- Seção: Resultados AFP — dados da pesquisa COPSOQ-III (Firestore) -->
        ${secResAFP ? `
        <div class="relatorio-secao rpt-secao-afp">
          <h3>${secResAFP}. Resultados — Avaliação de Fatores Psicossociais (AFP / COPSOQ-III)</h3>

          <!-- Indicadores de participação -->
          <div class="card" style="margin-bottom:var(--s3)">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s3);text-align:center;margin-bottom:var(--s3)">
              <div>
                <div style="font-size:24px;font-weight:700;color:var(--primaria)">${afpR.totalRespostas}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Respondentes</div>
              </div>
              <div>
                <div style="font-size:24px;font-weight:700">${afpR.totalAutorizados || '—'}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Convidados</div>
              </div>
              <div>
                <div style="font-size:24px;font-weight:700;color:${(afpR.taxaParticipacao >= 70) ? '#4caf50' : '#ff9800'}">${afpR.taxaParticipacao != null ? afpR.taxaParticipacao + '%' : '—'}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Taxa de participação</div>
              </div>
            </div>
            ${afpR.scoreGeral != null ? `
              <div style="text-align:center;border-top:1px solid var(--borda);padding-top:var(--s3)">
                <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s1)">Score Geral COPSOQ-III (0–100)</div>
                <div style="font-size:32px;font-weight:700;color:${afpR.scoreGeral >= 67 ? '#4caf50' : afpR.scoreGeral >= 34 ? '#ff9800' : '#f44336'}">${afpR.scoreGeral}</div>
              </div>` : ''}
          </div>

          <!-- Resultado por dimensão -->
          <div style="overflow-x:auto;margin-bottom:var(--s3)">
            <table class="tabela-simples">
              <thead><tr><th>Dimensão COPSOQ-III</th><th>Pontuação (0–100)</th><th style="text-align:center">Classificação</th></tr></thead>
              <tbody>${dimAFPLinhas || '<tr><td colspan="3" style="text-align:center;color:var(--texto-sec)">Sem dados de dimensões</td></tr>'}</tbody>
            </table>
          </div>

          <!-- Resultado por setor (se houver setores com dados suficientes) -->
          ${afpSetorEntries.length > 0 ? `
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Setor / Grupo</th><th style="text-align:center">Resp.</th><th style="text-align:center;color:#4caf50">Fav.</th><th style="text-align:center;color:#ff9800">Int.</th><th style="text-align:center;color:#f44336">Desf.</th></tr></thead>
              <tbody>${afpSetorLinhas}</tbody>
            </table>
          </div>` : ''}

          <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s2)">
            Resultados não devem ser individualizados — uso exclusivo para gestão de saúde coletiva (LGPD — Lei nº 13.709/2018).
          </p>
        </div>` : ''}

        <!-- Riscos Psicossociais Identificados -->
        ${secRiscoPsi ? `
        <div class="relatorio-secao rpt-secao-afp">
          <h3>${secRiscoPsi}. Riscos Psicossociais Identificados</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead>
                <tr>
                  <th style="width:35%">Condição de Risco (NR-17)</th>
                  <th style="width:45%">Fundamentação / Texto GRO-PGR</th>
                  <th style="width:20%">Hierarquia de Controle</th>
                </tr>
              </thead>
              <tbody>
                ${aprovadosPsi.map(r => `<tr>
                  <td style="font-weight:600;font-size:var(--txt-xs);text-align:left">${r.titulo || '—'}</td>
                  <td style="font-size:var(--txt-xs);text-align:left">${r.textoGRO || '—'}</td>
                  <td style="font-size:var(--txt-xs);text-align:center">${HIER_L[r.hierarquia] || r.hierarquia || '—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${proj.consolidacaoPsicossocial?.justificativaTecnica ? `
          <div style="margin-top:var(--s3);font-size:var(--txt-xs)">
            <strong>Justificativa Técnica:</strong> ${proj.consolidacaoPsicossocial.justificativaTecnica}
          </div>` : ''}
          <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s2)">
            Condições identificadas com base na correlação entre AEP (Checklist NR-17) e AFP (COPSOQ-III), aprovadas pelo profissional responsável. Base: NR-17 (Portaria MTP 1.467/2023) e NR-01/GRO-PGR. Ver Seção ${secOrientacoes||'—'} para orientações detalhadas de controle.
          </p>
        </div>` : ''}

        <!-- Orientações de Controle Psicossocial -->
        ${secOrientacoes ? `
        <div class="relatorio-secao rpt-secao-afp">
          <h3>${secOrientacoes}. Orientações de Controle Psicossocial</h3>
          <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)">
            Para cada condição de risco psicossocial aprovada, são apresentados abaixo o texto técnico de referência para o GRO/PGR e as orientações detalhadas de controle a serem implementadas.
          </p>
          ${aprovadosPsi.map((r, i) => `
          <div style="margin-bottom:var(--s4);${i > 0 ? 'border-top:1px solid var(--borda);padding-top:var(--s4)' : ''}">
            <div style="font-weight:700;font-size:var(--txt-sm);margin-bottom:var(--s3);color:#0D47A1">
              ${i + 1}. ${r.titulo || '—'}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s4)">
              <div>
                <div style="font-size:var(--txt-xs);font-weight:700;text-transform:uppercase;color:var(--texto-sec);margin-bottom:var(--s2)">
                  Texto para GRO/PGR
                </div>
                <div style="font-size:var(--txt-xs);line-height:1.6;text-align:justify">
                  ${r.textoGRO || '—'}
                </div>
                <div style="font-size:10px;color:var(--texto-sec);margin-top:var(--s2)">
                  📋 ${r.fundamentoLegal || ''}
                </div>
              </div>
              <div>
                <div style="font-size:var(--txt-xs);font-weight:700;text-transform:uppercase;color:var(--texto-sec);margin-bottom:var(--s2)">
                  Orientação de Controle
                </div>
                <div style="font-size:var(--txt-xs);line-height:1.6;text-align:justify">
                  ${r.estrategia || '<em style="color:var(--texto-sec)">Orientação não preenchida.</em>'}
                </div>
              </div>
            </div>
          </div>`).join('')}
        </div>` : ''}

        <!-- Plano de ação -->
        <div class="relatorio-secao">
          <h3>${secPlano}. Plano de Ação</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>#</th><th style="text-align:left">Ação / Recomendação</th><th style="text-align:left">Setor · Função</th><th>Medida</th><th>Prior.</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
              <tbody>
                ${(() => {
                  const PRIO_COR = { alta: '#f44336', media: '#ff9800', baixa: '#4caf50' };
                  const PRIO_L   = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
                  const STATUS_L = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído' };
                  const MEDIDA_L = { engenharia: 'Engenharia', administrativa: 'Admin.', organizacional: 'Org.', epi: 'EPI/EPC' };
                  let n = 0;
                  const linhasAv = avs.flatMap(av => {
                    const s = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
                    const f = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
                    return (av.planoAcao || []).map(acao => `<tr>
                      <td style="text-align:center">${++n}</td>
                      <td style="font-size:var(--txt-xs);text-align:left">${acao.descricao||'—'}</td>
                      <td style="font-size:var(--txt-xs);text-align:left">${s?.nome||'—'}${f?.nome?' · '+f.nome:''}</td>
                      <td style="font-size:var(--txt-xs)">${MEDIDA_L[acao.medida]||'—'}</td>
                      <td style="font-weight:700;color:${PRIO_COR[acao.prioridade]||'#888'};font-size:var(--txt-xs)">${PRIO_L[acao.prioridade]||acao.prioridade||'—'}</td>
                      <td style="font-size:var(--txt-xs)">${acao.responsavel||'—'}</td>
                      <td style="font-size:var(--txt-xs)">${_fd(acao.prazo)}</td>
                      <td style="font-size:var(--txt-xs)">${STATUS_L[acao.status]||acao.status||'—'}</td>
                    </tr>`);
                  }).join('');
                  const linhasPsi = acoesPsi.map(acao => `<tr>
                    <td style="text-align:center">${++n}</td>
                    <td style="font-size:var(--txt-xs);text-align:left">
                      ${acao.risco ? `<div style="font-size:9px;color:#90caf9;margin-bottom:2px">🧠 ${acao.risco}</div>` : ''}
                      ${acao.descricao||'—'}
                    </td>
                    <td style="font-size:var(--txt-xs);text-align:left">—</td>
                    <td style="font-size:var(--txt-xs)">Organizacional</td>
                    <td style="font-weight:700;color:${PRIO_COR[acao.prioridade]||'#888'};font-size:var(--txt-xs)">${PRIO_L[acao.prioridade]||acao.prioridade||'—'}</td>
                    <td style="font-size:var(--txt-xs)">${acao.responsavel||'—'}</td>
                    <td style="font-size:var(--txt-xs)">${_fd(acao.prazo)}</td>
                    <td style="font-size:var(--txt-xs)">${STATUS_L[acao.status]||acao.status||'—'}</td>
                  </tr>`).join('');
                  const todasLinhas = linhasAv + linhasPsi;
                  return todasLinhas || `<tr><td colspan="8" style="text-align:center;color:#888;font-style:italic">Nenhuma ação cadastrada.</td></tr>`;
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Conclusão técnica -->
        <div class="relatorio-secao">
          <h3>${secConc}. Conclusão Técnica</h3>
          <div class="card">
            <div class="grupo-campo nao-imprimir">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s2)">
                <span style="font-size:var(--txt-xs);color:var(--texto-sec)">Conclusão consolidada do projeto</span>
                <button id="btn-gerar-conclusao-proj" onclick="ModuloProjeto.gerarConclusaoIA()"
                        style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--r2);border:1px solid #3949ab;background:rgba(57,73,171,.15);color:#90caf9;cursor:pointer;white-space:nowrap;flex-shrink:0">
                  🤖 Gerar com IA
                </button>
              </div>
              <textarea id="proj-conclusao" rows="6"
                placeholder="Redija a conclusão técnica consolidada do projeto: principais achados, nível de risco geral, recomendações gerais e perspectivas de acompanhamento..."
                onblur="ModuloProjeto.onConclusaoChange(this.value)"
              >${proj.conclusaoTecnica || ''}</textarea>
            </div>
            <!-- Versão impressão da conclusão -->
            <div class="so-imprimir" id="proj-conclusao-print">
              <p style="font-size:9pt;white-space:pre-wrap">${proj.conclusaoTecnica || 'Conclusão técnica não registrada.'}</p>
            </div>
            <label class="check-item nao-imprimir" style="cursor:pointer;margin-top:var(--s3)">
              <input type="checkbox" id="proj-aet" ${proj.necessitaAET?'checked':''}
                     onchange="ModuloProjeto.onNecessitaAETChange(this.checked)">
              <div class="check-box">✓</div>
              <span>Este projeto indica necessidade de AET para alguma função</span>
            </label>
            ${proj.necessitaAET ? `
            <div class="so-imprimir aviso-tecnico aviso" style="margin-top:var(--s3)">
              <span>⚠️</span><span><strong>Este projeto indica necessidade de AET para uma ou mais funções avaliadas.</strong></span>
            </div>` : ''}
            <button class="btn btn-primario nao-imprimir" style="margin-top:var(--s3)" onclick="ModuloProjeto.salvarConclusao()">
              💾 Salvar Conclusão
            </button>
          </div>
        </div>

        <!-- Assinatura (só impressão) -->
        <div class="relatorio-secao so-imprimir">
          <h3>${secAssin}. Assinatura</h3>
          <div style="margin-top:12pt">
            <table style="width:100%;border-collapse:collapse;font-size:9pt">
              <tr>
                <td style="width:35%;padding:0 16pt 0 0;border:none;vertical-align:bottom">
                  <div style="border-bottom:1px solid #000;height:32pt;margin-bottom:4pt"></div>
                  <div style="font-weight:600">${proj.responsavelTecnico || 'Responsável Técnico'}</div>
                  <div style="color:#555">${proj.registroProfissional || 'Registro Profissional'}</div>
                </td>
                <td style="width:25%;padding:0 16pt;border:none;text-align:right;vertical-align:bottom">
                  <div style="font-size:8pt;color:#555">Data de Emissão</div>
                  <div style="font-weight:600">${_dataEmissao}</div>
                  <div style="font-size:7pt;color:#888;margin-top:4pt">${_nrProjetoAtual}</div>
                </td>
                <td style="width:40%;padding:0 0 0 0;border:none;vertical-align:bottom">
                  <div style="border:1.5px dashed #0D47A1;height:40pt;border-radius:3pt;margin-bottom:4pt"></div>
                  <div style="font-size:7pt;color:#555;text-align:center">Assinatura Eletrônica com Certificado</div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Rodapé empresa (só impressão) -->
        <div class="rpt-footer so-imprimir" id="proj-rodape-empresa">
          ENGENHALVES — Centro de Engenharia &amp; Segurança LTDA<br>
          Estrada Braulina Pigatto, 2320, CEP 84607-303 — Bom Jesus, União da Vitória - PR<br>
          (42) 99928-8177 &nbsp;|&nbsp; atendimento@engenhalves.com.br<br>
          <span style="font-size:7pt">Documento técnico de uso exclusivo do cliente &middot; ${_nrProjetoAtual}</span>
        </div>

      </div>
    `;
  }

  function _li(label, valor) {
    if (!valor && valor !== 0) return '';
    return `<div style="display:flex;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
      <span style="color:var(--texto-sec);font-size:var(--txt-sm);width:160px;flex-shrink:0">${label}</span>
      <span style="font-size:var(--txt-sm);font-weight:500">${valor}</span>
    </div>`;
  }

  function onConclusaoChange(texto) {
    const proj = App.obterProjetoAtual();
    if (proj) proj.conclusaoTecnica = texto.trim();
  }

  function onNecessitaAETChange(checked) {
    const proj = App.obterProjetoAtual();
    if (proj) proj.necessitaAET = checked;
  }

  function salvarConclusao() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    proj.conclusaoTecnica = document.getElementById('proj-conclusao')?.value?.trim() || '';
    proj.necessitaAET     = document.getElementById('proj-aet')?.checked || false;
    Storage.salvarProjeto(proj);
    App.mostrarToast('Conclusão salva','sucesso');
  }

  function _sincronizarMarcaProjeto(scopeEl) {
    const ROOT = scopeEl || document;
    const $    = id => ROOT === document ? document.getElementById(id) : ROOT.querySelector('#' + id);
    const cfg  = _EMPRESAS_PROJ[_empresaImpressaoProj] || _EMPRESAS_PROJ.engenhalves;
    const el1  = $('proj-capa-barra-topo');
    if (el1) el1.textContent = cfg.barraTopoTexto;
    const el2  = $('proj-capa-logo-area');
    if (el2) el2.innerHTML = cfg.capaLogo();
    const el3  = $('proj-header-logo-area');
    if (el3) el3.innerHTML = cfg.headerLogo();
    const el4  = $('proj-rodape-empresa');
    if (el4) el4.innerHTML = cfg.rodape(_nrProjetoAtual);
  }

  function imprimir(empresa, modo) {
    salvarConclusao();
    if (empresa) _empresaImpressaoProj = empresa;

    /* Relatório AFP → usa cache pré-carregado para chamada síncrona */
    if (modo === 'afp') {
      ModuloPesquisaAdmin.imprimirComCache(empresa);
      return;
    }

    /* Relatório AEP → gera overlay com HTML exclusivamente AEP (sem AFP) */
    if (modo === 'aep') {
      const overlay = document.createElement('div');
      overlay.id    = '_aep_print_layer_';
      overlay.innerHTML = _htmlRelatorio(null, true);

      const style = document.createElement('style');
      style.id    = '_aep_print_style_';
      style.textContent = [
        '@media screen { #_aep_print_layer_ { display:none !important; } }',
        '@media print  { body > * { display:none !important; }',
        '                #_aep_print_layer_ { display:block !important; } }',
      ].join('\n');

      document.head.appendChild(style);
      document.body.appendChild(overlay);

      _sincronizarMarcaProjeto(overlay);

      const cleanup = () => {
        overlay.parentNode?.removeChild(overlay);
        style.parentNode?.removeChild(style);
      };
      window.addEventListener('afterprint', cleanup, { once: true });

      const imgs     = [...overlay.querySelectorAll('img')];
      const pendentes = imgs.filter(img => !img.complete);
      if (pendentes.length === 0) { window.print(); return; }
      let n = 0;
      const proximo = () => { if (++n >= pendentes.length) window.print(); };
      pendentes.forEach(img => { img.onload = proximo; img.onerror = proximo; });
      return;
    }

    /* Híbrido — imprime tudo; precisa da classe para mostrar rpt-met-mix */
    /* Sincroniza div de impressão da conclusão (pode ter sido editada após renderização) */
    const printDiv = document.getElementById('proj-conclusao-print');
    if (printDiv) {
      const txt = document.getElementById('proj-conclusao')?.value?.trim() || '';
      printDiv.innerHTML = `<p style="font-size:9pt;white-space:pre-wrap">${txt || 'Conclusão técnica não registrada.'}</p>`;
    }
    document.body.classList.add('rpt-modo-hibrido');
    _sincronizarMarcaProjeto();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('rpt-modo-hibrido');
    }, { once: true });
    const imgs = [...document.querySelectorAll('#proj-capa-logo-area img, #proj-header-logo-area img')];
    const pendentes = imgs.filter(img => !img.complete);
    if (pendentes.length === 0) { window.print(); return; }
    let n = 0;
    const proximo = () => { if (++n >= pendentes.length) window.print(); };
    pendentes.forEach(img => { img.onload = proximo; img.onerror = proximo; });
  }

  function exportarProjeto() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const json = Storage.exportarProjeto(proj.id);
    const blob = new Blob([json], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Projeto_${(proj.nome||'laudo').replace(/\s+/g,'_')}_${(proj.dataInicio||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('Projeto exportado','sucesso');
  }

  /* ── Modal util ───────────────────────────────────────────── */
  function fecharModal(id) {
    document.getElementById(id)?.classList.add('oculto');
  }

  return {
    renderizar, trocarSecao,
    salvarVisaoGeral, gerarObjetivoIA, gerarConclusaoIA, onConclusaoChange, onNecessitaAETChange, salvarConclusao, imprimir, exportarProjeto,
    salvarCampoAcao, excluirAcao, adicionarAcaoManual,
    gerarAcoesPsicossocial, alterarStatusAcaoPsi, salvarCampoAcaoPsi, excluirAcaoPsi,
    abrirFormSetor, salvarSetor, excluirSetor,
    abrirFormFuncao, salvarFuncao, excluirFuncao,
    abrirWizardAv, _wizSetSetor, _wizSetFuncao, _wizVoltarSetor, _wizVoltarFuncao, _wizSetTipo,
    iniciarAETdaAEP,
    alterarStatusAcao, fecharModal
  };
})();
