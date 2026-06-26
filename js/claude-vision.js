/* ============================================================
   ErgoGRO — ClaudeVision
   Análise de imagens via Claude API (Anthropic) no browser.

   Dois modos:
   - analisar(campoId, contexto)  → preenche UM campo
   - analisarCompleto()           → UMA foto preenche TODO o Posto
   ============================================================ */

const ClaudeVision = (() => {

  const STORAGE_KEY = 'ergogro_anthropic_key';
  const MODEL       = 'claude-sonnet-4-6';
  const API_URL     = 'https://api.anthropic.com/v1/messages';
  const MAX_PX      = 1920;

  /* ── IDs de exposições disponíveis no sistema ────────────── */
  const EXP_IDS = [
    'ef_pescoco','ef_ombros','ef_tronco','ef_estatica','ef_repeticao',
    'ef_cargas','ef_esforco','ef_vib_maos','ef_vib_corpo','ef_pe',
    'eo_turno','eo_ritmo','ec_cognitivo'
  ];

  /* ── Prompt análise completa (retorna JSON estruturado) ──── */
  const PROMPT_COMPLETO = `Você é um engenheiro de segurança do trabalho realizando uma Avaliação Ergonômica Preliminar (AEP) conforme NR-17. Analise esta imagem do posto de trabalho e retorne APENAS um objeto JSON válido, sem texto adicional, sem markdown, sem blocos de código.

Estrutura obrigatória:
{
  "perfilPosto": "",
  "tipoAtividade": "",
  "ferramentas": "",
  "layout": "",
  "atividadeReal": "",
  "evidencias": "",
  "exposicoesPresentes": []
}

Valores válidos para perfilPosto (escolha apenas um):
administrativo, operacional_leve, operacional_pesado, industrial_repetitivo, cognitivo_intenso, atendimento, direcao_veicular, manutencao, externo

Valores válidos para tipoAtividade (escolha apenas um):
sentado, em_pe, alternado, variado

IDs válidos para exposicoesPresentes (inclua APENAS os claramente visíveis na imagem):
ef_pescoco (pescoço/cabeça em postura forçada)
ef_ombros (ombros/braços em postura forçada)
ef_tronco (tronco em flexão ou torção)
ef_estatica (postura estática prolongada)
ef_repeticao (movimentos repetitivos de membros superiores)
ef_cargas (levantamento ou manuseio de cargas)
ef_esforco (esforço físico intenso ou força com mãos)
ef_vib_maos (vibração de mãos e braços)
ef_vib_corpo (vibração de corpo inteiro)
ef_pe (trabalho prolongado em pé)
eo_turno (indícios de trabalho noturno ou em turnos)
eo_ritmo (indícios de pressão por ritmo ou metas)
ec_cognitivo (trabalho cognitivo de alta exigência)

Preencha cada campo de texto com linguagem técnica objetiva, adequada para laudo de engenharia. Se um campo não for observável, deixe a string vazia. Retorne SOMENTE o JSON.`;

  /* ── Prompts por campo individual ────────────────────────── */
  const PROMPTS = {
    layout: `Você é um engenheiro de segurança do trabalho realizando uma AEP conforme NR-17. Analise esta imagem do posto de trabalho e descreva o layout ergonômico de forma técnica e objetiva: disposição do mobiliário (mesa, cadeira, bancada, apoios), equipamentos presentes (monitor, teclado, mouse, ferramentas, máquinas), posicionamento e distâncias entre os elementos, organização e espaço físico disponível, e aspectos ergonômicos observados. Use linguagem técnica objetiva adequada para laudo de engenharia.`,

    atividadeReal: `Você é um engenheiro de segurança do trabalho realizando uma AEP conforme NR-17. Analise esta imagem e descreva a atividade de trabalho observada de forma técnica: postura corporal adotada (cabeça, pescoço, tronco, membros superiores e inferiores), movimentos identificados (repetitivos, esforços, alcances), ferramentas ou equipamentos em uso, posição do trabalhador em relação ao posto, e demandas físicas visíveis. Use linguagem técnica objetiva adequada para laudo de engenharia.`,

    evidencias: `Você é um engenheiro de segurança do trabalho realizando uma AEP conforme NR-17. Analise esta imagem e descreva as evidências ergonômicas observadas de forma técnica: não conformidades ergonômicas visíveis, riscos identificados (postural, físico, ambiental, organizacional), condições do ambiente de trabalho, e elementos que subsidiam a avaliação técnica. Use linguagem técnica objetiva adequada para laudo de engenharia.`,
  };

  /* ── Chave API ───────────────────────────────────────────── */
  function _getKey()  { return localStorage.getItem(STORAGE_KEY) || ''; }
  function _setKey(k) { localStorage.setItem(STORAGE_KEY, k.trim()); }
  function temChave() { return !!_getKey(); }

  /* ── Estado de análise pendente ──────────────────────────── */
  let _pendente = null;

  /* ── Modal de configuração da chave ─────────────────────── */
  function _abrirModalChave() {
    if (document.getElementById('modal-cv-key')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-cv-key" style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;
        display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--fundo-card);border:1px solid var(--borda);border-radius:var(--r3);
                    max-width:420px;width:100%;padding:24px">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:12px">
            🔑 Chave API Anthropic
          </div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:16px">
            Para análise de imagens com IA, informe sua chave Anthropic.
            Ela fica salva apenas neste dispositivo (localStorage).
          </p>
          <div class="grupo-campo">
            <label for="cv-key-input">Chave API (sk-ant-…)</label>
            <input type="password" id="cv-key-input"
                   placeholder="sk-ant-api03-…"
                   value="${_getKey()}"
                   autocomplete="off"
                   style="font-family:monospace;font-size:var(--txt-xs)">
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
            <button class="btn btn-primario" onclick="ClaudeVision._confirmarChave()">
              💾 Salvar
            </button>
            <button class="btn btn-secundario" onclick="ClaudeVision._fecharModal()">
              Cancelar
            </button>
          </div>
          <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:12px">
            Obtenha sua chave em <strong>console.anthropic.com</strong>
          </p>
        </div>
      </div>
    `);
    setTimeout(() => document.getElementById('cv-key-input')?.focus(), 100);
  }

  function _confirmarChave() {
    const val = document.getElementById('cv-key-input')?.value?.trim() || '';
    if (!val.startsWith('sk-')) {
      App.mostrarToast('Chave inválida — deve começar com sk-', 'erro');
      return;
    }
    _setKey(val);
    _fecharModal();
    App.mostrarToast('Chave salva', 'sucesso');
    if (_pendente) {
      const p = _pendente;
      _pendente = null;
      setTimeout(() => {
        if      (p.tipo === 'completo')  _dispararFileInputCompleto();
        else if (p.tipo === 'analise')   ModuloAEP.gerarAnaliseCompleta();
        else if (p.tipo === 'callback' && typeof p.fn === 'function') p.fn();
        else                             _dispararFileInput(p.campoId, p.contexto);
      }, 200);
    }
  }

  function _fecharModal() {
    document.getElementById('modal-cv-key')?.remove();
    _pendente = null;
  }

  /* ══════════════════════════════════════════════════════════
     MODO 1 — Campo individual
  ══════════════════════════════════════════════════════════ */

  function analisar(campoId, contexto) {
    if (!temChave()) {
      _pendente = { campoId, contexto };
      _abrirModalChave();
      return;
    }
    _dispararFileInput(campoId, contexto);
  }

  function _dispararFileInput(campoId, contexto) {
    /* Anexado ao DOM e posicionado fora da tela (NÃO display:none — em
       alguns navegadores mobile/PWA, principalmente iOS, um input "display:none"
       falha ao abrir a câmera ou perde o evento change ao voltar). */
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.top  = '-9999px';
    input.style.left = '-9999px';
    input.onchange = e => {
      const file = e.target.files?.[0];
      if (file) _processarArquivo(file, campoId, contexto);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }

  async function _processarArquivo(file, campoId, contexto) {
    const campo = document.getElementById(campoId);
    if (!campo) return;

    /* Captura a avaliação AGORA — a chamada à IA pode demorar (campo, sinal fraco)
       e o usuário pode trocar de aba/tela enquanto espera, tornando `campo` órfão.
       Persistir no objeto de dados (não só no DOM) evita perder o texto gerado. */
    const av = App.obterAvaliacaoAtual();
    const textoAnterior = campo.value;
    const btn = document.getElementById(`cv-btn-${campoId}`);

    campo.value    = '⏳ Analisando imagem com IA…';
    campo.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    let valorFinal = null;
    try {
      const { base64, mediaType } = await _comprimirImagem(file);
      const descricao = await _chamarAPI(base64, mediaType, PROMPTS[contexto] || PROMPTS.evidencias);
      valorFinal = textoAnterior.trim()
        ? textoAnterior.trim() + '\n\n' + descricao
        : descricao;
    } catch (err) {
      const campoAtual = document.getElementById(campoId);
      if (campoAtual) campoAtual.value = textoAnterior;
      _tratarErro(err);
    }

    if (valorFinal !== null) {
      /* Atualiza o campo se ele ainda estiver na tela (mesmo nó ou recriado) */
      const campoAtual = document.getElementById(campoId);
      if (campoAtual) campoAtual.value = valorFinal;

      /* Salva direto no modelo de dados, independente da tela atual.
         Mantém o texto gerado mesmo se a gravação falhar — evita
         obrigar o usuário a refazer a foto em caso de erro de storage. */
      try {
        if (av) {
          if (!av.aep) av.aep = {};
          if (!av.aep.posto) av.aep.posto = {};
          av.aep.posto[contexto] = valorFinal;
          Storage.salvar(av);
          App.mostrarToast('Imagem analisada pela IA — descrição salva', 'sucesso');
        } else {
          App.mostrarToast('Imagem analisada, mas nenhuma avaliação ativa — copie o texto manualmente', 'erro');
        }
      } catch (err) {
        App.mostrarToast('Descrição gerada, mas falhou ao salvar: ' + err.message, 'erro');
      }
    }

    const campoFinal = document.getElementById(campoId);
    if (campoFinal) { campoFinal.disabled = false; campoFinal.focus(); }
    if (btn) { btn.disabled = false; btn.textContent = '📷 IA'; }
  }

  /* ══════════════════════════════════════════════════════════
     MODO 2 — Análise completa do posto (todos os campos)
  ══════════════════════════════════════════════════════════ */

  function analisarCompleto() {
    if (!temChave()) {
      _pendente = { tipo: 'completo' };
      _abrirModalChave();
      return;
    }
    _dispararFileInputCompleto();
  }

  function _dispararFileInputCompleto() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.top  = '-9999px';
    input.style.left = '-9999px';
    input.onchange = e => {
      const file = e.target.files?.[0];
      if (file) _processarCompleto(file);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }

  async function _processarCompleto(file) {
    _mostrarOverlay();
    try {
      const { base64, mediaType } = await _comprimirImagem(file);
      const raw   = await _chamarAPI(base64, mediaType, PROMPT_COMPLETO, 2048);
      const texto = raw.replace(/^```json\s*/i, '').replace(/\s*```$/,'').trim();
      const dados = JSON.parse(texto);
      _aplicarDadosCompletos(dados);
      App.mostrarToast('Posto analisado — revise os campos preenchidos', 'sucesso');
    } catch (err) {
      if (err instanceof SyntaxError) {
        App.mostrarToast('Erro ao interpretar resposta da IA — tente novamente', 'erro');
      } else {
        _tratarErro(err);
      }
    } finally {
      _ocultarOverlay();
    }
  }

  function _aplicarDadosCompletos(dados) {
    /* Atualiza os campos na tela, se ainda estiverem presentes */
    _setSelect('posto-perfil',        dados.perfilPosto);
    _setSelect('posto-tipo-atividade', dados.tipoAtividade);
    _setTextarea('posto-ferramentas',    dados.ferramentas);
    _setTextarea('posto-layout',         dados.layout);
    _setTextarea('posto-atividade-real', dados.atividadeReal);
    _setTextarea('posto-evidencias',     dados.evidencias);

    if (Array.isArray(dados.exposicoesPresentes) && typeof ModuloAEP !== 'undefined') {
      EXP_IDS.forEach(id => {
        const presente = dados.exposicoesPresentes.includes(id) ? 'sim' : 'nao';
        ModuloAEP.onExpChange(id, 'presente', presente);
      });
    }

    /* Salva direto no modelo de dados — a análise completa demora (foto + 2048
       tokens), então não pode depender da tela "Posto" ainda estar aberta. */
    const av = App.obterAvaliacaoAtual();
    if (!av) {
      App.mostrarToast('Análise gerada, mas nenhuma avaliação ativa — copie manualmente', 'erro');
      return;
    }
    if (!av.aep) av.aep = {};
    if (!av.aep.posto) av.aep.posto = {};
    const p = av.aep.posto;
    if (dados.perfilPosto)    p.perfilPosto    = dados.perfilPosto;
    if (dados.tipoAtividade)  p.tipoAtividade  = dados.tipoAtividade;
    if (dados.ferramentas)    p.ferramentas    = dados.ferramentas;
    if (dados.layout)         p.layout         = dados.layout;
    if (dados.atividadeReal)  p.atividadeReal  = dados.atividadeReal;
    if (dados.evidencias)     p.evidencias     = dados.evidencias;

    try {
      Storage.salvar(av);
    } catch(e) {
      App.mostrarToast('Análise gerada, mas falhou ao salvar: ' + e.message, 'erro');
    }
  }

  function _setSelect(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setTextarea(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  /* ══════════════════════════════════════════════════════════
     MODO 3 — Análise técnica (texto, sem imagem)
  ══════════════════════════════════════════════════════════ */

  function solicitarParaAnalise() {
    _pendente = { tipo: 'analise' };
    _abrirModalChave();
  }

  /* ── Chamada de texto (sem imagem) ──────────────────────── */
  async function _chamarAPITexto(prompt, maxTokens = 1024) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    _getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return (data.content?.[0]?.text || '').trim();
  }

  /* Chamada pública para outros módulos gerarem texto via IA */
  async function gerarTextoIA(prompt, maxTokens = 512) {
    return await _chamarAPITexto(prompt, maxTokens);
  }

  /* Solicita chave e chama callback depois de confirmada */
  function solicitarChaveParaChamada(callback) {
    _pendente = { tipo: 'callback', fn: callback };
    _abrirModalChave();
  }

  async function gerarAnaliseTexto(contexto, nivel, scoreValor) {
    const nivelPt = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };

    const prompt = `Você é um engenheiro de segurança do trabalho especialista em ergonomia, elaborando uma Avaliação Ergonômica Preliminar (AEP) conforme NR-17. Com base nos dados abaixo, gere o texto técnico de análise.

DADOS DA AVALIAÇÃO:
${contexto}
Retorne APENAS um objeto JSON válido, sem texto adicional, sem markdown, sem blocos de código:
{
  "analiseTecnica": "<3-4 parágrafos técnicos correlacionando as não conformidades com os riscos ergonômicos e impactos para a saúde dos trabalhadores>",
  "justificativa": "<2-3 frases justificando objetivamente o nível de risco ${nivelPt[nivel] || nivel} com base no score ${scoreValor}/100 e nas evidências coletadas>"
}

Use linguagem técnica adequada para laudo de engenharia. Cite a NR-17 quando pertinente. Mencione os domínios de maior criticidade.`;

    const raw   = await _chamarAPITexto(prompt, 2048);
    const texto = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(texto);
  }

  /* ── Overlay de carregamento (análise completa) ──────────── */
  function _mostrarOverlay() {
    if (document.getElementById('cv-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="cv-overlay" style="
        position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1500;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
        <style>@keyframes cv-spin{to{transform:rotate(360deg)}}</style>
        <div style="width:52px;height:52px;border:4px solid #fff;border-top-color:transparent;
                    border-radius:50%;animation:cv-spin .9s linear infinite"></div>
        <div style="color:#fff;font-size:16px;font-weight:700">Analisando posto de trabalho…</div>
        <div style="color:#bbb;font-size:13px">Preenchendo todos os campos com IA</div>
      </div>
    `);
  }

  function _ocultarOverlay() {
    document.getElementById('cv-overlay')?.remove();
  }

  /* ── Compressão de imagem via canvas ─────────────────────── */
  function _comprimirImagem(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX_PX || height > MAX_PX) {
          const ratio = Math.min(MAX_PX / width, MAX_PX / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.82).split(',')[1], mediaType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ── Chamada à Claude API ────────────────────────────────── */
  async function _chamarAPI(base64, mediaType, prompt, maxTokens = 1024) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    _getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text',  text: prompt }
          ]
        }]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return (data.content?.[0]?.text || '').trim();
  }

  /* ── Tratamento de erros ─────────────────────────────────── */
  function _tratarErro(err) {
    if (err.message?.includes('401') || err.message?.includes('auth')) {
      App.mostrarToast('Chave API inválida ou expirada — reconfigure', 'erro');
      _abrirModalChave();
    } else {
      App.mostrarToast('Erro na análise: ' + err.message, 'erro');
    }
  }

  /* ── Configura chave externamente ────────────────────────── */
  function configurarChave() {
    _pendente = null;
    _abrirModalChave();
  }

  return {
    analisar,
    analisarCompleto,
    gerarAnaliseTexto,
    gerarTextoIA,
    solicitarParaAnalise,
    solicitarChaveParaChamada,
    configurarChave,
    temChave,
    _confirmarChave,
    _fecharModal,
  };
})();
