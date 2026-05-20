/* ============================================================
   ErgoGRO — Módulo: COPSOQ Reduzido (41 questões)
   Avaliação dos fatores psicossociais relacionados ao trabalho.

   AVISO TÉCNICO:
   - Resultados devem ser analisados em nível de GRUPO/SETOR
   - NÃO individualizar resultados
   - NÃO utilizar como diagnóstico médico ou psicológico
   - O sistema apoia a decisão técnica do profissional habilitado
   ============================================================ */

const ModuloCOPSOQ = (() => {

  /* ── Escalas de resposta ──────────────────────────────────── */
  const ESCALAS = {
    frequencia: [
      { valor: 1, rotulo: 'Nunca' },
      { valor: 2, rotulo: 'Raramente' },
      { valor: 3, rotulo: 'Às vezes' },
      { valor: 4, rotulo: 'Frequen-temente' },
      { valor: 5, rotulo: 'Sempre' }
    ],
    concordancia: [
      { valor: 1, rotulo: 'Discordo totalmente' },
      { valor: 2, rotulo: 'Discordo' },
      { valor: 3, rotulo: 'Neutro' },
      { valor: 4, rotulo: 'Concordo' },
      { valor: 5, rotulo: 'Concordo totalmente' }
    ],
    saude: [
      { valor: 1, rotulo: 'Muito ruim' },
      { valor: 2, rotulo: 'Ruim' },
      { valor: 3, rotulo: 'Regular' },
      { valor: 4, rotulo: 'Boa' },
      { valor: 5, rotulo: 'Excelente' }
    ]
  };

  /* ── Banco de questões COPSOQ-III reduzido ────────────────── */
  /* invertido: true = item positivo (maior valor = melhor condição) */
  const QUESTOES = [
    // EXIGÊNCIAS QUANTITATIVAS
    { id: 'c01', dim: 'Exigências Quantitativas',      escala: 'frequencia',   invertido: false, texto: 'Com que frequência você tem que trabalhar muito rapidamente?' },
    { id: 'c02', dim: 'Exigências Quantitativas',      escala: 'frequencia',   invertido: false, texto: 'Com que frequência você tem que trabalhar mais do que consegue dar conta?' },
    { id: 'c03', dim: 'Exigências Quantitativas',      escala: 'frequencia',   invertido: false, texto: 'Com que frequência você fica com trabalho em atraso?' },
    // RITMO DE TRABALHO
    { id: 'c04', dim: 'Ritmo de Trabalho',             escala: 'concordancia', invertido: false, texto: 'O ritmo do trabalho é muito acelerado?' },
    // EXIGÊNCIAS COGNITIVAS
    { id: 'c05', dim: 'Exigências Cognitivas',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho exige que você tome decisões difíceis?' },
    { id: 'c06', dim: 'Exigências Cognitivas',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho exige atenção constante e concentração?' },
    { id: 'c07', dim: 'Exigências Cognitivas',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho exige que você memorize muitas informações ao mesmo tempo?' },
    // EXIGÊNCIAS EMOCIONAIS
    { id: 'c08', dim: 'Exigências Emocionais',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho envolve situações emocionalmente desgastantes?' },
    { id: 'c09', dim: 'Exigências Emocionais',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho exige que você se preocupe com o bem-estar de outras pessoas?' },
    { id: 'c10', dim: 'Exigências Emocionais',         escala: 'frequencia',   invertido: false, texto: 'Com que frequência o trabalho exige que você esconda seus sentimentos ou emoções?' },
    // INFLUÊNCIA NO TRABALHO
    { id: 'c11', dim: 'Influência no Trabalho',        escala: 'frequencia',   invertido: true,  texto: 'Com que frequência você pode influenciar a quantidade de trabalho que lhe cabe?' },
    { id: 'c12', dim: 'Influência no Trabalho',        escala: 'frequencia',   invertido: true,  texto: 'Com que frequência você tem influência sobre o tipo de tarefas que realiza?' },
    { id: 'c13', dim: 'Influência no Trabalho',        escala: 'frequencia',   invertido: true,  texto: 'Com que frequência você pode decidir quando fazer uma pausa?' },
    // POSSIBILIDADES DE DESENVOLVIMENTO
    { id: 'c14', dim: 'Possibilidades de Desenvolvimento', escala: 'frequencia', invertido: true, texto: 'Com que frequência o trabalho exige que você tome iniciativas?' },
    { id: 'c15', dim: 'Possibilidades de Desenvolvimento', escala: 'frequencia', invertido: true, texto: 'Com que frequência o trabalho lhe dá oportunidade de aprender coisas novas?' },
    { id: 'c16', dim: 'Possibilidades de Desenvolvimento', escala: 'frequencia', invertido: true, texto: 'Com que frequência você pode usar suas habilidades e conhecimentos no trabalho?' },
    // PREVISIBILIDADE
    { id: 'c17', dim: 'Previsibilidade',               escala: 'frequencia',   invertido: true,  texto: 'Com que frequência você recebe informações sobre decisões importantes com antecedência suficiente?' },
    { id: 'c18', dim: 'Previsibilidade',               escala: 'frequencia',   invertido: true,  texto: 'Com que frequência as mudanças que afetam o seu trabalho são comunicadas previamente?' },
    // TRANSPARÊNCIA DO PAPEL
    { id: 'c19', dim: 'Transparência do Papel',        escala: 'concordancia', invertido: true,  texto: 'Há uma clara definição do que se espera de você no trabalho?' },
    { id: 'c20', dim: 'Transparência do Papel',        escala: 'concordancia', invertido: true,  texto: 'Você sabe exatamente quais são suas responsabilidades no trabalho?' },
    { id: 'c21', dim: 'Transparência do Papel',        escala: 'concordancia', invertido: true,  texto: 'Você conhece claramente os objetivos do seu setor/departamento?' },
    // RECOMPENSAS
    { id: 'c22', dim: 'Recompensas',                   escala: 'frequencia',   invertido: true,  texto: 'Com que frequência seu trabalho é reconhecido e valorizado pela chefia?' },
    { id: 'c23', dim: 'Recompensas',                   escala: 'concordancia', invertido: true,  texto: 'Você é tratado de forma justa e com respeito no trabalho?' },
    // CONFLITOS DE PAPEL
    { id: 'c24', dim: 'Conflitos de Papel',            escala: 'frequencia',   invertido: false, texto: 'Com que frequência você recebe solicitações conflitantes de pessoas diferentes no trabalho?' },
    { id: 'c25', dim: 'Conflitos de Papel',            escala: 'concordancia', invertido: false, texto: 'Você frequentemente tem que fazer coisas que entram em conflito com seus valores pessoais?' },
    // APOIO SOCIAL DE COLEGAS
    { id: 'c26', dim: 'Apoio de Colegas',              escala: 'frequencia',   invertido: true,  texto: 'Com que frequência seus colegas de trabalho o(a) apoiam quando você tem dificuldades?' },
    { id: 'c27', dim: 'Apoio de Colegas',              escala: 'concordancia', invertido: true,  texto: 'Há boa cooperação e espírito de equipe entre os colegas de trabalho?' },
    { id: 'c28', dim: 'Apoio de Colegas',              escala: 'concordancia', invertido: true,  texto: 'Você sente que faz parte de uma comunidade no seu local de trabalho?' },
    // APOIO SOCIAL DE SUPERIORES
    { id: 'c29', dim: 'Apoio de Superiores',           escala: 'frequencia',   invertido: true,  texto: 'Com que frequência seu superior imediato o(a) apoia quando você tem dificuldades?' },
    { id: 'c30', dim: 'Apoio de Superiores',           escala: 'concordancia', invertido: true,  texto: 'Seu superior imediato valoriza o desenvolvimento e bem-estar dos trabalhadores?' },
    // QUALIDADE DA LIDERANÇA
    { id: 'c31', dim: 'Qualidade da Liderança',        escala: 'concordancia', invertido: true,  texto: 'Seu superior imediato planeja bem o trabalho da equipe?' },
    { id: 'c32', dim: 'Qualidade da Liderança',        escala: 'concordancia', invertido: true,  texto: 'Seu superior imediato resolve conflitos de forma adequada e justa?' },
    { id: 'c33', dim: 'Qualidade da Liderança',        escala: 'concordancia', invertido: true,  texto: 'Seu superior imediato comunica-se de forma clara com a equipe?' },
    // SENTIDO DO TRABALHO
    { id: 'c34', dim: 'Sentido do Trabalho',           escala: 'concordancia', invertido: true,  texto: 'Seu trabalho tem significado e propósito para você?' },
    { id: 'c35', dim: 'Sentido do Trabalho',           escala: 'concordancia', invertido: true,  texto: 'Você se sente motivado e envolvido com o que faz no trabalho?' },
    { id: 'c36', dim: 'Sentido do Trabalho',           escala: 'concordancia', invertido: true,  texto: 'Você está satisfeito com o seu trabalho de forma geral?' },
    // INSEGURANÇA NO TRABALHO
    { id: 'c37', dim: 'Insegurança no Trabalho',       escala: 'concordancia', invertido: false, texto: 'Você está preocupado com a possibilidade de perder o emprego?' },
    { id: 'c38', dim: 'Insegurança no Trabalho',       escala: 'concordancia', invertido: false, texto: 'Você está preocupado que novas tecnologias ou mudanças tornem sua função desnecessária?' },
    // SAÚDE E BEM-ESTAR
    { id: 'c39', dim: 'Saúde e Bem-Estar',             escala: 'frequencia',   invertido: false, texto: 'Com que frequência você se sente esgotado emocionalmente após o trabalho?' },
    { id: 'c40', dim: 'Saúde e Bem-Estar',             escala: 'frequencia',   invertido: false, texto: 'Com que frequência você se sente estressado no trabalho?' },
    { id: 'c41', dim: 'Saúde e Bem-Estar',             escala: 'saude',        invertido: true,  texto: 'Em geral, como você avalia a sua própria saúde atualmente?' },
  ];

  /* ── Renderiza a tela COPSOQ ─────────────────────────────── */
  function renderizar() {
    const tela = document.getElementById('tela-copsoq');
    const av = App.obterAvaliacaoAtual();
    const respostas = av?.copsoq?.respostas || {};

    /* Agrupa questões por dimensão */
    const dimensoes = {};
    QUESTOES.forEach(q => {
      if (!dimensoes[q.dim]) dimensoes[q.dim] = [];
      dimensoes[q.dim].push(q);
    });

    const dimensoesHTML = Object.entries(dimensoes).map(([dim, questoes]) => {
      const questoesHTML = questoes.map((q, idx) => {
        const escala = ESCALAS[q.escala];
        const resposta = respostas[q.id];

        const opcoesHTML = escala.map(op => `
          <label>
            <input type="radio" name="${q.id}" value="${op.valor}"
                   ${resposta == op.valor ? 'checked' : ''}
                   onchange="ModuloCOPSOQ.onRespostaChange('${q.id}', ${op.valor})">
            <span class="valor">${op.valor}</span>
            <span class="rotulo">${op.rotulo}</span>
          </label>
        `).join('');

        const respondido = resposta !== undefined && resposta !== null;

        return `
          <div class="copsoq-questao ${respondido ? 'respondida' : ''}" id="q-${q.id}">
            <div class="q-num">Q${q.id.replace('c', '').padStart(2, '0')} de ${QUESTOES.length}</div>
            <div class="q-texto">${q.texto}</div>
            <div class="escala-copsoq">${opcoesHTML}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="copsoq-dimensao">
          <div class="copsoq-dimensao-titulo">
            📊 ${dim}
          </div>
          ${questoesHTML}
        </div>
      `;
    }).join('');

    /* Calcula progresso atual */
    const respondidas = Object.keys(respostas).length;
    const pct = Math.round((respondidas / QUESTOES.length) * 100);

    tela.innerHTML = `
      <div class="container">

        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span><strong>Aviso Técnico:</strong> Este instrumento avalia fatores psicossociais
          em nível de <strong>grupo/setor</strong>. Os resultados não devem ser individualizados
          nem utilizados como diagnóstico médico ou psicológico. O profissional habilitado
          é responsável pela interpretação técnica.</span>
        </div>

        <div class="copsoq-intro">
          <strong>Instrução de preenchimento:</strong> As respostas devem refletir a percepção
          predominante do grupo de trabalhadores avaliados. Aplique o questionário de forma
          consolidada com base em entrevistas e observações do grupo.
          <br><br>
          <strong>Progresso:</strong> ${respondidas} de ${QUESTOES.length} questões respondidas (${pct}%)
          <div class="barra-progresso" style="margin-top:var(--s2);margin-bottom:0">
            <div class="barra-progresso-fill" id="copsoq-progresso" style="width:${pct}%"></div>
          </div>
        </div>

        ${dimensoesHTML}

        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s6)">
          <button class="btn btn-primario" style="flex:1" onclick="ModuloCOPSOQ.salvar()">
            💾 Salvar Respostas
          </button>
          <button class="btn btn-secundario" onclick="ModuloCOPSOQ.verResultados()">
            📊 Ver Resultado
          </button>
        </div>

      </div>

      <!-- Modal de resultados -->
      <div class="modal-overlay oculto" id="modal-copsoq">
        <div class="modal-panel">
          <div class="modal-titulo">
            📊 Resultado COPSOQ por Dimensão
            <button class="btn-icone" onclick="ModuloCOPSOQ.fecharModal()">✕</button>
          </div>
          <div id="modal-copsoq-conteudo"></div>
        </div>
      </div>
    `;
  }

  /* ── Salva resposta individual ────────────────────────────── */
  function onRespostaChange(questaoId, valor) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    av.copsoq.respostas[questaoId] = valor;

    /* Atualiza estilo visual da questão */
    const el = document.getElementById(`q-${questaoId}`);
    if (el) el.classList.add('respondida');

    /* Atualiza barra de progresso em tempo real */
    const respondidas = Object.keys(av.copsoq.respostas).length;
    const pct = Math.round((respondidas / QUESTOES.length) * 100);
    const barra = document.getElementById('copsoq-progresso');
    if (barra) barra.style.width = `${pct}%`;
  }

  /* ── Persiste no storage ──────────────────────────────────── */
  function salvar() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    try {
      Storage.salvar(av);
      App.mostrarToast('Respostas COPSOQ salvas', 'sucesso');
    } catch (e) {
      App.mostrarToast(e.message, 'erro');
    }
  }

  /* ── Calcula resultados por dimensão ─────────────────────── */
  function calcularResultados(avaliacao) {
    const respostas = avaliacao?.copsoq?.respostas || {};
    const dimensoes = {};

    QUESTOES.forEach(q => {
      if (!dimensoes[q.dim]) {
        dimensoes[q.dim] = { questoes: [], soma: 0, n: 0, positivo: true };
      }
      dimensoes[q.dim].questoes.push(q);

      const val = respostas[q.id];
      if (val !== undefined && val !== null) {
        /* Normaliza para 0-100: itens positivos → maior = melhor; negativos → menor = melhor */
        let pontuacao;
        if (q.invertido) {
          pontuacao = ((val - 1) / 4) * 100; // 1→0, 5→100
        } else {
          pontuacao = ((5 - val) / 4) * 100; // 1→100, 5→0 (inverte: alto valor = desfavorável)
        }
        dimensoes[q.dim].soma += pontuacao;
        dimensoes[q.dim].n++;
      }
    });

    /* Calcula média e classifica */
    const resultado = {};
    Object.entries(dimensoes).forEach(([dim, dados]) => {
      const media = dados.n > 0 ? Math.round(dados.soma / dados.n) : null;
      let nivel = 'sem_dados';
      if (media !== null) {
        if (media >= 67)      nivel = 'favoravel';
        else if (media >= 34) nivel = 'intermediario';
        else                  nivel = 'desfavoravel';
      }
      resultado[dim] = {
        media,
        nivel,
        respondidas: dados.n,
        total: dados.questoes.length
      };
    });

    return resultado;
  }

  /* ── Exibe modal de resultados ───────────────────────────── */
  function verResultados() {
    salvar();
    const av = App.obterAvaliacaoAtual();
    const resultados = calcularResultados(av);

    const LABEL_NIVEL = {
      favoravel:     { texto: 'Favorável',     classe: 'badge-sucesso' },
      intermediario: { texto: 'Intermediário', classe: 'badge-aviso'   },
      desfavoravel:  { texto: 'Desfavorável',  classe: 'badge-alto'    },
      sem_dados:     { texto: 'Sem dados',     classe: 'badge-na'      }
    };

    const linhasHTML = Object.entries(resultados).map(([dim, r]) => {
      const info = LABEL_NIVEL[r.nivel];
      const pct = r.media ?? 0;
      const corBarra = r.nivel === 'favoravel' ? 'favoravel' : r.nivel === 'intermediario' ? 'intermediario' : 'desfavoravel';
      return `
        <div class="resultado-dimensao">
          <div class="dim-nome">
            ${dim}
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              ${r.respondidas}/${r.total} respondidas
            </div>
          </div>
          <div class="dim-barra">
            <div class="dim-barra-fill ${corBarra}" style="width:${pct}%"></div>
          </div>
          <span class="badge ${info.classe}">${info.texto}</span>
        </div>
      `;
    }).join('');

    document.getElementById('modal-copsoq-conteudo').innerHTML = `
      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Resultados representam a percepção do grupo avaliado.
        <strong>Favorável</strong> indica condição adequada;
        <strong>Intermediário</strong> requer atenção;
        <strong>Desfavorável</strong> indica necessidade de intervenção.</span>
      </div>
      ${linhasHTML}
      <div style="margin-top:var(--s4);padding-top:var(--s4);border-top:1px solid var(--borda);font-size:var(--txt-xs);color:var(--texto-sec)">
        Escala 0–100 normalizada. Baseado no COPSOQ-III adaptado para o contexto brasileiro.
        Resultados para uso técnico exclusivo — não substituem avaliação psicológica individualizada.
      </div>
    `;

    document.getElementById('modal-copsoq').classList.remove('oculto');
  }

  function fecharModal() {
    document.getElementById('modal-copsoq').classList.add('oculto');
  }

  /* Exporta ESCALAS para uso pelo módulo de Fatores Psicossociais */
  return { renderizar, onRespostaChange, salvar, verResultados, fecharModal, calcularResultados, QUESTOES, _ESCALAS: ESCALAS };
})();
