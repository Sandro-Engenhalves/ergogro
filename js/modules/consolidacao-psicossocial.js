/* ============================================================
   ErgoGRO — Módulo: Consolidação Técnica Psicossocial
   Camada de fechamento metodológico entre AFP/AEP e o PGR.

   PROPÓSITO:
   - Validar tecnicamente os resultados da AFP (COPSOQ-III) e AEP
   - Consolidar a exposição em categorias macro de risco psicossocial
   - Fechar o ciclo metodológico GRO/PGR com decisão técnica registrada

   RESTRIÇÕES OBRIGATÓRIAS:
   - NÃO gera riscos automaticamente no PGR
   - NÃO individualiza resultados da AFP (LGPD)
   - A decisão técnica é EXCLUSIVA do profissional habilitado
   - COPSOQ-III permanece como triagem organizacional, não diagnóstico
   ============================================================ */

const ModuloConsolidacao = (() => {

  /* ── 5 categorias macro de risco psicossocial (GRO/PGR) ─── */
  const RISCOS_MACRO = [
    {
      id: 'r_organizacao',
      titulo: 'Organização e Exigências do Trabalho',
      descricao: 'Exposição a fatores psicossociais relacionados à organização e exigências do trabalho (jornada, ritmo, metas, autonomia, distribuição de tarefas).',
      dimensoesAfp: ['demandas', 'organizacao'],
      itensAep: ['org_01', 'org_02', 'org_03', 'org_04', 'org_05', 'org_06', 'org_07'],
    },
    {
      id: 'r_relacoes',
      titulo: 'Relações Socioprofissionais e Liderança',
      descricao: 'Exposição a fatores psicossociais relacionados às relações socioprofissionais e liderança (suporte social, comunicação, reconhecimento, conflitos, assédio).',
      dimensoesAfp: ['relacoes', 'valores'],
      itensAep: ['psi_01', 'psi_02', 'psi_03', 'psi_05', 'psi_06'],
    },
    {
      id: 'r_demandas',
      titulo: 'Desequilíbrio entre Demandas e Recursos',
      descricao: 'Exposição a fatores psicossociais relacionados ao desequilíbrio entre as demandas impostas pelo trabalho e os recursos disponíveis ao trabalhador para respondê-las.',
      dimensoesAfp: ['demandas', 'interface'],
      itensAep: ['org_02', 'org_05', 'psi_04', 'cog_01'],
    },
    {
      id: 'r_previsibilidade',
      titulo: 'Previsibilidade e Estabilidade Organizacional',
      descricao: 'Exposição a fatores psicossociais relacionados à previsibilidade, transparência e estabilidade das condições organizacionais (informação, mudanças, definição de papéis).',
      dimensoesAfp: ['organizacao', 'valores'],
      itensAep: ['org_03', 'org_04', 'psi_02'],
    },
    {
      id: 'r_suporte',
      titulo: 'Suporte Social e Bem-Estar no Trabalho',
      descricao: 'Exposição a fatores psicossociais relacionados ao suporte social, saúde percebida e bem-estar dos trabalhadores no ambiente de trabalho.',
      dimensoesAfp: ['relacoes', 'saude'],
      itensAep: ['psi_01', 'psi_04', 'psi_05', 'org_01', 'org_06'],
    },
  ];

  /* Nomes de exibição para as dimensões AFP (IDs do COPSOQ-III) */
  const DIM_AFP_NOME = {
    demandas:    'Demandas de Trabalho',
    organizacao: 'Organização do Trabalho',
    relacoes:    'Relações Sociais e Liderança',
    interface:   'Interface Trabalho-Indivíduo',
    valores:     'Valores no Local de Trabalho',
    saude:       'Saúde e Bem-Estar',
  };

  /* Nomes curtos para os itens AEP usados na correlação */
  const AEP_ITEM_NOME = {
    org_01: 'Jornada e pausas',
    org_02: 'Ritmo e produtividade',
    org_03: 'Distribuição de tarefas',
    org_04: 'Autonomia',
    org_05: 'Metas e pressão',
    org_06: 'Postura estática',
    org_07: 'Movimentos repetitivos',
    psi_01: 'Suporte social',
    psi_02: 'Comunicação',
    psi_03: 'Reconhecimento',
    psi_04: 'Demanda-recurso',
    psi_05: 'Limites emocionais',
    psi_06: 'Assédio / violência',
    cog_01: 'Carga cognitiva',
  };

  /* Hierarquia de controles (NR-01) */
  const HIERARQUIA = [
    { id: 'eliminacao',     label: 'Eliminação',     desc: 'Remover o fator de risco na fonte' },
    { id: 'reducao',        label: 'Redução',         desc: 'Reduzir a exposição ao fator de risco' },
    { id: 'administrativo', label: 'Administrativo',  desc: 'Procedimentos, treinamento e gestão organizacional' },
    { id: 'monitoramento',  label: 'Monitoramento',   desc: 'Vigilância contínua com reavaliação periódica' },
  ];

  let _afpDados = null; /* cache AFP carregado de forma assíncrona */

  /* ══════════════════════════════════════════════════════════
     RENDERIZAÇÃO PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  async function renderizar(el) {
    if (!el) el = document.getElementById('projeto-conteudo');
    if (!el) return;

    el.innerHTML = '<div class="container" style="padding-top:var(--s6)"><div class="loading-inline">Carregando dados da avaliação psicossocial...</div></div>';

    /* Carrega dados AFP do Firestore (assíncrono) */
    const proj   = App.obterProjetoAtual();
    const temAFP = proj && ['aep_afp', 'aet', 'integrado', 'psicossocial'].includes(proj.tipo);

    _afpDados = null;
    if (temAFP && typeof listarCampanhas === 'function') {
      try {
        const campanhas = await listarCampanhas(proj.id);
        const comResp   = campanhas
          .filter(c => c.totalRespostas > 0)
          .sort((a, b) => ((b.criadoEm || '') > (a.criadoEm || '') ? 1 : -1));
        if (comResp.length > 0) {
          const c = comResp[0];
          const relatorio = await calcularRelatorio(c.id, c.minRespostasSetor || 5);
          _afpDados = { relatorio, campanhaId: c.id };
        }
      } catch (e) {
        console.warn('Consolidação: erro ao carregar AFP —', e.message);
      }
    }

    el.innerHTML = _htmlConsolidacao();
  }

  /* ══════════════════════════════════════════════════════════
     HTML PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  function _htmlConsolidacao() {
    const proj = App.obterProjetoAtual();
    const cons = proj?.consolidacaoPsicossocial || {};
    const dec  = cons.decisao || null;

    /* Coleta não-conformidades AEP para correlação */
    const avsAEP         = Storage.listarPorProjeto(proj.id).filter(a => a.tipo === 'aep');
    const itensNC        = _getItensNaoConformes(avsAEP);
    const dimsDesf       = _getDimsDesfavoraveis();

    const temAFP = ['aep_afp', 'aet', 'integrado', 'psicossocial'].includes(proj.tipo);
    const temAEP = ['aep', 'aep_afp', 'aet', 'integrado'].includes(proj.tipo);

    return `
      <div class="container">

        <!-- Aviso metodológico -->
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span>
            <strong>Consolidação Técnica Psicossocial</strong> — etapa de fechamento metodológico GRO/PGR.<br>
            A decisão de registro de risco é responsabilidade exclusiva do profissional habilitado.
            Esta ferramenta <strong>NÃO gera riscos automaticamente</strong>.
          </span>
        </div>

        <!-- ── ETAPA 1: Decisão Técnica ─────────────────────── -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s4)">
            Etapa 1 — Decisão Técnica
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s4);line-height:1.6">
            Com base nos resultados da AFP (COPSOQ-III) e das avaliações ergonômicas (AEP),
            o profissional deve decidir: os fatores psicossociais identificados configuram
            exposição a risco ocupacional a ser registrada formalmente no GRO/PGR?
          </p>

          <!-- Resumo AFP -->
          ${temAFP ? _htmlResumoAFP(dimsDesf) : ''}

          <!-- Resumo AEP -->
          ${temAEP && itensNC.length > 0 ? _htmlResumoAEP(itensNC) : ''}

          <!-- Aviso: sem dados AFP -->
          ${temAFP && !_afpDados ? `
            <div class="aviso-tecnico info" style="margin-top:var(--s3)">
              <span>ℹ️</span>
              <span>Nenhuma campanha AFP com respostas encontrada. Realize a pesquisa psicossocial
              na aba <strong>Pesquisas</strong> para habilitar a correlação automática.</span>
            </div>
          ` : ''}

          <!-- Cards de decisão -->
          <div class="cons-decisao-grid">
            ${_cardDecisao('sim', '✅', 'Confirmar Risco', 'Os fatores psicossociais identificados configuram risco ocupacional. Registrar no GRO/PGR com hierarquia de controles.', dec)}
            ${_cardDecisao('monitoramento', '👁️', 'Monitorar', 'Fatores psicossociais presentes em nível intermediário. Manter vigilância sem registro formal de risco por ora.', dec)}
            ${_cardDecisao('nao', '✗', 'Sem Risco Identificado', 'Os fatores psicossociais avaliados não configuram risco ocupacional no momento. Registrar conclusão.', dec)}
          </div>
        </div>

        <!-- ── ETAPA 2A: Categorias de risco (se decisão = sim) ── -->
        <div id="cons-bloco-riscos" style="${dec === 'sim' ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">
              Etapa 2 — Categorias de Risco Psicossocial
            </div>
            <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
              <span>ℹ️</span>
              <span>Selecione as categorias que se aplicam a este grupo. Para cada categoria
              selecionada, defina a hierarquia de controle e a estratégia de intervenção.
              Estas categorias orientam o registro no GRO/PGR — o profissional deve formalizá-las
              no sistema de gerenciamento de riscos da empresa.</span>
            </div>
            ${RISCOS_MACRO.map(r => _htmlCardRisco(r, cons, dimsDesf, itensNC)).join('')}
          </div>
        </div>

        <!-- ── ETAPA 2B: Plano de monitoramento (se decisão = monitoramento) ── -->
        <div id="cons-bloco-monitoramento" style="${dec === 'monitoramento' ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">
              Etapa 2 — Plano de Monitoramento
            </div>
            <div class="grupo-campo">
              <label for="cons-plano-monitor">
                Critérios, Indicadores e Frequência de Monitoramento
              </label>
              <textarea id="cons-plano-monitor" rows="5"
                placeholder="Descreva: quais indicadores serão acompanhados, frequência de reavaliação (ex.: anual), critérios de agravamento que acionariam novo ciclo de avaliação e responsáveis pelo monitoramento."
              >${cons.planoMonitoramento || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- ── ETAPA FINAL: Justificativa Técnica (visível após decisão) ── -->
        <div id="cons-bloco-justificativa" style="${dec ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">
              ${dec === 'nao' ? 'Etapa 2' : 'Etapa 3'} — Justificativa Técnica e Fechamento
            </div>
            <div class="grupo-campo">
              <label for="cons-justificativa">Justificativa Técnica do Profissional</label>
              <textarea id="cons-justificativa" rows="6"
                placeholder="Registre a justificativa para a decisão acima: contexto organizacional considerado, correlação entre AFP e AEP, fatores que influenciaram a conclusão, limitações identificadas na avaliação e critérios técnicos adotados."
              >${cons.justificativaTecnica || ''}</textarea>
            </div>
            <div class="linha-campos">
              <div class="grupo-campo">
                <label for="cons-responsavel">Responsável pela Consolidação</label>
                <input type="text" id="cons-responsavel"
                       placeholder="Nome do profissional habilitado"
                       value="${cons.responsavelConsolidacao || proj?.responsavelTecnico || ''}">
              </div>
              <div class="grupo-campo">
                <label for="cons-data">Data da Consolidação</label>
                <input type="date" id="cons-data"
                       value="${cons.dataConsolidacao || new Date().toISOString().slice(0, 10)}">
              </div>
            </div>
            ${cons.atualizadaEm ? `
              <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s2)">
                Última atualização: ${_fd(cons.atualizadaEm)}
              </p>` : ''}
          </div>

          <button class="btn-bloco" onclick="ModuloConsolidacao.salvar()">
            💾 Salvar Consolidação Técnica
          </button>
        </div>

        <div style="height:var(--s6)"></div>
      </div>
    `;
  }

  /* ── Card de decisão ──────────────────────────────────────── */
  function _cardDecisao(valor, icone, titulo, descricao, atual) {
    const ativo = atual === valor;
    const cfg = {
      sim:           { bg: 'var(--risco-alto-bg)',  borda: '#f85149', tc: '#f85149' },
      monitoramento: { bg: 'var(--risco-medio-bg)', borda: '#d29922', tc: '#d29922' },
      nao:           { bg: 'var(--risco-baixo-bg)', borda: '#3fb950', tc: '#3fb950' },
    }[valor];

    return `
      <div class="cons-decisao-card ${ativo ? 'ativo' : ''}"
           style="border-color:${ativo ? cfg.borda : 'var(--borda)'};
                  background:${ativo ? cfg.bg : 'var(--superficie-alt)'};"
           onclick="ModuloConsolidacao.selecionarDecisao('${valor}')">
        <div class="cons-decisao-icone">${icone}</div>
        <div class="cons-decisao-titulo" style="color:${ativo ? cfg.tc : 'var(--texto)'}">${titulo}</div>
        <div class="cons-decisao-desc">${descricao}</div>
      </div>
    `;
  }

  /* ── Resumo AFP ───────────────────────────────────────────── */
  function _htmlResumoAFP(dimsDesf) {
    if (!_afpDados?.relatorio) return '';
    const r           = _afpDados.relatorio;
    const consolidado = r.consolidado || [];
    if (!consolidado.length) return '';

    const COR   = { favoravel: '#3fb950', intermediario: '#d29922', desfavoravel: '#f85149', sem_dados: '#8b949e' };
    const LABEL = { favoravel: 'Fav.',    intermediario: 'Int.',     desfavoravel: 'Desf.',   sem_dados: '—' };

    return `
      <div class="cons-resumo-bloco">
        <div class="cons-resumo-titulo">AFP / COPSOQ-III — ${r.totalRespostas} respondentes</div>
        <div class="cons-resumo-chips">
          ${consolidado.map(d => `
            <div class="cons-dim-chip" style="border-color:${COR[d.nivel] || '#888'}">
              <span class="cons-dim-nome">${d.nome}</span>
              <span class="cons-dim-nivel" style="color:${COR[d.nivel] || '#888'}">${LABEL[d.nivel] || '—'} · ${d.media ?? '—'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ── Resumo AEP (itens psi/org não conformes) ──────────────── */
  function _htmlResumoAEP(itensNC) {
    const itensRel = itensNC.filter(i => i.blocoChave === 'psicossocial' || i.blocoChave === 'organizacao');
    if (!itensRel.length) return '';

    const COR = { alto: '#f85149', medio: '#d29922', baixo: '#3fb950' };
    return `
      <div class="cons-resumo-bloco" style="margin-top:var(--s3)">
        <div class="cons-resumo-titulo">
          AEP — Itens psicossociais / organizacionais com não conformidade (${itensRel.length})
        </div>
        <div class="cons-resumo-chips">
          ${itensRel.map(i => `
            <div class="cons-dim-chip" style="border-color:${COR[i.risco] || '#888'}">
              <span class="cons-dim-nome" style="color:${COR[i.risco] || '#888'}">${i.itemId}</span>
              <span class="cons-dim-nivel" style="color:var(--texto-sec)">${(i.itemTexto || '').slice(0, 45)}${(i.itemTexto || '').length > 45 ? '…' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ── Card de categoria de risco ──────────────────────────── */
  function _htmlCardRisco(risco, cons, dimsDesf, itensNC) {
    const riscosSalvos = cons.riscosConsolidados || [];
    const salvo        = riscosSalvos.find(r => r.id === risco.id) || {};
    const selecionado  = salvo.selecionado || false;

    /* Dimensões AFP desfavoráveis/intermediárias que correlacionam */
    const dimsAlerta = risco.dimensoesAfp.filter(d => dimsDesf.includes(d));
    /* Itens AEP não conformes que correlacionam */
    const itensAlerta = risco.itensAep.filter(id => itensNC.some(i => i.itemId === id));
    const temEvidencia = dimsAlerta.length > 0 || itensAlerta.length > 0;

    return `
      <div class="cons-risco-card ${selecionado ? 'selecionado' : ''}" id="cons-risco-${risco.id}">

        <!-- Cabeçalho clicável -->
        <div class="cons-risco-header" onclick="ModuloConsolidacao.toggleRisco('${risco.id}')">
          <div class="cons-checkbox ${selecionado ? 'marcado' : ''}" id="cons-chk-${risco.id}">
            ${selecionado ? '✓' : ''}
          </div>
          <div style="flex:1">
            <div class="cons-risco-titulo">${risco.titulo}</div>
            <div class="cons-risco-desc">${risco.descricao}</div>
          </div>
          ${temEvidencia ? `
            <div class="cons-evidencia-badge" title="${dimsAlerta.length} dim. AFP · ${itensAlerta.length} item(ns) AEP">
              ⚠ evidência
            </div>
          ` : ''}
        </div>

        <!-- Detalhes — visíveis apenas quando selecionado -->
        <div id="cons-det-${risco.id}" style="${selecionado ? '' : 'display:none'};
             padding:var(--s3) var(--s3) var(--s4);border-top:1px solid var(--borda)">

          <!-- Correlações automáticas -->
          <div class="cons-correlacao-grid">
            <div>
              <div class="cons-correlacao-titulo">Dimensões AFP relacionadas</div>
              <div class="cons-chips-row">
                ${risco.dimensoesAfp.map(d => {
                  const alert = dimsAlerta.includes(d);
                  return `<span class="cons-chip ${alert ? 'cons-chip-alert' : 'cons-chip-neutro'}">${DIM_AFP_NOME[d] || d}</span>`;
                }).join('')}
              </div>
            </div>
            <div>
              <div class="cons-correlacao-titulo">Itens AEP corroborantes</div>
              <div class="cons-chips-row">
                ${risco.itensAep.map(id => {
                  const alert = itensAlerta.includes(id);
                  return `<span class="cons-chip ${alert ? 'cons-chip-warn' : 'cons-chip-neutro'}">${AEP_ITEM_NOME[id] || id}</span>`;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Hierarquia de controle -->
          <div class="grupo-campo" style="margin-top:var(--s3)">
            <label style="font-size:var(--txt-xs)">Hierarquia de Controle (NR-01)</label>
            <select id="cons-hier-${risco.id}">
              <option value="">Selecione a medida de controle...</option>
              ${HIERARQUIA.map(h => `
                <option value="${h.id}" ${salvo.hierarquia === h.id ? 'selected' : ''}>
                  ${h.label} — ${h.desc}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Estratégia -->
          <div class="grupo-campo">
            <label style="font-size:var(--txt-xs)">Estratégia de Controle e Intervenção</label>
            <textarea id="cons-estrategia-${risco.id}" rows="3"
              placeholder="Descreva a estratégia de controle para este fator de risco psicossocial (ex.: revisar política de metas, implementar rodízio de funções, capacitar lideranças, promover diálogos de segurança...)."
            >${salvo.estrategia || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════
     INTERAÇÕES
  ══════════════════════════════════════════════════════════ */

  function selecionarDecisao(valor) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    proj.consolidacaoPsicossocial.decisao = valor;

    /* Atualiza exibição dos blocos */
    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    hide('cons-bloco-riscos');
    hide('cons-bloco-monitoramento');
    show('cons-bloco-justificativa');

    if (valor === 'sim')           show('cons-bloco-riscos');
    if (valor === 'monitoramento') show('cons-bloco-monitoramento');

    /* Atualiza visual dos cards de decisão */
    const cfg = {
      sim:           { borda: '#f85149', bg: 'var(--risco-alto-bg)' },
      monitoramento: { borda: '#d29922', bg: 'var(--risco-medio-bg)' },
      nao:           { borda: '#3fb950', bg: 'var(--risco-baixo-bg)' },
    };
    document.querySelectorAll('.cons-decisao-card').forEach(card => {
      const onclick = card.getAttribute('onclick') || '';
      const m = onclick.match(/'(\w+)'/);
      if (!m) return;
      const v   = m[1];
      const sel = v === valor;
      card.style.borderColor  = sel ? cfg[v]?.borda : 'var(--borda)';
      card.style.background   = sel ? cfg[v]?.bg    : 'var(--superficie-alt)';
      const tituloEl = card.querySelector('.cons-decisao-titulo');
      if (tituloEl) tituloEl.style.color = sel ? cfg[v]?.borda : 'var(--texto)';
    });

    try { Storage.salvarProjeto(proj); } catch (e) {}
  }

  function toggleRisco(riscoId) {
    const proj = App.obterProjetoAtual();
    if (!proj?.consolidacaoPsicossocial) return;
    const cons = proj.consolidacaoPsicossocial;
    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];

    let salvo = cons.riscosConsolidados.find(r => r.id === riscoId);
    if (!salvo) {
      const macro = RISCOS_MACRO.find(r => r.id === riscoId);
      salvo = {
        id: riscoId, selecionado: false,
        descricao: macro?.descricao || '',
        hierarquia: '', estrategia: '',
      };
      cons.riscosConsolidados.push(salvo);
    }
    salvo.selecionado = !salvo.selecionado;

    /* Atualiza DOM sem re-renderizar */
    const card = document.getElementById(`cons-risco-${riscoId}`);
    const chk  = document.getElementById(`cons-chk-${riscoId}`);
    const det  = document.getElementById(`cons-det-${riscoId}`);
    if (card) card.classList.toggle('selecionado', salvo.selecionado);
    if (chk)  { chk.classList.toggle('marcado', salvo.selecionado); chk.textContent = salvo.selecionado ? '✓' : ''; }
    if (det)  det.style.display = salvo.selecionado ? '' : 'none';

    try { Storage.salvarProjeto(proj); } catch (e) {}
  }

  function salvar() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    const cons = proj.consolidacaoPsicossocial;

    cons.justificativaTecnica    = document.getElementById('cons-justificativa')?.value?.trim()   || '';
    cons.responsavelConsolidacao = document.getElementById('cons-responsavel')?.value?.trim()     || '';
    cons.dataConsolidacao        = document.getElementById('cons-data')?.value                    || '';
    cons.planoMonitoramento      = document.getElementById('cons-plano-monitor')?.value?.trim()   || '';

    /* Salva hierarquia e estratégia de cada categoria selecionada */
    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];
    RISCOS_MACRO.forEach(risco => {
      const salvo = cons.riscosConsolidados.find(r => r.id === risco.id);
      if (!salvo) return;
      const hierEl  = document.getElementById(`cons-hier-${risco.id}`);
      const estratEl = document.getElementById(`cons-estrategia-${risco.id}`);
      if (hierEl)   salvo.hierarquia = hierEl.value;
      if (estratEl) salvo.estrategia = estratEl.value.trim();
    });

    cons.atualizadaEm = new Date().toISOString();

    try {
      Storage.salvarProjeto(proj);
      App.mostrarToast('Consolidação técnica salva com sucesso', 'sucesso');
    } catch (e) {
      App.mostrarToast('Erro ao salvar: ' + e.message, 'erro');
    }
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */

  /* Coleta itens não conformes via ModuloAEP, evitando duplicatas */
  function _getItensNaoConformes(avsAEP) {
    if (typeof ModuloAEP === 'undefined') return [];
    const mapa = new Map();
    const ord  = { alto: 3, medio: 2, baixo: 1 };
    avsAEP.forEach(av => {
      ModuloAEP.obterNaoConformes(av).forEach(nc => {
        const existente = mapa.get(nc.itemId);
        if (!existente || ord[nc.risco] > ord[existente.risco]) {
          mapa.set(nc.itemId, nc);
        }
      });
    });
    return [...mapa.values()];
  }

  /* Retorna IDs de dimensões AFP com resultado desfavorável ou intermediário */
  function _getDimsDesfavoraveis() {
    if (!_afpDados?.relatorio?.consolidado) return [];
    return _afpDados.relatorio.consolidado
      .filter(d => d.nivel === 'desfavoravel' || d.nivel === 'intermediario')
      .map(d => d.id)
      .filter(Boolean);
  }

  /* Formata data ISO → dd/mm/aaaa */
  function _fd(iso) {
    if (!iso) return '';
    try {
      const [a, m, d] = iso.slice(0, 10).split('-');
      return `${d}/${m}/${a}`;
    } catch { return iso; }
  }

  return { renderizar, selecionarDecisao, toggleRisco, salvar };
})();
