/* ============================================================
   ErgoGRO — COPSOQ-III Versão Curta (23 itens)
   Copenhagen Psychosocial Questionnaire — 3ª Edição

   Referência: Kristensen et al. (2019). COPSOQ-III: New scales
   for a better understanding of work, health and well-being.
   International Archives of Occupational and Environmental Health.

   Cada item contém:
   - textoTecnico : redação oficial para citação no laudo
   - texto        : linguagem simplificada exibida ao trabalhador
   - escalaPropria: quando a dimensão usa escala diferente da padrão

   AVISO TÉCNICO:
   - Resultados analisados em nível de GRUPO — nunca individual
   - Não constitui diagnóstico médico ou psicológico
   ============================================================ */

const PerguntasPsicossociais = (() => {

  /* Escala padrão de frequência (maioria dos itens) */
  const ESCALA = [
    { valor: 1, rotulo: 'Nunca',          cor: '#3fb950' },
    { valor: 2, rotulo: 'Raramente',      cor: '#58a6ff' },
    { valor: 3, rotulo: 'Às vezes',       cor: '#d29922' },
    { valor: 4, rotulo: 'Frequentemente', cor: '#f0883e' },
    { valor: 5, rotulo: 'Sempre',         cor: '#f85149' },
  ];

  /* Escala de avaliação de saúde (item q22) */
  const ESCALA_SAUDE = [
    { valor: 5, rotulo: 'Excelente',  cor: '#3fb950' },
    { valor: 4, rotulo: 'Muito boa',  cor: '#58a6ff' },
    { valor: 3, rotulo: 'Boa',        cor: '#d29922' },
    { valor: 2, rotulo: 'Razoável',   cor: '#f0883e' },
    { valor: 1, rotulo: 'Fraca',      cor: '#f85149' },
  ];

  /* ── 23 Dimensões COPSOQ-III em 6 categorias oficiais ──── */
  const DIMENSOES = [

    /* ══════════════════════════════════════════════════════
       CATEGORIA 1 — Demandas de Trabalho (5 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'demandas',
      nome: 'Demandas de Trabalho',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q01',
          dimensaoNome: 'Demandas Quantitativas',
          textoTecnico: 'O seu trabalho exige que você realize uma grande quantidade de tarefas?',
          texto:        'Você tem trabalho demais para dar conta no seu dia?',
          audioTexto:   'Você tem trabalho demais para dar conta no seu dia? Pense se o que te pedem é mais do que dá para fazer no tempo certo.',
          tipo: 'negativa',
        },
        {
          id: 'q02',
          dimensaoNome: 'Ritmo de Trabalho',
          textoTecnico: 'Você precisa trabalhar muito rapidamente?',
          texto:        'Você precisa trabalhar muito rápido para dar conta das tarefas?',
          audioTexto:   'Você precisa trabalhar muito rápido? Pense se te pedem para ir mais rápido do que você consegue.',
          tipo: 'negativa',
        },
        {
          id: 'q03',
          dimensaoNome: 'Demandas Cognitivas',
          textoTecnico: 'O seu trabalho exige que você tome decisões difíceis ou resolva problemas complexos?',
          texto:        'O seu trabalho exige que você resolva problemas difíceis ou tome decisões importantes?',
          audioTexto:   'Seu trabalho exige que você resolva problemas difíceis ou tome decisões importantes? Pense se você precisa pensar muito e resolver coisas complicadas no dia a dia.',
          tipo: 'negativa',
        },
        {
          id: 'q04',
          dimensaoNome: 'Demandas Emocionais',
          textoTecnico: 'O seu trabalho é emocionalmente desgastante?',
          texto:        'Seu trabalho envolve situações que te deixam emocionalmente cansado(a)?',
          audioTexto:   'Seu trabalho envolve situações que te deixam emocionalmente cansado? Pense se você fica esgotado por causa das situações que enfrenta.',
          tipo: 'negativa',
        },
        {
          id: 'q05',
          dimensaoNome: 'Exigência de Esconder Emoções',
          textoTecnico: 'O seu trabalho exige que você esconda os seus sentimentos?',
          texto:        'No trabalho, você precisa esconder como se sente?',
          audioTexto:   'No trabalho, você precisa esconder como se sente? Pense se você tem que fingir estar bem mesmo quando não está.',
          tipo: 'negativa',
        },
      ],
    },

    /* ══════════════════════════════════════════════════════
       CATEGORIA 2 — Organização e Conteúdo do Trabalho (5 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'organizacao',
      nome: 'Organização e Conteúdo do Trabalho',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q06',
          dimensaoNome: 'Influência no Trabalho',
          textoTecnico: 'Você tem influência sobre como realiza o seu trabalho?',
          texto:        'Você pode escolher como fazer o seu trabalho?',
          audioTexto:   'Você pode escolher como fazer o seu trabalho? Pense se você tem liberdade para decidir a maneira de trabalhar.',
          tipo: 'positiva',
        },
        {
          id: 'q07',
          dimensaoNome: 'Possibilidades de Desenvolvimento',
          textoTecnico: 'O seu trabalho oferece oportunidade de aprendizagem e desenvolvimento profissional?',
          texto:        'Seu trabalho oferece oportunidade de aprender coisas novas?',
          audioTexto:   'Seu trabalho oferece oportunidade de aprender coisas novas? Pense se você consegue desenvolver novas habilidades no trabalho.',
          tipo: 'positiva',
        },
        {
          id: 'q08',
          dimensaoNome: 'Significado do Trabalho',
          textoTecnico: 'O seu trabalho tem sentido?',
          texto:        'O seu trabalho tem sentido e importância para você?',
          audioTexto:   'O seu trabalho tem sentido e importância para você? Pense se o que você faz no trabalho é algo que vale a pena.',
          tipo: 'positiva',
        },
        {
          id: 'q09',
          dimensaoNome: 'Comprometimento com o Trabalho',
          textoTecnico: 'Você se sente comprometido e motivado com o seu trabalho?',
          texto:        'Você se sente motivado com o seu trabalho?',
          audioTexto:   'Você se sente motivado com o seu trabalho? Pense se você tem vontade de trabalhar bem e se sente engajado.',
          tipo: 'positiva',
        },
        {
          id: 'q10',
          dimensaoNome: 'Previsibilidade',
          textoTecnico: 'Você é informado com antecedência sobre decisões importantes, mudanças ou planos futuros no trabalho?',
          texto:        'Você é avisado com antecedência sobre mudanças importantes no trabalho?',
          audioTexto:   'Você é avisado com antecedência sobre mudanças importantes no trabalho? Pense se a empresa te conta sobre novidades ou mudanças antes que elas aconteçam.',
          tipo: 'positiva',
        },
      ],
    },

    /* ══════════════════════════════════════════════════════
       CATEGORIA 3 — Relações Interpessoais e Liderança (7 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'relacoes',
      nome: 'Relações Interpessoais e Liderança',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q11',
          dimensaoNome: 'Clareza do Papel',
          textoTecnico: 'As suas tarefas e responsabilidades estão claramente definidas?',
          texto:        'Você sabe exatamente quais são suas tarefas e responsabilidades?',
          audioTexto:   'Você sabe exatamente quais são suas tarefas e responsabilidades? Pense se ficou claro o que você deve fazer no trabalho.',
          tipo: 'positiva',
        },
        {
          id: 'q12',
          dimensaoNome: 'Conflitos de Papel',
          textoTecnico: 'Você recebe solicitações contraditórias ou incompatíveis de diferentes pessoas no trabalho?',
          texto:        'Você recebe pedidos contraditórios de pessoas diferentes no trabalho?',
          audioTexto:   'Você recebe pedidos contraditórios de pessoas diferentes no trabalho? Pense se alguém pede uma coisa e outra pessoa pede o contrário.',
          tipo: 'negativa',
        },
        {
          id: 'q13',
          dimensaoNome: 'Qualidade da Liderança',
          textoTecnico: 'A sua chefia imediata planeja bem o trabalho e comunica-se bem com os trabalhadores?',
          texto:        'Sua chefia organiza bem o trabalho e se comunica bem com a equipe?',
          audioTexto:   'Sua chefia organiza bem o trabalho e se comunica bem com a equipe? Pense se seu chefe ou chefa planeja as coisas bem e fala claramente com todos.',
          tipo: 'positiva',
        },
        {
          id: 'q14',
          dimensaoNome: 'Apoio Social da Chefia',
          textoTecnico: 'Com que frequência você recebe ajuda e apoio da sua chefia imediata?',
          texto:        'Com que frequência sua chefia te ajuda quando você precisa?',
          audioTexto:   'Com que frequência sua chefia te ajuda quando você precisa? Pense se seu chefe aparece para ajudar quando você tem um problema no trabalho.',
          tipo: 'positiva',
        },
        {
          id: 'q15',
          dimensaoNome: 'Apoio Social dos Colegas',
          textoTecnico: 'Com que frequência você recebe ajuda e apoio dos seus colegas de trabalho?',
          texto:        'Seus colegas te ajudam quando você precisa?',
          audioTexto:   'Seus colegas te ajudam quando você precisa? Pense se as pessoas do trabalho aparecem para ajudar quando você tem dificuldade.',
          tipo: 'positiva',
        },
        {
          id: 'q16',
          dimensaoNome: 'Comunidade Social no Trabalho',
          textoTecnico: 'Há um bom ambiente de trabalho entre você e seus colegas?',
          texto:        'O ambiente entre você e seus colegas é bom?',
          audioTexto:   'O ambiente entre você e seus colegas é bom? Pense se as pessoas se tratam bem e há cooperação no seu local de trabalho.',
          tipo: 'positiva',
        },
        {
          id: 'q17',
          dimensaoNome: 'Feedback no Trabalho',
          textoTecnico: 'Você recebe feedback sobre a qualidade do seu trabalho?',
          texto:        'Você recebe retorno sobre se está fazendo bem o seu trabalho?',
          audioTexto:   'Você recebe retorno sobre se está fazendo bem o seu trabalho? Pense se alguém te diz se você está indo bem ou se precisa melhorar.',
          tipo: 'positiva',
        },
      ],
    },

    /* ══════════════════════════════════════════════════════
       CATEGORIA 4 — Interface Trabalho-Indivíduo (2 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'interface',
      nome: 'Interface Trabalho-Indivíduo',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q18',
          dimensaoNome: 'Insegurança no Emprego',
          textoTecnico: 'Você está preocupado em perder o seu emprego?',
          texto:        'Você tem medo de perder o emprego?',
          audioTexto:   'Você tem medo de perder o emprego? Pense se fica preocupado que possa ser mandado embora.',
          tipo: 'negativa',
        },
        {
          id: 'q19',
          dimensaoNome: 'Conflito Trabalho-Família',
          textoTecnico: 'O seu trabalho interfere negativamente na sua vida pessoal e familiar?',
          texto:        'O trabalho afeta negativamente sua vida fora do trabalho?',
          audioTexto:   'O trabalho afeta negativamente sua vida fora do trabalho? Pense se o cansaço ou estresse do trabalho atrapalha sua vida com a família ou amigos.',
          tipo: 'negativa',
        },
      ],
    },

    /* ══════════════════════════════════════════════════════
       CATEGORIA 5 — Valores no Trabalho (2 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'valores',
      nome: 'Valores no Trabalho',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q20',
          dimensaoNome: 'Confiança na Gestão',
          textoTecnico: 'Você confia nas informações e decisões que vêm da direção da empresa?',
          texto:        'Você confia nas informações e decisões que vêm da gestão da empresa?',
          audioTexto:   'Você confia nas informações e decisões que vêm da gestão da empresa? Pense se você acredita no que a empresa diz e nas decisões que são tomadas.',
          tipo: 'positiva',
        },
        {
          id: 'q21',
          dimensaoNome: 'Justiça e Respeito',
          textoTecnico: 'Você é tratado com justiça e respeito no trabalho?',
          texto:        'Você é tratado com justiça e respeito no trabalho?',
          audioTexto:   'Você é tratado com justiça e respeito no trabalho? Pense se as regras são aplicadas de forma igual para todos e se você é respeitado.',
          tipo: 'positiva',
        },
      ],
    },

    /* ══════════════════════════════════════════════════════
       CATEGORIA 6 — Saúde e Bem-estar (2 itens)
    ══════════════════════════════════════════════════════ */
    {
      id: 'saude',
      nome: 'Saúde e Bem-estar',
      categoria: 'COPSOQ-III',
      perguntas: [
        {
          id: 'q22',
          dimensaoNome: 'Saúde Geral Autopercebida',
          textoTecnico: 'Em geral, como você avalia a sua saúde?',
          texto:        'Como você avalia a sua saúde em geral?',
          audioTexto:   'Como você avalia a sua saúde em geral? Pense em como você se sente tanto no corpo quanto na cabeça.',
          tipo: 'positiva',
          escalaPropria: ESCALA_SAUDE,  /* escala de avaliação, não de frequência */
        },
        {
          id: 'q23',
          dimensaoNome: 'Satisfação no Trabalho',
          textoTecnico: 'Considerando todos os aspectos, você está satisfeito com o seu trabalho?',
          texto:        'No geral, você está satisfeito(a) com o seu trabalho?',
          audioTexto:   'No geral, você está satisfeito com o seu trabalho? Pense em tudo junto: as tarefas, as pessoas, o ambiente e o salário.',
          tipo: 'positiva',
        },
      ],
    },
  ];

  /* ── Pontuação por questão (escala 0–100) ───────────────── */
  /* Positiva: Nunca=0  → Sempre=100  (ou Fraca=0 → Excelente=100) */
  /* Negativa: Nunca=100 → Sempre=0                                */
  function pontuar(questaoId, valor) {
    if (valor == null) return null;
    const q = _todas().find(x => x.id === questaoId);
    if (!q) return null;
    return q.tipo === 'positiva'
      ? (Number(valor) - 1) * 25
      : (5 - Number(valor)) * 25;
  }

  /* ── Score por dimensão ─────────────────────────────────── */
  function calcularDimensoes(respostas) {
    return DIMENSOES.map(dim => {
      const scores = dim.perguntas
        .map(p => pontuar(p.id, respostas[p.id]))
        .filter(s => s !== null);
      const media = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return {
        id:             dim.id,
        nome:           dim.nome,
        totalPerguntas: dim.perguntas.length,
        respondidas:    scores.length,
        media,
        nivel: media === null ? 'sem_dados'
             : media >= 67   ? 'favoravel'
             : media >= 34   ? 'intermediario'
             : 'desfavoravel',
      };
    });
  }

  /* ── Score geral (média das dimensões com dados) ─────────── */
  function calcularScoreGeral(respostas) {
    const dims = calcularDimensoes(respostas).filter(d => d.media !== null);
    if (dims.length === 0) return null;
    return Math.round(dims.reduce((s, d) => s + d.media, 0) / dims.length);
  }

  function _todas() {
    return DIMENSOES.flatMap(d => d.perguntas);
  }

  function todas()          { return _todas(); }
  function totalPerguntas() { return _todas().length; }

  return {
    ESCALA,
    ESCALA_SAUDE,
    DIMENSOES,
    todas,
    totalPerguntas,
    pontuar,
    calcularDimensoes,
    calcularScoreGeral,
  };
})();
