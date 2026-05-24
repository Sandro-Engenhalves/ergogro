/* ============================================================
   ErgoGRO — Módulo: AET (Análise Ergonômica do Trabalho) v6
   Seções: identificacao | demanda | atividade | diagnostico | relatorio
   ============================================================ */

const ModuloAET = (() => {

  let _secaoAtual = 'identificacao';

  const SECOES = [
    { id: 'identificacao', icone: '📋', label: 'Identificação' },
    { id: 'demanda',       icone: '📝', label: 'Demanda'       },
    { id: 'atividade',     icone: '🏃', label: 'Atividade'     },
    { id: 'diagnostico',   icone: '🔬', label: 'Diagnóstico'   },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'     },
  ];

  const FERRAMENTAS_DISPONIVEIS = [
    'RULA (Rapid Upper Limb Assessment)',
    'REBA (Rapid Entire Body Assessment)',
    'NIOSH — Equação de Levantamento',
    'OCRA — Índice de Repetitividade',
    'Strain Index',
    'QEC (Quick Exposure Check)',
    'HAL (Hand Activity Level)',
    'Diagrama de Corlett',
    'Análise de Posturas (fotográfica)',
    'Medição de força (dinamômetro)',
    'Medição de vibração',
    'Escala de Borg (esforço percebido)',
    'Entrevistas ergonômicas',
    'Filmagem e análise de vídeo',
    'Observação sistemática',
    'Outro método específico',
  ];

  /* ── Renderiza o shell AET ───────────────────────────────── */
  function renderizar(secao) {
    _secaoAtual = secao || _secaoAtual;
    const tela = document.getElementById('tela-aet');

    const abasHTML = SECOES.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-secao="${s.id}"
              onclick="ModuloAET.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');

    tela.innerHTML = `
      <nav class="subnav-abas" id="subnav-aet">${abasHTML}</nav>
      <div id="aet-conteudo"></div>
    `;

    _renderizarConteudo(_secaoAtual);
  }

  function trocarSecao(secao) {
    _salvarSecaoAtual();
    _secaoAtual = secao;
    document.querySelectorAll('#subnav-aet .aba-bloco').forEach(btn => {
      btn.classList.toggle('ativa', btn.dataset.secao === secao);
    });
    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('aet-conteudo');
    if (!el) return;

    if (secao === 'identificacao') {
      ModuloIdentificacao.renderizar('aet-conteudo');
      ModuloIdentificacao.carregar(App.obterAvaliacaoAtual());
    } else if (secao === 'demanda')     { el.innerHTML = _htmlDemanda();     }
    else if (secao === 'atividade')     { el.innerHTML = _htmlAtividade();   }
    else if (secao === 'diagnostico')   { el.innerHTML = _htmlDiagnostico(); }
    else if (secao === 'relatorio')     { el.innerHTML = _htmlRelatorio();   }
  }

  function _salvarSecaoAtual() {
    if (_secaoAtual === 'identificacao') ModuloIdentificacao.salvarSilencioso();
    else if (_secaoAtual === 'demanda')    _salvarDemanda();
    else if (_secaoAtual === 'atividade')  _salvarAtividade();
    else if (_secaoAtual === 'diagnostico')_salvarDiagnostico();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: DEMANDA E SOLICITAÇÃO
  ══════════════════════════════════════════════════════════ */

  function _htmlDemanda() {
    const av = App.obterAvaliacaoAtual();
    const d  = av?.aet || {};

    /* Aviso se criada a partir de AEP */
    const origemAEPHtml = av?.aetOrigemAEPId ? `
      <div class="aviso-tecnico aviso-tecnico-alto" style="margin-top:var(--s4)">
        <span>🔗</span>
        <span>Esta AET foi originada a partir de uma AEP que indicou necessidade de aprofundamento.
        Os campos de demanda foram pré-preenchidos com a justificativa da AEP.</span>
      </div>` : '';

    return `
      <div class="container">
        ${origemAEPHtml}
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>📝</span>
          <span>Registre a origem e o motivo da solicitação da AET. A demanda é o ponto
          de partida da análise e define o escopo do trabalho.</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Origem da Solicitação</div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="aet-solicitante">Solicitante</label>
              <select id="aet-solicitante">
                <option value="">Selecione...</option>
                <option value="empresa"        ${d.solicitante==='empresa'        ? 'selected':''}>Empresa / Empregador</option>
                <option value="cipa"           ${d.solicitante==='cipa'           ? 'selected':''}>CIPA</option>
                <option value="sindicato"      ${d.solicitante==='sindicato'      ? 'selected':''}>Sindicato</option>
                <option value="trabalhador"    ${d.solicitante==='trabalhador'    ? 'selected':''}>Trabalhador(es)</option>
                <option value="servico_saude"  ${d.solicitante==='servico_saude'  ? 'selected':''}>Serviço de Saúde / SESMT</option>
                <option value="judicial"       ${d.solicitante==='judicial'       ? 'selected':''}>Determinação judicial / regulatória</option>
                <option value="propria_iniciativa" ${d.solicitante==='propria_iniciativa'?'selected':''}>Iniciativa própria do profissional</option>
                <option value="outro"          ${d.solicitante==='outro'          ? 'selected':''}>Outro</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="aet-data-inicio">Data de Início da AET</label>
              <input type="date" id="aet-data-inicio" value="${d.dataInicio || ''}">
            </div>
          </div>

          <div class="grupo-campo">
            <label for="aet-motivo">Motivo da Solicitação</label>
            <textarea id="aet-motivo" rows="3"
              placeholder="Descreva o motivo que originou a solicitação da AET (queixas, acidentes, agravos, cumprimento normativo, melhoria...)..."
            >${d.motivoSolicitacao || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="aet-demanda">Demanda Apresentada</label>
            <textarea id="aet-demanda" rows="4"
              placeholder="Descreva a demanda de forma detalhada: quais são as questões a serem investigadas, o que se espera como resultado da AET..."
            >${d.demandaApresentada || ''}</textarea>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloAET.salvarDemanda()">
          💾 Salvar Demanda
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _salvarDemanda() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.aet.solicitante       = get('aet-solicitante');
    av.aet.dataInicio        = get('aet-data-inicio');
    av.aet.motivoSolicitacao = get('aet-motivo');
    av.aet.demandaApresentada= get('aet-demanda');
  }

  function salvarDemanda() {
    _salvarDemanda();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Demanda salva', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: ANÁLISE DA ATIVIDADE
  ══════════════════════════════════════════════════════════ */

  function _htmlAtividade() {
    const av = App.obterAvaliacaoAtual();
    const d  = av?.aet || {};

    const ferramentasHTML = FERRAMENTAS_DISPONIVEIS.map(f => {
      const marcada = (d.ferramentasAplicadas || []).includes(f);
      return `
        <label class="check-item">
          <input type="checkbox" name="ferramenta" value="${f}" ${marcada ? 'checked' : ''}>
          <div class="check-box">✓</div>
          <span style="font-size:var(--txt-sm)">${f}</span>
        </label>
      `;
    }).join('');

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>🏃</span>
          <span>Registre a análise da atividade de trabalho: o que o trabalhador
          <strong>deve</strong> fazer (tarefa prescrita) versus o que <strong>efetivamente</strong>
          faz (atividade real).</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Tarefa Prescrita</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            O que a organização define formalmente que o trabalhador deve fazer
            (procedimentos, normas, prescrições, manuais).
          </p>
          <div class="grupo-campo">
            <textarea id="aet-tarefa-prescrita" rows="5"
              placeholder="Descreva a tarefa prescrita: procedimentos formais, instruções de trabalho, normas operacionais..."
            >${d.tarefaPrescrita || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Atividade Real</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            O que o trabalhador <strong>efetivamente faz</strong> para dar conta do trabalho
            (incluindo adaptações, improvisações, estratégias informais).
          </p>
          <div class="grupo-campo">
            <textarea id="aet-atividade-real" rows="5"
              placeholder="Descreva a atividade real: sequência observada, posturas assumidas, estratégias adotadas, diferenças em relação ao prescrito..."
            >${d.atividadeReal || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Observação da Atividade</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Registre as observações realizadas em campo: condições do ambiente, postura,
            interações com equipamentos, ritmo observado.
          </p>
          <div class="grupo-campo">
            <textarea id="aet-observacao" rows="4"
              placeholder="Descreva as condições observadas em campo: ambiente, layout, equipamentos, interações, cadência, queixas dos trabalhadores..."
            >${d.observacaoAtividade || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Variabilidades e Modos Operatórios</div>
          <div class="grupo-campo">
            <label for="aet-variabilidades">Variabilidades da Atividade</label>
            <textarea id="aet-variabilidades" rows="3"
              placeholder="Registre as variações observadas no trabalho: sazonalidade, imprevistos, diferenças entre trabalhadores, condições excepcionais..."
            >${d.variabilidades || ''}</textarea>
          </div>
          <div class="grupo-campo">
            <label for="aet-modos-op">Modos Operatórios Identificados</label>
            <textarea id="aet-modos-op" rows="3"
              placeholder="Descreva as estratégias e modos operatórios observados — como os trabalhadores regulam sua atividade para dar conta das exigências..."
            >${d.modosOperatorios || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Exigências da Atividade</div>

          <div class="grupo-campo">
            <label for="aet-exig-bio">Exigências Biomecânicas</label>
            <textarea id="aet-exig-bio" rows="3"
              placeholder="Posturas, esforços, levantamentos, repetitividade, vibração, alcances..."
            >${d.exigenciasBiomecanicas || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="aet-exig-cog">Exigências Cognitivas</label>
            <textarea id="aet-exig-cog" rows="3"
              placeholder="Atenção, memória, tomada de decisão, resolução de problemas, processamento de informação..."
            >${d.exigenciasCognitivas || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="aet-exig-org">Exigências Organizacionais</label>
            <textarea id="aet-exig-org" rows="3"
              placeholder="Ritmo, prazos, metas, relacionamentos, comunicação, autonomia, conflitos de papel..."
            >${d.exigenciasOrganizacionais || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s3)">Ferramentas e Métodos de Análise Aplicados</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Marque os métodos utilizados nesta AET:
          </p>
          ${ferramentasHTML}
        </div>

        <button class="btn-bloco" onclick="ModuloAET.salvarAtividade()">
          💾 Salvar Análise da Atividade
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _salvarAtividade() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.aet.tarefaPrescrita           = get('aet-tarefa-prescrita');
    av.aet.atividadeReal             = get('aet-atividade-real');
    av.aet.observacaoAtividade       = get('aet-observacao');
    av.aet.variabilidades            = get('aet-variabilidades');
    av.aet.modosOperatorios          = get('aet-modos-op');
    av.aet.exigenciasBiomecanicas    = get('aet-exig-bio');
    av.aet.exigenciasCognitivas      = get('aet-exig-cog');
    av.aet.exigenciasOrganizacionais = get('aet-exig-org');
    av.aet.ferramentasAplicadas = Array.from(
      document.querySelectorAll('input[name="ferramenta"]:checked')
    ).map(el => el.value);
  }

  function salvarAtividade() {
    _salvarAtividade();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Atividade salva', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: DIAGNÓSTICO ERGONÔMICO
  ══════════════════════════════════════════════════════════ */

  function _htmlDiagnostico() {
    const av = App.obterAvaliacaoAtual();
    const d  = av?.aet || {};
    const pt = av?.planoAcao?.filter(i => i.origem === 'aet') || [];

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>🔬</span>
          <span>Registre o diagnóstico ergonômico com base na análise da demanda e da atividade.
          O diagnóstico fundamenta as recomendações e o plano de transformação.</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Diagnóstico Ergonômico</div>
          <div class="grupo-campo">
            <textarea id="aet-diagnostico" rows="7"
              placeholder="Formule o diagnóstico ergonômico: descreva as situações de trabalho problemáticas identificadas, os determinantes da carga de trabalho, as relações entre as condições de trabalho e os efeitos sobre os trabalhadores..."
            >${d.diagnosticoErgonomico || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Recomendações</div>
          <div class="grupo-campo">
            <textarea id="aet-recomendacoes" rows="6"
              placeholder="Liste as recomendações técnicas, em ordem de prioridade. Classifique em: medidas de engenharia (modificação de equipamentos, layout, ferramentas), medidas organizacionais (ritmo, pausas, rotação) e medidas administrativas (treinamento, EPIs)..."
            >${d.recomendacoes || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Plano de Transformação</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Ações específicas para transformação das situações de trabalho problemáticas:
          </p>
          <div id="aet-plano-lista">
            ${pt.map((a, i) => _htmlItemPlano(a, i)).join('') || `
              <div class="empty-state" style="padding:var(--s4)">
                <p style="font-size:var(--txt-sm)">Nenhuma ação adicionada ao plano.</p>
              </div>
            `}
          </div>
          <button class="btn btn-secundario" style="width:100%;margin-top:var(--s3)"
                  onclick="ModuloAET.adicionarAcaoPlano()">
            + Adicionar Ação ao Plano
          </button>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3)">
            <div class="card-titulo" style="margin-bottom:0">Conclusão Técnica</div>
            <button id="btn-gerar-conclusao-aet" onclick="ModuloAET.gerarConclusaoAETIA()"
                    style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--raio);border:1px solid #3949ab;background:rgba(57,73,171,.15);color:#90caf9;cursor:pointer;white-space:nowrap;flex-shrink:0">
              🤖 Gerar com IA
            </button>
          </div>
          <div class="grupo-campo">
            <textarea id="aet-conclusao" rows="5"
              placeholder="Redija a conclusão técnica da AET: síntese dos principais achados, resposta à demanda original, perspectivas de acompanhamento..."
            >${d.conclusaoTecnica || ''}</textarea>
          </div>
          <div class="linha-campos">
            <div style="flex:1">
              <label class="check-item" style="cursor:pointer">
                <input type="checkbox" id="aet-reavaliacao" ${d.necessitaReavaliacao ? 'checked' : ''}
                       onchange="document.getElementById('aet-prazo-reav').closest('.grupo-campo').classList.toggle('oculto', !this.checked)">
                <div class="check-box">✓</div>
                <span>Necessita reavaliação periódica</span>
              </label>
            </div>
            <div class="grupo-campo ${d.necessitaReavaliacao ? '' : 'oculto'}">
              <label for="aet-prazo-reav">Prazo de reavaliação</label>
              <input type="date" id="aet-prazo-reav" value="${d.prazoReavaliacao || ''}">
            </div>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloAET.salvarDiagnostico()">
          💾 Salvar Diagnóstico
        </button>
        <div style="height:var(--s4)"></div>
      </div>

      <!-- Modal nova ação -->
      <div class="modal-overlay oculto" id="modal-aet-acao">
        <div class="modal-panel">
          <div class="modal-titulo">
            Nova Ação — Plano de Transformação
            <button class="btn-icone" onclick="document.getElementById('modal-aet-acao').classList.add('oculto')">✕</button>
          </div>
          <div id="modal-aet-acao-form"></div>
        </div>
      </div>
    `;
  }

  function _htmlItemPlano(acao, idx) {
    const STATUS_L = { pendente: '⏳ Pendente', em_andamento: '🔄 Em andamento', concluido: '✅ Concluído' };
    return `
      <div class="item-plano prioridade-${acao.prioridade || 'media'}" style="margin-bottom:var(--s2)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s2)">
          <div>
            <div style="font-weight:600;font-size:var(--txt-sm)">${acao.descricao || ''}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s1)">
              ${acao.responsavel ? `👤 ${acao.responsavel}` : ''}
              ${acao.prazo ? ` · 📅 ${acao.prazo}` : ''}
            </div>
          </div>
          <button class="btn btn-perigo btn-sm" onclick="ModuloAET.removerAcaoPlano('${acao.id}')">🗑️</button>
        </div>
      </div>
    `;
  }

  function adicionarAcaoPlano() {
    document.getElementById('modal-aet-acao-form').innerHTML = `
      <div class="grupo-campo">
        <label>Descrição da Ação</label>
        <textarea id="aet-ac-descricao" rows="3" placeholder="Descreva a ação de transformação..."></textarea>
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Responsável</label>
          <input type="text" id="aet-ac-resp" placeholder="Nome ou setor">
        </div>
        <div class="grupo-campo">
          <label>Prazo</label>
          <input type="date" id="aet-ac-prazo">
        </div>
      </div>
      <div class="grupo-campo">
        <label>Prioridade</label>
        <select id="aet-ac-prior">
          <option value="alta">🔴 Alta</option>
          <option value="media" selected>🟡 Média</option>
          <option value="baixa">🟢 Baixa</option>
        </select>
      </div>
      <button class="btn btn-primario" style="width:100%;margin-top:var(--s3)"
              onclick="ModuloAET.confirmarAcaoPlano()">💾 Adicionar</button>
    `;
    document.getElementById('modal-aet-acao').classList.remove('oculto');
  }

  function confirmarAcaoPlano() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const desc = document.getElementById('aet-ac-descricao')?.value?.trim();
    if (!desc) { App.mostrarToast('Informe a descrição', 'erro'); return; }
    const acao = {
      id:          `aet_${Date.now()}`,
      origem:      'aet',
      descricao:   desc,
      responsavel: document.getElementById('aet-ac-resp')?.value?.trim() || '',
      prazo:       document.getElementById('aet-ac-prazo')?.value || '',
      prioridade:  document.getElementById('aet-ac-prior')?.value || 'media',
      status:      'pendente'
    };
    av.planoAcao.push(acao);
    Storage.salvar(av);
    document.getElementById('modal-aet-acao').classList.add('oculto');
    App.mostrarToast('Ação adicionada ao plano', 'sucesso');
    const lista = document.getElementById('aet-plano-lista');
    if (lista) lista.innerHTML = av.planoAcao.filter(a => a.origem === 'aet').map((a, i) => _htmlItemPlano(a, i)).join('');
  }

  function removerAcaoPlano(id) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    av.planoAcao = av.planoAcao.filter(a => a.id !== id);
    Storage.salvar(av);
    const lista = document.getElementById('aet-plano-lista');
    if (lista) lista.innerHTML = av.planoAcao.filter(a => a.origem === 'aet').map((a, i) => _htmlItemPlano(a, i)).join('');
    App.mostrarToast('Ação removida', 'sucesso');
  }

  function _salvarDiagnostico() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.aet.diagnosticoErgonomico  = get('aet-diagnostico');
    av.aet.recomendacoes          = get('aet-recomendacoes');
    av.aet.conclusaoTecnica       = get('aet-conclusao');
    av.aet.necessitaReavaliacao   = document.getElementById('aet-reavaliacao')?.checked || false;
    av.aet.prazoReavaliacao       = get('aet-prazo-reav');
  }

  function salvarDiagnostico() {
    _salvarDiagnostico();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Diagnóstico salvo', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     GERAÇÃO POR IA — CONCLUSÃO TÉCNICA
  ══════════════════════════════════════════════════════════ */

  async function gerarConclusaoAETIA() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;

    const executar = async () => {
      const btn = document.getElementById('btn-gerar-conclusao-aet');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }
      try {
        const d      = av.aet || {};
        const proj   = av.projetoId ? Storage.buscarProjeto(av.projetoId) : null;
        const emp    = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
        const setor  = av.setorId  ? Storage.buscarSetor(av.setorId)  : null;
        const funcao = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;

        const prompt = `Você é um Engenheiro de Segurança do Trabalho especialista em Ergonomia (NR-17).
Redija a CONCLUSÃO TÉCNICA de uma AET (Análise Ergonômica do Trabalho).

CONTEXTO:
Empresa: ${emp?.nome || ''}
Setor: ${setor?.nome || ''}
Função: ${funcao?.nome || ''}
Nº Trabalhadores: ${funcao?.numTrabalhadores || '—'}

DEMANDA ORIGINAL: ${d.motivoSolicitacao || '—'}
DIAGNÓSTICO ERGONÔMICO: ${d.diagnosticoErgonomico || '—'}
EXIGÊNCIAS BIOMECÂNICAS: ${d.exigenciasBiomecanicas || '—'}
EXIGÊNCIAS COGNITIVAS: ${d.exigenciasCognitivas || '—'}
EXIGÊNCIAS ORGANIZACIONAIS: ${d.exigenciasOrganizacionais || '—'}
RECOMENDAÇÕES: ${d.recomendacoes || '—'}

Escreva a Conclusão Técnica em português do Brasil, entre 150 e 300 palavras.
Inclua: síntese dos achados, nível de risco identificado, resposta à demanda original e perspectivas.
Não use bullet points. Use parágrafos coesos. Seja técnico e objetivo.`;

        App.mostrarToast('Gerando conclusão com IA...', 'info');
        const texto = await ClaudeVision.gerarTextoIA(prompt, 512);
        const ta = document.getElementById('aet-conclusao');
        if (ta) { ta.value = texto; ta.dispatchEvent(new Event('input')); }
        _salvarDiagnostico();
        Storage.salvar(av);
        App.mostrarToast('Conclusão gerada com IA', 'sucesso');
      } catch (err) {
        App.mostrarToast('Erro ao gerar: ' + err.message, 'erro');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🤖 Gerar com IA'; }
      }
    };

    if (ClaudeVision.temChave()) {
      await executar();
    } else {
      ClaudeVision.solicitarChaveParaChamada(executar);
    }
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO AET
  ══════════════════════════════════════════════════════════ */

  function _htmlRelatorio() {
    const av = App.obterAvaliacaoAtual();
    const d  = av?.aet || {};
    const _fd = iso => {
      if (!iso) return '';
      try { const [a,m,dia] = iso.slice(0,10).split('-'); return `${dia}/${m}/${a}`; } catch { return iso; }
    };
    const _li = (label, valor) => {
      if (!valor && valor !== 0) return '';
      return `<div style="display:flex;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
        <span style="color:var(--texto-sec);font-size:var(--txt-sm);width:170px;flex-shrink:0">${label}</span>
        <span style="font-size:var(--txt-sm);font-weight:500">${valor}</span>
      </div>`;
    };
    const _p = texto => texto
      ? `<p style="font-size:var(--txt-sm);text-align:justify;hyphens:auto;white-space:pre-wrap;margin-bottom:var(--s2)">${texto}</p>`
      : '';

    /* Lookup correto de empresa/setor/função via Storage */
    const proj   = av?.projetoId ? Storage.buscarProjeto(av.projetoId) : null;
    const emp    = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
    const setor  = av?.setorId  ? Storage.buscarSetor(av.setorId)  : null;
    const funcao = av?.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
    const nomeEmp  = emp?.nome          || av?._empresaNome || '';
    const cnpj     = emp?.cnpj          || '';
    const nomeSet  = setor?.nome        || av?._setorNome   || '';
    const nomeFun  = funcao?.nome       || av?._funcaoNome  || '';
    const nTrab    = funcao?.numTrabalhadores || av?.numTrabalhadores || '';
    const respTec  = av?.responsavelTecnico   || proj?.responsavelTecnico   || '';
    const regProf  = av?.registroProfissional || proj?.registroProfissional || '';
    const cargo    = av?.cargoResponsavel     || proj?.cargoResponsavel     || '';

    const acoesAET = av?.planoAcao?.filter(a => a.origem === 'aet') || [];
    const SOLIC_L  = {
      empresa: 'Empresa', cipa: 'CIPA', sindicato: 'Sindicato',
      trabalhador: 'Trabalhador(es)', servico_saude: 'Serviço de Saúde / SESMT',
      judicial: 'Determinação judicial', propria_iniciativa: 'Iniciativa própria', outro: 'Outro'
    };

    return `
      <style>
        @media print {
          body, #app-content { min-height: 0 !important; }
          .subnav-abas, .btn, .btn-bloco, #btn-voltar, header, nav { display: none !important; }
          .relatorio-secao { page-break-inside: avoid; }
          .relatorio-secao p, .relatorio-secao .campo-tecnico {
            text-align: justify !important; hyphens: auto !important;
          }
        }
      </style>

      <div class="container">
        <div style="margin-top:var(--s4);text-align:center;margin-bottom:var(--s5)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">
            Análise Ergonômica do Trabalho — AET / NR-17
          </div>
          <div style="font-size:var(--txt-xl);font-weight:700">Relatório Técnico</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            ${nomeEmp}${nomeEmp && nomeSet ? ' · ' : ''}${nomeSet}${nomeFun ? ' — ' + nomeFun : ''}
          </div>
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s1)">
            ${_fd(d.dataInicio || av?.dataAvaliacao || '')}
          </div>
        </div>

        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="window.print()">🖨️ Imprimir PDF</button>
          <button class="btn btn-secundario" onclick="ModuloAET.exportarJSON()">📤 Exportar JSON</button>
        </div>

        <div class="relatorio-secao">
          <h3>1. Identificação</h3>
          <div class="card">
            ${_li('Empresa', nomeEmp)}
            ${_li('CNPJ', cnpj)}
            ${_li('Setor / Função', [nomeSet, nomeFun].filter(Boolean).join(' / '))}
            ${_li('Nº Trabalhadores', nTrab)}
            ${_li('Responsável Técnico', respTec)}
            ${_li('Registro Profissional', regProf)}
            ${_li('Cargo / Habilitação', cargo)}
            ${_li('Início da AET', _fd(d.dataInicio))}
          </div>
        </div>

        <div class="relatorio-secao">
          <h3>2. Demanda</h3>
          <div class="card">
            ${_li('Solicitante', SOLIC_L[d.solicitante] || d.solicitante || '')}
            ${d.motivoSolicitacao  ? `<strong style="font-size:var(--txt-sm)">Motivo da Solicitação</strong>${_p(d.motivoSolicitacao)}` : ''}
            ${d.demandaApresentada ? `<strong style="font-size:var(--txt-sm)">Demanda Apresentada</strong>${_p(d.demandaApresentada)}` : ''}
          </div>
        </div>

        ${(d.tarefaPrescrita || d.atividadeReal || d.observacaoAtividade) ? `
        <div class="relatorio-secao">
          <h3>3. Análise da Atividade</h3>
          <div class="card">
            ${d.tarefaPrescrita      ? `<strong style="font-size:var(--txt-sm)">Tarefa Prescrita</strong>${_p(d.tarefaPrescrita)}` : ''}
            ${d.atividadeReal        ? `<strong style="font-size:var(--txt-sm)">Atividade Real</strong>${_p(d.atividadeReal)}` : ''}
            ${d.observacaoAtividade  ? `<strong style="font-size:var(--txt-sm)">Observação em Campo</strong>${_p(d.observacaoAtividade)}` : ''}
            ${d.variabilidades       ? `<strong style="font-size:var(--txt-sm)">Variabilidades</strong>${_p(d.variabilidades)}` : ''}
            ${d.exigenciasBiomecanicas   ? `<strong style="font-size:var(--txt-sm)">Exigências Biomecânicas</strong>${_p(d.exigenciasBiomecanicas)}` : ''}
            ${d.exigenciasCognitivas     ? `<strong style="font-size:var(--txt-sm)">Exigências Cognitivas</strong>${_p(d.exigenciasCognitivas)}` : ''}
            ${d.exigenciasOrganizacionais? `<strong style="font-size:var(--txt-sm)">Exigências Organizacionais</strong>${_p(d.exigenciasOrganizacionais)}` : ''}
            ${d.ferramentasAplicadas?.length ? `
              <strong style="font-size:var(--txt-sm)">Métodos Aplicados</strong>
              <ul style="font-size:var(--txt-xs);margin:var(--s1) 0 var(--s2) var(--s4)">
                ${d.ferramentasAplicadas.map(f => `<li>${f}</li>`).join('')}
              </ul>` : ''}
          </div>
        </div>` : ''}

        ${d.diagnosticoErgonomico ? `
        <div class="relatorio-secao">
          <h3>4. Diagnóstico Ergonômico</h3>
          <div class="card">${_p(d.diagnosticoErgonomico)}</div>
        </div>` : ''}

        ${d.recomendacoes ? `
        <div class="relatorio-secao">
          <h3>5. Recomendações</h3>
          <div class="card">${_p(d.recomendacoes)}</div>
        </div>` : ''}

        ${acoesAET.length > 0 ? `
        <div class="relatorio-secao">
          <h3>6. Plano de Transformação (${acoesAET.length} ação(ões))</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>#</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th></tr></thead>
              <tbody>
                ${acoesAET.map((a, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td style="font-size:var(--txt-xs)">${a.descricao || ''}</td>
                    <td style="font-size:var(--txt-xs)">${a.responsavel||'—'}</td>
                    <td style="font-size:var(--txt-xs)">${_fd(a.prazo)}</td>
                    <td style="font-size:var(--txt-xs)">${a.prioridade || '—'}</td>
                    <td><span class="status-chip status-${a.status}">${a.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        ${d.conclusaoTecnica ? `
        <div class="relatorio-secao">
          <h3>7. Conclusão Técnica</h3>
          <div class="card">${_p(d.conclusaoTecnica)}</div>
          ${d.necessitaReavaliacao ? `
          <div class="aviso-tecnico aviso-tecnico-medio" style="margin-top:var(--s3)">
            <span>🔄</span>
            <span>Reavaliação periódica indicada${d.prazoReavaliacao ? ' · Prazo: ' + _fd(d.prazoReavaliacao) : ''}.</span>
          </div>` : ''}
        </div>` : ''}

        <div style="margin-top:var(--s6);padding-top:var(--s4);border-top:1px solid var(--borda)">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:var(--s4)">
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              ErgoGRO · Análise Ergonômica do Trabalho (AET) · NR-17 / GRO-PGR<br>
              Documento técnico de uso profissional exclusivo
            </div>
            ${respTec ? `
            <div style="text-align:center;min-width:200px">
              <div style="border-top:1px solid var(--texto-sec);padding-top:var(--s2);font-size:var(--txt-xs)">
                ${respTec}${cargo ? '<br>' + cargo : ''}${regProf ? '<br>' + regProf : ''}
              </div>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function exportarJSON() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const proj   = av.projetoId ? Storage.buscarProjeto(av.projetoId) : null;
    const emp    = proj ? Storage.buscarEmpresa(proj.empresaId) : null;
    const blob   = new Blob([Storage.exportarJSON(av.id)], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `AET_${(emp?.nome||'ergogro').replace(/\s+/g,'_')}_${(av.dataAvaliacao||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('JSON exportado', 'sucesso');
  }

  return {
    renderizar, trocarSecao,
    salvarDemanda, salvarAtividade, salvarDiagnostico,
    adicionarAcaoPlano, confirmarAcaoPlano, removerAcaoPlano,
    gerarConclusaoAETIA,
    exportarJSON
  };
})();
