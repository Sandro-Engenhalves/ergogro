/* ============================================================
   ErgoGRO — ClaudeVision
   Análise de imagens via Claude API (Anthropic) diretamente
   no browser. Técnico tira foto no campo → IA descreve o
   que vê → texto inserido no campo da AEP.

   Requer: chave sk-ant-... salva em localStorage.
   Header anthropic-dangerous-direct-browser-access: true
   habilita CORS na API Anthropic para uso em browser.
   ============================================================ */

const ClaudeVision = (() => {

  const STORAGE_KEY = 'ergogro_anthropic_key';
  const MODEL       = 'claude-sonnet-4-6';
  const API_URL     = 'https://api.anthropic.com/v1/messages';
  const MAX_PX      = 1920; /* redimensionamento máximo antes do envio */

  /* ── Prompts técnicos por contexto ──────────────────────── */
  const PROMPTS = {
    layout: `Você é um engenheiro de segurança do trabalho realizando uma Avaliação Ergonômica Preliminar (AEP) conforme NR-17. Analise esta imagem do posto de trabalho e descreva o layout ergonômico de forma técnica e objetiva, abordando: disposição do mobiliário (mesa, cadeira, bancada, apoios), equipamentos presentes (monitor, teclado, mouse, ferramentas, máquinas), posicionamento e distâncias entre os elementos, organização e espaço físico disponível, e aspectos ergonômicos observados. Use linguagem técnica objetiva, adequada para laudo de engenharia.`,

    atividadeReal: `Você é um engenheiro de segurança do trabalho realizando uma Avaliação Ergonômica Preliminar (AEP) conforme NR-17. Analise esta imagem e descreva a atividade de trabalho observada de forma técnica, abordando: postura corporal adotada (cabeça, pescoço, tronco, membros superiores e inferiores), movimentos identificados (repetitivos, esforços, alcances), ferramentas ou equipamentos em uso, posição do trabalhador em relação ao posto, e demandas físicas visíveis. Use linguagem técnica objetiva, adequada para laudo de engenharia.`,

    evidencias: `Você é um engenheiro de segurança do trabalho realizando uma Avaliação Ergonômica Preliminar (AEP) conforme NR-17. Analise esta imagem e descreva as evidências ergonômicas observadas de forma técnica, abordando: não conformidades ergonômicas visíveis, riscos identificados (postural, físico, ambiental, organizacional), condições do ambiente de trabalho, e elementos que subsidiam a avaliação técnica. Use linguagem técnica objetiva, adequada para laudo de engenharia.`,
  };

  /* ── Chave API ───────────────────────────────────────────── */
  function _getKey()       { return localStorage.getItem(STORAGE_KEY) || ''; }
  function _setKey(k)      { localStorage.setItem(STORAGE_KEY, k.trim()); }
  function temChave()      { return !!_getKey(); }

  /* ── Estado de análise pendente (aguarda configurar chave) ── */
  let _pendente = null;

  /* ── Modal de configuração ───────────────────────────────── */
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
      setTimeout(() => _dispararFileInput(p.campoId, p.contexto), 200);
    }
  }

  function _fecharModal() {
    document.getElementById('modal-cv-key')?.remove();
    _pendente = null;
  }

  /* ── Ponto de entrada público ────────────────────────────── */
  function analisar(campoId, contexto) {
    if (!temChave()) {
      _pendente = { campoId, contexto };
      _abrirModalChave();
      return;
    }
    _dispararFileInput(campoId, contexto);
  }

  function configurarChave() {
    _pendente = null;
    _abrirModalChave();
  }

  /* ── Seletor de arquivo / câmera ─────────────────────────── */
  function _dispararFileInput(campoId, contexto) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    /* Sem capture="environment" para dar a opção câmera ou galeria */
    input.onchange = e => {
      const file = e.target.files?.[0];
      if (file) _processarArquivo(file, campoId, contexto);
    };
    input.click();
  }

  /* ── Processa arquivo selecionado ────────────────────────── */
  async function _processarArquivo(file, campoId, contexto) {
    const campo = document.getElementById(campoId);
    if (!campo) return;

    const textoAnterior = campo.value;
    const btn = document.getElementById(`cv-btn-${campoId}`);

    /* Estado de carregamento */
    campo.value    = '⏳ Analisando imagem com IA…';
    campo.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
      const { base64, mediaType } = await _comprimirImagem(file);
      const descricao = await _chamarAPI(base64, mediaType, contexto);

      campo.value = textoAnterior.trim()
        ? textoAnterior.trim() + '\n\n' + descricao
        : descricao;

      campo.dispatchEvent(new Event('blur', { bubbles: true }));
      App.mostrarToast('Imagem analisada pela IA', 'sucesso');
    } catch (err) {
      campo.value = textoAnterior;
      if (err.message?.includes('401') || err.message?.includes('auth')) {
        App.mostrarToast('Chave API inválida ou expirada', 'erro');
        _abrirModalChave();
      } else {
        App.mostrarToast('Erro na análise: ' + err.message, 'erro');
      }
    } finally {
      campo.disabled = false;
      if (btn) { btn.disabled = false; btn.textContent = '📷 IA'; }
      campo.focus();
    }
  }

  /* ── Comprime imagem via canvas (max 1920px, JPEG 0.82) ──── */
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
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const base64    = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
        const mediaType = 'image/jpeg';
        resolve({ base64, mediaType });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ── Chama a Claude API com visão ────────────────────────── */
  async function _chamarAPI(base64, mediaType, contexto) {
    const prompt = PROMPTS[contexto] || PROMPTS.evidencias;

    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-key':     _getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
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
    return (data.content?.[0]?.text || '').trim() || '(sem resposta)';
  }

  return {
    analisar,
    configurarChave,
    temChave,
    _confirmarChave,
    _fecharModal,
  };
})();
