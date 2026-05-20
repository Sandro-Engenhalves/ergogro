/* ============================================================
   ErgoGRO — Lógica da Tela do Trabalhador (pesquisa.html)
   Fluxo: loading → entrada CPF → instrução → perguntas → confirmação
   ============================================================ */

(async function () {

  /* ── Estado ─────────────────────────────────────────────── */
  const _estado = {
    campanhaId:  null,
    campanha:    null,
    cpfHash:     null,
    setor:       '',
    respostaId:  null,
    respostas:   {},    /* {questaoId: valor} */
    indice:      0,     /* pergunta atual (0-based) */
    todas:       [],    /* lista plana de todas as perguntas */
    ttsDisponivel: false,
    ttsFalando:  false,
  };

  const $conteudo = document.getElementById('ps-conteudo');
  const $empresa  = document.getElementById('ps-empresa-nome');

  /* ── Inicialização ──────────────────────────────────────── */
  async function init() {
    _estado.campanhaId = _lerUrlParam('c');
    _estado.todas      = PerguntasPsicossociais.todas();
    _estado.ttsDisponivel = 'speechSynthesis' in window;

    if (!_estado.campanhaId) {
      return _renderizarErro('Link inválido', 'Este link de pesquisa não contém um identificador de campanha.');
    }

    if (!firebaseConfigurado()) {
      return _renderizarErro(
        'Firebase não configurado',
        'O administrador precisa configurar o Firebase em js/firebase-pesquisa.js antes de usar esta página.',
      );
    }

    try {
      _estado.campanha = await buscarCampanha(_estado.campanhaId);
    } catch (e) {
      return _renderizarErro('Erro de conexão', 'Não foi possível carregar a pesquisa. Verifique sua conexão com a internet.');
    }

    if (!_estado.campanha) {
      return _renderizarErro('Pesquisa não encontrada', 'Este link não corresponde a nenhuma pesquisa ativa.');
    }

    if (_estado.campanha.status === 'encerrada') {
      return _renderizarEncerrada();
    }

    $empresa.textContent = _estado.campanha.empresaNome || 'Pesquisa Psicossocial';
    _renderizarEntradaCPF();
  }

  /* ── Leitura de parâmetro de URL ────────────────────────── */
  function _lerUrlParam(chave) {
    return new URLSearchParams(window.location.search).get(chave);
  }

  /* ══════════════════════════════════════════════════════════
     TELAS
  ══════════════════════════════════════════════════════════ */

  /* ── Tela: Erro ─────────────────────────────────────────── */
  function _renderizarErro(titulo, texto) {
    $conteudo.innerHTML = `
      <div class="tela-bloqueio">
        <div class="bloqueio-icone">⚠️</div>
        <div class="bloqueio-titulo">${titulo}</div>
        <div class="bloqueio-texto">${texto}</div>
      </div>
    `;
  }

  /* ── Tela: Encerrada ────────────────────────────────────── */
  function _renderizarEncerrada() {
    $empresa.textContent = _estado.campanha?.empresaNome || 'Pesquisa';
    $conteudo.innerHTML = `
      <div class="tela-bloqueio">
        <div class="bloqueio-icone">🔒</div>
        <div class="bloqueio-titulo">Pesquisa encerrada</div>
        <div class="bloqueio-texto">
          O prazo para responder esta pesquisa já terminou.<br>
          Obrigado pelo seu interesse.
        </div>
      </div>
    `;
  }

  /* ── Tela: Entrada de CPF ───────────────────────────────── */
  function _renderizarEntradaCPF(mensagemErro) {
    $conteudo.innerHTML = `
      <div class="tela-entrada">
        <div class="entrada-titulo">Consulta sobre seu trabalho</div>
        <div class="entrada-subtitulo">
          Para acessar a pesquisa, informe seu CPF.<br>
          Ele é usado <strong>somente para identificar se você já respondeu</strong>
          — não aparece no relatório.
        </div>

        ${mensagemErro ? `
          <div class="aviso-box erro">
            <span>❌</span>
            <span>${mensagemErro}</span>
          </div>
        ` : ''}

        <div class="campo-cpf-wrap">
          <label for="ps-cpf">Digite seu CPF:</label>
          <input
            type="tel"
            id="ps-cpf"
            class="campo-cpf"
            placeholder="000.000.000-00"
            maxlength="14"
            inputmode="numeric"
            autocomplete="off"
          >
        </div>

        <button class="btn-entrar" id="ps-btn-entrar" onclick="psContinuar()" disabled>
          Continuar
        </button>

        <div class="aviso-box">
          <span>🔒</span>
          <span>
            <strong>Privacidade:</strong> Suas respostas são anônimas e protegidas pela LGPD.
            Nunca serão divulgadas individualmente.
          </span>
        </div>
      </div>
    `;

    const input = document.getElementById('ps-cpf');
    const btn   = document.getElementById('ps-btn-entrar');

    input.addEventListener('input', () => {
      const formatado = _formatarCPF(input.value);
      input.value = formatado;
      btn.disabled = formatado.replace(/\D/g, '').length < 11;
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !btn.disabled) psContinuar();
    });

    input.focus();
  }

  /* ── Tela: Validando CPF ────────────────────────────────── */
  function _renderizarValidando() {
    $conteudo.innerHTML = `
      <div class="loading-wrap">
        <div class="spinner"></div>
        <span>Verificando...</span>
      </div>
    `;
  }

  /* ── Tela: Instrução inicial ─────────────────────────────── */
  function _renderizarInstrucao(jaRespondeu) {
    const camp = _estado.campanha;
    const prazo = camp.prazo
      ? ` até ${_formatarData(camp.prazo)}`
      : '';

    $conteudo.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:20px">
        ${jaRespondeu ? `
          <div class="aviso-box sucesso">
            <span>✅</span>
            <span>Você já respondeu esta pesquisa. Pode alterar suas respostas até o encerramento.</span>
          </div>
        ` : ''}

        <div class="instrucao-card">
          <div class="instrucao-titulo">Antes de começar</div>
          <ul class="instrucao-lista">
            <li><span>📋</span><span>São <strong>${PerguntasPsicossociais.totalPerguntas()} perguntas</strong> sobre como você se sente no trabalho.</span></li>
            <li><span>🕐</span><span>Leva cerca de <strong>5 a 10 minutos</strong> para responder.</span></li>
            <li><span>🔒</span><span>Suas respostas são <strong>anônimas</strong>. Não há resposta certa ou errada.</span></li>
            <li><span>💾</span><span>Seu progresso é salvo automaticamente. Você pode continuar de onde parou.</span></li>
            ${_estado.ttsDisponivel ? `<li><span>🔊</span><span>Use o botão <strong>"Ouvir"</strong> para escutar cada pergunta em voz alta.</span></li>` : ''}
          </ul>
        </div>

        ${camp.nome ? `<p style="text-align:center;color:var(--texto-sec);font-size:14px">📋 ${camp.nome}${prazo}</p>` : ''}

        <button class="btn-iniciar" onclick="psIniciarPerguntas()">
          ${jaRespondeu ? 'Ver / Alterar respostas' : 'Começar a pesquisa'}
        </button>
      </div>
    `;
  }

  /* ── Tela: Pergunta ─────────────────────────────────────── */
  function _renderizarPergunta() {
    const todas   = _estado.todas;
    const indice  = _estado.indice;
    const pergunta = todas[indice];
    if (!pergunta) { _renderizarRevisao(); return; }

    const dim = PerguntasPsicossociais.DIMENSOES.find(d => d.perguntas.some(p => p.id === pergunta.id));
    const respondidas = Object.keys(_estado.respostas).length;
    const pct = Math.round((respondidas / todas.length) * 100);
    const valorAtual  = _estado.respostas[pergunta.id] || null;
    const ultimaPergunta = indice === todas.length - 1;

    /* Usa escalaPropria se definida (ex: q22 — saúde geral) */
    const escala = pergunta.escalaPropria || PerguntasPsicossociais.ESCALA;
    const opcoesHTML = escala.map(op => `
      <button
        class="opcao-btn${valorAtual == op.valor ? ' selecionada' : ''}"
        onclick="psResponder('${pergunta.id}', ${op.valor})"
      >
        <span class="opcao-bolinha"></span>
        <span>${op.rotulo}</span>
      </button>
    `).join('');

    const iconeSom = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>`;

    $conteudo.innerHTML = `
      <!-- Progresso -->
      <div class="barra-progresso-wrap">
        <div class="barra-progresso-info">
          <span>Pergunta ${indice + 1} de ${todas.length}</span>
          <span>${pct}% concluído</span>
        </div>
        <div class="barra-progresso">
          <div class="barra-progresso-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <!-- Card da pergunta -->
      <div class="pergunta-card">
        <div class="pergunta-dimensao">${pergunta.dimensaoNome || dim?.nome || ''}</div>
        <div class="pergunta-numero">Pergunta ${indice + 1}</div>
        <div class="pergunta-texto">${pergunta.texto}</div>

        ${_estado.ttsDisponivel ? `
          <button class="btn-audio" id="btn-audio-p" onclick="psOuvir()">
            ${iconeSom} Ouvir pergunta
          </button>
        ` : ''}

        <div class="opcoes-resposta">
          ${opcoesHTML}
        </div>

        <!-- Navegação -->
        <div class="nav-perguntas">
          <button class="btn-nav anterior"
            onclick="psNavegar(-1)"
            ${indice === 0 ? 'disabled' : ''}>
            ← Anterior
          </button>

          ${ultimaPergunta ? `
            <button class="btn-nav finalizar"
              onclick="psRevisar()"
              ${valorAtual == null ? 'disabled title="Responda esta pergunta para continuar"' : ''}>
              Revisar e enviar →
            </button>
          ` : `
            <button class="btn-nav proximo"
              onclick="psNavegar(1)"
              ${valorAtual == null ? 'disabled title="Selecione uma opção para continuar"' : ''}>
              Próxima →
            </button>
          `}
        </div>
      </div>

      <div class="autosave-info">💾 Salvo automaticamente</div>
    `;
  }

  /* ── Tela: Revisão antes de enviar ─────────────────────── */
  function _renderizarRevisao() {
    const todas = _estado.todas;
    const respondidas = Object.keys(_estado.respostas).length;
    const naoRespondidas = todas.filter(p => _estado.respostas[p.id] == null);

    $conteudo.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:20px;padding:4px 0">
        <div class="instrucao-card">
          <div class="instrucao-titulo">Revisar antes de enviar</div>
          <p style="font-size:15px;color:var(--texto-sec);margin-top:8px">
            Você respondeu <strong>${respondidas} de ${todas.length}</strong> perguntas.
          </p>

          ${naoRespondidas.length > 0 ? `
            <div class="aviso-box" style="margin-top:16px;border-color:var(--aviso);background:#d2992210">
              <span>⚠️</span>
              <div>
                <strong>${naoRespondidas.length} pergunta(s) sem resposta:</strong>
                <ul style="margin-top:6px;padding-left:16px;font-size:14px;color:var(--texto-sec)">
                  ${naoRespondidas.slice(0, 5).map((p, i) => {
                    const num = todas.indexOf(p) + 1;
                    return `<li>Pergunta ${num}: ${p.texto.substring(0, 50)}...</li>`;
                  }).join('')}
                  ${naoRespondidas.length > 5 ? `<li>...e mais ${naoRespondidas.length - 5}</li>` : ''}
                </ul>
              </div>
            </div>
          ` : `
            <div class="aviso-box sucesso" style="margin-top:16px">
              <span>✅</span>
              <span>Todas as perguntas respondidas!</span>
            </div>
          `}
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          <button class="btn-nav finalizar" style="padding:18px;font-size:17px" onclick="psEnviar()">
            ✅ Enviar respostas
          </button>
          <button class="btn-nav anterior" style="padding:16px" onclick="psIniciarPerguntas()">
            ← Voltar e revisar perguntas
          </button>
        </div>

        <div class="aviso-box">
          <span>ℹ️</span>
          <span>Após enviar, você ainda pode alterar as respostas enquanto a pesquisa estiver aberta.</span>
        </div>
      </div>
    `;
  }

  /* ── Tela: Confirmação de envio ─────────────────────────── */
  function _renderizarConfirmacao() {
    $conteudo.innerHTML = `
      <div class="tela-confirmacao">
        <div class="confirmacao-icone">✅</div>
        <div class="confirmacao-titulo">Obrigado pela participação!</div>
        <div class="confirmacao-texto">
          Suas respostas foram registradas com sucesso.<br><br>
          Elas são <strong>completamente anônimas</strong> e vão ajudar a melhorar
          as condições de trabalho.
        </div>
        <div class="aviso-box" style="max-width:340px;margin-top:8px">
          <span>ℹ️</span>
          <span>Você pode fechar esta página com segurança.</span>
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════
     AÇÕES GLOBAIS (chamadas pelo HTML via onclick)
  ══════════════════════════════════════════════════════════ */

  /* Valida CPF e carrega/cria resposta */
  window.psContinuar = async function () {
    const input = document.getElementById('ps-cpf');
    if (!input) return;
    const cpf = input.value.replace(/\D/g, '');
    if (cpf.length !== 11) return;

    _renderizarValidando();

    try {
      const resultado = await verificarCPF(_estado.campanhaId, cpf);

      if (!resultado.autorizado) {
        const msgs = {
          cpf_invalido:            'CPF inválido. Verifique os números e tente novamente.',
          campanha_nao_encontrada: 'Pesquisa não encontrada.',
          encerrada:               'Esta pesquisa já foi encerrada.',
          nao_autorizado:          'Este CPF não está na lista de participantes desta pesquisa.',
        };
        return _renderizarEntradaCPF(msgs[resultado.motivo] || 'Acesso não permitido.');
      }

      _estado.cpfHash = resultado.hash;
      _estado.setor   = resultado.setor || '';

      /* Carrega ou cria resposta */
      const resp = await criarOuCarregarResposta(
        _estado.campanhaId,
        _estado.cpfHash,
        _estado.setor
      );
      _estado.respostaId = resp.id;
      _estado.respostas  = resp.respostas || {};

      const jaRespondeu = resp.status === 'finalizada';
      _renderizarInstrucao(jaRespondeu);

    } catch (e) {
      console.error(e);
      _renderizarEntradaCPF('Erro ao verificar. Verifique sua conexão e tente novamente.');
    }
  };

  /* Inicia ou volta para as perguntas */
  window.psIniciarPerguntas = function () {
    /* Vai para a primeira pergunta não respondida, ou a primeira */
    const todas = _estado.todas;
    const primeira = todas.findIndex(p => _estado.respostas[p.id] == null);
    _estado.indice = primeira >= 0 ? primeira : 0;
    _renderizarPergunta();
  };

  /* Registra resposta e avança automaticamente */
  window.psResponder = async function (questaoId, valor) {
    _estado.respostas[questaoId] = valor;
    _renderizarPergunta(); /* re-render para refletir seleção */

    /* Auto-save silencioso */
    if (_estado.respostaId) {
      try { await salvarRascunho(_estado.respostaId, { ..._estado.respostas }); }
      catch (e) { console.warn('Erro no auto-save:', e); }
    }

    /* Avança automaticamente após 400ms se não for a última */
    const total = _estado.todas.length;
    if (_estado.indice < total - 1) {
      setTimeout(() => {
        _estado.indice++;
        _renderizarPergunta();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 380);
    }
  };

  /* Navegação manual */
  window.psNavegar = function (delta) {
    const novoIndice = _estado.indice + delta;
    if (novoIndice < 0 || novoIndice >= _estado.todas.length) return;
    _estado.indice = novoIndice;
    _renderizarPergunta();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Vai para revisão */
  window.psRevisar = function () {
    _renderizarRevisao();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Envio final */
  window.psEnviar = async function () {
    if (!_estado.respostaId) return;

    const btn = document.querySelector('.btn-nav.finalizar');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      await finalizarResposta(_estado.respostaId, { ..._estado.respostas });
      _renderizarConfirmacao();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar respostas'; }
      alert('Erro ao enviar. Verifique sua conexão e tente novamente.');
    }
  };

  /* TTS — lê a pergunta atual em voz alta */
  window.psOuvir = function () {
    if (!_estado.ttsDisponivel) return;
    const pergunta = _estado.todas[_estado.indice];
    if (!pergunta) return;

    if (_estado.ttsFalando) {
      window.speechSynthesis.cancel();
      _estado.ttsFalando = false;
      const btn = document.getElementById('btn-audio-p');
      if (btn) btn.classList.remove('tocando');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(pergunta.audioTexto || pergunta.texto);
    utterance.lang  = 'pt-BR';
    utterance.rate  = 0.9;

    const btn = document.getElementById('btn-audio-p');
    if (btn) btn.classList.add('tocando');
    _estado.ttsFalando = true;

    utterance.onend = () => {
      _estado.ttsFalando = false;
      const b = document.getElementById('btn-audio-p');
      if (b) b.classList.remove('tocando');
    };

    window.speechSynthesis.speak(utterance);
  };

  /* ── Utilitários ─────────────────────────────────────────── */
  function _formatarCPF(valor) {
    const n = valor.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 3) return n;
    if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`;
    if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`;
    return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
  }

  function _formatarData(iso) {
    if (!iso) return '';
    try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; }
    catch { return iso; }
  }

  /* ── Start ──────────────────────────────────────────────── */
  init();

})();
