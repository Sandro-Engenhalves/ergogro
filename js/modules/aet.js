/* ══════════════════════════════════════════════════════════════════════
   aet.js — Módulo AET v7
   Análise Ergonômica do Trabalho — NR 17
   ErgoGRO © 2026
   ══════════════════════════════════════════════════════════════════════ */

const ModuloAET = (() => {
  'use strict';

  /* ── Seções (abas) ── */
  const SECOES = [
    { id: 'identificacao', icone: '📋', label: 'Identificação'   },
    { id: 'demanda',       icone: '📝', label: 'Demanda'         },
    { id: 'caracterizacao',icone: '🏭', label: 'Caracterização'  },
    { id: 'atividade',     icone: '🏃', label: 'Atividade'       },
    { id: 'exigencias',    icone: '⚠️',  label: 'Exigências'     },
    { id: 'ferramentas',   icone: '🔧', label: 'Ferramentas'     },
    { id: 'diagnostico',   icone: '🔬', label: 'Diagnóstico'     },
    { id: 'recomendacoes', icone: '💡', label: 'Recomendações'   },
    { id: 'plano',         icone: '📌', label: 'Plano'           },
    { id: 'conclusao',     icone: '✅', label: 'Conclusão'       },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'       },
  ];

  /* ── Definição das ferramentas ergonômicas ── */
  const TOOLS_DEF = [
    {
      id: 'rula', nome: 'RULA', categoria: 'postural',
      desc: 'Rapid Upper Limb Assessment — membros superiores e pescoço',
      campos: [
        { id: 'pontuacao',     label: 'Pontuação final (1–7)',   tipo: 'number', min: 1, max: 7 },
        { id: 'nivel',         label: 'Nível de ação',           tipo: 'select', opts: ['1 – Aceitável','2 – Investigar','3 – Investigar e mudar breve','4 – Investigar e mudar imediatamente'] },
        { id: 'membros',       label: 'Membros avaliados',       tipo: 'text'   },
        { id: 'tarefa',        label: 'Tarefa avaliada',         tipo: 'text'   },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'reba', nome: 'REBA', categoria: 'postural',
      desc: 'Rapid Entire Body Assessment — corpo inteiro',
      campos: [
        { id: 'pontuacao',     label: 'Pontuação REBA (1–15)',   tipo: 'number', min: 1, max: 15 },
        { id: 'nivel',         label: 'Nível de risco',          tipo: 'select', opts: ['Negligenciável (1)','Baixo (2–3)','Médio (4–7)','Alto (8–10)','Muito alto (11–15)'] },
        { id: 'tarefa',        label: 'Tarefa avaliada',         tipo: 'text'   },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'owas', nome: 'OWAS', categoria: 'postural',
      desc: 'Ovako Working Posture Analysis System — posturas de trabalho',
      campos: [
        { id: 'categorias',    label: 'Distribuição por categoria (1–4)',   tipo: 'textarea' },
        { id: 'pior_cat',      label: 'Categoria predominante',             tipo: 'select', opts: ['Categoria 1 – Sem dano','Categoria 2 – Atenção','Categoria 3 – Intervenção breve','Categoria 4 – Intervenção imediata'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'niosh', nome: 'Equação NIOSH', categoria: 'carga',
      desc: 'Cálculo do limite de peso recomendado para levantamento manual',
      temCalculo: true,
      campos: [
        { id: 'peso',      label: 'Peso real levantado (kg)',    tipo: 'number', min: 0, step: 0.1 },
        { id: 'H',         label: 'H — Distância horizontal (cm)', tipo: 'number', min: 1 },
        { id: 'V',         label: 'V — Altura de origem (cm)',   tipo: 'number', min: 0 },
        { id: 'D',         label: 'D — Distância vertical (cm)',tipo: 'number', min: 1 },
        { id: 'A',         label: 'A — Ângulo assimetria (°)',  tipo: 'number', min: 0, max: 135 },
        { id: 'FM_cat',    label: 'FM — Categoria frequência',   tipo: 'select', opts: ['≤0,2/min – baixa carga','>0,2 a ≤1/min','> 1 a ≤5/min','> 5 a ≤9/min','>9/min'] },
        { id: 'CM_cat',    label: 'CM — Acoplamento',            tipo: 'select', opts: ['Bom','Regular','Ruim'] },
        { id: 'RWL',       label: 'RWL calculado (kg) [auto]',  tipo: 'number', readonly: true },
        { id: 'IL',        label: 'IL calculado [auto]',        tipo: 'number', readonly: true, step: 0.01 },
        { id: 'observacoes',label: 'Observações',               tipo: 'textarea' },
      ]
    },
    {
      id: 'ocra', nome: 'OCRA', categoria: 'repeticao',
      desc: 'Occupational Repetitive Actions — membros superiores repetitivos',
      campos: [
        { id: 'indice',        label: 'Índice OCRA (checklist ou completo)', tipo: 'number', step: 0.1 },
        { id: 'nivel',         label: 'Nível de exposição',       tipo: 'select', opts: ['Verde (≤2,2 – Aceitável)','Amarelo (2,3–3,5 – Muito leve)','Laranja (3,6–4,5 – Leve)','Vermelho (4,6–9,0 – Médio)','Roxo (>9,0 – Alto)'] },
        { id: 'membro',        label: 'Membro avaliado',          tipo: 'select', opts: ['Direito','Esquerdo','Ambos'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'strain_index', nome: 'Strain Index', categoria: 'repeticao',
      desc: 'Índice de tensão para distúrbios distais de membros superiores',
      campos: [
        { id: 'si',            label: 'Strain Index (valor)',     tipo: 'number', step: 0.1 },
        { id: 'nivel',         label: 'Classificação',            tipo: 'select', opts: ['<3 – Provavelmente seguro','3–5 – Incerto','>5 – Provavelmente perigoso','>9 – Perigoso'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'qec', nome: 'QEC', categoria: 'postural',
      desc: 'Quick Exposure Check — exposição a riscos musculoesqueléticos',
      campos: [
        { id: 'pontuacao',     label: 'Pontuação QEC (%)',        tipo: 'number', min: 0, max: 100 },
        { id: 'nivel',         label: 'Nível de ação',            tipo: 'select', opts: ['<40% – Aceitável','40–49% – Investigar','50–69% – Investigar e mudar','≥70% – Mudar imediatamente'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'hal', nome: 'HAL/ACGIH', categoria: 'repeticao',
      desc: 'Hand Activity Level — nível de atividade da mão',
      campos: [
        { id: 'hal',           label: 'HAL (0–10)',               tipo: 'number', min: 0, max: 10, step: 0.5 },
        { id: 'pf',            label: 'Pico de força normalizado (0–1)', tipo: 'number', min: 0, max: 1, step: 0.05 },
        { id: 'nivel',         label: 'Situação',                 tipo: 'select', opts: ['Abaixo do TLV – Aceitável','Entre TLV e AL – Atenção','Acima do AL – Risco elevado'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'borg', nome: 'Escala de Borg', categoria: 'carga',
      desc: 'Percepção subjetiva de esforço — CR10 ou CR20',
      campos: [
        { id: 'versao',        label: 'Versão',                   tipo: 'select', opts: ['CR10','CR20 (RPE)'] },
        { id: 'media',         label: 'Média das respostas',      tipo: 'number', step: 0.5 },
        { id: 'interpretacao', label: 'Interpretação',            tipo: 'select', opts: ['Muito fraco / Repouso','Fraco','Moderado','Forte','Muito forte','Extremamente forte / Máximo'] },
        { id: 'n_respondentes',label: 'Nº de respondentes',       tipo: 'number', min: 1 },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'corlett', nome: 'Mapa de Desconforto (Corlett)', categoria: 'postural',
      desc: 'Mapeamento corporal de desconforto e dor',
      campos: [
        { id: 'regioes',       label: 'Regiões com maior desconforto', tipo: 'textarea' },
        { id: 'nivel_max',     label: 'Nível máximo relatado (1–5)', tipo: 'number', min: 1, max: 5 },
        { id: 'n_respondentes',label: 'Nº de respondentes',       tipo: 'number', min: 1 },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'postural', nome: 'Análise Postural', categoria: 'postural',
      desc: 'Análise qualitativa ou fotográfica de posturas adotadas',
      campos: [
        { id: 'posturas',      label: 'Posturas identificadas',   tipo: 'textarea' },
        { id: 'frequencia',    label: 'Frequência / duração',     tipo: 'text' },
        { id: 'nivel',         label: 'Nível de risco estimado',  tipo: 'select', opts: ['Baixo','Médio','Alto','Muito alto'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'forca', nome: 'Análise de Força', categoria: 'carga',
      desc: 'Mensuração ou estimativa de esforço e força aplicada',
      campos: [
        { id: 'metodo',        label: 'Método utilizado',         tipo: 'select', opts: ['Dinamômetro','Escala de percepção','Equação biomecânica','Outro'] },
        { id: 'valores',       label: 'Valores medidos / estimados', tipo: 'textarea' },
        { id: 'nivel',         label: 'Classificação do esforço', tipo: 'select', opts: ['Leve','Moderado','Intenso','Muito intenso'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'vibracao', nome: 'Vibrações', categoria: 'ambiente',
      desc: 'Avaliação de exposição a vibrações (mão-braço ou corpo inteiro)',
      campos: [
        { id: 'tipo',          label: 'Tipo',                     tipo: 'select', opts: ['Mão-braço (NHV)','Corpo inteiro (WBV)','Ambos'] },
        { id: 'aceleracao',    label: 'Aceleração medida (m/s²)', tipo: 'number', step: 0.01 },
        { id: 'duracao',       label: 'Tempo de exposição diária (h)', tipo: 'number', step: 0.5 },
        { id: 'nivel',         label: 'Situação em relação ao limite', tipo: 'select', opts: ['Abaixo do valor de ação','Entre valor de ação e limite','Acima do limite'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'entrevista', nome: 'Entrevista Semiestruturada', categoria: 'qualitativa',
      desc: 'Entrevista com trabalhadores sobre a atividade real de trabalho',
      campos: [
        { id: 'n_entrevistados',label: 'Nº de entrevistados',    tipo: 'number', min: 1 },
        { id: 'temas',         label: 'Temas abordados',         tipo: 'textarea' },
        { id: 'principais_relatos', label: 'Principais relatos', tipo: 'textarea' },
        { id: 'observacoes',   label: 'Síntese / observações',   tipo: 'textarea' },
      ]
    },
    {
      id: 'filmagem', nome: 'Filmagem / Análise de Vídeo', categoria: 'qualitativa',
      desc: 'Registro em vídeo para análise detalhada da atividade',
      campos: [
        { id: 'duracao_total', label: 'Duração total gravada (min)', tipo: 'number' },
        { id: 'tarefas',       label: 'Tarefas filmadas',         tipo: 'textarea' },
        { id: 'achados',       label: 'Principais achados',      tipo: 'textarea' },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
    {
      id: 'observacao_sistematica', nome: 'Observação Sistemática', categoria: 'qualitativa',
      desc: 'Observação estruturada e registro da atividade real de trabalho',
      campos: [
        { id: 'duracao',       label: 'Duração da observação (min)', tipo: 'number' },
        { id: 'ciclos',        label: 'Ciclos observados',        tipo: 'number' },
        { id: 'achados',       label: 'Principais achados',      tipo: 'textarea' },
        { id: 'observacoes',   label: 'Observações / síntese',   tipo: 'textarea' },
      ]
    },
    {
      id: 'outro', nome: 'Outra Ferramenta', categoria: 'outro',
      desc: 'Ferramenta ou método não listado acima',
      campos: [
        { id: 'nome_outro',    label: 'Nome da ferramenta',       tipo: 'text' },
        { id: 'metodologia',   label: 'Metodologia / referência', tipo: 'textarea' },
        { id: 'resultados',    label: 'Resultados obtidos',       tipo: 'textarea' },
        { id: 'nivel',         label: 'Nível de risco identificado', tipo: 'select', opts: ['Sem risco','Baixo','Médio','Alto','Muito alto'] },
        { id: 'observacoes',   label: 'Observações',             tipo: 'textarea' },
      ]
    },
  ];

  /* ── Guias práticos por ferramenta ── */
  const TOOLS_GUIA = {
    rula:                  'Pontuação 1–2: sem ação • 3–4: investigar • 5–6: mudar em breve • 7: imediato. Fotografar postura mais crítica do ciclo.',
    reba:                  'Score ≤3: baixo • 4–7: médio • 8–10: alto • ≥11: muito alto. Avalia corpo inteiro; inclui membros inferiores, ao contrário do RULA.',
    owas:                  'Cat. 1: normal • 2: monitorar • 3: intervir breve • 4: imediato. Observar mín. 50 posturas em intervalos aleatórios.',
    niosh:                 'IL ≤1,0: aceitável • 1,1–3: risco moderado • >3: alto. Registrar dimensões reais da tarefa (H, V, D) e frequência de levantamento.',
    ocra:                  '≤2,2 verde • 2,3–3,5 amarelo • 3,6–4,5 laranja • 4,6–9,0 vermelho • >9,0 roxo. Para tarefas com >2 h de movimentos repetitivos por turno.',
    strain_index:          '<3 provavelmente seguro • 3–5 incerto • >5 perigoso • >9 muito perigoso. Seis variáveis: esforço, aceleração, duração, frequência, postura e ritmo.',
    qec:                   'Pontuar 4 segmentos (costas, ombros, punho, pescoço). % = pontos/máx × 100. ≥50% exige investigação; ≥70% intervenção imediata.',
    hal:                   'TLV: HAL 7 + PF 0,36 • AL: HAL 4 + PF 0,5. HAL 0–10 (frequência/velocidade); PF 0–1 (força normalizada). Plotar no gráfico ACGIH.',
    borg:                  'CR10: 0=repouso • 3=moderado • 5=forte • 7=muito forte • 10=máximo. Média do grupo >5 indica necessidade de intervenção ergonômica.',
    corlett:               'Aplicar antes e após turno nas 32 regiões corporais (1–5). Diferença pré × pós indica carga acumulada. Anonimato garante fidedignidade.',
    postural:              'Registrar ângulo articular, frequência e duração. Fotografar nos ângulos lateral e frontal. Usar goniômetro ou software de videoanálise.',
    forca:                 'Dinamômetro: preensão repetitiva >70 N é risco. Escala de percepção: esforço >5 (CR10) exige intervenção. NIOSH complementa avaliação.',
    vibracao:              'Mão-braço: VA 2,5 m/s² • VL 5 m/s² (8 h). Corpo inteiro: VA 0,5 m/s² • VL 1,15 m/s². Medir com acelerômetro triaxial calibrado.',
    entrevista:            'Roteiro semiestruturado; garantir anonimato; mín. 3 trabalhadores por grupo. Registrar relatos literais quando relevantes para o laudo.',
    filmagem:              'Filmar ciclo completo; ângulos lateral e frontal para análise postural. Obter autorização escrita. Usar para RULA/REBA pós-campo.',
    observacao_sistematica:'Amostragem de trabalho: mín. 50 observações em intervalos aleatórios. Ou análise completa de ciclo com cronoanálise elemento a elemento.',
    outro:                 'Documentar referência metodológica (norma, artigo, manual técnico) e critérios de classificação de risco adotados.',
  };

  /* ── Exigências da atividade ── */
  const EXIG_DEF = {
    bio: [
      { id: 'postura',        label: 'Posturas inadequadas ou forçadas' },
      { id: 'repeticao',      label: 'Movimentos repetitivos de membros superiores' },
      { id: 'forca',          label: 'Aplicação de força excessiva' },
      { id: 'levantamento',   label: 'Levantamento e transporte manual de cargas' },
      { id: 'vibracao_mb',    label: 'Vibração mão-braço' },
      { id: 'vibracao_ci',    label: 'Vibração de corpo inteiro' },
      { id: 'trabalho_altura',label: 'Trabalho em altura ou posições extremas' },
      { id: 'contato_frio',   label: 'Contato com superfícies frias / ferramentas' },
      { id: 'compressao',     label: 'Compressão localizada (punho, palma, etc.)' },
      { id: 'estatica',       label: 'Postura estática prolongada' },
      { id: 'tronco_flexao',  label: 'Flexão ou rotação de tronco' },
      { id: 'pescoco',        label: 'Flexão / extensão de pescoço' },
      { id: 'ombro',          label: 'Elevação ou abdução de ombros' },
      { id: 'joelhos',        label: 'Trabalho ajoelhado ou agachado' },
      { id: 'pe_prolongado',  label: 'Permanência em pé por longos períodos' },
      { id: 'caminhada',      label: 'Caminhada excessiva' },
      { id: 'destreza',       label: 'Exigência de alta destreza manual' },
      { id: 'outro_bio',      label: 'Outra exigência biomecânica' },
    ],
    cog: [
      { id: 'atencao',        label: 'Atenção concentrada e sustentada' },
      { id: 'memoria',        label: 'Demanda elevada de memória de trabalho' },
      { id: 'decisao',        label: 'Tomada de decisão sob pressão' },
      { id: 'multitarefa',    label: 'Execução simultânea de múltiplas tarefas' },
      { id: 'ritmo',          label: 'Trabalho em ritmo acelerado ou imposto' },
      { id: 'informacao',     label: 'Volume excessivo de informações' },
      { id: 'monitoramento',  label: 'Monitoramento contínuo de sistemas' },
      { id: 'precisao',       label: 'Exigência de alta precisão' },
      { id: 'criatividade',   label: 'Resolução de problemas complexos' },
      { id: 'comunicacao',    label: 'Comunicação técnica intensa' },
      { id: 'treinamento',    label: 'Aprendizado contínuo / atualizações frequentes' },
      { id: 'outro_cog',      label: 'Outra exigência cognitiva' },
    ],
    org: [
      { id: 'jornada',        label: 'Jornada prolongada ou irregular' },
      { id: 'turnos',         label: 'Trabalho em turnos / noturno' },
      { id: 'pausa',          label: 'Ausência ou insuficiência de pausas' },
      { id: 'autonomia',      label: 'Baixa autonomia sobre o próprio trabalho' },
      { id: 'relacionamento', label: 'Conflitos interpessoais / clima organizacional' },
      { id: 'chefia',         label: 'Estilo de gestão autoritário ou inconsistente' },
      { id: 'metas',          label: 'Metas excessivas ou inatingíveis' },
      { id: 'instabilidade',  label: 'Insegurança no emprego / instabilidade' },
      { id: 'reconhecimento', label: 'Falta de reconhecimento / valorização' },
      { id: 'assedio',        label: 'Situações de assédio moral ou sexual' },
      { id: 'violencia',      label: 'Exposição a violência ou ameaças' },
      { id: 'monotonia',      label: 'Monotonia e falta de variedade' },
      { id: 'responsabilidade',label: 'Responsabilidade excessiva sem suporte' },
      { id: 'layout',         label: 'Layout inadequado / espaço insuficiente' },
      { id: 'outro_org',      label: 'Outra exigência organizacional' },
    ]
  };

  /* ── Estado interno ── */
  let _secaoAtual = 'identificacao';

  /* ═══════════════════════════════════════════════════════════════════
     FRAMEWORK DE RENDERIZAÇÃO
     ═══════════════════════════════════════════════════════════════════ */

  function renderizar() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};

    const el = document.getElementById('aet-container') || document.getElementById('tela-aet');
    if (!el) return;

    el.innerHTML = `
      <div class="aet-tabs" id="aet-tabs">${_htmlTabs()}</div>
      <div class="aet-conteudo" id="aet-secao-conteudo"></div>
    `;
    _renderSecao(_secaoAtual);
  }

  function _htmlTabs() {
    return SECOES.map(s => `
      <button class="aet-tab${s.id === _secaoAtual ? ' ativa' : ''}"
              onclick="ModuloAET.trocarSecao('${s.id}')">
        <span class="aet-tab-icone">${s.icone}</span>
        <span class="aet-tab-label">${s.label}</span>
      </button>`
    ).join('');
  }

  function _renderSecao(id) {
    _secaoAtual = id;
    const el = document.getElementById('aet-secao-conteudo');
    if (!el) return;

    const mapa = {
      identificacao:  _htmlIdentificacao,
      demanda:        _htmlDemanda,
      caracterizacao: _htmlCaracterizacao,
      atividade:      _htmlAtividade,
      exigencias:     _htmlExigencias,
      ferramentas:    _htmlFerramentas,
      diagnostico:    _htmlDiagnostico,
      recomendacoes:  _htmlRecomendacoes,
      plano:          _htmlPlano,
      conclusao:      _htmlConclusao,
      relatorio:      _htmlRelatorio,
    };

    el.innerHTML = mapa[id] ? mapa[id]() : `<p>Seção ${id} não encontrada.</p>`;

    document.querySelectorAll('.aet-tab').forEach(btn => {
      btn.classList.toggle('ativa', btn.getAttribute('onclick').includes(`'${id}'`));
    });
  }

  function trocarSecao(id) {
    _salvarSecaoAtual();
    _renderSecao(id);
  }

  function _salvarSecaoAtual() {
    switch (_secaoAtual) {
      case 'identificacao':  _salvarIdentificacao();  break;
      case 'demanda':        _salvarDemanda();         break;
      case 'caracterizacao': _salvarCaracterizacao();  break;
      case 'atividade':      _salvarAtividade();       break;
      case 'exigencias':     _salvarExigencias();      break;
      case 'diagnostico':    _salvarDiagnostico();     break;
      case 'recomendacoes':  _salvarRecomendacoes();   break;
      case 'conclusao':      _salvarConclusao();       break;
    }
  }

  /* ── Utilitário de campo ── */
  function _v(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return el.value || '';
  }

  function _preencher(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val != null ? val : '';
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 1: IDENTIFICAÇÃO
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlIdentificacao() {
    const av  = App.obterAvaliacaoAtual();
    const d   = av.aet || {};
    const emp = Storage.buscarEmpresa(av.empresaId) || {};
    const set = Storage.buscarSetor(av.setorId)     || {};
    const fun = Storage.buscarFuncao(av.funcaoId)   || {};
    const proj = Storage.buscarProjeto(av.projetoId) || {};

    const statusOpts = ['Em andamento','Concluída','Suspensa','Aguardando dados'];
    const motivoOpts = ['Solicitação patronal','Indicação AEP','Denúncia / reclamação','Revisão periódica','Acidente de trabalho','Doença ocupacional','Exigência legal','Outro'];

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">📋 Identificação da AET</h3>

        <div class="form-grid-2">
          <div class="form-grupo">
            <label class="form-label">Empresa</label>
            <input class="form-input" value="${emp.nomeFantasia || emp.razaoSocial || ''}" disabled>
          </div>
          <div class="form-grupo">
            <label class="form-label">CNPJ</label>
            <input class="form-input" value="${emp.cnpj || ''}" disabled>
          </div>
          <div class="form-grupo">
            <label class="form-label">Setor</label>
            <input class="form-input" value="${set.nome || ''}" disabled>
          </div>
          <div class="form-grupo">
            <label class="form-label">Função avaliada</label>
            <input class="form-input" value="${fun.nome || ''}" disabled>
          </div>
          <div class="form-grupo">
            <label class="form-label">Nº de trabalhadores na função</label>
            <input id="aet-n-trab" class="form-input" type="number" min="1"
                   value="${d.nTrabalhadores || av.nTrabalhadores || ''}">
          </div>
          <div class="form-grupo">
            <label class="form-label">Data de início da AET</label>
            <input id="aet-data-inicio" class="form-input" type="date"
                   value="${d.dataInicio || ''}">
          </div>
          <div class="form-grupo">
            <label class="form-label">Data de conclusão</label>
            <input id="aet-data-fim" class="form-input" type="date"
                   value="${d.dataFim || ''}">
          </div>
          <div class="form-grupo">
            <label class="form-label">Status</label>
            <select id="aet-status" class="form-select">
              ${statusOpts.map(o => `<option${d.status === o ? ' selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-grupo">
          <label class="form-label">Responsável técnico</label>
          <input id="aet-responsavel" class="form-input" type="text"
                 value="${d.responsavel || ''}" placeholder="Nome e registro profissional">
        </div>

        <div class="form-grupo">
          <label class="form-label">Motivo da AET</label>
          <select id="aet-motivo" class="form-select">
            ${motivoOpts.map(o => `<option${d.motivo === o ? ' selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>

        <div class="form-grupo">
          <label class="form-label">Objetivos específicos da avaliação</label>
          <textarea id="aet-objetivos" class="form-textarea" rows="3"
                    placeholder="Descreva os objetivos desta AET...">${d.objetivos || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Fontes de informação utilizadas</label>
          <div class="checkbox-grupo">
            ${['Observação direta','Entrevistas','Filmagem','Documentos / prontuários','Medições instrumentais','Dados de saúde / afastamentos','Análise de acidentes','PCMSO / ASO','PPRA / PGR / GRO'].map(src => `
            <label class="checkbox-item">
              <input type="checkbox" name="aet-fonte" value="${src}"
                     ${(d.fontes||[]).includes(src) ? 'checked' : ''}>
              ${src}
            </label>`).join('')}
          </div>
        </div>

        <div class="form-grupo">
          <label class="form-label">Observações gerais</label>
          <textarea id="aet-obs-ident" class="form-textarea" rows="2"
                    placeholder="Informações complementares...">${d.obsIdentificacao || ''}</textarea>
        </div>

        <div class="aet-importar-box">
          <div class="aet-importar-topo">
            <button class="btn-secundario" onclick="ModuloAET.importarDadosAepAfp()">
              📥 Importar dados da AEP / AFP
            </button>
            <span class="aet-importar-dica">Preenche automaticamente campos desta AET com dados da AEP e AFP desta função. Apenas campos vazios são preenchidos.</span>
          </div>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarIdentificacao()">
          💾 Salvar Identificação
        </button>
      </div>`;
  }

  function _salvarIdentificacao() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const d = av.aet;

    d.nTrabalhadores   = _v('aet-n-trab');
    d.dataInicio       = _v('aet-data-inicio');
    d.dataFim          = _v('aet-data-fim');
    d.status           = _v('aet-status');
    d.responsavel      = _v('aet-responsavel');
    d.motivo           = _v('aet-motivo');
    d.objetivos        = _v('aet-objetivos');
    d.obsIdentificacao = _v('aet-obs-ident');
    d.fontes = [...document.querySelectorAll('input[name="aet-fonte"]:checked')].map(c => c.value);

    Storage.salvar(av);
  }

  function salvarIdentificacao() {
    _salvarIdentificacao();
    App.mostrarToast('Identificação salva.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 2: DEMANDA
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlDemanda() {
    const av = App.obterAvaliacaoAtual();
    const d  = av.aet || {};

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">📝 Demanda da Avaliação</h3>

        <div class="form-grupo">
          <label class="form-label">Demanda inicial / solicitação</label>
          <textarea id="aet-demanda-inicial" class="form-textarea" rows="3"
                    placeholder="Descreva a demanda que originou esta AET...">${d.demandaInicial || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Formulação da demanda técnica</label>
          <textarea id="aet-demanda-tecnica" class="form-textarea" rows="3"
                    placeholder="Reformule a demanda sob perspectiva ergonômica...">${d.demandaTecnica || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Queixas e sintomas relatados pelos trabalhadores</label>
          <textarea id="aet-queixas" class="form-textarea" rows="3"
                    placeholder="Liste queixas, sintomas musculoesqueléticos, fadiga, estresse, etc...">${d.queixas || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Dados de saúde disponíveis (afastamentos, CAT, PCMSO)</label>
          <textarea id="aet-dados-saude" class="form-textarea" rows="3"
                    placeholder="Informe dados epidemiológicos relevantes...">${d.dadosSaude || ''}</textarea>
        </div>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Síntese da demanda</label>
            <button class="btn-ia-inline" id="btn-ia-demanda"
                    onclick="ModuloAET.gerarSinteseDemandaIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="aet-sintese-demanda" class="form-textarea" rows="4"
                    placeholder="Síntese técnica da demanda ergonômica...">${d.sinteseDemanda || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarDemanda()">
          💾 Salvar Demanda
        </button>
      </div>`;
  }

  function _salvarDemanda() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const d = av.aet;

    d.demandaInicial = _v('aet-demanda-inicial');
    d.demandaTecnica = _v('aet-demanda-tecnica');
    d.queixas        = _v('aet-queixas');
    d.dadosSaude     = _v('aet-dados-saude');
    d.sinteseDemanda = _v('aet-sintese-demanda');

    Storage.salvar(av);
  }

  function salvarDemanda() {
    _salvarDemanda();
    App.mostrarToast('Demanda salva.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 3: CARACTERIZAÇÃO DA SITUAÇÃO DE TRABALHO
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlCaracterizacao() {
    const av = App.obterAvaliacaoAtual();
    const c  = (av.aet || {}).car || {};

    const turnos = ['Diurno fixo','Noturno fixo','Turno rotativo 2x','Turno rotativo 3x','Misto','Escala 12x36','Outro'];

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">🏭 Caracterização da Situação de Trabalho</h3>

        <fieldset class="aet-fieldset">
          <legend>Organização do trabalho</legend>
          <div class="form-grid-2">
            <div class="form-grupo">
              <label class="form-label">Turno de trabalho</label>
              <select id="car-turno" class="form-select">
                ${turnos.map(t => `<option${c.turno === t ? ' selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Jornada diária (horas)</label>
              <input id="car-jornada" class="form-input" type="number" step="0.5"
                     value="${c.jornada || ''}">
            </div>
            <div class="form-grupo">
              <label class="form-label">Pausas previstas</label>
              <input id="car-pausas" class="form-input" type="text"
                     value="${c.pausas || ''}" placeholder="Ex: 1h almoço + 2x 10 min">
            </div>
            <div class="form-grupo">
              <label class="form-label">Ritmo de trabalho</label>
              <select id="car-ritmo" class="form-select">
                ${['Autônomo','Parcialmente imposto','Imposto por máquina / esteira','Imposto por metas'].map(r => `<option${c.ritmo === r ? ' selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-grupo">
            <label class="form-label">Descrição das tarefas prescritivas (tarefa prescrita)</label>
            <textarea id="car-tarefa-prescrita" class="form-textarea" rows="3"
                      placeholder="Como o trabalho é formalmente descrito / normatizado...">${c.tarefaPrescrita || ''}</textarea>
          </div>
        </fieldset>

        <fieldset class="aet-fieldset">
          <legend>Posto de trabalho e ambiente</legend>
          <div class="form-grupo">
            <label class="form-label">Descrição do posto de trabalho</label>
            <textarea id="car-posto" class="form-textarea" rows="3"
                      placeholder="Dimensões, layout, equipamentos, ferramentas...">${c.posto || ''}</textarea>
          </div>
          <div class="form-grid-2">
            <div class="form-grupo">
              <label class="form-label">Iluminação</label>
              <select id="car-iluminacao" class="form-select">
                ${['Adequada','Insuficiente','Excessiva / ofuscante','Não avaliada'].map(o => `<option${c.iluminacao === o ? ' selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Ruído</label>
              <select id="car-ruido" class="form-select">
                ${['Baixo','Moderado','Elevado (>85 dB)','Não avaliado'].map(o => `<option${c.ruido === o ? ' selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Temperatura</label>
              <select id="car-temperatura" class="form-select">
                ${['Confortável','Frio','Calor','Não avaliada'].map(o => `<option${c.temperatura === o ? ' selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Equipamentos / tecnologia</label>
              <input id="car-equipamentos" class="form-input" type="text"
                     value="${c.equipamentos || ''}" placeholder="Principais equipamentos e ferramentas">
            </div>
          </div>
        </fieldset>

        <fieldset class="aet-fieldset">
          <legend>Perfil dos trabalhadores</legend>
          <div class="form-grid-2">
            <div class="form-grupo">
              <label class="form-label">Faixa etária predominante</label>
              <input id="car-idade" class="form-input" type="text"
                     value="${c.faixaEtaria || ''}" placeholder="Ex: 25–45 anos">
            </div>
            <div class="form-grupo">
              <label class="form-label">Tempo médio na função (anos)</label>
              <input id="car-tempo-funcao" class="form-input" type="number" step="0.5"
                     value="${c.tempoFuncao || ''}">
            </div>
            <div class="form-grupo">
              <label class="form-label">Gênero predominante</label>
              <select id="car-genero" class="form-select">
                ${['Misto','Masculino','Feminino'].map(o => `<option${c.genero === o ? ' selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Capacitação / treinamento</label>
              <select id="car-treinamento" class="form-select">
                ${['Adequado','Parcial','Insuficiente','Não informado'].map(o => `<option${c.treinamento === o ? ' selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
          </div>
        </fieldset>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Síntese da caracterização</label>
            <button class="btn-ia-inline" id="btn-ia-car"
                    onclick="ModuloAET.gerarCaracterizacaoIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="car-texto" class="form-textarea" rows="5"
                    placeholder="Síntese técnica da situação de trabalho...">${c.texto || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarCaracterizacao()">
          💾 Salvar Caracterização
        </button>
      </div>`;
  }

  function _salvarCaracterizacao() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.car) av.aet.car = {};
    const c = av.aet.car;

    c.turno          = _v('car-turno');
    c.jornada        = _v('car-jornada');
    c.pausas         = _v('car-pausas');
    c.ritmo          = _v('car-ritmo');
    c.tarefaPrescrita= _v('car-tarefa-prescrita');
    c.posto          = _v('car-posto');
    c.iluminacao     = _v('car-iluminacao');
    c.ruido          = _v('car-ruido');
    c.temperatura    = _v('car-temperatura');
    c.equipamentos   = _v('car-equipamentos');
    c.faixaEtaria    = _v('car-idade');
    c.tempoFuncao    = _v('car-tempo-funcao');
    c.genero         = _v('car-genero');
    c.treinamento    = _v('car-treinamento');
    c.texto          = _v('car-texto');

    Storage.salvar(av);
  }

  function salvarCaracterizacao() {
    _salvarCaracterizacao();
    App.mostrarToast('Caracterização salva.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 4: ATIVIDADE DE TRABALHO
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlAtividade() {
    const av = App.obterAvaliacaoAtual();
    const d  = av.aet || {};

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">🏃 Atividade de Trabalho</h3>

        <div class="form-grupo">
          <label class="form-label">Descrição da atividade real (o que o trabalhador realmente faz)</label>
          <textarea id="aet-atividade-real" class="form-textarea" rows="4"
                    placeholder="Descreva a atividade real observada — ciclos, sequência de gestos, adaptações, regulações...">${d.atividadeReal || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Modos operatórios identificados</label>
          <textarea id="aet-modos-op" class="form-textarea" rows="3"
                    placeholder="Como os trabalhadores organizam e regulam sua própria atividade...">${d.modosOperatorios || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Variabilidades e imprevistos</label>
          <textarea id="aet-variabilidades" class="form-textarea" rows="3"
                    placeholder="Situações atípicas, picos de produção, falhas de equipamento, variações de material...">${d.variabilidades || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Regulações e estratégias dos trabalhadores</label>
          <textarea id="aet-regulacoes" class="form-textarea" rows="3"
                    placeholder="Como o trabalhador compensa as exigências — postura alternativa, ritmo variado, cooperação...">${d.regulacoes || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Custo humano da atividade percebido</label>
          <textarea id="aet-custo-humano" class="form-textarea" rows="3"
                    placeholder="Fadiga, tensão, dor, esforço excessivo relatados ou observados ao longo do turno...">${d.custoHumano || ''}</textarea>
        </div>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Comparação tarefa prescrita × atividade real</label>
            <button class="btn-ia-inline" id="btn-ia-ativ"
                    onclick="ModuloAET.gerarComparacaoAtividadeIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="aet-comparacao" class="form-textarea" rows="4"
                    placeholder="Analise as diferenças entre o que foi prescrito e o que realmente ocorre...">${d.comparacaoPrescritaReal || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarAtividade()">
          💾 Salvar Atividade
        </button>
      </div>`;
  }

  function _salvarAtividade() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    const d = av.aet;

    d.atividadeReal          = _v('aet-atividade-real');
    d.modosOperatorios       = _v('aet-modos-op');
    d.variabilidades         = _v('aet-variabilidades');
    d.regulacoes             = _v('aet-regulacoes');
    d.custoHumano            = _v('aet-custo-humano');
    d.comparacaoPrescritaReal= _v('aet-comparacao');

    Storage.salvar(av);
  }

  function salvarAtividade() {
    _salvarAtividade();
    App.mostrarToast('Atividade salva.', 'sucesso');
  }


  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 5: EXIGÊNCIAS DA ATIVIDADE
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlExigencias() {
    const av = App.obterAvaliacaoAtual();
    const d  = av.aet || {};
    const marcados = d.exigencias || {};

    function _bloco(titulo, chave, itens) {
      return `
        <fieldset class="aet-fieldset">
          <legend>${titulo}</legend>
          <div class="exig-grid">
            ${itens.map(it => `
            <label class="checkbox-item">
              <input type="checkbox" name="exig-${chave}" value="${it.id}"
                     ${(marcados[chave] || []).includes(it.id) ? 'checked' : ''}>
              ${it.label}
            </label>`).join('')}
          </div>
        </fieldset>`;
    }

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">⚠️ Exigências da Atividade</h3>
        <p class="aet-secao-desc">Marque todas as exigências identificadas na atividade avaliada.</p>

        ${_bloco('Exigências Biomecânicas', 'bio', EXIG_DEF.bio)}
        ${_bloco('Exigências Cognitivas',   'cog', EXIG_DEF.cog)}
        ${_bloco('Exigências Organizacionais / Psicossociais', 'org', EXIG_DEF.org)}

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Análise das exigências</label>
            <button class="btn-ia-inline" id="btn-ia-exig"
                    onclick="ModuloAET.gerarAnaliseExigenciasIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="exig-analise" class="form-textarea" rows="5"
                    placeholder="Analise as exigências marcadas em relação à atividade e ao perfil dos trabalhadores...">${d.exigenciasAnalise || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarExigencias()">
          💾 Salvar Exigências
        </button>
      </div>`;
  }

  function _salvarExigencias() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};

    const exig = {};
    ['bio','cog','org'].forEach(chave => {
      exig[chave] = [...document.querySelectorAll(`input[name="exig-${chave}"]:checked`)].map(c => c.value);
    });
    av.aet.exigencias      = exig;
    av.aet.exigenciasAnalise = _v('exig-analise');

    Storage.salvar(av);
  }

  function salvarExigencias() {
    _salvarExigencias();
    App.mostrarToast('Exigências salvas.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 6: FERRAMENTAS ERGONÔMICAS
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlFerramentas() {
    const av    = App.obterAvaliacaoAtual();
    const tools = (av.aet || {}).tools || {};

    const categorias = [
      { id: 'postural',    label: 'Postural / Corporal',         cor: '#1565c0' },
      { id: 'carga',       label: 'Carga e Força',               cor: '#6a1b9a' },
      { id: 'repeticao',   label: 'Repetitividade',              cor: '#e65100' },
      { id: 'ambiente',    label: 'Ambiente de Trabalho',        cor: '#2e7d32' },
      { id: 'qualitativa', label: 'Métodos Qualitativos',        cor: '#00838f' },
      { id: 'outro',       label: 'Outros Métodos',              cor: '#546e7a' },
    ];

    const sugestaoTxt = ((av.aet || {}).toolsSugestao || '').toLowerCase();

    function _cartoes(catId) {
      return TOOLS_DEF
        .filter(t => t.categoria === catId)
        .map(t => {
          const td       = tools[t.id] || {};
          const usado    = !!td.usado;
          const temDados = usado && Object.keys(td).filter(k => k !== 'usado').length > 0;
          const sugerida = sugestaoTxt && sugestaoTxt.includes(t.nome.toLowerCase());
          return `
            <div class="tool-card${usado ? ' usado' : ''}${sugerida && !usado ? ' sugerida' : ''}">
              <div class="tool-card-header">
                <strong>${t.nome}</strong>
                ${sugerida && !usado ? '<span class="tool-badge-ia">✨IA</span>' : ''}
                ${temDados ? '<span class="tool-badge-ok">✓</span>' : ''}
              </div>
              <p class="tool-card-desc">${t.desc}</p>
              <div class="tool-card-acoes">
                <label class="checkbox-item" style="font-size:0.8rem">
                  <input type="checkbox" id="tool-uso-${t.id}"
                         onchange="ModuloAET.toggleToolUso('${t.id}')"
                         ${usado ? 'checked' : ''}> Utilizada
                </label>
                <button class="btn-secundario btn-sm"
                        onclick="ModuloAET.abrirTool('${t.id}')">
                  ${temDados ? '✏️ Editar' : '➕ Preencher'}
                </button>
              </div>
            </div>`;
        }).join('');
    }

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">🔧 Ferramentas Ergonômicas</h3>

        <div class="form-grupo" style="background:rgba(57,73,171,.1);padding:10px;border-radius:6px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <label class="form-label" style="margin:0">Sugestão de ferramentas (IA)</label>
            <button class="btn-ia-inline" id="btn-ia-tools"
                    onclick="ModuloAET.sugerirFerramentasIA()">✨ Sugerir com IA</button>
          </div>
          <div id="tools-sugestao" class="ia-resultado">${_mdParaHtml((av.aet || {}).toolsSugestao || '')}</div>
        </div>

        ${categorias.map(cat => `
          <div class="tools-categoria">
            <h4 class="tools-cat-titulo" style="border-left:3px solid ${cat.cor};padding-left:8px">${cat.label}</h4>
            <div class="tools-grid">${_cartoes(cat.id)}</div>
          </div>`).join('')}

        <div id="modal-tool" class="modal" style="display:none">
          <div class="modal-caixa modal-grande">
            <div id="modal-tool-conteudo"></div>
          </div>
        </div>
      </div>`;
  }

  function toggleToolUso(toolId) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.tools) av.aet.tools = {};
    if (!av.aet.tools[toolId]) av.aet.tools[toolId] = {};

    const cb = document.getElementById(`tool-uso-${toolId}`);
    av.aet.tools[toolId].usado = cb ? cb.checked : false;
    Storage.salvar(av);
  }

  function abrirTool(toolId) {
    const modal = document.getElementById('modal-tool');
    const cont  = document.getElementById('modal-tool-conteudo');
    if (!modal || !cont) return;

    cont.innerHTML = _htmlToolForm(toolId);
    modal.style.display = 'flex';
  }

  function fecharTool() {
    const modal = document.getElementById('modal-tool');
    if (modal) modal.style.display = 'none';
  }

  function _htmlToolForm(toolId) {
    const tool = TOOLS_DEF.find(t => t.id === toolId);
    if (!tool) return '<p>Ferramenta não encontrada.</p>';

    const av  = App.obterAvaliacaoAtual();
    const td  = ((av.aet || {}).tools || {})[toolId] || {};

    function _campo(c) {
      const val = td[c.id] != null ? td[c.id] : '';
      if (c.tipo === 'textarea') {
        return `<div class="form-grupo">
          <label class="form-label">${c.label}</label>
          <textarea id="tf-${c.id}" class="form-textarea" rows="3">${val}</textarea>
        </div>`;
      }
      if (c.tipo === 'select') {
        return `<div class="form-grupo">
          <label class="form-label">${c.label}</label>
          <select id="tf-${c.id}" class="form-select">
            ${c.opts.map(o => `<option${val === o ? ' selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }
      const attrs = [
        `type="${c.tipo}"`,
        val !== '' ? `value="${val}"` : '',
        c.min  != null ? `min="${c.min}"` : '',
        c.max  != null ? `max="${c.max}"` : '',
        c.step != null ? `step="${c.step}"` : '',
        c.readonly ? 'readonly' : '',
      ].filter(Boolean).join(' ');
      return `<div class="form-grupo">
        <label class="form-label">${c.label}</label>
        <input id="tf-${c.id}" class="form-input" ${attrs}>
      </div>`;
    }

    const guia = TOOLS_GUIA[toolId] || '';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0">🔧 ${tool.nome}</h3>
        <button class="btn-fechar" onclick="ModuloAET.fecharTool()">✕</button>
      </div>
      <p style="color:var(--txt-sec);font-size:0.85rem;margin-bottom:8px">${tool.desc}</p>
      ${guia ? `<p class="tool-guia">📌 ${guia}</p>` : ''}

      ${tool.campos.map(_campo).join('')}

      ${tool.temCalculo ? `
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn-secundario" onclick="ModuloAET.calcularNIOSH()">⚙️ Calcular NIOSH</button>
      </div>` : ''}

      <div class="form-grupo">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <label class="form-label" style="margin:0">Interpretação / conclusão técnica</label>
          <button class="btn-ia-inline" id="btn-ia-tool-${toolId}"
                  onclick="ModuloAET.interpretarToolIA('${toolId}')">✨ Interpretar com IA</button>
        </div>
        <textarea id="tf-interpretacao" class="form-textarea" rows="4"
                  placeholder="Interpretação ergonômica dos resultados obtidos...">${td.interpretacao || ''}</textarea>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-secundario" onclick="ModuloAET.fecharTool()">Cancelar</button>
        <button class="btn-primario" onclick="ModuloAET.salvarTool('${toolId}')">💾 Salvar</button>
      </div>`;
  }

  function salvarTool(toolId) {
    const av   = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.tools) av.aet.tools = {};
    if (!av.aet.tools[toolId]) av.aet.tools[toolId] = {};

    const tool = TOOLS_DEF.find(t => t.id === toolId);
    if (!tool) return;

    const td = av.aet.tools[toolId];
    td.usado = true;
    tool.campos.forEach(c => {
      const el = document.getElementById(`tf-${c.id}`);
      if (el) td[c.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    td.interpretacao = _v('tf-interpretacao');

    Storage.salvar(av);
    fecharTool();
    App.mostrarToast(`${tool.nome} salvo.`, 'sucesso');
    _renderSecao('ferramentas');
  }

  function calcularNIOSH() {
    const H  = parseFloat(_v('tf-H'))  || 0;
    const V  = parseFloat(_v('tf-V'))  || 0;
    const D  = parseFloat(_v('tf-D'))  || 1;
    const A  = parseFloat(_v('tf-A'))  || 0;
    const W  = parseFloat(_v('tf-peso'))|| 0;

    const FM_MAP = [1.0, 0.97, 0.84, 0.72, 0.45];
    const fmCat  = parseInt(_v('tf-FM_cat')) || 0;
    const FM     = FM_MAP[Math.min(fmCat, 4)];

    const cmVal  = _v('tf-CM_cat');
    const CM     = cmVal === 'Bom' ? 1.0 : cmVal === 'Regular' ? 0.95 : 0.90;

    const LC = 23;
    const HM = H > 0 ? Math.min(25 / H, 1) : 0;
    const VM = 1 - 0.003 * Math.abs(V - 75);
    const DM = D > 0 ? 0.82 + (4.5 / D) : 0;
    const AM = 1 - 0.0032 * A;

    const RWL = LC * HM * VM * DM * AM * FM * CM;
    const IL  = W > 0 && RWL > 0 ? W / RWL : 0;

    const elRwl = document.getElementById('tf-RWL');
    const elIL  = document.getElementById('tf-IL');
    if (elRwl) elRwl.value = RWL.toFixed(2);
    if (elIL)  elIL.value  = IL.toFixed(2);

    let msg = `RWL = ${RWL.toFixed(2)} kg | IL = ${IL.toFixed(2)}`;
    if (IL <= 1)      msg += ' ✅ Aceitável';
    else if (IL <= 3) msg += ' ⚠️ Risco moderado';
    else              msg += ' 🔴 Risco elevado';

    App.mostrarToast(msg, IL <= 1 ? 'sucesso' : 'aviso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 7: DIAGNÓSTICO ERGONÔMICO
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlDiagnostico() {
    const av   = App.obterAvaliacaoAtual();
    const d    = (av.aet || {}).diag || {};
    const niveis = ['1 – Sem risco identificado','2 – Risco baixo','3 – Risco moderado','4 – Risco alto','5 – Risco muito alto / crítico'];

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">🔬 Diagnóstico Ergonômico</h3>

        <div class="form-grupo">
          <label class="form-label">Situações de trabalho críticas identificadas</label>
          <textarea id="diag-situacoes" class="form-textarea" rows="4"
                    placeholder="Descreva as situações de trabalho que apresentam maior risco ergonômico...">${d.situacoes || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Determinantes das situações críticas</label>
          <textarea id="diag-determinantes" class="form-textarea" rows="4"
                    placeholder="Quais fatores organizacionais, técnicos ou individuais explicam essas situações...">${d.determinantes || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Efeitos sobre a saúde e o desempenho</label>
          <textarea id="diag-efeitos" class="form-textarea" rows="3"
                    placeholder="Consequências observadas ou relatadas: dor, fadiga, erros, acidentes, absenteísmo...">${d.efeitos || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Nível de risco ergonômico global</label>
          <div class="radio-grupo">
            ${niveis.map((n, i) => `
            <label class="radio-item nivel-${i+1}">
              <input type="radio" name="diag-nivel" value="${n}"
                     ${d.nivel === n ? 'checked' : ''}>
              ${n}
            </label>`).join('')}
          </div>
        </div>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Diagnóstico ergonômico</label>
            <button class="btn-ia-inline" id="btn-ia-diag"
                    onclick="ModuloAET.gerarDiagnosticoIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="diag-texto" class="form-textarea" rows="6"
                    placeholder="Redija o diagnóstico ergonômico consolidado...">${d.texto || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarDiagnostico()">
          💾 Salvar Diagnóstico
        </button>
      </div>`;
  }

  function _salvarDiagnostico() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.diag) av.aet.diag = {};
    const d = av.aet.diag;

    d.situacoes    = _v('diag-situacoes');
    d.determinantes= _v('diag-determinantes');
    d.efeitos      = _v('diag-efeitos');
    const nr       = document.querySelector('input[name="diag-nivel"]:checked');
    d.nivel        = nr ? nr.value : '';
    d.texto        = _v('diag-texto');

    av.aet.diagnosticoErgonomico = d.texto;
    Storage.salvar(av);
  }

  function salvarDiagnostico() {
    _salvarDiagnostico();
    App.mostrarToast('Diagnóstico salvo.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 8: RECOMENDAÇÕES
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlRecomendacoes() {
    const av = App.obterAvaliacaoAtual();
    const r  = (av.aet || {}).recs || {};

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">💡 Recomendações Ergonômicas</h3>

        <fieldset class="aet-fieldset">
          <legend>Medidas de engenharia / projeto</legend>
          <textarea id="recs-engenharia" class="form-textarea" rows="4"
                    placeholder="Redesenho de postos, equipamentos, ferramentas, layout...">${r.engenharia || ''}</textarea>
        </fieldset>

        <fieldset class="aet-fieldset">
          <legend>Medidas organizacionais</legend>
          <textarea id="recs-organizacional" class="form-textarea" rows="4"
                    placeholder="Pausas, rotação, ritmo, jornada, distribuição de tarefas...">${r.organizacional || ''}</textarea>
        </fieldset>

        <fieldset class="aet-fieldset">
          <legend>Medidas administrativas e de treinamento</legend>
          <textarea id="recs-administrativa" class="form-textarea" rows="3"
                    placeholder="Capacitações, procedimentos, comunicação, supervisão...">${r.administrativa || ''}</textarea>
        </fieldset>

        <fieldset class="aet-fieldset">
          <legend>EPI / medidas de proteção individual</legend>
          <textarea id="recs-epi" class="form-textarea" rows="2"
                    placeholder="EPI recomendados (quando as outras medidas não forem suficientes)...">${r.epi || ''}</textarea>
        </fieldset>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Síntese das recomendações</label>
            <button class="btn-ia-inline" id="btn-ia-recs"
                    onclick="ModuloAET.gerarRecomendacoesIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="recs-texto" class="form-textarea" rows="5"
                    placeholder="Síntese técnica das recomendações e prioridades de intervenção...">${r.texto || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarRecomendacoes()">
          💾 Salvar Recomendações
        </button>
      </div>`;
  }

  function _salvarRecomendacoes() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.recs) av.aet.recs = {};
    const r = av.aet.recs;

    r.engenharia    = _v('recs-engenharia');
    r.organizacional= _v('recs-organizacional');
    r.administrativa= _v('recs-administrativa');
    r.epi           = _v('recs-epi');
    r.texto         = _v('recs-texto');

    av.aet.recomendacoes = r.texto;
    Storage.salvar(av);
  }

  function salvarRecomendacoes() {
    _salvarRecomendacoes();
    App.mostrarToast('Recomendações salvas.', 'sucesso');
  }


  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 9: PLANO DE AÇÃO AET
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlPlano() {
    const av     = App.obterAvaliacaoAtual();
    const acoes  = (av.planoAcao || []).filter(a => a.origem === 'aet');

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">📌 Plano de Ação AET</h3>
        <p class="aet-secao-desc">Registre as ações de melhoria identificadas na AET. Priorize conforme urgência e hierarquia de controles.</p>

        <div id="lista-acoes-aet">
          ${acoes.length === 0
            ? '<p class="txt-vazio">Nenhuma ação registrada ainda.</p>'
            : acoes.map(a => _htmlItemPlano(a)).join('')}
        </div>

        <div class="plano-form" id="form-acao-aet" style="display:none">
          <h4>Nova ação</h4>
          <div class="form-grid-2">
            <div class="form-grupo">
              <label class="form-label">Descrição da ação</label>
              <input id="pa-descricao" class="form-input" type="text"
                     placeholder="O que deve ser feito?">
            </div>
            <div class="form-grupo">
              <label class="form-label">Responsável</label>
              <input id="pa-responsavel" class="form-input" type="text"
                     placeholder="Quem?">
            </div>
            <div class="form-grupo">
              <label class="form-label">Prazo</label>
              <input id="pa-prazo" class="form-input" type="date">
            </div>
            <div class="form-grupo">
              <label class="form-label">Prioridade</label>
              <select id="pa-prioridade" class="form-select">
                <option>Imediata</option>
                <option>Alta</option>
                <option selected>Média</option>
                <option>Baixa</option>
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Tipo de medida</label>
              <select id="pa-tipo" class="form-select">
                <option>Engenharia / projeto</option>
                <option>Organizacional</option>
                <option>Administrativa</option>
                <option>EPI</option>
                <option>Outro</option>
              </select>
            </div>
            <div class="form-grupo">
              <label class="form-label">Status</label>
              <select id="pa-status" class="form-select">
                <option>Pendente</option>
                <option>Em andamento</option>
                <option>Concluída</option>
                <option>Cancelada</option>
              </select>
            </div>
          </div>
          <div class="form-grupo">
            <label class="form-label">Observações</label>
            <textarea id="pa-obs" class="form-textarea" rows="2"
                      placeholder="Detalhes adicionais, recursos necessários..."></textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-primario" onclick="ModuloAET.confirmarAcaoPlano()">💾 Salvar ação</button>
            <button class="btn-secundario" onclick="document.getElementById('form-acao-aet').style.display='none'">Cancelar</button>
          </div>
        </div>

        <button class="btn-secundario" style="margin-top:12px"
                onclick="ModuloAET.adicionarAcaoPlano()">➕ Nova ação</button>
      </div>`;
  }

  function _htmlItemPlano(a) {
    const corPrior = { Imediata: '#d32f2f', Alta: '#f57c00', Média: '#1976d2', Baixa: '#388e3c' };
    const cor = corPrior[a.prioridade] || '#546e7a';
    return `
      <div class="plano-item" id="pa-item-${a.id}">
        <div class="plano-item-header">
          <span class="plano-badge" style="background:${cor}">${a.prioridade || 'Média'}</span>
          <strong>${a.descricao || '(sem descrição)'}</strong>
          <span class="plano-tipo">${a.tipo || ''}</span>
        </div>
        <div class="plano-item-detalhe">
          <span>👤 ${a.responsavel || '—'}</span>
          <span>📅 ${a.prazo || '—'}</span>
          <span class="plano-status">${a.status || 'Pendente'}</span>
        </div>
        ${a.obs ? `<p class="plano-obs">${a.obs}</p>` : ''}
        <button class="btn-perigo btn-xs" onclick="ModuloAET.removerAcaoPlano('${a.id}')">🗑️ Remover</button>
      </div>`;
  }

  function adicionarAcaoPlano() {
    const f = document.getElementById('form-acao-aet');
    if (f) f.style.display = 'block';
  }

  function confirmarAcaoPlano() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.planoAcao) av.planoAcao = [];

    const acao = {
      id:          'aet_' + Date.now(),
      origem:      'aet',
      descricao:   _v('pa-descricao'),
      responsavel: _v('pa-responsavel'),
      prazo:       _v('pa-prazo'),
      prioridade:  _v('pa-prioridade'),
      tipo:        _v('pa-tipo'),
      status:      _v('pa-status'),
      obs:         _v('pa-obs'),
      criadoEm:    new Date().toISOString(),
    };

    if (!acao.descricao) {
      App.mostrarToast('Informe a descrição da ação.', 'erro');
      return;
    }

    av.planoAcao.push(acao);
    Storage.salvar(av);
    App.mostrarToast('Ação registrada.', 'sucesso');
    _renderSecao('plano');
  }

  function removerAcaoPlano(id) {
    const av = App.obterAvaliacaoAtual();
    if (!av || !av.planoAcao) return;
    av.planoAcao = av.planoAcao.filter(a => a.id !== id);
    Storage.salvar(av);
    _renderSecao('plano');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 10: CONCLUSÃO
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlConclusao() {
    const av = App.obterAvaliacaoAtual();
    const c  = (av.aet || {}).conclusao || {};

    const niveis = ['1 – Sem risco / situação adequada','2 – Risco baixo','3 – Risco moderado','4 – Risco alto','5 – Risco muito alto'];

    return `
      <div class="aet-secao">
        <h3 class="aet-secao-titulo">✅ Conclusão Técnica</h3>

        <div class="form-grupo">
          <label class="form-label">Resposta à demanda inicial</label>
          <textarea id="con-resposta" class="form-textarea" rows="4"
                    placeholder="Como os achados da AET respondem à demanda que originou a avaliação...">${c.respostaADemanda || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Síntese dos principais achados</label>
          <textarea id="con-sintese" class="form-textarea" rows="4"
                    placeholder="Principais situações críticas, determinantes e efeitos identificados...">${c.sintese || ''}</textarea>
        </div>

        <div class="form-grupo">
          <label class="form-label">Nível de risco ergonômico final</label>
          <div class="radio-grupo">
            ${niveis.map((n, i) => `
            <label class="radio-item nivel-${i+1}">
              <input type="radio" name="con-nivel-risco" value="${n}"
                     ${c.nivelRiscoFinal === n ? 'checked' : ''}>
              ${n}
            </label>`).join('')}
          </div>
        </div>

        <div class="form-grupo">
          <div class="checkbox-grupo">
            <label class="checkbox-item">
              <input type="checkbox" id="con-necessita-reaval"
                     ${c.necessitaReavaliacao ? 'checked' : ''}>
              Necessita reavaliação ergonômica após intervenções
            </label>
            <label class="checkbox-item">
              <input type="checkbox" id="con-necessita-monit"
                     ${c.necessitaMonitoramento ? 'checked' : ''}>
              Necessita monitoramento contínuo da saúde dos trabalhadores
            </label>
          </div>
        </div>

        <div class="form-grupo">
          <label class="form-label">Prazo para reavaliação</label>
          <input id="con-prazo-reaval" class="form-input" type="date"
                 value="${c.prazoReavaliacao || ''}">
        </div>

        <div class="form-grupo">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <label class="form-label" style="margin:0">Conclusão técnica</label>
            <button class="btn-ia-inline" id="btn-ia-conclusao"
                    onclick="ModuloAET.gerarConclusaoAETIA()">✨ Gerar com IA</button>
          </div>
          <textarea id="con-texto" class="form-textarea" rows="7"
                    placeholder="Redija a conclusão técnica completa da AET...">${c.texto || ''}</textarea>
        </div>

        <button class="btn-primario" onclick="ModuloAET.salvarConclusao()">
          💾 Salvar Conclusão
        </button>
      </div>`;
  }

  function _salvarConclusao() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet) av.aet = {};
    if (!av.aet.conclusao) av.aet.conclusao = {};
    const c = av.aet.conclusao;

    c.respostaADemanda   = _v('con-resposta');
    c.sintese            = _v('con-sintese');
    const nr             = document.querySelector('input[name="con-nivel-risco"]:checked');
    c.nivelRiscoFinal    = nr ? nr.value : '';
    c.necessitaReavaliacao   = _v('con-necessita-reaval');
    c.necessitaMonitoramento = _v('con-necessita-monit');
    c.prazoReavaliacao   = _v('con-prazo-reaval');
    c.texto              = _v('con-texto');

    av.aet.conclusaoTecnica      = c.texto;
    av.aet.necessitaReavaliacao  = c.necessitaReavaliacao;
    av.aet.prazoReavaliacao      = c.prazoReavaliacao;

    Storage.salvar(av);
  }

  function salvarConclusao() {
    _salvarConclusao();
    App.mostrarToast('Conclusão salva.', 'sucesso');
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEÇÃO 11: RELATÓRIO AET
     ═══════════════════════════════════════════════════════════════════ */

  function _htmlRelatorio() {
    const av   = App.obterAvaliacaoAtual();
    const d    = av.aet || {};
    const car  = d.car  || {};
    const diag = d.diag || {};
    const recs = d.recs || {};
    const conc = d.conclusao || {};

    const emp   = Storage.buscarEmpresa(av.empresaId) || {};
    const set   = Storage.buscarSetor(av.setorId)     || {};
    const fun   = Storage.buscarFuncao(av.funcaoId)   || {};

    const hoje  = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

    const acoes = (av.planoAcao || []).filter(a => a.origem === 'aet');

    const toolsUsadas = TOOLS_DEF.filter(t => {
      const td = (d.tools || {})[t.id] || {};
      return td.usado;
    });

    const exigBio = ((d.exigencias || {}).bio || []);
    const exigCog = ((d.exigencias || {}).cog || []);
    const exigOrg = ((d.exigencias || {}).org || []);

    function _exigLabel(lista, def) {
      return lista.map(id => {
        const it = def.find(x => x.id === id);
        return it ? it.label : id;
      }).join('; ') || '—';
    }

    return `
      <div class="aet-secao relatorio-preview">
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <button class="btn-primario" onclick="ModuloAET.imprimirRelatorio()">🖨️ Imprimir / PDF</button>
          <button class="btn-secundario" onclick="ModuloAET.exportarJSON()">📥 Exportar JSON</button>
        </div>

        <div id="aet-relatorio-corpo">
          <div class="rel-capa">
            <div class="rel-capa-titulo">ANÁLISE ERGONÔMICA DO TRABALHO</div>
            <div class="rel-capa-sub">Norma Regulamentadora NR 17</div>
            <div class="rel-capa-empresa">${emp.razaoSocial || emp.nomeFantasia || 'Empresa não identificada'}</div>
            <div class="rel-capa-detalhe">Setor: ${set.nome || '—'} | Função: ${fun.nome || '—'}</div>
            <div class="rel-capa-detalhe">CNPJ: ${emp.cnpj || '—'}</div>
            <div class="rel-capa-detalhe">Data: ${hoje}</div>
            ${d.responsavel ? `<div class="rel-capa-resp">Responsável técnico: ${d.responsavel}</div>` : ''}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">1. Identificação</h2>
            <table class="rel-tabela">
              <tr><td><strong>Empresa</strong></td><td>${emp.razaoSocial || emp.nomeFantasia || '—'}</td><td><strong>CNPJ</strong></td><td>${emp.cnpj || '—'}</td></tr>
              <tr><td><strong>Setor</strong></td><td>${set.nome || '—'}</td><td><strong>Função</strong></td><td>${fun.nome || '—'}</td></tr>
              <tr><td><strong>Nº trabalhadores</strong></td><td>${d.nTrabalhadores || '—'}</td><td><strong>Status</strong></td><td>${d.status || '—'}</td></tr>
              <tr><td><strong>Motivo</strong></td><td colspan="3">${d.motivo || '—'}</td></tr>
              <tr><td><strong>Período</strong></td><td colspan="3">${d.dataInicio || '—'} a ${d.dataFim || '—'}</td></tr>
            </table>
            ${d.objetivos ? `<p><strong>Objetivos:</strong> ${d.objetivos}</p>` : ''}
            ${(d.fontes || []).length > 0 ? `<p><strong>Fontes de informação:</strong> ${d.fontes.join(', ')}</p>` : ''}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">2. Demanda da Avaliação</h2>
            ${d.demandaInicial ? `<p><strong>Demanda inicial:</strong><br>${d.demandaInicial}</p>` : ''}
            ${d.demandaTecnica ? `<p><strong>Formulação técnica:</strong><br>${d.demandaTecnica}</p>` : ''}
            ${d.queixas        ? `<p><strong>Queixas dos trabalhadores:</strong><br>${d.queixas}</p>` : ''}
            ${d.dadosSaude     ? `<p><strong>Dados de saúde:</strong><br>${d.dadosSaude}</p>` : ''}
            ${d.sinteseDemanda ? `<p><strong>Síntese:</strong><br>${d.sinteseDemanda}</p>` : '<p class="rel-vazio">Não preenchido.</p>'}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">3. Caracterização da Situação de Trabalho</h2>
            <table class="rel-tabela">
              <tr><td><strong>Turno</strong></td><td>${car.turno || '—'}</td><td><strong>Jornada</strong></td><td>${car.jornada ? car.jornada + 'h' : '—'}</td></tr>
              <tr><td><strong>Pausas</strong></td><td>${car.pausas || '—'}</td><td><strong>Ritmo</strong></td><td>${car.ritmo || '—'}</td></tr>
              <tr><td><strong>Iluminação</strong></td><td>${car.iluminacao || '—'}</td><td><strong>Ruído</strong></td><td>${car.ruido || '—'}</td></tr>
              <tr><td><strong>Temperatura</strong></td><td>${car.temperatura || '—'}</td><td><strong>Equipamentos</strong></td><td>${car.equipamentos || '—'}</td></tr>
              <tr><td><strong>Faixa etária</strong></td><td>${car.faixaEtaria || '—'}</td><td><strong>Tempo na função</strong></td><td>${car.tempoFuncao ? car.tempoFuncao + ' anos' : '—'}</td></tr>
            </table>
            ${car.tarefaPrescrita ? `<p><strong>Tarefa prescrita:</strong><br>${car.tarefaPrescrita}</p>` : ''}
            ${car.texto ? `<p><strong>Síntese:</strong><br>${car.texto}</p>` : ''}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">4. Atividade de Trabalho</h2>
            ${d.atividadeReal           ? `<p><strong>Atividade real:</strong><br>${d.atividadeReal}</p>` : ''}
            ${d.modosOperatorios        ? `<p><strong>Modos operatórios:</strong><br>${d.modosOperatorios}</p>` : ''}
            ${d.variabilidades          ? `<p><strong>Variabilidades:</strong><br>${d.variabilidades}</p>` : ''}
            ${d.regulacoes              ? `<p><strong>Regulações:</strong><br>${d.regulacoes}</p>` : ''}
            ${d.custoHumano             ? `<p><strong>Custo humano:</strong><br>${d.custoHumano}</p>` : ''}
            ${d.comparacaoPrescritaReal ? `<p><strong>Prescrito × real:</strong><br>${d.comparacaoPrescritaReal}</p>` : ''}
            ${!d.atividadeReal ? '<p class="rel-vazio">Não preenchido.</p>' : ''}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">5. Exigências da Atividade</h2>
            ${exigBio.length > 0 ? `<p><strong>Biomecânicas:</strong> ${_exigLabel(exigBio, EXIG_DEF.bio)}</p>` : ''}
            ${exigCog.length > 0 ? `<p><strong>Cognitivas:</strong> ${_exigLabel(exigCog, EXIG_DEF.cog)}</p>` : ''}
            ${exigOrg.length > 0 ? `<p><strong>Organizacionais:</strong> ${_exigLabel(exigOrg, EXIG_DEF.org)}</p>` : ''}
            ${d.exigenciasAnalise ? `<p><strong>Análise:</strong><br>${d.exigenciasAnalise}</p>` : ''}
            ${(exigBio.length + exigCog.length + exigOrg.length) === 0 ? '<p class="rel-vazio">Não preenchido.</p>' : ''}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">6. Ferramentas Ergonômicas Aplicadas</h2>
            ${toolsUsadas.length === 0
              ? '<p class="rel-vazio">Nenhuma ferramenta registrada.</p>'
              : toolsUsadas.map(t => {
                  const td = (d.tools || {})[t.id] || {};
                  const campos = t.campos
                    .filter(c => td[c.id] != null && td[c.id] !== '')
                    .map(c => `<tr><td><strong>${c.label}</strong></td><td>${td[c.id]}</td></tr>`)
                    .join('');
                  return `
                    <div class="rel-tool">
                      <h3 class="rel-h3">${t.nome}</h3>
                      ${campos ? `<table class="rel-tabela">${campos}</table>` : ''}
                      ${td.interpretacao ? `<p><strong>Interpretação:</strong><br>${td.interpretacao}</p>` : ''}
                    </div>`;
                }).join('')}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">7. Diagnóstico Ergonômico</h2>
            ${diag.situacoes    ? `<p><strong>Situações críticas:</strong><br>${diag.situacoes}</p>` : ''}
            ${diag.determinantes? `<p><strong>Determinantes:</strong><br>${diag.determinantes}</p>` : ''}
            ${diag.efeitos      ? `<p><strong>Efeitos:</strong><br>${diag.efeitos}</p>` : ''}
            ${diag.nivel        ? `<p><strong>Nível de risco:</strong> ${diag.nivel}</p>` : ''}
            ${diag.texto        ? `<p><strong>Diagnóstico:</strong><br>${diag.texto}</p>` : '<p class="rel-vazio">Não preenchido.</p>'}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">8. Recomendações Ergonômicas</h2>
            ${recs.engenharia     ? `<p><strong>Engenharia / projeto:</strong><br>${recs.engenharia}</p>` : ''}
            ${recs.organizacional ? `<p><strong>Organizacionais:</strong><br>${recs.organizacional}</p>` : ''}
            ${recs.administrativa ? `<p><strong>Administrativas / treinamento:</strong><br>${recs.administrativa}</p>` : ''}
            ${recs.epi            ? `<p><strong>EPI:</strong><br>${recs.epi}</p>` : ''}
            ${recs.texto          ? `<p><strong>Síntese:</strong><br>${recs.texto}</p>` : '<p class="rel-vazio">Não preenchido.</p>'}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">9. Plano de Ação</h2>
            ${acoes.length === 0
              ? '<p class="rel-vazio">Nenhuma ação registrada.</p>'
              : `<table class="rel-tabela rel-tabela-plano">
                  <thead>
                    <tr><th>Ação</th><th>Tipo</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${acoes.map(a => `
                    <tr>
                      <td>${a.descricao || '—'}</td>
                      <td>${a.tipo || '—'}</td>
                      <td>${a.responsavel || '—'}</td>
                      <td>${a.prazo || '—'}</td>
                      <td>${a.prioridade || '—'}</td>
                      <td>${a.status || '—'}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>`}
          </div>

          <div class="rel-secao">
            <h2 class="rel-h2">10. Conclusão Técnica</h2>
            ${conc.respostaADemanda ? `<p><strong>Resposta à demanda:</strong><br>${conc.respostaADemanda}</p>` : ''}
            ${conc.sintese          ? `<p><strong>Síntese dos achados:</strong><br>${conc.sintese}</p>` : ''}
            ${conc.nivelRiscoFinal  ? `<p><strong>Nível de risco final:</strong> ${conc.nivelRiscoFinal}</p>` : ''}
            ${conc.texto            ? `<p><strong>Conclusão:</strong><br>${conc.texto}</p>` : '<p class="rel-vazio">Não preenchido.</p>'}
            ${conc.necessitaReavaliacao ? `<p>✅ Necessita reavaliação${conc.prazoReavaliacao ? ' até ' + conc.prazoReavaliacao : ''}.</p>` : ''}
            ${conc.necessitaMonitoramento ? '<p>✅ Necessita monitoramento contínuo da saúde.</p>' : ''}
          </div>

          <div class="rel-assinatura">
            <p>Este documento foi elaborado com base em observações de campo, entrevistas e aplicação de métodos ergonômicos reconhecidos, em conformidade com a NR 17 e seus anexos.</p>
            <div class="rel-assin-bloco">
              <div class="rel-assin-linha"></div>
              <p>${d.responsavel || 'Responsável Técnico'}</p>
              <p>Ergonomista / Técnico de SST</p>
              <p>${hoje}</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  function imprimirRelatorio() {
    _salvarSecaoAtual();
    const corpo = document.getElementById('aet-relatorio-corpo');
    if (!corpo) return;

    const janela = window.open('', '_blank');
    janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>AET — Relatório</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm; }
        h2 { font-size: 13pt; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 20px 0 10px; }
        h3 { font-size: 11pt; margin: 12px 0 6px; }
        p  { margin: 6px 0; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10pt; }
        td, th { border: 1px solid #999; padding: 4px 8px; vertical-align: top; }
        th { background: #eee; font-weight: bold; }
        .rel-capa { text-align: center; margin-bottom: 30px; }
        .rel-capa-titulo { font-size: 18pt; font-weight: bold; margin-bottom: 8px; }
        .rel-capa-sub    { font-size: 12pt; color: #555; margin-bottom: 16px; }
        .rel-capa-empresa{ font-size: 14pt; font-weight: bold; margin-bottom: 4px; }
        .rel-capa-detalhe{ font-size: 10pt; color: #555; }
        .rel-capa-resp   { font-size: 10pt; margin-top: 8px; }
        .rel-assinatura  { margin-top: 40px; font-size: 10pt; color: #555; }
        .rel-assin-bloco { margin-top: 40px; text-align: center; }
        .rel-assin-linha { border-top: 1px solid #333; width: 250px; margin: 0 auto 6px; }
        .rel-vazio       { color: #aaa; font-style: italic; }
        .rel-tool        { margin: 10px 0; }
        @page { margin: 20mm; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${corpo.innerHTML}</body></html>`);
    janela.document.close();
    janela.print();
  }

  function exportarJSON() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;

    const json = JSON.stringify(av, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `aet_${(av.codigo || av.id || 'export').replace(/\s/g,'_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ═══════════════════════════════════════════════════════════════════
     IA — CONTEXTO E HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  /* Converte markdown simples em HTML seguro para exibir respostas da IA */
  function _mdParaHtml(txt) {
    if (!txt) return '';
    const esc = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return esc
      .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="color:var(--primaria)">$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|?$/gm, (_, a, b) =>
        `<div style="margin:4px 0;padding:4px 0;border-bottom:1px solid var(--borda)"><strong>${a.replace(/\*\*/g,'')}</strong> — ${b.replace(/\*\*/g,'')}</div>`)
      .replace(/^\|[-:| ]+\|?$/gm, '')
      .replace(/^\|.+\|?$/gm, '')
      .replace(/^---+$/gm, '<hr style="border-color:var(--borda);margin:6px 0">')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function _ctxBase() {
    const av      = App.obterAvaliacaoAtual() || {};
    const d       = av.aet || {};
    const emp     = Storage.buscarEmpresa(av.empresaId)  || {};
    const setor   = Storage.buscarSetor(av.setorId)      || {};
    const funcao  = Storage.buscarFuncao(av.funcaoId)    || {};

    const empresa    = emp.razaoSocial || emp.nomeFantasia || 'empresa';
    const setorNome  = setor.nome  || 'setor não identificado';
    const funcaoNome = funcao.nome || 'função não identificada';
    const nTrab      = d.nTrabalhadores || av.nTrabalhadores || '?';

    return { av, d, emp, setor, funcao, empresa, setorNome, funcaoNome, nTrab };
  }

  async function _iaExec(promptFn, maxTok, btnId, taId, salvarFn, msg) {
    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(() => _iaExec(promptFn, maxTok, btnId, taId, salvarFn, msg));
      return;
    }

    const btn = document.getElementById(btnId);
    const ta  = document.getElementById(taId);
    if (!ta) { App.mostrarToast('Campo de destino não encontrado.', 'erro'); return; }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }

    try {
      const prompt = promptFn();
      const texto  = await ClaudeVision.gerarTextoIA(prompt, maxTok);
      ta.value = texto;
      if (salvarFn) salvarFn();
      App.mostrarToast(msg || 'Texto gerado pela IA.', 'sucesso');
    } catch (e) {
      App.mostrarToast('Erro ao gerar com IA: ' + e.message, 'erro');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Gerar com IA'; }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     IA — FUNÇÕES DE GERAÇÃO
     ═══════════════════════════════════════════════════════════════════ */

  function gerarSinteseDemandaIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
      return `Você é ergonomista. Elabore uma síntese técnica da demanda ergonômica para AET.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Demanda inicial: ${d.demandaInicial || '—'}
Formulação técnica: ${d.demandaTecnica || '—'}
Queixas: ${d.queixas || '—'}
Dados de saúde: ${d.dadosSaude || '—'}
Escreva 3–5 parágrafos contextualizando a demanda ergonômica, relacionando os dados disponíveis com os objetivos da AET. Use linguagem técnica e objetiva.`;
    }, 800, 'btn-ia-demanda', 'aet-sintese-demanda', _salvarDemanda, 'Síntese da demanda gerada.');
  }

  function gerarCaracterizacaoIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
      const c = d.car || {};
      return `Você é ergonomista. Elabore a síntese técnica de caracterização da situação de trabalho para AET.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Turno: ${c.turno || '—'} | Jornada: ${c.jornada || '—'}h | Pausas: ${c.pausas || '—'}
Ritmo: ${c.ritmo || '—'} | Iluminação: ${c.iluminacao || '—'} | Ruído: ${c.ruido || '—'}
Temperatura: ${c.temperatura || '—'} | Equipamentos: ${c.equipamentos || '—'}
Faixa etária: ${c.faixaEtaria || '—'} | Tempo na função: ${c.tempoFuncao || '—'} anos
Tarefa prescrita: ${c.tarefaPrescrita || '—'}
Redija 3–4 parágrafos caracterizando a situação de trabalho, destacando aspectos organizacionais, ambientais e do perfil dos trabalhadores relevantes para o risco ergonômico.`;
    }, 700, 'btn-ia-car', 'car-texto', _salvarCaracterizacao, 'Caracterização gerada.');
  }

  function gerarComparacaoAtividadeIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, d } = _ctxBase();
      const c = d.car || {};
      return `Você é ergonomista especialista em análise da atividade. Compare a tarefa prescrita com a atividade real.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome}
Tarefa prescrita: ${c.tarefaPrescrita || d.demandaTecnica || '—'}
Atividade real observada: ${d.atividadeReal || '—'}
Modos operatórios: ${d.modosOperatorios || '—'}
Variabilidades: ${d.variabilidades || '—'}
Regulações: ${d.regulacoes || '—'}
Custo humano: ${d.custoHumano || '—'}
Elabore análise técnica de 3–5 parágrafos sobre as distâncias entre tarefa prescrita e atividade real, suas causas e implicações ergonômicas. Destaque as estratégias dos trabalhadores e os custos humanos identificados.`;
    }, 800, 'btn-ia-ativ', 'aet-comparacao', _salvarAtividade, 'Comparação gerada.');
  }

  function gerarAnaliseExigenciasIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
      const exig = d.exigencias || {};
      const bio  = (exig.bio || []).map(id => { const it = EXIG_DEF.bio.find(x => x.id === id); return it ? it.label : id; });
      const cog  = (exig.cog || []).map(id => { const it = EXIG_DEF.cog.find(x => x.id === id); return it ? it.label : id; });
      const org  = (exig.org || []).map(id => { const it = EXIG_DEF.org.find(x => x.id === id); return it ? it.label : id; });
      return `Você é ergonomista. Elabore análise técnica das exigências da atividade de trabalho.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Exigências biomecânicas identificadas: ${bio.join('; ') || 'Nenhuma'}
Exigências cognitivas: ${cog.join('; ') || 'Nenhuma'}
Exigências organizacionais/psicossociais: ${org.join('; ') || 'Nenhuma'}
Atividade real: ${d.atividadeReal || '—'}
Elabore 4–6 parágrafos analisando as exigências identificadas, suas inter-relações, fatores agravantes e consequências para a saúde dos trabalhadores. Use linguagem técnica conforme NR 17.`;
    }, 900, 'btn-ia-exig', 'exig-analise', _salvarExigencias, 'Análise de exigências gerada.');
  }

  function sugerirFerramentasIA() {
    const btn = document.getElementById('btn-ia-tools');
    const div = document.getElementById('tools-sugestao');
    if (!div) return;

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(sugerirFerramentasIA);
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando...'; }

    const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
    const exig = d.exigencias || {};
    const bio  = (exig.bio || []).slice(0, 6).join(', ');
    const cog  = (exig.cog || []).slice(0, 4).join(', ');

    const prompt = `Você é ergonomista. Sugira ferramentas ergonômicas adequadas para esta AET.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Atividade real: ${d.atividadeReal || '—'}
Exigências biomecânicas: ${bio || '—'}
Exigências cognitivas: ${cog || '—'}
Ferramentas disponíveis: RULA, REBA, OWAS, NIOSH, OCRA, Strain Index, QEC, HAL/ACGIH, Borg, Corlett, Análise postural, Análise de força, Vibrações, Entrevista, Filmagem, Observação sistemática.
Sugira 3–5 ferramentas com justificativa técnica para cada uma. Formato: nome da ferramenta → justificativa (1–2 linhas).`;

    ClaudeVision.gerarTextoIA(prompt, 900).then(texto => {
      div.innerHTML = _mdParaHtml(texto);
      const av = App.obterAvaliacaoAtual();
      if (av) { if (!av.aet) av.aet = {}; av.aet.toolsSugestao = texto; Storage.salvar(av); }
      App.mostrarToast('Sugestão de ferramentas gerada.', 'sucesso');
    }).catch(e => {
      App.mostrarToast('Erro IA: ' + e.message, 'erro');
    }).finally(() => {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Sugerir com IA'; }
    });
  }

  function interpretarToolIA(toolId) {
    const tool = TOOLS_DEF.find(t => t.id === toolId);
    if (!tool) return;

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(() => interpretarToolIA(toolId));
      return;
    }

    const btn = document.getElementById(`btn-ia-tool-${toolId}`);
    const ta  = document.getElementById('tf-interpretacao');
    if (!ta) return;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Interpretando...'; }

    const { empresa, setorNome, funcaoNome, d } = _ctxBase();
    const td = ((d.tools || {})[toolId]) || {};

    const dados = tool.campos
      .filter(c => td[c.id] != null && td[c.id] !== '')
      .map(c => `${c.label}: ${td[c.id]}`)
      .join('\n');

    const prompt = `Você é ergonomista. Interprete os resultados da ferramenta ${tool.nome} para elaborar conclusão técnica.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome}
Ferramenta: ${tool.nome} — ${tool.desc}
Dados obtidos:
${dados || '(sem dados preenchidos)'}
Elabore interpretação técnica de 3–5 parágrafos: o que os resultados indicam, nível de risco, relação com a atividade real, e recomendações iniciais específicas para esta ferramenta.`;

    ClaudeVision.gerarTextoIA(prompt, 600).then(texto => {
      ta.value = texto;
      App.mostrarToast(`Interpretação de ${tool.nome} gerada.`, 'sucesso');
    }).catch(e => {
      App.mostrarToast('Erro IA: ' + e.message, 'erro');
    }).finally(() => {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Interpretar com IA'; }
    });
  }

  function gerarDiagnosticoIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
      const diag  = d.diag || {};
      const exig  = d.exigencias || {};
      const bio   = (exig.bio || []).join(', ');
      const tools = TOOLS_DEF.filter(t => ((d.tools||{})[t.id]||{}).usado)
        .map(t => { const td = (d.tools||{})[t.id]||{}; return `${t.nome}: ${td.interpretacao || '(sem interpretação)'}`;}).join('\n');
      return `Você é ergonomista sênior. Elabore o diagnóstico ergonômico para AET.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Atividade real: ${d.atividadeReal || '—'}
Exigências biomecânicas: ${bio || '—'}
Situações críticas: ${diag.situacoes || '—'}
Determinantes: ${diag.determinantes || '—'}
Efeitos: ${diag.efeitos || '—'}
Resultados das ferramentas:
${tools || '(nenhuma ferramenta registrada)'}
Elabore diagnóstico ergonômico técnico e defensável em 5–7 parágrafos. Identifique as situações de trabalho críticas, seus determinantes organizacionais e técnicos, os efeitos sobre saúde e desempenho, e o nível de risco ergonômico global. Use linguagem técnica conforme NR 17.`;
    }, 1000, 'btn-ia-diag', 'diag-texto', _salvarDiagnostico, 'Diagnóstico ergonômico gerado.');
  }

  function gerarRecomendacoesIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, d } = _ctxBase();
      const diag = d.diag || {};
      return `Você é ergonomista. Elabore recomendações ergonômicas seguindo a hierarquia de controles (engenharia → organizacional → administrativo → EPI).
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome}
Diagnóstico: ${diag.texto || '—'}
Situações críticas: ${diag.situacoes || '—'}
Determinantes: ${diag.determinantes || '—'}
Atividade real: ${d.atividadeReal || '—'}
Elabore recomendações técnicas objetivas em 4–6 parágrafos, organizadas por tipo de medida (engenharia/projeto, organizacionais, administrativas/treinamento, EPI). Inclua justificativa técnica para cada grupo de recomendações.`;
    }, 800, 'btn-ia-recs', 'recs-texto', _salvarRecomendacoes, 'Recomendações geradas.');
  }

  function gerarConclusaoAETIA() {
    _iaExec(() => {
      const { empresa, setorNome, funcaoNome, nTrab, d } = _ctxBase();
      const diag = d.diag || {};
      const recs = d.recs || {};
      const conc = d.conclusao || {};
      return `Você é ergonomista. Elabore a conclusão técnica completa desta AET.
Empresa: ${empresa} | Setor: ${setorNome} | Função: ${funcaoNome} | Trabalhadores: ${nTrab}
Demanda inicial: ${d.demandaInicial || '—'}
Diagnóstico: ${diag.texto || '—'}
Nível de risco: ${diag.nivel || conc.nivelRiscoFinal || '—'}
Recomendações síntese: ${recs.texto || '—'}
Resposta à demanda: ${conc.respostaADemanda || '—'}
Síntese dos achados: ${conc.sintese || '—'}
Elabore conclusão técnica definitiva em 5–7 parágrafos: resposta à demanda inicial, síntese dos achados, nível de risco final, principais recomendações e necessidade de acompanhamento. Finalize com declaração de responsabilidade técnica. Use linguagem formal e objetiva.`;
    }, 1000, 'btn-ia-conclusao', 'con-texto', _salvarConclusao, 'Conclusão gerada.');
  }

  /* ═══════════════════════════════════════════════════════════════════
     IMPORTAÇÃO AUTOMÁTICA DE DADOS AEP / AFP
     ═══════════════════════════════════════════════════════════════════ */

  function importarDadosAepAfp() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aet)           av.aet           = {};
    if (!av.aet.car)       av.aet.car       = {};
    if (!av.aet.diag)      av.aet.diag      = {};
    if (!av.aet.recs)      av.aet.recs      = {};
    if (!av.aet.exigencias)av.aet.exigencias= {};

    const todas = Storage.listarPorProjeto(av.projetoId);
    const aep   = todas.find(a => a.tipo === 'aep' && a.funcaoId === av.funcaoId);
    const afp   = todas.find(a => a.tipo === 'psicossocial' && a.funcaoId === av.funcaoId);

    if (!aep && !afp) {
      App.mostrarToast('Nenhuma AEP ou AFP encontrada para esta função.', 'aviso');
      return;
    }

    let importados = 0;

    /* Preenche campo apenas se estiver vazio */
    function _set(obj, campo, valor) {
      if (valor && !obj[campo]) { obj[campo] = valor; importados++; }
    }

    /* ── AEP → AET ── */
    if (aep && aep.aep) {
      const posto   = aep.aep.posto   || {};
      const analise = aep.aep.analise || {};

      /* Demanda */
      _set(av.aet, 'demandaInicial', analise.justificativaAET || analise.analiseTecnica);
      _set(av.aet, 'queixas',        posto.evidencias);

      /* Caracterização */
      _set(av.aet.car, 'turno',          posto.turno);
      _set(av.aet.car, 'tarefaPrescrita', posto.perfilPosto);
      _set(av.aet.car, 'equipamentos',    posto.ferramentas);
      _set(av.aet.car, 'posto',           posto.layout);

      /* Atividade */
      _set(av.aet, 'atividadeReal', posto.atividadeReal);

      /* Diagnóstico */
      _set(av.aet.diag, 'situacoes', analise.analiseTecnica);
      _set(av.aet.diag, 'efeitos',   posto.evidencias);

      /* Nível de risco: tenta mapear string "N – Desc" ou apenas dígito */
      if (!av.aet.diag.nivel && analise.nivelRiscoGeral) {
        const nivelMap = {
          '1': '1 – Sem risco identificado',
          '2': '2 – Risco baixo',
          '3': '3 – Risco moderado',
          '4': '4 – Risco alto',
          '5': '5 – Risco muito alto / crítico',
        };
        const m = String(analise.nivelRiscoGeral).match(/\d/);
        if (m) { av.aet.diag.nivel = nivelMap[m[0]] || ''; importados++; }
      }

      /* Recomendações */
      _set(av.aet.recs, 'texto', analise.recomendacoes);

      /* Exigências: mapeamento de exposições estruturadas AEP → exigências AET */
      const mapBio = {
        ef_pescoco:   'pescoco',
        ef_ombros:    'ombro',
        ef_tronco:    'tronco_flexao',
        ef_estatica:  'estatica',
        ef_repeticao: 'repeticao',
        ef_cargas:    'levantamento',
        ef_esforco:   'forca',
        ef_vib_maos:  'vibracao_mb',
        ef_vib_corpo: 'vibracao_ci',
        ef_pe:        'pe_prolongado',
      };
      const mapOrg = { eo_turno: 'turnos' };
      const mapCog = { eo_ritmo: 'ritmo', ec_cognitivo: 'atencao' };

      const presentes = (posto.exposicoesEstruturadas || []).filter(e => e.presente === 'sim').map(e => e.id);
      if (presentes.length) {
        if (!av.aet.exigencias.bio) av.aet.exigencias.bio = [];
        if (!av.aet.exigencias.org) av.aet.exigencias.org = [];
        if (!av.aet.exigencias.cog) av.aet.exigencias.cog = [];
        presentes.forEach(eid => {
          if (mapBio[eid] && !av.aet.exigencias.bio.includes(mapBio[eid])) {
            av.aet.exigencias.bio.push(mapBio[eid]); importados++;
          }
          if (mapOrg[eid] && !av.aet.exigencias.org.includes(mapOrg[eid])) {
            av.aet.exigencias.org.push(mapOrg[eid]); importados++;
          }
          if (mapCog[eid] && !av.aet.exigencias.cog.includes(mapCog[eid])) {
            av.aet.exigencias.cog.push(mapCog[eid]); importados++;
          }
        });
      }
    }

    /* ── AFP (psicossocial) → AET ── */
    if (afp && afp.psicossocial) {
      const psi = afp.psicossocial;
      _set(av.aet.recs, 'organizacional', psi.medidasPreventivas);
      _set(av.aet.diag, 'determinantes',  psi.fatoresCriticos);
      /* Adiciona 'relacionamento' nas exigências org se houver fatores críticos */
      if (psi.fatoresCriticos) {
        if (!av.aet.exigencias.org) av.aet.exigencias.org = [];
        if (!av.aet.exigencias.org.includes('relacionamento')) {
          av.aet.exigencias.org.push('relacionamento'); importados++;
        }
      }
    }

    if (importados === 0) {
      App.mostrarToast('Campos já preenchidos — nenhum dado novo importado.', 'aviso');
      return;
    }

    Storage.salvar(av);
    App.mostrarToast(`${importados} campos importados da AEP/AFP com sucesso!`, 'sucesso');
    _renderSecao(_secaoAtual);
  }

  /* ═══════════════════════════════════════════════════════════════════
     RETORNO PÚBLICO
     ═══════════════════════════════════════════════════════════════════ */

  return {
    renderizar,
    trocarSecao,
    salvarIdentificacao,
    salvarDemanda,
    salvarCaracterizacao,
    salvarAtividade,
    salvarExigencias,
    toggleToolUso,
    abrirTool,
    fecharTool,
    salvarTool,
    calcularNIOSH,
    salvarDiagnostico,
    salvarRecomendacoes,
    adicionarAcaoPlano,
    confirmarAcaoPlano,
    removerAcaoPlano,
    salvarConclusao,
    imprimirRelatorio,
    exportarJSON,
    gerarSinteseDemandaIA,
    gerarCaracterizacaoIA,
    gerarComparacaoAtividadeIA,
    gerarAnaliseExigenciasIA,
    sugerirFerramentasIA,
    interpretarToolIA,
    gerarDiagnosticoIA,
    gerarRecomendacoesIA,
    gerarConclusaoAETIA,
    importarDadosAepAfp,
  };

})();
