/* ============================================================
   ErgoGRO — Módulo: AEP (Avaliação Ergonômica Preliminar)
   Gerencia todas as seções da AEP:
   identificacao | posto | checklist | analise | relatorio
   ============================================================ */

const ModuloAEP = (() => {

  let _secaoAtual = 'identificacao';

  /* ── Checklist NR-17 ─────────────────────────────────────── */
  const BLOCOS = {
    organizacao: {
      titulo: 'Organização do Trabalho', icone: '⏱️',
      itens: [
        { id: 'org_01', texto: 'A jornada de trabalho respeita os limites legais e há pausas regulares estabelecidas? (NR-17 item 17.4.1)' },
        { id: 'org_02', texto: 'O ritmo de trabalho não é determinado exclusivamente por máquina ou pressão excessiva de metas?' },
        { id: 'org_03', texto: 'Há distribuição adequada e planejamento das tarefas ao longo da jornada?' },
        { id: 'org_04', texto: 'O trabalhador tem autonomia suficiente para organizar o próprio trabalho?' },
        { id: 'org_05', texto: 'As metas estabelecidas são compatíveis com a capacidade dos trabalhadores?' },
        { id: 'org_06', texto: 'O trabalho não exige postura estática prolongada por mais de 2 horas consecutivas sem pausa?' },
        { id: 'org_07', texto: 'Não há movimentos repetitivos com ciclos curtos inferiores a 30 segundos de forma contínua?' },
        { id: 'org_08', texto: 'O trabalhador recebe treinamento adequado para a função, incluindo aspectos ergonômicos?' },
      ]
    },
    cargas: {
      titulo: 'Levantamento e Transporte de Cargas', icone: '🏋️',
      itens: [
        { id: 'car_01', texto: 'Os pesos levantados manualmente respeitam os limites recomendados? (23 kg homens / 13 kg mulheres — NIOSH)' },
        { id: 'car_02', texto: 'O trabalhador realiza a pega adequada e posicionamento corporal correto ao levantar cargas?' },
        { id: 'car_03', texto: 'Há equipamentos de apoio disponíveis e utilizados (carrinhos, paletes, elevadores)?' },
        { id: 'car_04', texto: 'A frequência de levantamento permite recuperação muscular adequada entre esforços?' },
        { id: 'car_05', texto: 'Os percursos de transporte são desobstruídos, planos e seguros?' },
        { id: 'car_06', texto: 'O ponto de pega e de deposição das cargas está entre altura do joelho e dos ombros?' },
      ]
    },
    mobiliario: {
      titulo: 'Mobiliário', icone: '🪑',
      itens: [
        { id: 'mob_01', texto: 'O assento é regulável em altura e possui apoio lombar adequado? (NR-17 item 17.2.1)' },
        { id: 'mob_02', texto: 'A superfície de trabalho tem altura compatível com a tarefa e com o trabalhador?' },
        { id: 'mob_03', texto: 'Há apoio para os membros superiores quando a tarefa exige?' },
        { id: 'mob_04', texto: 'Há espaço suficiente para os membros inferiores sob a superfície de trabalho?' },
        { id: 'mob_05', texto: 'Os materiais de uso frequente estão ao alcance sem torção do tronco ou esforço excessivo?' },
        { id: 'mob_06', texto: 'Há suporte para os pés quando necessário?' },
        { id: 'mob_07', texto: 'O encosto do assento é adequado e regulável em inclinação?' },
      ]
    },
    maquinas: {
      titulo: 'Máquinas e Equipamentos', icone: '⚙️',
      itens: [
        { id: 'maq_01', texto: 'Os controles e comandos são de fácil acesso e operação, sem exigir esforço ou postura inadequada?' },
        { id: 'maq_02', texto: 'Não há exposição a vibração de mãos, braços ou corpo inteiro acima dos limites de conforto?' },
        { id: 'maq_03', texto: 'O uso de ferramentas manuais não exige força excessiva ou postura inadequada?' },
        { id: 'maq_04', texto: 'As ferramentas são adequadas à tarefa e dimensionadas para o perfil do trabalhador?' },
        { id: 'maq_05', texto: 'O trabalho com telas (VDT) não exige postura forçada de pescoço ou membros superiores? (NR-17 item 17.3)' },
        { id: 'maq_06', texto: 'A posição do monitor é regulável em altura, inclinação e distância?' },
        { id: 'maq_07', texto: 'Os equipamentos têm manutenção regular documentada e funcionam sem vibração ou resistência anormal?' },
      ]
    },
    ambiente: {
      titulo: 'Condições Ambientais', icone: '🌡️',
      itens: [
        { id: 'amb_01', texto: 'O nível de iluminamento é adequado para a exigência visual da tarefa? (NR-17 item 17.5.3)' },
        { id: 'amb_02', texto: 'Não há reflexos, ofuscamentos ou sombras que prejudiquem a visão no posto de trabalho?' },
        { id: 'amb_03', texto: 'O nível de ruído não interfere na comunicação verbal nem na concentração dos trabalhadores?' },
        { id: 'amb_04', texto: 'A temperatura e umidade estão em níveis confortáveis para o tipo de atividade realizada?' },
        { id: 'amb_05', texto: 'A ventilação e a qualidade do ar interior são satisfatórias?' },
        { id: 'amb_06', texto: 'Não há odores, vapores ou agentes químicos em concentração incômoda no ambiente?' },
        { id: 'amb_07', texto: 'O espaço físico do posto é suficiente, organizado e permite livre movimentação?' },
      ]
    },
    cognitiva: {
      titulo: 'Demandas Cognitivas', icone: '🧠',
      itens: [
        { id: 'cog_01', texto: 'As demandas de atenção e concentração são compatíveis com as capacidades dos trabalhadores?' },
        { id: 'cog_02', texto: 'Não há exigência simultânea de múltiplas tarefas incompatíveis ou que gerem sobrecarga cognitiva?' },
        { id: 'cog_03', texto: 'A carga de memorização exigida é compatível com as condições e suportes disponíveis no posto?' },
        { id: 'cog_04', texto: 'O trabalhador dispõe de tempo adequado para tomada de decisão nas situações críticas da tarefa?' },
        { id: 'cog_05', texto: 'O ambiente de trabalho é livre de interrupções frequentes que comprometam a execução das tarefas?' },
        { id: 'cog_06', texto: 'A carga mental total imposta é compatível com os recursos e suportes disponíveis ao trabalhador?' },
        { id: 'cog_07', texto: 'Não há pressão temporal que comprometa a qualidade das decisões ou a segurança operacional?' },
      ]
    },
    psicossocial: {
      titulo: 'Aspectos Psicossociais', icone: '🧩',
      itens: [
        { id: 'psi_01', texto: 'O trabalhador tem suporte social adequado de colegas e da chefia imediata?' },
        { id: 'psi_02', texto: 'Há comunicação clara sobre expectativas, objetivos e mudanças que afetam o trabalho?' },
        { id: 'psi_03', texto: 'O trabalhador recebe reconhecimento adequado pelo trabalho realizado?' },
        { id: 'psi_04', texto: 'Há equilíbrio entre as demandas impostas e os recursos disponíveis para realizá-las?' },
        { id: 'psi_05', texto: 'Os limites físicos e emocionais dos trabalhadores são respeitados?' },
        { id: 'psi_06', texto: 'Não há relatos ou evidências de assédio moral, discriminação ou violência no trabalho?' },
      ]
    }
  };

  const ORDEM_BLOCOS = ['organizacao', 'cargas', 'mobiliario', 'maquinas', 'ambiente', 'cognitiva', 'psicossocial'];
  let _blocoAtivo = 'organizacao';
  let _empresaImpressaoAEP = 'engenhalves';
  let _nrAEPAtual = '';

  /* ── Seções do módulo AEP ────────────────────────────────── */
  const SECOES = [
    { id: 'identificacao', icone: '📋', label: 'Identificação' },
    { id: 'posto',         icone: '🏭', label: 'Posto'         },
    { id: 'checklist',     icone: '✅', label: 'Checklist'     },
    { id: 'analise',       icone: '🔬', label: 'Análise'       },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'     },
  ];

  /* ── Exposições estruturadas (13 fatores) ────────────────── */
  const EXPOSICOES = [
    { id: 'ef_pescoco',   label: 'Postura forçada de pescoço / cabeça',          dominio: 'fisica' },
    { id: 'ef_ombros',    label: 'Postura forçada de ombros / braços',            dominio: 'fisica' },
    { id: 'ef_tronco',    label: 'Postura forçada de tronco (flexão / torção)',   dominio: 'fisica' },
    { id: 'ef_estatica',  label: 'Postura estática prolongada',                   dominio: 'fisica' },
    { id: 'ef_repeticao', label: 'Movimentos repetitivos de membros superiores',  dominio: 'fisica' },
    { id: 'ef_cargas',    label: 'Levantamento e manuseio manual de cargas',      dominio: 'fisica' },
    { id: 'ef_esforco',   label: 'Esforço físico intenso / força com mãos',       dominio: 'fisica' },
    { id: 'ef_vib_maos',  label: 'Vibração de mãos e braços',                     dominio: 'fisica' },
    { id: 'ef_vib_corpo', label: 'Vibração de corpo inteiro',                     dominio: 'fisica' },
    { id: 'ef_pe',        label: 'Trabalho prolongado em pé sem alternância',     dominio: 'fisica' },
    { id: 'eo_turno',     label: 'Trabalho noturno ou em turnos alternados',      dominio: 'organizacional' },
    { id: 'eo_ritmo',     label: 'Pressão intensa por ritmo / metas',             dominio: 'organizacional' },
    { id: 'ec_cognitivo', label: 'Trabalho cognitivo de alta exigência',          dominio: 'cognitiva' },
  ];

  /* ── Perfis de posto de trabalho ─────────────────────────── */
  const PERFIS_POSTO = [
    { id: 'administrativo',        label: 'Administrativo / Escritório' },
    { id: 'operacional_leve',      label: 'Operacional Leve' },
    { id: 'operacional_pesado',    label: 'Operacional Pesado' },
    { id: 'industrial_repetitivo', label: 'Industrial / Repetitivo' },
    { id: 'cognitivo_intenso',     label: 'Cognitivo Intenso' },
    { id: 'atendimento',           label: 'Atendimento ao Público' },
    { id: 'direcao_veicular',      label: 'Direção Veicular' },
    { id: 'manutencao',            label: 'Manutenção / Técnico' },
    { id: 'externo',               label: 'Campo / Externo' },
  ];

  /* ── Textos de recomendação por bloco ────────────────────── */
  const _RECS_BLOCO = {
    organizacao: {
      imediata: 'Revisar imediatamente jornada, pausas e ritmo de trabalho conforme NR-17 item 17.4.1; suspender exigências incompatíveis com a saúde dos trabalhadores',
      alta:     'Adequar distribuição de tarefas, pausas regulares e sistema de metas; documentar ações no PGR',
      media:    'Revisar organização do trabalho e planejar melhorias nas condições de ritmo e autonomia'
    },
    cargas: {
      imediata: 'Suspender levantamento manual acima dos limites NIOSH; fornecer imediatamente equipamentos de apoio e orientação técnica',
      alta:     'Aplicar equação NIOSH; implementar treinamento de movimentação de cargas e fornecer EPIs adequados',
      media:    'Revisar procedimentos de manuseio de cargas; orientar trabalhadores sobre posturas e limites seguros'
    },
    mobiliario: {
      imediata: 'Substituir ou adaptar imediatamente mobiliário que represente risco postural significativo conforme NR-17 item 17.2',
      alta:     'Adequar mobiliário às normas ergonômicas; fornecer cadeiras reguláveis e superfícies adequadas',
      media:    'Ajustar regulagens de cadeiras e bancadas; verificar apoios lombares e para os pés'
    },
    maquinas: {
      imediata: 'Avaliar e corrigir imediatamente configurações de máquinas que geram risco ergonômico iminente',
      alta:     'Revisar configuração e manutenção de equipamentos; instalar suportes, apoios e atenuadores de vibração',
      media:    'Adequar configurações ergonômicas de máquinas e ferramentas conforme NR-17 item 17.3'
    },
    ambiente: {
      imediata: 'Realizar medições imediatas de iluminação, ruído e temperatura; implementar correções urgentes das condições ambientais',
      alta:     'Adequar condições ambientais (iluminação, ruído, temperatura, ventilação) conforme NR-17 item 17.5',
      media:    'Verificar e melhorar progressivamente as condições ambientais do posto de trabalho'
    },
    cognitiva: {
      imediata: 'Revisar imediatamente a carga cognitiva e reorganizar tarefas para prevenir erros críticos por sobrecarga mental',
      alta:     'Implementar pausas cognitivas estruturadas; reduzir interrupções; revisar interface e fluxo de trabalho',
      media:    'Analisar e organizar melhor as demandas cognitivas; fornecer suportes e recursos adequados'
    },
    psicossocial: {
      imediata: 'Implementar medidas imediatas de suporte psicossocial; comunicar RH e gestão; considerar avaliação por saúde do trabalho',
      alta:     'Desenvolver programa de gestão de riscos psicossociais; promover comunicação e reconhecimento no trabalho',
      media:    'Melhorar suporte social, comunicação e equilíbrio entre demandas e recursos disponíveis'
    }
  };

  const _RECS_EXPOSICAO = {
    ef_pescoco:   'Reorganizar posto para manter pescoço/cabeça em posição neutra; avaliar altura de monitor, bancada ou material de trabalho',
    ef_ombros:    'Ajustar altura da superfície de trabalho; instalar apoios para membros superiores; avaliar com RULA/REBA',
    ef_tronco:    'Reorganizar layout do posto; implementar rotação de tarefas e pausas posturais; aplicar método OWAS',
    ef_estatica:  'Introduzir ginástica laboral e pausas ativas; avaliar uso de apoios, encostos e suportes; promover alternância postural',
    ef_repeticao: 'Aplicar análise de repetitividade (OCRA ou SI); implementar pausas, rodízio e redução de ciclos',
    ef_cargas:    'Aplicar equação NIOSH; fornecer equipamentos de transporte; treinar técnica de levantamento seguro',
    ef_esforco:   'Avaliar necessidade de ferramentas de auxílio; revisar dimensionamento da tarefa e tempos de recuperação',
    ef_vib_maos:  'Medir exposição à vibração conforme NR-09/ISO 5349; substituir ou isolar ferramentas vibratórias; controlar tempo de exposição',
    ef_vib_corpo: 'Avaliar exposição a VCI conforme NR-09/ISO 2631; revisar assentos e sistemas de amortecimento; controlar duração',
    ef_pe:        'Instalar tapetes anti-fadiga; criar alternância sentado/em pé; programar pausas de descanso postural',
    eo_turno:     'Revisar escala de turnos conforme NR-17; garantir descanso interjornada adequado e adaptação ao trabalho noturno',
    eo_ritmo:     'Revisar sistema de metas e cadência de produção; implementar margem de tempo para recuperação entre ciclos',
    ec_cognitivo: 'Revisar interface homem-máquina; reduzir interrupções; implementar pausas cognitivas e reorganizar fluxo de trabalho'
  };

  /* ── Motor de criticidade (score 0–100) ──────────────────── */
  const MOTOR_AEP = {
    PESOS: { fisica: 0.35, organizacional: 0.25, cognitiva: 0.20, psicossocial: 0.20 },

    BLOCO_DOMINIO: {
      organizacao: 'organizacional', cargas: 'fisica',
      mobiliario: 'fisica', maquinas: 'fisica',
      ambiente: 'fisica', cognitiva: 'cognitiva', psicossocial: 'psicossocial'
    },

    EXP_MULT: {
      intensidade: { baixa: 0.3, moderada: 0.6, alta: 1.0 },
      frequencia:  { ocasional: 0.3, intermitente: 0.6, continua: 1.0 },
      duracao:     { '<1h': 0.3, '1h-3h': 0.5, '3h-6h': 0.8, '>6h': 1.0 }
    },

    _scoreChecklist(av) {
      const somas   = { fisica: 0, organizacional: 0, cognitiva: 0, psicossocial: 0 };
      const contagens = { fisica: 0, organizacional: 0, cognitiva: 0, psicossocial: 0 };

      ORDEM_BLOCOS.forEach(chave => {
        const dominio = MOTOR_AEP.BLOCO_DOMINIO[chave];
        const bloco   = BLOCOS[chave];
        const respostas = av?.aep?.[chave] || {};
        let pts = 0, max = bloco.itens.length * 3;

        bloco.itens.forEach(item => {
          const r = respostas[item.id];
          if (r?.resposta === 'nao') {
            pts += r.risco === 'alto' ? 3 : r.risco === 'medio' ? 2 : 1;
          }
        });

        somas[dominio]    += pts / max;
        contagens[dominio]++;
      });

      const result = {};
      Object.keys(somas).forEach(dom => {
        result[dom] = contagens[dom] ? somas[dom] / contagens[dom] : 0;
      });
      return result;
    },

    _scoreExposicoes(av) {
      const exps = av?.aep?.posto?.exposicoesEstruturadas || [];
      const somas   = { fisica: 0, organizacional: 0, cognitiva: 0 };
      const totais  = { fisica: 0, organizacional: 0, cognitiva: 0 };

      EXPOSICOES.forEach(def => {
        const dom = def.dominio;
        if (!somas.hasOwnProperty(dom)) return;
        totais[dom]++;
        const e = exps.find(x => x.id === def.id);
        if (!e || e.presente !== 'sim') return;
        const m = MOTOR_AEP.EXP_MULT;
        somas[dom] += (m.intensidade[e.intensidade] || 0) *
                      (m.frequencia[e.frequencia]   || 0) *
                      (m.duracao[e.duracao]          || 0);
      });

      const result = {};
      Object.keys(somas).forEach(dom => {
        result[dom] = totais[dom] ? somas[dom] / totais[dom] : 0;
      });
      return result;
    },

    calcularScore(av) {
      const checklist  = MOTOR_AEP._scoreChecklist(av);
      const exposicoes = MOTOR_AEP._scoreExposicoes(av);
      const componentes = {};

      ['fisica', 'organizacional', 'cognitiva', 'psicossocial'].forEach(dom => {
        const c = checklist[dom]  || 0;
        const e = exposicoes[dom] || 0;
        componentes[dom] = dom !== 'psicossocial' ? c * 0.7 + e * 0.3 : c;
      });

      const p = MOTOR_AEP.PESOS;
      const valor = Math.round(
        (componentes.fisica         * p.fisica +
         componentes.organizacional * p.organizacional +
         componentes.cognitiva      * p.cognitiva +
         componentes.psicossocial   * p.psicossocial) * 100
      );

      return { valor, componentes, calculadoEm: new Date().toISOString() };
    },

    sugerirNivel(score) {
      if (score < 25) return 'baixo';
      if (score < 50) return 'medio';
      if (score < 75) return 'alto';
      return 'critico';
    },

    corNivel(nivel) {
      return { baixo: '#4caf50', medio: '#ff9800', alto: '#f44336', critico: '#b71c1c' }[nivel] || '#888';
    },

    gerarRecomendacoes(av) {
      const recs = [];
      const nivelOrd = { baixo: 0, medio: 1, alto: 2 };

      ORDEM_BLOCOS.forEach(chave => {
        const bloco = BLOCOS[chave];
        const respostas = av?.aep?.[chave] || {};
        let maxRisco = null;

        bloco.itens.forEach(item => {
          const r = respostas[item.id];
          if (r?.resposta !== 'nao') return;
          const nr = r.risco || 'baixo';
          if (maxRisco === null || nivelOrd[nr] > nivelOrd[maxRisco]) maxRisco = nr;
        });

        if (!maxRisco) return;
        const prio  = maxRisco === 'alto' ? 'imediata' : maxRisco === 'medio' ? 'alta' : 'media';
        const texto = (_RECS_BLOCO[chave] || {})[prio];
        if (texto) recs.push({ prioridade: prio, texto });
      });

      const exps = av?.aep?.posto?.exposicoesEstruturadas || [];
      exps.forEach(e => {
        if (e.presente !== 'sim') return;
        const texto = _RECS_EXPOSICAO[e.id];
        if (!texto) return;
        const intN = { alta: 2, moderada: 1, baixa: 0 }[e.intensidade] || 0;
        const frqN = { continua: 2, intermitente: 1, ocasional: 0 }[e.frequencia] || 0;
        const prio = (intN + frqN) >= 4 ? 'imediata' : (intN + frqN) >= 2 ? 'alta' : 'media';
        recs.push({ prioridade: prio, texto });
      });

      const ordem = { imediata: 0, alta: 1, media: 2 };
      recs.sort((a, b) => (ordem[a.prioridade] ?? 2) - (ordem[b.prioridade] ?? 2));
      return recs;
    }
  };

  /* ── SVG brandmark Engenhalves ───────────────────────────── */
  const _SVG_E = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${w}" height="${h}" style="flex-shrink:0">
    <path fill="#0D47A1" d="M500 115C287.2 115 115 287.2 115 500S287.2 885 500 885c129.1 0 243.4-63.7 313.2-161.4H641.8C600.5 748.7 551.8 762 500 762c-144.7 0-262-117.3-262-262s117.3-262 262-262c51.8 0 100.5 13.3 141.8 38.4h171.4C743.4 178.7 629.1 115 500 115z"/>
    <path fill="#0D47A1" d="M300 333H732L795 426H300Z"/>
    <path fill="#0D47A1" d="M248 454H752L695 546H248Z"/>
    <path fill="#0D47A1" d="M300 574H795L732 667H300Z"/>
  </svg>`;

  /* ── Config de marca (Engenhalves / Kalprevi) ─────────── */
  const _EMPRESAS_AEP = {
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
        ${_SVG_E(28, 28)}
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

  /* ══════════════════════════════════════════════════════════
     SHELL E NAVEGAÇÃO
  ══════════════════════════════════════════════════════════ */

  function renderizar(secao) {
    _secaoAtual = secao || _secaoAtual;
    const tela = document.getElementById('tela-aep');

    const abasHTML = SECOES.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-secao="${s.id}"
              onclick="ModuloAEP.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');

    tela.innerHTML = `
      <nav class="subnav-abas" id="subnav-aep">${abasHTML}</nav>
      <div id="aep-conteudo"></div>
    `;

    _renderizarConteudo(_secaoAtual);
  }

  function trocarSecao(secao) {
    _salvarSecaoAtual();
    _secaoAtual = secao;

    document.querySelectorAll('#subnav-aep .aba-bloco').forEach(btn => {
      btn.classList.toggle('ativa', btn.dataset.secao === secao);
    });

    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('aep-conteudo');
    if (!el) return;

    if (secao === 'identificacao') {
      ModuloIdentificacao.renderizar('aep-conteudo');
      ModuloIdentificacao.carregar(App.obterAvaliacaoAtual());
    } else if (secao === 'posto') {
      el.innerHTML = _htmlPosto();
      _carregarPosto();
    } else if (secao === 'checklist') {
      el.innerHTML = _htmlChecklist();
      if (typeof ConsultaAEP !== 'undefined') setTimeout(ConsultaAEP.verificarStatus, 500);
    } else if (secao === 'analise') {
      el.innerHTML = _htmlAnalise();
      _carregarAnalise();
    } else if (secao === 'relatorio') {
      el.innerHTML = _htmlRelatorioAEP();
      window.addEventListener('beforeprint', _sincronizarMarcaAEP);
    }
  }

  function _salvarSecaoAtual() {
    if (_secaoAtual === 'identificacao') {
      ModuloIdentificacao.salvarSilencioso();
    } else if (_secaoAtual === 'posto') {
      _salvarPosto();
    } else if (_secaoAtual === 'analise') {
      _salvarAnalise();
    }
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: POSTO DE TRABALHO
  ══════════════════════════════════════════════════════════ */

  function _pillStyle(presente, val) {
    const isActive = presente === val;
    if (!isActive) return 'background:var(--fundo);color:var(--texto-sec);border:1px solid var(--borda)';
    if (val === 'sim') return 'background:#0D47A1;color:#fff;border:1px solid #0D47A1';
    if (val === 'nao') return 'background:#555;color:#fff;border:1px solid #555';
    return 'background:#444;color:#fff;border:1px solid #444';
  }

  function _htmlExposicaoRow(def, e) {
    const presente  = e?.presente || '';
    const detVisible = presente === 'sim';

    return `
      <div style="padding:var(--s3) 0;border-bottom:1px solid var(--borda)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--s2);flex-wrap:wrap">
          <span style="font-size:var(--txt-sm);flex:1;min-width:140px">${def.label}</span>
          <div style="display:flex;gap:var(--s1);flex-shrink:0">
            ${['sim','nao','na'].map(v => `
              <button id="pill-${v}-${def.id}"
                      onclick="ModuloAEP.onExpChange('${def.id}','presente','${v}')"
                      style="padding:4px 10px;border-radius:var(--r2);font-size:var(--txt-xs);font-weight:700;cursor:pointer;transition:all .15s;${_pillStyle(presente, v)}">
                ${v === 'sim' ? 'SIM' : v === 'nao' ? 'NÃO' : 'N/A'}
              </button>
            `).join('')}
          </div>
        </div>
        <div id="exp-det-${def.id}" ${detVisible ? '' : 'class="oculto"'}
             style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--s2);margin-top:var(--s2)">
          <div>
            <label style="font-size:var(--txt-xs);color:var(--texto-sec);display:block;margin-bottom:2px">Intensidade</label>
            <select onchange="ModuloAEP.onExpChange('${def.id}','intensidade',this.value)" style="width:100%;font-size:var(--txt-xs)">
              <option value="">—</option>
              <option value="baixa"    ${e?.intensidade==='baixa'    ? 'selected' : ''}>Baixa</option>
              <option value="moderada" ${e?.intensidade==='moderada' ? 'selected' : ''}>Moderada</option>
              <option value="alta"     ${e?.intensidade==='alta'     ? 'selected' : ''}>Alta</option>
            </select>
          </div>
          <div>
            <label style="font-size:var(--txt-xs);color:var(--texto-sec);display:block;margin-bottom:2px">Frequência</label>
            <select onchange="ModuloAEP.onExpChange('${def.id}','frequencia',this.value)" style="width:100%;font-size:var(--txt-xs)">
              <option value="">—</option>
              <option value="ocasional"    ${e?.frequencia==='ocasional'    ? 'selected' : ''}>Ocasional</option>
              <option value="intermitente" ${e?.frequencia==='intermitente' ? 'selected' : ''}>Intermitente</option>
              <option value="continua"     ${e?.frequencia==='continua'     ? 'selected' : ''}>Contínua</option>
            </select>
          </div>
          <div>
            <label style="font-size:var(--txt-xs);color:var(--texto-sec);display:block;margin-bottom:2px">Duração/Turno</label>
            <select onchange="ModuloAEP.onExpChange('${def.id}','duracao',this.value)" style="width:100%;font-size:var(--txt-xs)">
              <option value="">—</option>
              <option value="<1h"   ${e?.duracao==='<1h'   ? 'selected' : ''}>&lt;1h</option>
              <option value="1h-3h" ${e?.duracao==='1h-3h' ? 'selected' : ''}>1h – 3h</option>
              <option value="3h-6h" ${e?.duracao==='3h-6h' ? 'selected' : ''}>3h – 6h</option>
              <option value=">6h"   ${e?.duracao==='>6h'   ? 'selected' : ''}>&gt;6h</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  function _htmlPosto() {
    const av  = App.obterAvaliacaoAtual();
    const p   = av?.aep?.posto || {};
    const getExp = id => (p.exposicoesEstruturadas || []).find(e => e.id === id);

    const perfisOpts = PERFIS_POSTO.map(pf => `
      <option value="${pf.id}" ${p.perfilPosto === pf.id ? 'selected' : ''}>${pf.label}</option>
    `).join('');

    const exposicoesHTML = EXPOSICOES.map(def => _htmlExposicaoRow(def, getExp(def.id))).join('');

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>🏭</span>
          <span>Caracterize o posto de trabalho avaliado. Essas informações complementam
          o checklist e alimentam o motor de criticidade automática.</span>
        </div>

        <!-- Análise completa com IA -->
        <div style="margin:var(--s4) 0;padding:var(--s4);border:2px dashed #0D47A1;border-radius:var(--r3);text-align:center;background:rgba(13,71,161,.06)">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:var(--s2)">
            📷 Análise Completa com IA
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Fotografe o posto → a IA preenche automaticamente todos os campos:<br>
            perfil, tipo de atividade, ferramentas, layout, atividade real e exposições.
          </p>
          <button class="btn btn-primario" onclick="ClaudeVision.analisarCompleto()"
                  style="font-size:var(--txt-base);padding:var(--s3) var(--s5)">
            📷 Fotografar e Analisar Posto
          </button>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Perfil e Organização do Posto</div>

          <div class="grupo-campo">
            <label for="posto-perfil">Perfil do Posto de Trabalho</label>
            <select id="posto-perfil">
              <option value="">Selecione o perfil...</option>
              ${perfisOpts}
            </select>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="posto-tipo-atividade">Tipo de Atividade</label>
              <select id="posto-tipo-atividade">
                <option value="">Selecione...</option>
                <option value="sentado"   ${p.tipoAtividade === 'sentado'   ? 'selected' : ''}>Sentado</option>
                <option value="em_pe"     ${p.tipoAtividade === 'em_pe'     ? 'selected' : ''}>Em pé</option>
                <option value="alternado" ${p.tipoAtividade === 'alternado' ? 'selected' : ''}>Alternado (sentado/em pé)</option>
                <option value="variado"   ${p.tipoAtividade === 'variado'   ? 'selected' : ''}>Variado / Dinâmico</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="posto-turno">Turno de Trabalho</label>
              <select id="posto-turno">
                <option value="">Selecione...</option>
                <option value="diurno"     ${p.turno === 'diurno'     ? 'selected' : ''}>Diurno</option>
                <option value="vespertino" ${p.turno === 'vespertino' ? 'selected' : ''}>Vespertino</option>
                <option value="noturno"    ${p.turno === 'noturno'    ? 'selected' : ''}>Noturno</option>
                <option value="misto"      ${p.turno === 'misto'      ? 'selected' : ''}>Misto / Revezamento</option>
              </select>
            </div>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="posto-ciclo">Duração do Ciclo de Trabalho</label>
              <input type="text" id="posto-ciclo" placeholder="Ex.: 45 segundos, 8 min"
                     value="${p.cicloTrabalho || ''}">
            </div>
            <div class="grupo-campo">
              <label for="posto-ciclos-hora">Ciclos por Hora (estimativa)</label>
              <input type="number" id="posto-ciclos-hora" placeholder="Ex.: 60"
                     value="${p.ciclosHora || ''}" min="0">
            </div>
          </div>

          <div class="grupo-campo">
            <label for="posto-ferramentas">Principais Ferramentas e Equipamentos</label>
            <textarea id="posto-ferramentas" rows="3"
              placeholder="Liste as ferramentas, máquinas e equipamentos usados nesta função..."
            >${p.ferramentas || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1)">
              <label for="posto-layout" style="margin:0">Descrição do Layout do Posto</label>
              <button id="cv-btn-posto-layout"
                      onclick="ClaudeVision.analisar('posto-layout','layout')"
                      title="Fotografar o posto — IA descreve o layout"
                      style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--r2);border:1px solid var(--borda);background:var(--fundo);color:var(--texto-sec);cursor:pointer;white-space:nowrap">
                📷 IA
              </button>
            </div>
            <textarea id="posto-layout" rows="3"
              placeholder="Descreva o arranjo físico do posto: bancada, cadeira, monitor, materiais..."
            >${p.layout || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Descrição da Atividade Real</div>
          <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
            <span>ℹ️</span>
            <span>Registre o que o trabalhador <strong>efetivamente faz</strong>, não o que deveria fazer.
            Inclua variações, imprevistos e adaptações observadas.</span>
          </div>
          <div class="grupo-campo">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1)">
              <span style="font-size:var(--txt-sm);color:var(--texto-sec)">Descrição da atividade</span>
              <button id="cv-btn-posto-atividade-real"
                      onclick="ClaudeVision.analisar('posto-atividade-real','atividadeReal')"
                      title="Fotografar o trabalhador em atividade — IA descreve as posturas e movimentos"
                      style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--r2);border:1px solid var(--borda);background:var(--fundo);color:var(--texto-sec);cursor:pointer;white-space:nowrap">
                📷 IA
              </button>
            </div>
            <textarea id="posto-atividade-real" rows="5"
              placeholder="Descreva com base em observação direta: sequência de tarefas, posturas assumidas, esforços realizados, interações com equipamentos e outros trabalhadores..."
            >${p.atividadeReal || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s2)">Exposições Identificadas</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Para cada fator, indique se está presente (SIM), ausente (NÃO) ou não aplicável (N/A).
            Quando presente, detalhe intensidade, frequência e duração.
          </p>
          <div id="exposicoes-lista">
            ${exposicoesHTML}
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Evidências e Observações</div>
          <div class="grupo-campo">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1)">
              <label for="posto-evidencias" style="margin:0">Observações Técnicas e Evidências</label>
              <button id="cv-btn-posto-evidencias"
                      onclick="ClaudeVision.analisar('posto-evidencias','evidencias')"
                      title="Fotografar evidência — IA descreve a não conformidade"
                      style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--r2);border:1px solid var(--borda);background:var(--fundo);color:var(--texto-sec);cursor:pointer;white-space:nowrap">
                📷 IA
              </button>
            </div>
            <textarea id="posto-evidencias" rows="4"
              placeholder="Registre fotos tiradas (nomes/referências), medições realizadas, relatos dos trabalhadores, observações técnicas adicionais..."
            >${p.evidencias || ''}</textarea>
          </div>
          <div class="aviso-tecnico info" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--s2)">
            <div style="display:flex;gap:var(--s2);flex:1">
              <span>📷</span>
              <span>Os botões <strong>📷 IA</strong> fotografam e descrevem automaticamente. Fotos também podem ser anexadas ao relatório final.</span>
            </div>
            <button onclick="ClaudeVision.configurarChave()"
                    style="font-size:var(--txt-xs);padding:2px 8px;border-radius:var(--r2);border:1px solid var(--borda);background:transparent;color:var(--texto-sec);cursor:pointer;flex-shrink:0">
              ⚙ Chave IA
            </button>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloAEP.salvarPosto()">
          💾 Salvar Caracterização do Posto
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _carregarPosto() { /* dados já embutidos no HTML via _htmlPosto() */ }

  function _salvarPosto() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep) av.aep = {};
    if (!av.aep.posto) av.aep.posto = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';

    av.aep.posto.perfilPosto    = get('posto-perfil');
    av.aep.posto.tipoAtividade  = get('posto-tipo-atividade');
    av.aep.posto.turno          = get('posto-turno');
    av.aep.posto.cicloTrabalho  = get('posto-ciclo');
    av.aep.posto.ciclosHora     = get('posto-ciclos-hora');
    av.aep.posto.ferramentas    = get('posto-ferramentas');
    av.aep.posto.layout         = get('posto-layout');
    av.aep.posto.atividadeReal  = get('posto-atividade-real');
    av.aep.posto.evidencias     = get('posto-evidencias');

    /* Deriva lista simples de exposições presentes (compatibilidade com relatório) */
    const expEstr = av.aep.posto.exposicoesEstruturadas || [];
    av.aep.posto.exposicoes = expEstr
      .filter(e => e.presente === 'sim')
      .map(e => EXPOSICOES.find(x => x.id === e.id)?.label || e.id);
  }

  function salvarPosto() {
    _salvarPosto();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Posto salvo', 'sucesso'); } catch(e) {}
  }

  function onExpChange(expId, campo, valor) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep) av.aep = {};
    if (!av.aep.posto) av.aep.posto = {};
    if (!av.aep.posto.exposicoesEstruturadas) av.aep.posto.exposicoesEstruturadas = [];

    let entry = av.aep.posto.exposicoesEstruturadas.find(e => e.id === expId);
    if (!entry) {
      entry = { id: expId, presente: '', intensidade: '', frequencia: '', duracao: '' };
      av.aep.posto.exposicoesEstruturadas.push(entry);
    }
    entry[campo] = valor;

    if (campo === 'presente') {
      const det = document.getElementById(`exp-det-${expId}`);
      if (det) det.classList.toggle('oculto', valor !== 'sim');

      ['sim','nao','na'].forEach(v => {
        const btn = document.getElementById(`pill-${v}-${expId}`);
        if (!btn) return;
        if (v === valor) {
          const cor = v === 'sim' ? '#0D47A1' : v === 'nao' ? '#555' : '#444';
          btn.style.background = cor;
          btn.style.color      = '#fff';
          btn.style.borderColor = cor;
        } else {
          btn.style.background  = 'var(--fundo)';
          btn.style.color       = 'var(--texto-sec)';
          btn.style.borderColor = 'var(--borda)';
        }
      });
    }

    try { Storage.salvar(av); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: CHECKLIST NR-17
  ══════════════════════════════════════════════════════════ */

  function _htmlChecklist() {
    const av = App.obterAvaliacaoAtual();

    const abasHTML = ORDEM_BLOCOS.map(chave => {
      const bloco = BLOCOS[chave];
      return `
        <button class="aba-bloco ${chave === _blocoAtivo ? 'ativa' : ''}"
                data-bloco="${chave}"
                onclick="ModuloAEP.trocarBloco('${chave}')">
          <span>${bloco.icone}</span>
          <span>${bloco.titulo.split(' ')[0]}</span>
        </button>
      `;
    }).join('');

    return `
      <nav class="subnav-abas" id="subnav-checklist" style="top:calc(var(--h-header) + var(--h-subnav))">
        ${abasHTML}
      </nav>

      <!-- Card: Enviar Consulta por Link -->
      <div class="container">
        <div class="card" style="margin-top:var(--s4);border-color:var(--primario)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--s2);margin-bottom:var(--s3)">
            <div class="card-titulo" style="margin:0">📨 Consulta Remota</div>
            <button id="btn-importar-consulta"
                    onclick="ConsultaAEP.importarRespostas()"
                    style="font-size:var(--txt-xs);padding:4px 10px;border-radius:var(--r2);
                           border:1px solid var(--borda);background:var(--fundo);
                           color:var(--texto-sec);cursor:pointer">
              📥 Importar Respostas
            </button>
          </div>
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)">
            Envie um link para cada responsável preencher os itens pertinentes, sem precisar de login.
            Quando responderem, clique em <strong>Importar Respostas</strong>.
          </div>
          <div id="consulta-status-badge"
               style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)"></div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
            <button id="btn-consulta-lider"
                    onclick="ConsultaAEP.abrirConsulta('lider')"
                    class="btn btn-secundario" style="flex:1;font-size:var(--txt-xs)">
              👷 Líder de Setor
            </button>
            <button id="btn-consulta-rh"
                    onclick="ConsultaAEP.abrirConsulta('rh')"
                    class="btn btn-secundario" style="flex:1;font-size:var(--txt-xs)">
              🧑‍💼 RH
            </button>
            <button id="btn-consulta-tecnico"
                    onclick="ConsultaAEP.abrirConsulta('tecnico')"
                    class="btn btn-secundario" style="flex:1;font-size:var(--txt-xs)">
              ⚙️ Técnico / SESMT
            </button>
          </div>
        </div>
      </div>

      <div id="checklist-bloco-conteudo">
        ${_htmlBloco(_blocoAtivo, av)}
      </div>
    `;
  }

  function _htmlBloco(chave, av) {
    const bloco = BLOCOS[chave];
    const respostas = av?.aep?.[chave] || {};
    const resumo = _calcularResumoBloco(chave, respostas, bloco.itens);

    const itensHTML = bloco.itens.map((item, idx) => {
      const resp = respostas[item.id] || {};
      const classeItem = resp.resposta === 'sim' ? 'conforme' : resp.resposta === 'nao' ? 'nao-conforme' : resp.resposta === 'na' ? 'nao-aplica' : '';

      return `
        <div class="item-checklist ${classeItem}" id="item-${item.id}">
          <div class="item-num">Item ${String(idx + 1).padStart(2, '0')} de ${bloco.itens.length}</div>
          <div class="item-texto">${item.texto}</div>
          <div class="opcoes-resposta">
            ${['sim','nao','na'].map(v => `
              <div class="radio-btn opcao-${v === 'na' ? 'na' : v}">
                <input type="radio" name="r_${item.id}" id="${v}_${item.id}" value="${v}"
                  ${resp.resposta === v ? 'checked' : ''}
                  onchange="ModuloAEP.onRespostaChange('${chave}','${item.id}','${v}')">
                <label for="${v}_${item.id}">${v === 'sim' ? '✓ Sim' : v === 'nao' ? '✗ Não' : '— N/A'}</label>
              </div>
            `).join('')}
          </div>
          <div class="secao-risco ${resp.resposta === 'nao' ? '' : 'oculto'}" id="risco_${item.id}">
            <div style="font-size:var(--txt-sm);font-weight:600;color:var(--texto-sec);margin-bottom:var(--s2)">
              Classificar o risco identificado:
            </div>
            <div class="opcoes-risco">
              ${['baixo','medio','alto'].map(r => `
                <div class="radio-btn opcao-${r}">
                  <input type="radio" name="risco_${item.id}" id="r${r[0]}_${item.id}" value="${r}"
                    ${resp.risco === r ? 'checked' : ''}
                    onchange="ModuloAEP.onRiscoChange('${chave}','${item.id}','${r}')">
                  <label for="r${r[0]}_${item.id}">${r === 'baixo' ? '🟢 Baixo' : r === 'medio' ? '🟡 Médio' : '🔴 Alto'}</label>
                </div>
              `).join('')}
            </div>
            <textarea id="obs_${item.id}" placeholder="Observação técnica (opcional)" rows="2"
              onblur="ModuloAEP.onObsChange('${chave}','${item.id}',this.value)"
            >${resp.observacao || ''}</textarea>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="container" style="padding-top:var(--s4)">
        <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
          <span>${bloco.icone}</span>
          <span><strong>${bloco.titulo}</strong> — Responda com base na inspeção do posto de trabalho.</span>
        </div>
        <div class="card" style="padding:var(--s3) var(--s4); margin-bottom:var(--s4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s2)">
            <span style="font-size:var(--txt-sm);color:var(--texto-sec)">
              Respondidos: <strong>${resumo.respondidos}</strong> / ${bloco.itens.length}
            </span>
            <div style="display:flex;gap:var(--s2)">
              ${resumo.alto  ? `<span class="badge badge-alto">${resumo.alto} Alto</span>` : ''}
              ${resumo.medio ? `<span class="badge badge-medio">${resumo.medio} Médio</span>` : ''}
              ${resumo.baixo ? `<span class="badge badge-baixo">${resumo.baixo} Baixo</span>` : ''}
            </div>
          </div>
          <div class="barra-progresso">
            <div class="barra-progresso-fill" style="width:${(resumo.respondidos/bloco.itens.length)*100}%"></div>
          </div>
        </div>
        ${itensHTML}
        <button class="btn-bloco" onclick="ModuloAEP.salvarBloco('${chave}')">
          💾 Salvar ${bloco.titulo}
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function trocarBloco(chave) {
    _salvarBlocoSilencioso(_blocoAtivo);
    _blocoAtivo = chave;
    document.querySelectorAll('#subnav-checklist .aba-bloco').forEach(btn => {
      btn.classList.toggle('ativa', btn.dataset.bloco === chave);
    });
    const av = App.obterAvaliacaoAtual();
    document.getElementById('checklist-bloco-conteudo').innerHTML = _htmlBloco(chave, av);
    window.scrollTo({ top: 0 });
  }

  function onRespostaChange(blocoChave, itemId, valor) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep[blocoChave]) av.aep[blocoChave] = {};
    if (!av.aep[blocoChave][itemId]) av.aep[blocoChave][itemId] = {};
    av.aep[blocoChave][itemId].resposta = valor;
    const secaoRisco = document.getElementById(`risco_${itemId}`);
    if (secaoRisco) secaoRisco.classList.toggle('oculto', valor !== 'nao');
    const divItem = document.getElementById(`item-${itemId}`);
    if (divItem) {
      divItem.className = 'item-checklist';
      if (valor === 'sim') divItem.classList.add('conforme');
      if (valor === 'nao') divItem.classList.add('nao-conforme');
      if (valor === 'na')  divItem.classList.add('nao-aplica');
    }
    if (valor !== 'nao') delete av.aep[blocoChave][itemId].risco;
  }

  function onRiscoChange(blocoChave, itemId, nivel) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep[blocoChave]) av.aep[blocoChave] = {};
    if (!av.aep[blocoChave][itemId]) av.aep[blocoChave][itemId] = {};
    av.aep[blocoChave][itemId].risco = nivel;
  }

  function onObsChange(blocoChave, itemId, texto) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep[blocoChave]) av.aep[blocoChave] = {};
    if (!av.aep[blocoChave][itemId]) av.aep[blocoChave][itemId] = {};
    av.aep[blocoChave][itemId].observacao = texto.trim();
  }

  function salvarBloco(chave) {
    _salvarBlocoSilencioso(chave);
    App.mostrarToast(`"${BLOCOS[chave].titulo}" salvo`, 'sucesso');
  }

  function _salvarBlocoSilencioso(chave) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    try { Storage.salvar(av); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: ANÁLISE TÉCNICA E CONCLUSÃO
  ══════════════════════════════════════════════════════════ */

  function _htmlRecsList(recs) {
    if (!recs.length) {
      return `<p style="font-size:var(--txt-sm);color:var(--texto-sec);padding:var(--s2) 0">
        Preencha o checklist e as exposições do posto para gerar recomendações automáticas.
      </p>`;
    }
    const prioLabel = { imediata: '🚨 Imediata', alta: '🔴 Alta', media: '🟡 Média' };
    const prioColor = { imediata: '#b71c1c', alta: '#f44336', media: '#ff9800' };
    return recs.map(r => `
      <div style="display:flex;gap:var(--s2);align-items:flex-start;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
        <span style="font-size:var(--txt-xs);font-weight:700;color:${prioColor[r.prioridade]||'#888'};white-space:nowrap;min-width:80px">${prioLabel[r.prioridade]||r.prioridade}</span>
        <span style="font-size:var(--txt-sm)">${r.texto}</span>
      </div>
    `).join('');
  }

  function _htmlAnalise() {
    const av  = App.obterAvaliacaoAtual();
    const a   = av?.aep?.analise || {};

    const score        = MOTOR_AEP.calcularScore(av);
    const nivelSug     = MOTOR_AEP.sugerirNivel(score.valor);
    const corScore     = MOTOR_AEP.corNivel(nivelSug);
    const nivelLabel   = { baixo: '🟢 Baixo', medio: '🟡 Médio', alto: '🔴 Alto', critico: '🚨 Crítico' };
    const recs         = MOTOR_AEP.gerarRecomendacoes(av);

    const domLabel = { fisica: 'Física', organizacional: 'Organizacional', cognitiva: 'Cognitiva', psicossocial: 'Psicossocial' };
    const componentesHTML = ['fisica','organizacional','cognitiva','psicossocial'].map(dom => {
      const val = Math.round((score.componentes[dom] || 0) * 100);
      return `
        <div style="margin-bottom:var(--s2)">
          <div style="display:flex;justify-content:space-between;font-size:var(--txt-xs);margin-bottom:3px">
            <span style="color:var(--texto-sec)">${domLabel[dom]}</span>
            <span id="score-pct-${dom}" style="font-weight:600">${val}%</span>
          </div>
          <div style="background:var(--borda);border-radius:99px;height:5px">
            <div id="score-bar-${dom}" style="background:${corScore};border-radius:99px;height:5px;width:${val}%;transition:width .3s"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="container">
        <!-- Botão principal: IA preenche tudo -->
        <button onclick="ModuloAEP.gerarAnaliseCompleta()"
                style="width:100%;margin-top:var(--s4);padding:var(--s4) var(--s3);
                       background:linear-gradient(135deg,#3949ab,#1565c0);
                       color:#fff;font-size:var(--txt-base);font-weight:700;
                       border:none;border-radius:var(--raio);cursor:pointer;
                       display:flex;align-items:center;justify-content:center;gap:var(--s3)">
          <span style="font-size:1.4rem">🤖</span>
          <div>
            <div>Gerar Análise Completa com IA</div>
            <div style="font-size:var(--txt-xs);font-weight:400;opacity:.85;margin-top:2px">
              Preenche automaticamente todos os campos com base no checklist e exposições
            </div>
          </div>
        </button>

        <!-- Score de criticidade -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
            <div class="card-titulo" style="margin:0">Score de Criticidade</div>
            <button onclick="ModuloAEP.recalcularScore()"
                    style="font-size:var(--txt-xs);padding:4px 10px;border-radius:var(--r2);border:1px solid var(--borda);background:var(--fundo);color:var(--texto-sec);cursor:pointer">
              🔄 Recalcular
            </button>
          </div>

          <div style="display:flex;align-items:center;gap:var(--s5);flex-wrap:wrap;margin-bottom:var(--s4)">
            <div style="text-align:center;flex-shrink:0">
              <div id="score-valor" style="font-size:3rem;font-weight:900;line-height:1;color:${corScore}">${score.valor}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">/&nbsp;100</div>
              <div id="score-nivel-sugerido" style="margin-top:var(--s2);font-weight:700;font-size:var(--txt-sm);color:${corScore}">
                ${nivelLabel[nivelSug]}
              </div>
            </div>
            <div style="flex:1;min-width:180px">
              ${componentesHTML}
            </div>
          </div>

          <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
            <button class="btn btn-secundario" onclick="ModuloAEP.aplicarNivelSugerido()"
                    style="font-size:var(--txt-sm)">
              ✅ Usar nível sugerido
            </button>
          </div>
        </div>

        <!-- Recomendações automáticas -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
            <div class="card-titulo" style="margin:0">Recomendações Automáticas</div>
            <button onclick="ModuloAEP.usarRecomendacoesAuto()"
                    style="font-size:var(--txt-xs);padding:4px 10px;border-radius:var(--r2);border:1px solid var(--borda);background:var(--fundo);color:var(--texto-sec);cursor:pointer">
              ✅ Inserir no campo
            </button>
          </div>
          <div id="recs-auto-lista">${_htmlRecsList(recs)}</div>
        </div>

        <!-- Análise técnica manual -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Análise Técnica</div>
          <div class="grupo-campo">
            <label for="an-analise">Análise Técnica Geral</label>
            <textarea id="an-analise" rows="6"
              placeholder="Descreva os principais achados ergonômicos, correlacionando as não conformidades identificadas com os riscos para a saúde dos trabalhadores..."
            >${a.analiseTecnica || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Classificação de Risco Ergonômico</div>

          <div class="grupo-campo">
            <label for="an-nivel-risco">Nível de Risco Ergonômico Geral</label>
            <select id="an-nivel-risco">
              <option value="">Selecione...</option>
              <option value="baixo"   ${a.nivelRiscoGeral === 'baixo'   ? 'selected' : ''}>🟢 Baixo — Situação adequada, ações de melhoria opcionais</option>
              <option value="medio"   ${a.nivelRiscoGeral === 'medio'   ? 'selected' : ''}>🟡 Médio — Não conformidades identificadas, ação planejada necessária</option>
              <option value="alto"    ${a.nivelRiscoGeral === 'alto'    ? 'selected' : ''}>🔴 Alto — Risco significativo, ação corretiva prioritária</option>
              <option value="critico" ${a.nivelRiscoGeral === 'critico' ? 'selected' : ''}>🚨 Crítico — Risco iminente, intervenção imediata necessária</option>
            </select>
          </div>

          <div class="grupo-campo">
            <label for="an-justificativa">Justificativa do Nível de Risco</label>
            <textarea id="an-justificativa" rows="3"
              placeholder="Justifique o nível de risco atribuído com base nas evidências coletadas..."
            >${a.justificativaRisco || ''}</textarea>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="an-prioridade">Prioridade de Intervenção</label>
              <select id="an-prioridade">
                <option value="">Selecione...</option>
                <option value="imediata" ${a.prioridadeIntervencao === 'imediata' ? 'selected' : ''}>Imediata (até 30 dias)</option>
                <option value="curto"    ${a.prioridadeIntervencao === 'curto'    ? 'selected' : ''}>Curto prazo (até 90 dias)</option>
                <option value="medio"    ${a.prioridadeIntervencao === 'medio'    ? 'selected' : ''}>Médio prazo (até 6 meses)</option>
                <option value="longo"    ${a.prioridadeIntervencao === 'longo'    ? 'selected' : ''}>Longo prazo (até 1 ano)</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="an-prazo-retorno">Prazo de Reavaliação</label>
              <input type="date" id="an-prazo-retorno" value="${a.prazoRetorno || ''}">
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Recomendações Técnicas</div>
          <div class="grupo-campo">
            <textarea id="an-recomendacoes" rows="6"
              placeholder="Liste as recomendações técnicas prioritárias, em ordem de urgência. Inclua medidas de engenharia, organizacionais e administrativas..."
            >${a.recomendacoes || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Indicação Técnica</div>

          <label class="check-item" style="cursor:pointer">
            <input type="checkbox" id="an-indica-aet" ${a.indicaAET ? 'checked' : ''}
                   onchange="ModuloAEP.onAETChange(this.checked)">
            <div class="check-box">✓</div>
            <span>Esta AEP indica necessidade de <strong>AET (Análise Ergonômica do Trabalho)</strong></span>
          </label>

          <div id="div-justificativa-aet" class="${a.indicaAET ? '' : 'oculto'}" style="margin-top:var(--s4)">
            <div class="grupo-campo">
              <label for="an-justificativa-aet">Justificativa para indicação de AET</label>
              <textarea id="an-justificativa-aet" rows="3"
                placeholder="Descreva os fatores que fundamentam a necessidade de AET..."
              >${a.justificativaAET || ''}</textarea>
            </div>
          </div>

          <div class="grupo-campo" style="margin-top:var(--s4)">
            <label for="an-responsavel">Responsável pelo Acompanhamento</label>
            <input type="text" id="an-responsavel" placeholder="Nome ou setor responsável"
                   value="${a.responsavelAcompanhamento || ''}">
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloAEP.salvarAnalise()">
          💾 Salvar Análise e Conclusão
        </button>

        <!-- Gerar Plano de Ação -->
        <button onclick="ModuloAEP.gerarPlanoDeAcao()"
                style="width:100%;margin-top:var(--s3);padding:var(--s3);
                       background:var(--fundo-card);border:1px solid var(--primario);
                       color:var(--primario);font-size:var(--txt-sm);font-weight:700;
                       border-radius:var(--raio);cursor:pointer;
                       display:flex;align-items:center;justify-content:center;gap:var(--s2)">
          📋 Gerar Plano de Ação a partir das Recomendações
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _carregarAnalise() { /* dados já embutidos no HTML via _htmlAnalise() */ }

  function onAETChange(checked) {
    document.getElementById('div-justificativa-aet')?.classList.toggle('oculto', !checked);
    /* Salva imediatamente para garantir persistência ao gerar o relatório do projeto */
    const av = App.obterAvaliacaoAtual();
    if (av) {
      if (!av.aep) av.aep = {};
      if (!av.aep.analise) av.aep.analise = {};
      if (!av.relatorio) av.relatorio = {};
      av.aep.analise.indicaAET  = checked;
      av.relatorio.necessitaAET = checked;
      try { Storage.salvar(av); } catch(e) {}
    }
  }

  function _salvarAnalise() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep) av.aep = {};
    if (!av.aep.analise) av.aep.analise = {};
    if (!av.relatorio) av.relatorio = { conclusao: '', necessitaAET: false, justificativaAET: '' };
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.aep.analise.analiseTecnica            = get('an-analise');
    av.aep.analise.nivelRiscoGeral           = get('an-nivel-risco');
    av.aep.analise.justificativaRisco        = get('an-justificativa');
    av.aep.analise.prioridadeIntervencao     = get('an-prioridade');
    av.aep.analise.prazoRetorno              = get('an-prazo-retorno');
    av.aep.analise.recomendacoes             = get('an-recomendacoes');
    av.aep.analise.indicaAET                 = document.getElementById('an-indica-aet')?.checked || false;
    av.aep.analise.justificativaAET          = get('an-justificativa-aet');
    av.aep.analise.responsavelAcompanhamento = get('an-responsavel');
    av.relatorio.necessitaAET     = av.aep.analise.indicaAET;
    av.relatorio.justificativaAET = av.aep.analise.justificativaAET;
  }

  function salvarAnalise() {
    _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Análise salva', 'sucesso'); } catch(e) {}
  }

  function recalcularScore() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const score    = MOTOR_AEP.calcularScore(av);
    const nivel    = MOTOR_AEP.sugerirNivel(score.valor);
    const cor      = MOTOR_AEP.corNivel(nivel);
    const nivelLabel = { baixo: '🟢 Baixo', medio: '🟡 Médio', alto: '🔴 Alto', critico: '🚨 Crítico' };

    const valorEl = document.getElementById('score-valor');
    if (valorEl) { valorEl.textContent = score.valor; valorEl.style.color = cor; }

    const nivelEl = document.getElementById('score-nivel-sugerido');
    if (nivelEl) { nivelEl.textContent = nivelLabel[nivel] || nivel; nivelEl.style.color = cor; }

    ['fisica','organizacional','cognitiva','psicossocial'].forEach(dom => {
      const val = Math.round((score.componentes[dom] || 0) * 100);
      const barEl = document.getElementById(`score-bar-${dom}`);
      const pctEl = document.getElementById(`score-pct-${dom}`);
      if (barEl) { barEl.style.width = val + '%'; barEl.style.background = cor; }
      if (pctEl) pctEl.textContent = val + '%';
    });

    const recsEl = document.getElementById('recs-auto-lista');
    if (recsEl) recsEl.innerHTML = _htmlRecsList(MOTOR_AEP.gerarRecomendacoes(av));

    App.mostrarToast('Score recalculado', 'sucesso');
  }

  function aplicarNivelSugerido() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const score = MOTOR_AEP.calcularScore(av);
    const nivel = MOTOR_AEP.sugerirNivel(score.valor);
    const sel = document.getElementById('an-nivel-risco');
    if (sel) sel.value = nivel;
    App.mostrarToast('Nível aplicado: ' + nivel, 'sucesso');
  }

  function usarRecomendacoesAuto() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const recs = MOTOR_AEP.gerarRecomendacoes(av);
    if (!recs.length) {
      App.mostrarToast('Nenhuma recomendação gerada — preencha o checklist e exposições', 'info');
      return;
    }
    const grupos = { imediata: [], alta: [], media: [] };
    recs.forEach(r => (grupos[r.prioridade] || grupos.media).push(r.texto));

    let texto = '';
    if (grupos.imediata.length) {
      texto += 'AÇÃO IMEDIATA:\n';
      grupos.imediata.forEach(t => { texto += `• ${t}\n`; });
      texto += '\n';
    }
    if (grupos.alta.length) {
      texto += 'PRIORIDADE ALTA:\n';
      grupos.alta.forEach(t => { texto += `• ${t}\n`; });
      texto += '\n';
    }
    if (grupos.media.length) {
      texto += 'PRIORIDADE MÉDIA:\n';
      grupos.media.forEach(t => { texto += `• ${t}\n`; });
    }

    const textarea = document.getElementById('an-recomendacoes');
    if (textarea) textarea.value = texto.trim();
    App.mostrarToast('Recomendações inseridas', 'sucesso');
  }

  /* ══════════════════════════════════════════════════════════
     GERAÇÃO DO PLANO DE AÇÃO A PARTIR DAS RECOMENDAÇÕES
  ══════════════════════════════════════════════════════════ */

  function gerarPlanoDeAcao() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;

    /* Garante que a análise está salva antes de gerar o plano */
    salvarAnalise();

    const recs = MOTOR_AEP.gerarRecomendacoes(av);
    if (!recs.length) {
      App.mostrarToast('Nenhuma recomendação — preencha o checklist e as exposições primeiro', 'info');
      return;
    }

    if (!av.planoAcao) av.planoAcao = [];

    /* Prazo automático por prioridade */
    const hoje    = new Date();
    const addDias = n => { const d = new Date(hoje); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const diasMap = { imediata: 30, alta: 90, media: 180 };
    const prioMap = { imediata: 'alta', alta: 'alta', media: 'media' };

    let adicionadas = 0;
    recs.forEach(rec => {
      const jaExiste = av.planoAcao.some(a => a.descricao === rec.texto && a.origem === 'aep_motor');
      if (jaExiste) return;
      av.planoAcao.push({
        id:          Storage.gerarId('acao'),
        descricao:   rec.texto,
        prioridade:  prioMap[rec.prioridade] || 'media',
        prazo:       addDias(diasMap[rec.prioridade] || 90),
        responsavel: '',
        medida:      '',
        status:      'pendente',
        origem:      'aep_motor',
        criadaEm:    new Date().toISOString(),
      });
      adicionadas++;
    });

    try {
      Storage.salvar(av);
      const msg = adicionadas > 0
        ? `${adicionadas} ação(ões) adicionada(s) ao Plano — acesse a aba Plano para editar responsáveis e prazos`
        : 'Todas as recomendações já estão no Plano de Ação';
      App.mostrarToast(msg, adicionadas > 0 ? 'sucesso' : 'info');
    } catch (e) {
      App.mostrarToast('Erro ao salvar: ' + e.message, 'erro');
    }
  }

  /* ══════════════════════════════════════════════════════════
     GERAÇÃO AUTOMÁTICA DA ANÁLISE (IA)
  ══════════════════════════════════════════════════════════ */

  async function gerarAnaliseCompleta() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarParaAnalise();
      return;
    }

    _mostrarOverlayAnalise();
    try {
      const score = MOTOR_AEP.calcularScore(av);
      const nivel = MOTOR_AEP.sugerirNivel(score.valor);

      /* Nível de risco */
      const selNivel = document.getElementById('an-nivel-risco');
      if (selNivel) selNivel.value = nivel;

      /* Prioridade de intervenção derivada do nível */
      const prioMap = { baixo: 'longo', medio: 'medio', alto: 'curto', critico: 'imediata' };
      const selPrio = document.getElementById('an-prioridade');
      if (selPrio) selPrio.value = prioMap[nivel] || 'medio';

      /* Recomendações automáticas (reutiliza lógica existente) */
      usarRecomendacoesAuto();

      /* Contexto para a IA */
      const contexto = _construirContextoAnalise(av, score, nivel);

      /* Gera análise e justificativa via Claude */
      const textos = await ClaudeVision.gerarAnaliseTexto(contexto, nivel, score.valor);

      if (textos) {
        const taField   = document.getElementById('an-analise');
        const justField = document.getElementById('an-justificativa');
        if (taField   && textos.analiseTecnica) taField.value   = textos.analiseTecnica;
        if (justField && textos.justificativa)  justField.value = textos.justificativa;
      }

      salvarAnalise();
      App.mostrarToast('Análise preenchida automaticamente — revise e ajuste conforme necessário', 'sucesso');
    } catch (err) {
      if (err instanceof SyntaxError) {
        App.mostrarToast('Erro ao interpretar resposta da IA — tente novamente', 'erro');
      } else {
        App.mostrarToast('Erro ao gerar análise: ' + err.message, 'erro');
      }
    } finally {
      _ocultarOverlayAnalise();
    }
  }

  function _construirContextoAnalise(av, score, nivel) {
    const nivelPt = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };
    const domPt   = { fisica: 'Físico', organizacional: 'Organizacional', cognitiva: 'Cognitivo', psicossocial: 'Psicossocial' };
    const posto   = av?.aep?.posto || {};

    let ctx = `Função: ${av.funcao || '—'}\nSetor: ${av.setor || '—'}\n`;
    ctx += `Perfil do Posto: ${posto.perfilPosto || 'não informado'}\n`;
    ctx += `Tipo de Atividade: ${posto.tipoAtividade || 'não informado'}\n`;
    ctx += `Score de Criticidade: ${score.valor}/100 — Nível ${nivelPt[nivel] || nivel}\n`;
    ctx += `Componentes do Score:\n`;
    ['fisica', 'organizacional', 'cognitiva', 'psicossocial'].forEach(dom => {
      const val = Math.round((score.componentes[dom] || 0) * 100);
      ctx += `  ${domPt[dom]}: ${val}%\n`;
    });

    const naoConformes = obterNaoConformes(av);
    if (naoConformes.length) {
      ctx += `\nNão Conformidades identificadas no checklist (${naoConformes.length} itens):\n`;
      naoConformes.forEach(nc => {
        ctx += `[${nc.risco.toUpperCase()}] ${nc.blocoTitulo}: ${nc.itemTexto}\n`;
      });
    } else {
      ctx += '\nNenhuma não conformidade identificada no checklist.\n';
    }

    const exps = (posto.exposicoesEstruturadas || []).filter(e => e.presente === 'sim');
    if (exps.length) {
      ctx += `\nExposições ergonômicas presentes (${exps.length}):\n`;
      exps.forEach(e => {
        const def = EXPOSICOES.find(x => x.id === e.id);
        ctx += `${def?.label || e.id}: intensidade ${e.intensidade || '?'}, frequência ${e.frequencia || '?'}, duração ${e.duracao || '?'}\n`;
      });
    }

    if (posto.atividadeReal) ctx += `\nAtividade real observada: ${posto.atividadeReal}\n`;
    if (posto.evidencias)    ctx += `\nEvidências ergonômicas: ${posto.evidencias}\n`;

    return ctx;
  }

  function _mostrarOverlayAnalise() {
    if (document.getElementById('aep-analise-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="aep-analise-overlay" style="
        position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1500;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
        <style>@keyframes aep-spin{to{transform:rotate(360deg)}}</style>
        <div style="width:52px;height:52px;border:4px solid #fff;border-top-color:transparent;
                    border-radius:50%;animation:aep-spin .9s linear infinite"></div>
        <div style="color:#fff;font-size:16px;font-weight:700">Gerando análise técnica com IA…</div>
        <div style="color:#bbb;font-size:13px">Preenchendo todos os campos da análise</div>
      </div>
    `);
  }

  function _ocultarOverlayAnalise() {
    document.getElementById('aep-analise-overlay')?.remove();
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO AEP
  ══════════════════════════════════════════════════════════ */

  function _htmlRelatorioAEP() {
    const av       = App.obterAvaliacaoAtual();
    const riscos   = calcularRiscoGeral(av);
    const analise  = av?.aep?.analise || {};
    const posto    = av?.aep?.posto   || {};
    const score    = MOTOR_AEP.calcularScore(av);
    const nivelSug = MOTOR_AEP.sugerirNivel(score.valor);

    const NIVEL_LABEL = { baixo: '🟢 Baixo', medio: '🟡 Médio', alto: '🔴 Alto', critico: '🚨 Crítico' };
    const NIVEL_PRINT = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };

    const naoConformes = obterNaoConformes(av);
    const expsPresentes = (posto.exposicoesEstruturadas || []).filter(e => e.presente === 'sim');

    /* Número do laudo e data */
    _nrAEPAtual  = `AEP-${(av.empresa?.nome||'ERG').replace(/\s+/g,'').slice(0,4).toUpperCase()}-${new Date().getFullYear()}`;
    const _dataEmissao = _formatarData(new Date().toISOString().slice(0,10));
    const _responsavel = av.empresa?.responsavelTecnico || '';
    const _registro    = av.empresa?.registroProfissional || '';

    /* Resumo por bloco para a tabela */
    const blocoResumoHTML = ORDEM_BLOCOS.map(chave => {
      const bloco = BLOCOS[chave];
      const resp  = av?.aep?.[chave] || {};
      const r     = (() => {
        let resp2 = 0, nc = 0, alt = 0, med = 0, bx = 0;
        bloco.itens.forEach(item => {
          const rt = resp[item.id];
          if (rt?.resposta) resp2++;
          if (rt?.resposta === 'nao') {
            nc++;
            if (rt.risco === 'alto') alt++;
            else if (rt.risco === 'medio') med++;
            else bx++;
          }
        });
        return { resp: resp2, nc, alt, med, bx, total: bloco.itens.length };
      })();
      return `<tr>
        <td>${bloco.icone} ${bloco.titulo}</td>
        <td style="text-align:center">${r.resp}/${r.total}</td>
        <td style="text-align:center">${r.nc || '—'}</td>
        <td style="text-align:center">${r.alt || '—'}</td>
        <td style="text-align:center">${r.med || '—'}</td>
      </tr>`;
    }).join('');

    return `
      <!-- ══ CSS DE IMPRESSÃO PADRÃO ENGENHALVES ══ -->
      <style>
        @media print {
          @page { size: A4 portrait; margin: 18mm 12mm 14mm; }
          @page :first { margin: 0 12mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #app-header, #nav-principal, .subnav-abas,
          .nao-imprimir, .btn, #toast { display: none !important; }
          body {
            background: #fff !important; color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9pt !important; line-height: 1.4 !important; margin: 0 !important;
          }
          .rpt-capa {
            display: flex !important; flex-direction: column;
            justify-content: space-between; align-items: stretch;
            min-height: 297mm; padding: 0; text-align: center;
            page-break-after: always; break-after: always; background: #fff;
          }
          .rpt-capa-barra-topo {
            background: #0D47A1; color: #fff; padding: 10pt 16pt;
            font-size: 8pt; font-weight: 700; letter-spacing: 1pt;
            text-transform: uppercase; text-align: center;
          }
          .rpt-capa-corpo {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: space-between;
            text-align: center; padding: 10mm 20mm 8mm;
          }
          .rpt-capa-titulo {
            font-size: 22pt; font-weight: 900; color: #0D47A1;
            text-transform: uppercase; letter-spacing: 1.5px;
            margin-bottom: 4mm; line-height: 1.2;
          }
          .rpt-capa-subtitulo { font-size: 10pt; color: #555; margin-bottom: 12mm; letter-spacing: .3pt; }
          .rpt-capa-linha { width: 40mm; height: 2px; background: #0D47A1; margin: 0 auto 10mm; }
          .rpt-capa-tabela { width: 100%; max-width: 130mm; border-collapse: collapse; font-size: 9pt; text-align: left; }
          .rpt-capa-tabela td { padding: 4pt 8pt; border: none !important; border-bottom: 1px solid #e0e0e0 !important; background: transparent !important; color: #222; }
          .rpt-capa-td-label { font-weight: 700; color: #0D47A1 !important; width: 44%; }
          .rpt-capa-barra-rodape { background: #0D47A1; color: #fff; padding: 8pt 16pt; font-size: 8pt; text-align: center; line-height: 1.6; }
          .rpt-sumario { page-break-after: always; break-after: always; padding: 0; }
          .rpt-sumario-titulo { display: block !important; font-size: 14pt; font-weight: 900; color: #fff !important; background: #0D47A1 !important; padding: 8pt 12pt !important; text-transform: uppercase; letter-spacing: 3pt; margin: 0 0 10mm !important; }
          .rpt-sumario-lista { padding: 0; }
          .rpt-sumario-item { display: flex !important; align-items: baseline !important; padding: 5pt 14pt !important; font-size: 10pt; color: #111; border: none !important; background: transparent !important; }
          .rpt-sumario-item:nth-child(even) { background: #f5f7fa !important; }
          .rpt-sumario-item.sumario-sub { padding: 3pt 14pt 3pt 34pt !important; font-size: 9pt; color: #444; }
          .rpt-sumario-num { font-weight: 700; color: #0D47A1 !important; min-width: 24pt; flex-shrink: 0; }
          .rpt-sumario-nome { flex-shrink: 0; white-space: nowrap; }
          .rpt-sumario-pontilhado { flex: 1; border-bottom: 1pt dotted #bbb; margin: 0 8pt 3pt; }
          .rpt-sumario-pag { color: #555; min-width: 18pt; text-align: right; flex-shrink: 0; }
          .rpt-sumario-sep { height: 2pt; background: #0D47A1 !important; border: none !important; margin: 4pt 0 !important; display: block !important; }
          .so-imprimir { display: block !important; }
          .nao-imprimir { display: none !important; }
          .rpt-header { display: flex !important; height: 14mm; background: #fff; border-bottom: 2px solid #0D47A1; padding: 0; align-items: center; justify-content: space-between; margin-bottom: 8pt; }
          .rpt-header-logo { display: flex; align-items: center; gap: 6pt; }
          .rpt-header-info { font-size: 7pt; color: #555; text-align: right; line-height: 1.5; }
          .rpt-footer { display: block !important; border-top: 1px solid #0D47A1; margin-top: 20pt; padding-top: 6pt; font-size: 7.5pt; color: #444; text-align: center; line-height: 1.6; }
          .rpt-conteudo { margin: 0 !important; padding: 0 !important; }
          .rpt-secao h3, .relatorio-secao h3 {
            background: #0D47A1 !important; color: #fff !important;
            padding: 5pt 9pt !important; font-size: 9pt !important;
            font-weight: 700 !important; text-transform: uppercase !important;
            letter-spacing: .5pt !important; margin: 0 0 6pt !important;
            border-radius: 0 !important; page-break-after: avoid !important;
          }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt !important; margin-bottom: 6pt !important; }
          th { background: #0D47A1 !important; color: #fff !important; padding: 3pt 6pt !important; font-weight: 600 !important; text-align: left !important; border: 1px solid #0D47A1 !important; }
          td { padding: 3pt 6pt !important; border: 1px solid #ccc !important; color: #111 !important; }
          tr:nth-child(even) td { background: #f0f4f8 !important; }
          .card { border: none !important; border-bottom: 1px solid #e8e8e8 !important; background: #fff !important; border-radius: 0 !important; padding: 6pt 0 !important; margin-bottom: 8pt !important; color: #000 !important; }
          .badge { border: 1px solid #ccc !important; font-size: 7pt !important; padding: 1pt 4pt !important; }
          .badge-alto    { background:#f8d7da !important; color:#721c24 !important; border-color:#f5c6cb !important; }
          .badge-medio   { background:#fff3cd !important; color:#856404 !important; border-color:#ffeeba !important; }
          .badge-baixo   { background:#d4edda !important; color:#155724 !important; border-color:#c3e6cb !important; }
          textarea::placeholder, input::placeholder { color: transparent !important; }
          textarea.campo-tecnico { border: none !important; }
          div:empty { display: none !important; }
          .card { page-break-inside: avoid !important; break-inside: avoid !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .relatorio-secao h3 { page-break-after: avoid !important; break-after: avoid !important; }
          .rpt-capa { page-break-after: always; break-after: always; }
          .rpt-capa, .rpt-header, .rpt-footer { display: none; }
        }
        @media screen {
          .rpt-capa, .rpt-sumario { display: none !important; }
          .so-imprimir { display: none !important; }
        }
      </style>

      <!-- ── CAPA ─────────────────────────────────────────── -->
      <div class="rpt-capa">
        <div class="rpt-capa-barra-topo" id="aep-capa-barra-topo">
          ENGENHALVES — Centro de Engenharia e Segurança LTDA
        </div>
        <div class="rpt-capa-corpo">
          <div id="aep-capa-logo-area" style="text-align:center">
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
            <div class="rpt-capa-titulo">Avaliação Ergonômica Preliminar</div>
            <div class="rpt-capa-subtitulo">Laudo Técnico de Ergonomia — NR-17 &middot; GRO-PGR</div>
            <div class="rpt-capa-linha"></div>
          </div>
          <table class="rpt-capa-tabela" style="margin-bottom:8mm">
            <tr><td class="rpt-capa-td-label">Empresa / Cliente</td><td>${av.empresa?.nome || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Setor Avaliado</td><td>${av.setor || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Função Avaliada</td><td>${av.funcao || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Data da Avaliação</td><td>${_formatarData(av.empresa?.dataAvaliacao) || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Responsável Técnico</td><td>${_responsavel || '—'}</td></tr>
            <tr><td class="rpt-capa-td-label">Registro Profissional</td><td>${_registro || '—'}</td></tr>
          </table>
        </div>
        <div class="rpt-capa-barra-rodape">
          Documento gerado em ${_dataEmissao} &mdash; Confidencial &nbsp;|&nbsp; ${_nrAEPAtual}
        </div>
      </div>

      <!-- ── SUMÁRIO ───────────────────────────────────────── -->
      <div class="rpt-sumario so-imprimir">
        <div class="rpt-sumario-titulo">Sumário</div>
        <div class="rpt-sumario-lista">
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">1.</span><span class="rpt-sumario-nome">Informações Gerais</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">3</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">2.</span><span class="rpt-sumario-nome">Objetivo</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">3</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">3.</span><span class="rpt-sumario-nome">Metodologia</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">4</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">4.</span><span class="rpt-sumario-nome">Normas Aplicáveis</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">4</span></div>
          <div class="rpt-sumario-sep"></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">5.</span><span class="rpt-sumario-nome">Posto de Trabalho</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">5</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">6.</span><span class="rpt-sumario-nome">Checklist NR-17</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">5</span></div>
          <div class="rpt-sumario-item sumario-sub"><span class="rpt-sumario-num">6.1</span><span class="rpt-sumario-nome">Resumo por Bloco</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">5</span></div>
          <div class="rpt-sumario-item sumario-sub"><span class="rpt-sumario-num">6.2</span><span class="rpt-sumario-nome">Não Conformidades</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">6</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">7.</span><span class="rpt-sumario-nome">Score de Criticidade</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">6</span></div>
          <div class="rpt-sumario-sep"></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">8.</span><span class="rpt-sumario-nome">Análise Técnica</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">7</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">9.</span><span class="rpt-sumario-nome">Recomendações Técnicas</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">7</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">10.</span><span class="rpt-sumario-nome">Indicação Técnica (AET)</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">8</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">11.</span><span class="rpt-sumario-nome">Plano de Ação</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">8</span></div>
          <div class="rpt-sumario-item"><span class="rpt-sumario-num">12.</span><span class="rpt-sumario-nome">Conclusão e Assinatura</span><span class="rpt-sumario-pontilhado"></span><span class="rpt-sumario-pag">9</span></div>
        </div>
      </div>

      <!-- ── CONTEÚDO ──────────────────────────────────────── -->
      <div class="container">

        <!-- Header (imprime em cada página de conteúdo) -->
        <div class="rpt-header so-imprimir">
          <div class="rpt-header-logo" id="aep-header-logo-area">
            ${_SVG_E(28, 28)}
            <div>
              <div style="font-size:11pt;font-weight:900;color:#0D47A1;letter-spacing:1px;line-height:1">ENGENHALVES</div>
              <div style="font-size:6pt;color:#777;letter-spacing:.5px">CENTRO DE ENGENHARIA E SEGURANÇA LTDA</div>
            </div>
          </div>
          <div class="rpt-header-info">
            Avaliação Ergonômica Preliminar — AEP<br>
            ${av.empresa?.nome || ''} · ${_formatarData(av.empresa?.dataAvaliacao)}<br>
            ${_nrAEPAtual}
          </div>
        </div>

        <!-- Cabeçalho de tela -->
        <div class="nao-imprimir" style="margin:var(--s4) 0 var(--s5);text-align:center">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">
            Avaliação Ergonômica Preliminar — NR-17 / GRO-PGR
          </div>
          <div style="font-size:var(--txt-xl);font-weight:700">Relatório Técnico</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            ${av.empresa?.nome || 'Empresa'} · ${av.setor || ''} · ${_formatarData(av.empresa?.dataAvaliacao)}
          </div>
        </div>

        <!-- Botões de ação -->
        <div class="nao-imprimir" style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="ModuloAEP.imprimirRelatorio('engenhalves')">🖨️ Engenhalves</button>
          <button class="btn btn-primario" onclick="ModuloAEP.imprimirRelatorio('kalprevi')" style="background:#1a5c2a">🖨️ Kalprevi</button>
          <button class="btn btn-secundario" onclick="ModuloAEP.exportarJSON()">📤 Exportar JSON</button>
        </div>

        <!-- Resumo de riscos (tela) -->
        <div class="relatorio-resumo-risco nao-imprimir">
          <div class="resumo-risco-card alto"><div class="numero">${riscos.alto}</div><div class="label">Risco Alto</div></div>
          <div class="resumo-risco-card medio"><div class="numero">${riscos.medio}</div><div class="label">Risco Médio</div></div>
          <div class="resumo-risco-card baixo"><div class="numero">${riscos.baixo}</div><div class="label">Risco Baixo</div></div>
        </div>

        <!-- 1. Informações Gerais -->
        <div class="relatorio-secao">
          <h3>1. Informações Gerais</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <tbody>
                <tr><td style="font-weight:600;width:40%">Empresa / Cliente</td><td>${av.empresa?.nome || '—'}</td></tr>
                <tr><td style="font-weight:600">CNPJ</td><td>${av.empresa?.cnpj || '—'}</td></tr>
                <tr><td style="font-weight:600">Setor Avaliado</td><td>${av.setor || '—'}</td></tr>
                <tr><td style="font-weight:600">Função Avaliada</td><td>${av.funcao || '—'}</td></tr>
                <tr><td style="font-weight:600">Nº de Trabalhadores</td><td>${av.numTrabalhadores || '—'}</td></tr>
                <tr><td style="font-weight:600">Data da Avaliação</td><td>${_formatarData(av.empresa?.dataAvaliacao) || '—'}</td></tr>
                <tr><td style="font-weight:600">N° do Laudo</td><td>${_nrAEPAtual}</td></tr>
                <tr><td style="font-weight:600">Data de Emissão</td><td>${_dataEmissao}</td></tr>
                <tr><td style="font-weight:600">Responsável Técnico</td><td>${_responsavel || '—'}</td></tr>
                <tr><td style="font-weight:600">Registro Profissional</td><td>${_registro || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Objetivo -->
        <div class="relatorio-secao">
          <h3>2. Objetivo</h3>
          <div class="card">
            <p style="font-size:var(--txt-sm)">
              A presente Avaliação Ergonômica Preliminar — AEP tem por objetivo identificar os fatores de risco
              ergonômico presentes no posto de trabalho avaliado, em atendimento às disposições da
              <strong>NR-17 — Ergonomia</strong> e ao <strong>GRO/PGR — Gerenciamento de Riscos Ocupacionais</strong>
              (Portaria MTP nº 672/2021). Os resultados subsidiam as ações do Programa de Gerenciamento de Riscos
              e fundamentam a necessidade de intervenções ergonômicas ou de Análise Ergonômica do Trabalho — AET.
            </p>
          </div>
        </div>

        <!-- 3. Metodologia -->
        <div class="relatorio-secao">
          <h3>3. Metodologia</h3>
          <div class="card">
            <p style="font-size:var(--txt-sm)">
              A avaliação foi conduzida por meio de inspeção in loco do posto de trabalho, com aplicação de
              checklist estruturado baseado na <strong>NR-17</strong>, composto por
              <strong>${ORDEM_BLOCOS.reduce((n,c) => n + BLOCOS[c].itens.length, 0)} itens</strong> distribuídos
              em ${ORDEM_BLOCOS.length} blocos temáticos: Organização do Trabalho, Levantamento e Transporte de
              Cargas, Mobiliário, Máquinas e Equipamentos, Condições Ambientais, Demandas Cognitivas e Aspectos
              Psicossociais.
            </p>
            <p style="font-size:var(--txt-sm);margin-top:var(--s3)">
              Complementarmente, foram avaliadas as exposições ergonômicas do posto (fatores físicos,
              organizacionais e cognitivos), com caracterização de intensidade, frequência e duração de cada
              exposição. Um <strong>Motor de Criticidade</strong> integrado calcula automaticamente um
              Score de Criticidade (0–100), ponderando os domínios: Físico (35%), Organizacional (25%),
              Cognitivo (20%) e Psicossocial (20%).
            </p>
          </div>
        </div>

        <!-- 4. Normas Aplicáveis -->
        <div class="relatorio-secao">
          <h3>4. Normas Aplicáveis</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Norma / Referência</th><th>Descrição</th></tr></thead>
              <tbody>
                <tr><td>NR-17</td><td>Ergonomia — Portaria MTE nº 876/2021</td></tr>
                <tr><td>NR-01</td><td>Disposições Gerais e Gerenciamento de Riscos Ocupacionais — Portaria MTP nº 672/2021</td></tr>
                <tr><td>NIOSH (1994)</td><td>Equação NIOSH para Levantamento Manual de Cargas</td></tr>
                <tr><td>ISO 11228</td><td>Ergonomics — Manual Handling</td></tr>
                <tr><td>COPSOQ-III</td><td>Copenhagen Psychosocial Questionnaire, 3ª Edição (Kristensen et al., 2019)</td></tr>
                <tr><td>LGPD — Lei nº 13.709/2018</td><td>Lei Geral de Proteção de Dados Pessoais</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. Posto de Trabalho -->
        ${posto.atividadeReal || posto.perfilPosto ? `
        <div class="relatorio-secao">
          <h3>5. Posto de Trabalho</h3>
          <div class="card">
            ${posto.perfilPosto ? `${_linhaInfo('Perfil', PERFIS_POSTO.find(p => p.id === posto.perfilPosto)?.label || posto.perfilPosto)}` : ''}
            ${_linhaInfo('Tipo de atividade', posto.tipoAtividade)}
            ${_linhaInfo('Turno', posto.turno)}
            ${_linhaInfo('Ciclo de trabalho', posto.cicloTrabalho)}
            ${_linhaInfo('Ferramentas / Equipamentos', posto.ferramentas)}
            ${posto.atividadeReal ? `<div style="margin-top:var(--s3)"><strong style="font-size:var(--txt-sm)">Atividade Real Observada:</strong><p style="font-size:var(--txt-sm);margin-top:var(--s2)">${posto.atividadeReal}</p></div>` : ''}
            ${expsPresentes.length ? `
              <div style="margin-top:var(--s3)">
                <strong style="font-size:var(--txt-sm)">Exposições Identificadas (${expsPresentes.length}):</strong>
                <div style="overflow-x:auto;margin-top:var(--s2)">
                  <table class="tabela-simples">
                    <thead><tr><th>Exposição</th><th>Intensidade</th><th>Frequência</th><th>Duração</th></tr></thead>
                    <tbody>
                      ${expsPresentes.map(e => {
                        const def = EXPOSICOES.find(x => x.id === e.id);
                        return `<tr>
                          <td style="font-size:var(--txt-xs)">${def?.label || e.id}</td>
                          <td style="font-size:var(--txt-xs)">${e.intensidade || '—'}</td>
                          <td style="font-size:var(--txt-xs)">${e.frequencia || '—'}</td>
                          <td style="font-size:var(--txt-xs)">${e.duracao || '—'}</td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
          </div>
        </div>` : ''}

        <!-- 6. Checklist NR-17 -->
        <div class="relatorio-secao">
          <h3>6. Checklist NR-17</h3>
          <h4 style="font-size:var(--txt-sm);font-weight:600;margin:var(--s3) 0 var(--s2);color:var(--texto-sec)">6.1 Resumo por Bloco</h4>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Bloco</th><th>Respondidos</th><th>Não Conf.</th><th>Alto</th><th>Médio</th></tr></thead>
              <tbody>${blocoResumoHTML}</tbody>
            </table>
          </div>
          ${naoConformes.length > 0 ? `
          <h4 style="font-size:var(--txt-sm);font-weight:600;margin:var(--s4) 0 var(--s2);color:var(--texto-sec)">6.2 Não Conformidades Identificadas</h4>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Bloco</th><th>Item</th><th>Risco</th></tr></thead>
              <tbody>
                ${naoConformes.map(nc => `
                  <tr>
                    <td style="white-space:nowrap;font-size:var(--txt-xs)">${nc.blocoTitulo}</td>
                    <td style="font-size:var(--txt-xs)">${nc.itemTexto.slice(0, 90)}${nc.itemTexto.length > 90 ? '…' : ''}</td>
                    <td><span class="badge badge-${nc.risco || 'medio'}">${NIVEL_PRINT[nc.risco] || nc.risco}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : `<p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s3)">Nenhuma não conformidade registrada.</p>`}
        </div>

        <!-- 7. Score de Criticidade -->
        <div class="relatorio-secao">
          <h3>7. Score de Criticidade</h3>
          <div class="card">
            <div style="display:flex;align-items:center;gap:var(--s5);flex-wrap:wrap">
              <div style="text-align:center;flex-shrink:0">
                <div style="font-size:3rem;font-weight:900;color:${MOTOR_AEP.corNivel(nivelSug)};line-height:1">${score.valor}</div>
                <div style="font-size:var(--txt-xs);color:var(--texto-sec)">/&nbsp;100</div>
                <div style="font-weight:700;font-size:var(--txt-sm);color:${MOTOR_AEP.corNivel(nivelSug)};margin-top:var(--s1)">${NIVEL_LABEL[nivelSug]}</div>
              </div>
              <div style="flex:1;min-width:160px">
                ${['fisica','organizacional','cognitiva','psicossocial'].map(dom => {
                  const val = Math.round((score.componentes[dom] || 0) * 100);
                  const label = { fisica: 'Físico', organizacional: 'Organizacional', cognitiva: 'Cognitivo', psicossocial: 'Psicossocial' };
                  return `
                    <div style="margin-bottom:var(--s2)">
                      <div style="display:flex;justify-content:space-between;font-size:var(--txt-xs);margin-bottom:2px">
                        <span style="color:var(--texto-sec)">${label[dom]}</span><span style="font-weight:600">${val}%</span>
                      </div>
                      <div style="background:var(--borda);border-radius:99px;height:5px">
                        <div style="background:${MOTOR_AEP.corNivel(nivelSug)};border-radius:99px;height:5px;width:${val}%"></div>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>
            <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s3)">
              Score calculado automaticamente pelo Motor de Criticidade ErgoGRO com base no checklist NR-17 e exposições estruturadas.
              Pesos: Físico 35% · Organizacional 25% · Cognitivo 20% · Psicossocial 20%.
            </p>
          </div>
        </div>

        <!-- 8. Análise Técnica -->
        ${analise.analiseTecnica ? `
        <div class="relatorio-secao">
          <h3>8. Análise Técnica</h3>
          <div class="card">
            ${analise.nivelRiscoGeral ? `
              <div style="margin-bottom:var(--s3)">
                <strong>Nível de Risco Classificado: </strong>
                <span class="badge badge-${analise.nivelRiscoGeral === 'baixo' ? 'baixo' : analise.nivelRiscoGeral === 'medio' ? 'medio' : 'alto'}">${NIVEL_LABEL[analise.nivelRiscoGeral]}</span>
                ${analise.prioridadeIntervencao ? `<span style="font-size:var(--txt-xs);color:var(--texto-sec);margin-left:var(--s3)">Prioridade: ${analise.prioridadeIntervencao}</span>` : ''}
              </div>` : ''}
            <p style="font-size:var(--txt-sm)">${analise.analiseTecnica}</p>
            ${analise.justificativaRisco ? `<p style="font-size:var(--txt-sm);margin-top:var(--s3);color:var(--texto-sec)"><em>${analise.justificativaRisco}</em></p>` : ''}
          </div>
        </div>` : ''}

        <!-- 9. Recomendações -->
        ${analise.recomendacoes ? `
        <div class="relatorio-secao">
          <h3>9. Recomendações Técnicas</h3>
          <div class="card"><p style="font-size:var(--txt-sm);white-space:pre-wrap">${analise.recomendacoes}</p></div>
        </div>` : ''}

        <!-- 10. Indicação de AET -->
        <div class="relatorio-secao">
          <h3>10. Indicação Técnica</h3>
          <div class="card">
            ${analise.indicaAET ? `
              <div class="aviso-tecnico aviso" style="margin:0">
                <span>⚠️</span>
                <span><strong>Esta AEP indica necessidade de AET (Análise Ergonômica do Trabalho).</strong>
                ${analise.justificativaAET ? `<br><span style="font-size:var(--txt-sm)">${analise.justificativaAET}</span>` : ''}
                </span>
              </div>` : `
              <p style="font-size:var(--txt-sm)">
                Com base nos dados levantados, esta AEP <strong>não indica necessidade imediata de AET</strong>,
                devendo as ações corretivas ser implementadas conforme as recomendações técnicas acima.
              </p>`}
            ${analise.prazoRetorno ? `<p style="font-size:var(--txt-sm);margin-top:var(--s3)"><strong>Prazo de Reavaliação:</strong> ${_formatarData(analise.prazoRetorno)}</p>` : ''}
          </div>
        </div>

        <!-- 11. Plano de Ação -->
        ${av.planoAcao?.length > 0 ? (() => {
          const PRIO_COR  = { alta: '#f44336', media: '#ff9800', baixa: '#4caf50' };
          const PRIO_L    = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
          const STATUS_L  = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído' };
          const MEDIDA_L  = { engenharia: 'Engenharia', administrativa: 'Administrativa', organizacional: 'Organizacional', epi: 'EPI/EPC' };
          return `
          <div class="relatorio-secao">
            <h3>11. Plano de Ação (${av.planoAcao.length} ação(ões))</h3>
            <div style="overflow-x:auto">
              <table class="tabela-simples">
                <thead><tr><th>#</th><th>Ação / Recomendação</th><th>Tipo de Medida</th><th>Prioridade</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
                <tbody>
                  ${av.planoAcao.map((a, i) => `
                    <tr>
                      <td>${i+1}</td>
                      <td style="font-size:var(--txt-xs)">${a.descricao || '—'}</td>
                      <td style="font-size:var(--txt-xs)">${MEDIDA_L[a.medida] || '—'}</td>
                      <td><span style="font-weight:700;color:${PRIO_COR[a.prioridade]||'#888'};font-size:var(--txt-xs)">${PRIO_L[a.prioridade]||a.prioridade||'—'}</span></td>
                      <td style="font-size:var(--txt-xs)">${a.responsavel || '—'}</td>
                      <td style="font-size:var(--txt-xs)">${_formatarData(a.prazo)}</td>
                      <td style="font-size:var(--txt-xs)">${STATUS_L[a.status]||a.status||'—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
        })() : ''}

        <!-- 12. Conclusão e Assinatura -->
        <div class="relatorio-secao">
          <h3>12. Conclusão e Assinatura</h3>
          <div class="card">
            <p style="font-size:var(--txt-sm)">
              A presente Avaliação Ergonômica Preliminar foi elaborada com base em inspeção in loco,
              aplicação de checklist estruturado (NR-17) e análise das exposições ergonômicas do posto.
              Os resultados e recomendações têm caráter técnico e devem ser implementados com o
              acompanhamento de profissional habilitado em Segurança do Trabalho.
            </p>
            <p style="font-size:var(--txt-sm);margin-top:var(--s3)">
              Este documento integra o Programa de Gerenciamento de Riscos — PGR da empresa
              <strong>${av.empresa?.nome || '[empresa]'}</strong> e deverá ser revisado nas condições
              previstas na NR-01 e NR-17.
            </p>
          </div>
          <!-- Assinatura (só impressão) -->
          <div class="so-imprimir" style="margin-top:20pt">
            <table style="width:100%;border-collapse:collapse;font-size:9pt">
              <tr>
                <td style="width:50%;padding:0 20pt 0 0;border:none">
                  <div style="border-bottom:1px solid #000;height:32pt;margin-bottom:4pt"></div>
                  <div style="font-weight:600">${_responsavel || 'Responsável Técnico'}</div>
                  <div style="color:#555">${_registro || 'Registro Profissional'}</div>
                </td>
                <td style="width:50%;padding:0 0 0 20pt;border:none;text-align:right">
                  <div style="font-size:8pt;color:#555">Data de Emissão</div>
                  <div style="font-weight:600">${_dataEmissao}</div>
                  <div style="font-size:7pt;color:#888;margin-top:4pt">${_nrAEPAtual}</div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Rodapé empresa (só impressão, última página) -->
        <div class="rpt-footer so-imprimir" id="aep-rodape-empresa">
          ENGENHALVES — Centro de Engenharia &amp; Segurança LTDA<br>
          Estrada Braulina Pigatto, 2320, CEP 84607-303 — Bom Jesus, União da Vitória - PR<br>
          (42) 99928-8177 &nbsp;|&nbsp; atendimento@engenhalves.com.br<br>
          <span style="font-size:7pt">Documento técnico de uso exclusivo do cliente &middot; ${_nrAEPAtual}</span>
        </div>

      </div>
    `;
  }

  function _sincronizarMarcaAEP() {
    const cfg = _EMPRESAS_AEP[_empresaImpressaoAEP] || _EMPRESAS_AEP.engenhalves;
    const el1 = document.getElementById('aep-capa-barra-topo');
    if (el1) el1.textContent = cfg.barraTopoTexto;
    const el2 = document.getElementById('aep-capa-logo-area');
    if (el2) el2.innerHTML = cfg.capaLogo();
    const el3 = document.getElementById('aep-header-logo-area');
    if (el3) el3.innerHTML = cfg.headerLogo();
    const el4 = document.getElementById('aep-rodape-empresa');
    if (el4) el4.innerHTML = cfg.rodape(_nrAEPAtual);
  }

  function imprimirRelatorio(empresa) {
    /* Só salva análise se o DOM da seção 'analise' estiver ativo;
       chamar _salvarAnalise() na seção 'relatorio' limpa os campos */
    if (_secaoAtual === 'analise') _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) Storage.salvar(av);
    if (empresa) _empresaImpressaoAEP = empresa;
    _sincronizarMarcaAEP();
    const imgs = [...document.querySelectorAll('#aep-capa-logo-area img, #aep-header-logo-area img')];
    const pendentes = imgs.filter(img => !img.complete);
    if (pendentes.length === 0) { window.print(); return; }
    let n = 0;
    const proximo = () => { if (++n >= pendentes.length) window.print(); };
    pendentes.forEach(img => { img.onload = proximo; img.onerror = proximo; });
  }

  function exportarJSON() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const json = Storage.exportarJSON(av.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `AEP_${(av.empresa.nome || 'ergogro').replace(/\s+/g,'_')}_${(av.empresa.dataAvaliacao||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('JSON exportado', 'sucesso');
  }

  /* ── Helpers de cálculo ──────────────────────────────────── */

  function _calcularResumoBloco(chave, respostas, itens) {
    let respondidos = 0, alto = 0, medio = 0, baixo = 0;
    itens.forEach(item => {
      const r = respostas[item.id];
      if (r?.resposta) respondidos++;
      if (r?.resposta === 'nao') {
        if (r.risco === 'alto')  alto++;
        if (r.risco === 'medio') medio++;
        if (r.risco === 'baixo') baixo++;
      }
    });
    return { respondidos, alto, medio, baixo };
  }

  function calcularRiscoGeral(avaliacao) {
    const resultado = { total: 0, naoConformes: 0, alto: 0, medio: 0, baixo: 0, blocos: {} };
    ORDEM_BLOCOS.forEach(chave => {
      const bloco = BLOCOS[chave];
      const respostas = avaliacao?.aep?.[chave] || {};
      const r = _calcularResumoBloco(chave, respostas, bloco.itens);
      resultado.total += bloco.itens.length;
      resultado.naoConformes += r.alto + r.medio + r.baixo;
      resultado.alto  += r.alto;
      resultado.medio += r.medio;
      resultado.baixo += r.baixo;
      resultado.blocos[chave] = { ...r, titulo: bloco.titulo, icone: bloco.icone };
    });
    return resultado;
  }

  function obterNaoConformes(avaliacao) {
    const itens = [];
    ORDEM_BLOCOS.forEach(chave => {
      const bloco = BLOCOS[chave];
      const respostas = avaliacao?.aep?.[chave] || {};
      bloco.itens.forEach(item => {
        const r = respostas[item.id];
        if (r?.resposta === 'nao') {
          itens.push({
            blocoChave: chave, blocoTitulo: bloco.titulo,
            itemId: item.id, itemTexto: item.texto,
            risco: r.risco || 'medio', observacao: r.observacao || ''
          });
        }
      });
    });
    return itens;
  }

  function _linhaInfo(label, valor) {
    if (!valor && valor !== 0) return '';
    return `<div style="display:flex;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
      <span style="color:var(--texto-sec);font-size:var(--txt-sm);width:160px;flex-shrink:0">${label}</span>
      <span style="font-size:var(--txt-sm);font-weight:500">${valor}</span>
    </div>`;
  }

  function _formatarData(iso) {
    if (!iso) return '';
    try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; }
  }

  return {
    renderizar, trocarSecao,
    /* checklist */
    trocarBloco, onRespostaChange, onRiscoChange, onObsChange, salvarBloco,
    /* posto */
    salvarPosto, onExpChange,
    /* análise */
    salvarSecaoAtual: () => { _salvarSecaoAtual(); },
    onAETChange, salvarAnalise, recalcularScore, aplicarNivelSugerido, usarRecomendacoesAuto, gerarAnaliseCompleta, gerarPlanoDeAcao,
    /* relatório */
    imprimirRelatorio, exportarJSON,
    /* cálculos (usados por outros módulos) */
    calcularRiscoGeral, obterNaoConformes,
    /* dados estáticos exportados */
    BLOCOS, ORDEM_BLOCOS, EXPOSICOES, PERFIS_POSTO, MOTOR_AEP
  };
})();
