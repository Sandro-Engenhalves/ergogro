/* ============================================================
   ErgoGRO — Módulo: Consolidação Técnica Psicossocial
   Camada de fechamento metodológico entre AFP/AEP e o GRO/PGR.

   PROPÓSITO:
   - Validar tecnicamente os resultados AFP (COPSOQ-III) e AEP
   - Consolidar a exposição em condições de risco baseadas em
     condições de trabalho (não estados psicológicos)
   - Fechar o ciclo metodológico GRO/PGR com decisão registrada

   RESTRIÇÕES OBRIGATÓRIAS:
   - NÃO gera riscos automaticamente no PGR
   - NÃO individualiza resultados AFP (LGPD — Lei 13.709/2018)
   - Decisão técnica é EXCLUSIVA do profissional habilitado
   - COPSOQ-III permanece como triagem organizacional, não diagnóstico
   - Nomenclatura ancora em condições de trabalho (NR-17/2023),
     nunca em estados psicológicos ou comportamentos individuais
   ============================================================ */

const ModuloConsolidacao = (() => {

  /* ══════════════════════════════════════════════════════════
     CONDIÇÕES DE RISCO PSICOSSOCIAL
     Base: NR-17 (Portaria MTP 1.467/2023) — organização do trabalho
     Princípio: nomear a CONDIÇÃO DE TRABALHO, não o estado psicológico.
     Isso garante: (1) ancoragem legal, (2) aceitação pelo cliente,
     (3) possibilidade real de ação corretiva.
  ══════════════════════════════════════════════════════════ */
  const CONDICOES_RISCO = [
    {
      id: 'cr_exigencias',
      titulo: 'Exigências de trabalho além da capacidade operacional',
      descricaoUI: 'Ritmo, metas ou jornada sistematicamente acima do que os trabalhadores conseguem executar com segurança e qualidade.',
      /* Texto formal pronto para uso no laudo/GRO */
      textoLaudo: 'Condições de organização do trabalho com exigências de ritmo, produtividade e/ou carga horária que ultrapassam a capacidade operacional dos trabalhadores, com potencial de comprometimento da saúde e da segurança.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — organização do trabalho: ritmo, metas e jornada · NR-01 — GRO/PGR: fatores psicossociais',
      dimensoesAfp: ['demandas'],
      itensAep: ['org_01', 'org_02', 'org_05'],
    },
    {
      id: 'cr_autonomia',
      titulo: 'Restrição de autonomia e participação no trabalho',
      descricaoUI: 'Trabalhador com baixo ou nenhum controle sobre ritmo, método, planejamento e organização do próprio trabalho.',
      textoLaudo: 'Condições de trabalho caracterizadas pela baixa influência do trabalhador sobre o planejamento, métodos e ritmo de execução das próprias tarefas, limitando a capacidade de adaptação às demandas e de resolução de problemas.',
      fundamentoLegal: 'NR-17 (2023) — organização do trabalho: participação e controle · NR-01 — GRO/PGR: fatores psicossociais',
      dimensoesAfp: ['organizacao'],
      itensAep: ['org_03', 'org_04'],
    },
    {
      id: 'cr_suporte',
      titulo: 'Déficit de suporte social e reconhecimento no trabalho',
      descricaoUI: 'Ausência ou insuficiência de apoio da liderança e dos colegas, comunicação deficiente e falta de reconhecimento pelo trabalho realizado.',
      textoLaudo: 'Condições de trabalho marcadas pela insuficiência de suporte social da chefia e/ou dos colegas, ausência de mecanismos de reconhecimento e deficiências nos canais de comunicação organizacional, comprometendo o senso de pertencimento e a motivação dos trabalhadores.',
      fundamentoLegal: 'NR-17 (2023) — organização do trabalho: relacionamento interpessoal e comunicação · NR-01 — GRO/PGR: fatores psicossociais',
      dimensoesAfp: ['relacoes', 'valores'],
      itensAep: ['psi_01', 'psi_02', 'psi_03'],
    },
    {
      id: 'cr_conflitos',
      titulo: 'Conflitos e deterioração das relações de trabalho',
      descricaoUI: 'Ambiente com conflitos interpessoais frequentes, situações de constrangimento, humilhação ou violência nas relações entre trabalhadores ou com a hierarquia.',
      textoLaudo: 'Condições de trabalho com presença de conflitos interpessoais, situações de constrangimento, tratamento desrespeitoso ou condutas assediadoras nas relações entre pares ou entre trabalhadores e hierarquia, configurando ambiente de trabalho hostil.',
      fundamentoLegal: 'NR-17 (2023) — organização do trabalho: relacionamento interpessoal · NR-01 — GRO/PGR: fatores psicossociais e violência no trabalho',
      dimensoesAfp: ['relacoes', 'valores'],
      itensAep: ['psi_06', 'psi_05'],
    },
    {
      id: 'cr_emocional',
      titulo: 'Exigências emocionais sem suporte adequado',
      descricaoUI: 'Trabalho que exige lidar com sofrimento, conflitos ou situações de alta carga emocional sem que a organização ofereça suporte técnico ou recursos para isso.',
      textoLaudo: 'Condições de trabalho que impõem exigências emocionais intensas — como lidar com usuários em sofrimento, situações de conflito ou demandas incompatíveis — sem que a organização disponibilize suporte técnico, supervisão ou recursos adequados para o manejo dessas situações.',
      fundamentoLegal: 'NR-17 (2023) — organização do trabalho: condições psicossociais · NR-01 — GRO/PGR: fatores psicossociais',
      dimensoesAfp: ['interface', 'saude'],
      itensAep: ['psi_04', 'psi_05'],
    },
    {
      id: 'cr_previsibilidade',
      titulo: 'Falta de clareza e previsibilidade organizacional',
      descricaoUI: 'Papéis indefinidos, mudanças frequentes sem comunicação, ausência de processos claros — gerando insegurança e dificuldade de planejamento pelos trabalhadores.',
      textoLaudo: 'Condições organizacionais marcadas pela indefinição de papéis e responsabilidades, ausência de comunicação estruturada sobre mudanças e decisões, e falta de previsibilidade sobre as condições de trabalho, gerando insegurança e dificultando o desempenho seguro das atividades.',
      fundamentoLegal: 'NR-17 (2023) — organização do trabalho: comunicação e participação · NR-01 — GRO/PGR: fatores psicossociais',
      dimensoesAfp: ['organizacao', 'valores'],
      itensAep: ['psi_02', 'org_03'],
    },
  ];

  /* Nomes de exibição das dimensões AFP (IDs do COPSOQ-III) */
  const DIM_AFP_NOME = {
    demandas:    'Demandas de Trabalho',
    organizacao: 'Organização do Trabalho',
    relacoes:    'Relações Sociais e Liderança',
    interface:   'Interface Trabalho-Indivíduo',
    valores:     'Valores no Local de Trabalho',
    saude:       'Saúde e Bem-Estar',
  };

  /* Nomes curtos dos itens AEP usados na correlação */
  const AEP_ITEM_NOME = {
    org_01: 'Jornada e pausas',
    org_02: 'Ritmo e produtividade',
    org_03: 'Distribuição de tarefas',
    org_04: 'Autonomia',
    org_05: 'Metas e pressão',
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
    { id: 'eliminacao',     label: 'Eliminação',     desc: 'Remover a condição de risco na fonte (ex.: eliminar metas inviáveis, reestruturar turno)' },
    { id: 'reducao',        label: 'Redução',         desc: 'Reduzir a exposição à condição de risco (ex.: reduzir ritmo, limitar jornada extra)' },
    { id: 'administrativo', label: 'Administrativo',  desc: 'Procedimentos, treinamento e gestão (ex.: capacitar lideranças, criar canal de escuta)' },
    { id: 'monitoramento',  label: 'Monitoramento',   desc: 'Vigilância contínua com reavaliação periódica dos indicadores psicossociais' },
  ];

  let _afpDados = null;

  /* ══════════════════════════════════════════════════════════
     RENDERIZAÇÃO PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  async function renderizar(el) {
    if (!el) el = document.getElementById('projeto-conteudo');
    if (!el) return;

    el.innerHTML = '<div class="container" style="padding-top:var(--s6)"><div class="loading-inline">Carregando dados da avaliação psicossocial...</div></div>';

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
          _afpDados = { relatorio: await calcularRelatorio(c.id, c.minRespostasSetor || 5), campanhaId: c.id };
        }
      } catch (e) {
        console.warn('Consolidação: erro AFP —', e.message);
      }
    }

    el.innerHTML = _htmlConsolidacao();
  }

  /* ══════════════════════════════════════════════════════════
     HTML PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  function _htmlConsolidacao() {
    const proj    = App.obterProjetoAtual();
    const cons    = proj?.consolidacaoPsicossocial || {};
    const dec     = cons.decisao || null;
    const avsAEP  = Storage.listarPorProjeto(proj.id).filter(a => a.tipo === 'aep');
    const itensNC = _getItensNaoConformes(avsAEP);
    const dimsDesf = _getDimsDesfavoraveis();
    const temAFP  = ['aep_afp', 'aet', 'integrado', 'psicossocial'].includes(proj.tipo);
    const temAEP  = ['aep', 'aep_afp', 'aet', 'integrado'].includes(proj.tipo);

    return `
      <div class="container">

        <!-- Aviso metodológico -->
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span>
            <strong>Consolidação Técnica Psicossocial</strong> — fechamento metodológico GRO/PGR.<br>
            As condições de risco abaixo são baseadas em <strong>condições de trabalho</strong>
            (NR-17/2023), não em estados psicológicos individuais.
            A decisão de registro é exclusiva do profissional habilitado.
          </span>
        </div>

        <!-- ── ETAPA 1: Evidências e Decisão ─────────────────── -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s4)">
            Etapa 1 — Evidências e Decisão Técnica
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s4);line-height:1.6">
            Analise as evidências abaixo e decida: as condições de trabalho identificadas
            configuram exposição a risco psicossocial a ser registrada no GRO/PGR?
          </p>

          ${temAFP ? _htmlResumoAFP(dimsDesf) : ''}
          ${temAEP && itensNC.length > 0 ? _htmlResumoAEP(itensNC) : ''}

          ${temAFP && !_afpDados ? `
            <div class="aviso-tecnico info" style="margin-top:var(--s3)">
              <span>ℹ️</span>
              <span>Nenhuma campanha AFP com respostas encontrada.
              Acesse <strong>Pesquisas</strong> para habilitar a correlação automática.</span>
            </div>` : ''}

          <div class="cons-decisao-grid">
            ${_cardDecisao('sim',           '✅', 'Confirmar Risco',         'Condições identificadas configuram risco psicossocial. Selecionar condições e registrar no GRO/PGR.', dec)}
            ${_cardDecisao('monitoramento', '👁️', 'Monitorar',               'Condições em nível intermediário. Manter vigilância e reavaliar no próximo ciclo.', dec)}
            ${_cardDecisao('nao',           '✗',  'Sem Condição de Risco',   'As condições de trabalho avaliadas não configuram risco psicossocial no momento.', dec)}
          </div>
        </div>

        <!-- ── ETAPA 2A: Condições de risco (decisão = sim) ─── -->
        <div id="cons-bloco-riscos" style="${dec === 'sim' ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s3)">
              Etapa 2 — Condições de Risco Identificadas
            </div>
            <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
              <span>ℹ️</span>
              <span>Selecione as condições presentes neste grupo de trabalhadores.
              Cada condição selecionada gera um <strong>perigo psicossocial</strong>
              registrável no GRO/PGR. O texto do laudo é gerado automaticamente
              com linguagem técnica e fundamentação legal — revise antes de usar.</span>
            </div>
            ${CONDICOES_RISCO.map(c => _htmlCardCondicao(c, cons, dimsDesf, itensNC)).join('')}
          </div>
        </div>

        <!-- ── ETAPA 2B: Monitoramento ────────────────────────── -->
        <div id="cons-bloco-monitoramento" style="${dec === 'monitoramento' ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">
              Etapa 2 — Plano de Monitoramento
            </div>
            <div class="grupo-campo">
              <label for="cons-plano-monitor">Critérios, Indicadores e Frequência</label>
              <textarea id="cons-plano-monitor" rows="5"
                placeholder="Descreva: quais indicadores serão acompanhados (ex.: taxa de absenteísmo, resultado da próxima AFP), frequência de reavaliação, critérios que acionariam formalização do risco no GRO, e responsável pelo monitoramento."
              >${cons.planoMonitoramento || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- ── ETAPA FINAL: Justificativa e Fechamento ────────── -->
        <div id="cons-bloco-justificativa" style="${dec ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s4)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">
              ${dec === 'nao' ? 'Etapa 2' : 'Etapa 3'} — Justificativa Técnica e Fechamento
            </div>
            <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
              <span>ℹ️</span>
              <span><strong>Nota para o laudo:</strong> A correlação entre instrumentos (AFP/COPSOQ-III e AEP)
              utilizada nesta consolidação é baseada em correspondência de conteúdo entre os instrumentos,
              conforme prática técnica em ergonomia, com fundamentação na NR-17 (2023). Os resultados
              psicossociais são mantidos em nível de grupo (LGPD — Lei 13.709/2018).</span>
            </div>
            <div class="grupo-campo">
              <label for="cons-justificativa">Justificativa Técnica do Profissional</label>
              <textarea id="cons-justificativa" rows="6"
                placeholder="Registre a justificativa para a decisão acima: contexto organizacional considerado, correlação entre AFP e AEP, fatores que influenciaram a conclusão, limitações da avaliação e critérios técnicos adotados."
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
            ${cons.atualizadaEm ? `<p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s2)">Última atualização: ${_fd(cons.atualizadaEm)}</p>` : ''}
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
           style="border-color:${ativo ? cfg.borda : 'var(--borda)'};background:${ativo ? cfg.bg : 'var(--superficie-alt)'};"
           onclick="ModuloConsolidacao.selecionarDecisao('${valor}')">
        <div class="cons-decisao-icone">${icone}</div>
        <div class="cons-decisao-titulo" style="color:${ativo ? cfg.tc : 'var(--texto)'}">${titulo}</div>
        <div class="cons-decisao-desc">${descricao}</div>
      </div>`;
  }

  /* ── Resumo AFP ───────────────────────────────────────────── */
  function _htmlResumoAFP(dimsDesf) {
    if (!_afpDados?.relatorio?.consolidado?.length) return '';
    const r   = _afpDados.relatorio;
    const COR = { favoravel: '#3fb950', intermediario: '#d29922', desfavoravel: '#f85149', sem_dados: '#8b949e' };
    const LBL = { favoravel: 'Favorável', intermediario: 'Intermediário', desfavoravel: 'Desfavorável', sem_dados: '—' };
    return `
      <div class="cons-resumo-bloco">
        <div class="cons-resumo-titulo">AFP / COPSOQ-III — ${r.totalRespostas} respondentes</div>
        <div class="cons-resumo-chips">
          ${r.consolidado.map(d => `
            <div class="cons-dim-chip" style="border-color:${COR[d.nivel] || '#888'}">
              <span class="cons-dim-nome">${d.nome}</span>
              <span class="cons-dim-nivel" style="color:${COR[d.nivel] || '#888'}">${LBL[d.nivel] || '—'} · ${d.media ?? '—'}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Resumo AEP ───────────────────────────────────────────── */
  function _htmlResumoAEP(itensNC) {
    const rel = itensNC.filter(i => i.blocoChave === 'psicossocial' || i.blocoChave === 'organizacao');
    if (!rel.length) return '';
    const COR = { alto: '#f85149', medio: '#d29922', baixo: '#3fb950' };
    return `
      <div class="cons-resumo-bloco" style="margin-top:var(--s3)">
        <div class="cons-resumo-titulo">AEP — Itens psicossociais / organizacionais com não conformidade (${rel.length})</div>
        <div class="cons-resumo-chips">
          ${rel.map(i => `
            <div class="cons-dim-chip" style="border-color:${COR[i.risco] || '#888'}">
              <span class="cons-dim-nome" style="color:${COR[i.risco] || '#888'}">${i.itemId}</span>
              <span class="cons-dim-nivel" style="color:var(--texto-sec)">${(i.itemTexto || '').slice(0, 50)}${(i.itemTexto || '').length > 50 ? '…' : ''}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Card de condição de risco ────────────────────────────── */
  function _htmlCardCondicao(cond, cons, dimsDesf, itensNC) {
    const saved       = (cons.riscosConsolidados || []).find(r => r.id === cond.id) || {};
    const selecionado = saved.selecionado || false;
    const dimsAlerta  = cond.dimensoesAfp.filter(d => dimsDesf.includes(d));
    const itensAlerta = cond.itensAep.filter(id => itensNC.some(i => i.itemId === id));
    const temEvidencia = dimsAlerta.length > 0 || itensAlerta.length > 0;

    return `
      <div class="cons-risco-card ${selecionado ? 'selecionado' : ''}" id="cons-risco-${cond.id}">

        <div class="cons-risco-header" onclick="ModuloConsolidacao.toggleRisco('${cond.id}')">
          <div class="cons-checkbox ${selecionado ? 'marcado' : ''}" id="cons-chk-${cond.id}">${selecionado ? '✓' : ''}</div>
          <div style="flex:1">
            <div class="cons-risco-titulo">${cond.titulo}</div>
            <div class="cons-risco-desc">${cond.descricaoUI}</div>
          </div>
          ${temEvidencia ? `<div class="cons-evidencia-badge">⚠ evidência</div>` : ''}
        </div>

        <div id="cons-det-${cond.id}" style="${selecionado ? '' : 'display:none'};padding:var(--s3) var(--s3) var(--s4);border-top:1px solid var(--borda)">

          <!-- Texto do laudo (pré-gerado, revisável) -->
          <div style="margin-bottom:var(--s3)">
            <div class="cons-correlacao-titulo" style="margin-bottom:var(--s2)">
              Texto para o laudo / GRO — revise antes de usar
            </div>
            <div style="background:var(--fundo);border:1px solid var(--borda);border-left:3px solid var(--primaria);
                        border-radius:var(--raio);padding:var(--s3);font-size:var(--txt-xs);
                        color:var(--texto-sec);line-height:1.6;font-style:italic">
              ${cond.textoLaudo}
            </div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s1)">
              📋 Base legal: ${cond.fundamentoLegal}
            </div>
          </div>

          <!-- Correlações AFP ↔ AEP -->
          <div class="cons-correlacao-grid">
            <div>
              <div class="cons-correlacao-titulo">COPSOQ-III — dimensões relacionadas</div>
              <div class="cons-chips-row">
                ${cond.dimensoesAfp.map(d => {
                  const a = dimsAlerta.includes(d);
                  return `<span class="cons-chip ${a ? 'cons-chip-alert' : 'cons-chip-neutro'}">${DIM_AFP_NOME[d] || d}</span>`;
                }).join('')}
              </div>
            </div>
            <div>
              <div class="cons-correlacao-titulo">AEP — itens corroborantes</div>
              <div class="cons-chips-row">
                ${cond.itensAep.map(id => {
                  const a = itensAlerta.includes(id);
                  return `<span class="cons-chip ${a ? 'cons-chip-warn' : 'cons-chip-neutro'}">${AEP_ITEM_NOME[id] || id}</span>`;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Hierarquia de controle -->
          <div class="grupo-campo" style="margin-top:var(--s3)">
            <label style="font-size:var(--txt-xs)">Hierarquia de Controle (NR-01)</label>
            <select id="cons-hier-${cond.id}">
              <option value="">Selecione a medida de controle...</option>
              ${HIERARQUIA.map(h => `
                <option value="${h.id}" ${saved.hierarquia === h.id ? 'selected' : ''}>
                  ${h.label} — ${h.desc}
                </option>`).join('')}
            </select>
          </div>

          <!-- Estratégia -->
          <div class="grupo-campo">
            <label style="font-size:var(--txt-xs)">Estratégia de Controle</label>
            <textarea id="cons-estrategia-${cond.id}" rows="3"
              placeholder="Descreva as ações concretas para controlar ou eliminar esta condição de risco (ex.: revisão da política de metas, programa de capacitação em gestão humanizada, implantação de ouvidoria interna...)."
            >${saved.estrategia || ''}</textarea>
          </div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     INTERAÇÕES
  ══════════════════════════════════════════════════════════ */

  function selecionarDecisao(valor) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    proj.consolidacaoPsicossocial.decisao = valor;

    const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    hide('cons-bloco-riscos');
    hide('cons-bloco-monitoramento');
    show('cons-bloco-justificativa');
    if (valor === 'sim')           show('cons-bloco-riscos');
    if (valor === 'monitoramento') show('cons-bloco-monitoramento');

    const cfg = {
      sim:           { borda: '#f85149', bg: 'var(--risco-alto-bg)'  },
      monitoramento: { borda: '#d29922', bg: 'var(--risco-medio-bg)' },
      nao:           { borda: '#3fb950', bg: 'var(--risco-baixo-bg)' },
    };
    document.querySelectorAll('.cons-decisao-card').forEach(card => {
      const m = (card.getAttribute('onclick') || '').match(/'(\w+)'/);
      if (!m) return;
      const v = m[1]; const sel = v === valor;
      card.style.borderColor = sel ? cfg[v]?.borda : 'var(--borda)';
      card.style.background  = sel ? cfg[v]?.bg    : 'var(--superficie-alt)';
      const t = card.querySelector('.cons-decisao-titulo');
      if (t) t.style.color = sel ? cfg[v]?.borda : 'var(--texto)';
    });

    try { Storage.salvarProjeto(proj); } catch (e) {}
  }

  function toggleRisco(condId) {
    const proj = App.obterProjetoAtual();
    if (!proj?.consolidacaoPsicossocial) return;
    const cons = proj.consolidacaoPsicossocial;
    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];

    let saved = cons.riscosConsolidados.find(r => r.id === condId);
    if (!saved) {
      const cond = CONDICOES_RISCO.find(c => c.id === condId);
      saved = { id: condId, selecionado: false, titulo: cond?.titulo || '', textoLaudo: cond?.textoLaudo || '', fundamentoLegal: cond?.fundamentoLegal || '', hierarquia: '', estrategia: '' };
      cons.riscosConsolidados.push(saved);
    }
    saved.selecionado = !saved.selecionado;

    const card = document.getElementById(`cons-risco-${condId}`);
    const chk  = document.getElementById(`cons-chk-${condId}`);
    const det  = document.getElementById(`cons-det-${condId}`);
    if (card) card.classList.toggle('selecionado', saved.selecionado);
    if (chk)  { chk.classList.toggle('marcado', saved.selecionado); chk.textContent = saved.selecionado ? '✓' : ''; }
    if (det)  det.style.display = saved.selecionado ? '' : 'none';

    try { Storage.salvarProjeto(proj); } catch (e) {}
  }

  function salvar() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    const cons = proj.consolidacaoPsicossocial;

    cons.justificativaTecnica    = document.getElementById('cons-justificativa')?.value?.trim()  || '';
    cons.responsavelConsolidacao = document.getElementById('cons-responsavel')?.value?.trim()    || '';
    cons.dataConsolidacao        = document.getElementById('cons-data')?.value                   || '';
    cons.planoMonitoramento      = document.getElementById('cons-plano-monitor')?.value?.trim()  || '';

    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];
    CONDICOES_RISCO.forEach(cond => {
      const saved = cons.riscosConsolidados.find(r => r.id === cond.id);
      if (!saved) return;
      const h = document.getElementById(`cons-hier-${cond.id}`);
      const e = document.getElementById(`cons-estrategia-${cond.id}`);
      if (h) saved.hierarquia = h.value;
      if (e) saved.estrategia = e.value.trim();
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

  function _getItensNaoConformes(avsAEP) {
    if (typeof ModuloAEP === 'undefined') return [];
    const mapa = new Map();
    const ord  = { alto: 3, medio: 2, baixo: 1 };
    avsAEP.forEach(av => {
      ModuloAEP.obterNaoConformes(av).forEach(nc => {
        const ex = mapa.get(nc.itemId);
        if (!ex || ord[nc.risco] > ord[ex.risco]) mapa.set(nc.itemId, nc);
      });
    });
    return [...mapa.values()];
  }

  function _getDimsDesfavoraveis() {
    if (!_afpDados?.relatorio?.consolidado) return [];
    return _afpDados.relatorio.consolidado
      .filter(d => d.nivel === 'desfavoravel' || d.nivel === 'intermediario')
      .map(d => d.id)
      .filter(Boolean);
  }

  function _fd(iso) {
    if (!iso) return '';
    try { const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; }
    catch { return iso; }
  }

  /* Expõe as condições para uso externo (ex.: relatório) */
  function obterCondicoesSelecionadas() {
    const proj = App.obterProjetoAtual();
    return (proj?.consolidacaoPsicossocial?.riscosConsolidados || [])
      .filter(r => r.selecionado);
  }

  return { renderizar, selecionarDecisao, toggleRisco, salvar, obterCondicoesSelecionadas };
})();
