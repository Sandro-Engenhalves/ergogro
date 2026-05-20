/* ============================================================
   ErgoGRO — Módulo: AEP (Avaliação Ergonômica Preliminar)
   Gerencia todas as seções da AEP:
   identificacao | posto | checklist | analise | relatorio
   ============================================================ */

const ModuloAEP = (() => {

  let _secaoAtual = 'identificacao';

  /* ── Dados do checklist NR-17 (preservados) ──────────────── */
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

  const ORDEM_BLOCOS = ['organizacao', 'cargas', 'mobiliario', 'maquinas', 'ambiente', 'psicossocial'];
  let _blocoAtivo = 'organizacao';

  /* ── Seções do módulo AEP ────────────────────────────────── */
  const SECOES = [
    { id: 'identificacao', icone: '📋', label: 'Identificação' },
    { id: 'posto',         icone: '🏭', label: 'Posto'         },
    { id: 'checklist',     icone: '✅', label: 'Checklist'     },
    { id: 'analise',       icone: '🔬', label: 'Análise'       },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'     },
  ];

  /* ── Renderiza o shell AEP completo ──────────────────────── */
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

  /* ── Troca de seção ──────────────────────────────────────── */
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
    } else if (secao === 'analise') {
      el.innerHTML = _htmlAnalise();
      _carregarAnalise();
    } else if (secao === 'relatorio') {
      el.innerHTML = _htmlRelatorioAEP();
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

  function _htmlPosto() {
    const av  = App.obterAvaliacaoAtual();
    const p   = av?.aep?.posto || {};

    const exposicoes = [
      'Postura forçada de pescoço/cabeça',
      'Postura forçada de ombros/braços',
      'Postura forçada de tronco',
      'Trabalho em postura estática prolongada',
      'Movimentos repetitivos de membros superiores',
      'Levantamento e manuseio manual de cargas',
      'Esforço físico intenso',
      'Vibração de mãos e braços',
      'Vibração de corpo inteiro',
      'Trabalho cognitivo de alta exigência',
      'Trabalho noturno ou em turnos',
      'Pressão por ritmo / metas de produção',
    ];

    const checkboxesHTML = exposicoes.map(exp => {
      const marcado = (p.exposicoes || []).includes(exp);
      return `
        <label class="check-item">
          <input type="checkbox" name="exposicao" value="${exp}" ${marcado ? 'checked' : ''}>
          <div class="check-box">✓</div>
          <span style="font-size:var(--txt-sm)">${exp}</span>
        </label>
      `;
    }).join('');

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>🏭</span>
          <span>Caracterize o posto de trabalho avaliado. Essas informações complementam
          o checklist e compõem o relatório técnico.</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Tipo e Organização</div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="posto-tipo-atividade">Tipo de Atividade</label>
              <select id="posto-tipo-atividade">
                <option value="">Selecione...</option>
                <option value="sentado" ${p.tipoAtividade === 'sentado' ? 'selected' : ''}>Sentado</option>
                <option value="em_pe" ${p.tipoAtividade === 'em_pe' ? 'selected' : ''}>Em pé</option>
                <option value="alternado" ${p.tipoAtividade === 'alternado' ? 'selected' : ''}>Alternado (sentado/em pé)</option>
                <option value="variado" ${p.tipoAtividade === 'variado' ? 'selected' : ''}>Variado / Dinâmico</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="posto-turno">Turno de Trabalho</label>
              <select id="posto-turno">
                <option value="">Selecione...</option>
                <option value="diurno"  ${p.turno === 'diurno'  ? 'selected' : ''}>Diurno</option>
                <option value="vespertino" ${p.turno === 'vespertino' ? 'selected' : ''}>Vespertino</option>
                <option value="noturno" ${p.turno === 'noturno' ? 'selected' : ''}>Noturno</option>
                <option value="misto"   ${p.turno === 'misto'   ? 'selected' : ''}>Misto / Revezamento</option>
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
            <label for="posto-ferramentas">Principais Ferramentas e Equipamentos Utilizados</label>
            <textarea id="posto-ferramentas" rows="3"
              placeholder="Liste as ferramentas, máquinas e equipamentos usados nesta função..."
            >${p.ferramentas || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="posto-layout">Descrição do Layout do Posto de Trabalho</label>
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
            <textarea id="posto-atividade-real" rows="5"
              placeholder="Descreva com base em observação direta: sequência de tarefas, posturas assumidas, esforços realizados, interações com equipamentos e outros trabalhadores..."
            >${p.atividadeReal || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s3)">Exposições Identificadas</div>
          <p style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
            Marque as exposições presentes neste posto de trabalho:
          </p>
          <div id="exposicoes-lista">${checkboxesHTML}</div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Evidências e Observações</div>
          <div class="grupo-campo">
            <label for="posto-evidencias">Observações Técnicas e Evidências Coletadas</label>
            <textarea id="posto-evidencias" rows="4"
              placeholder="Registre fotos tiradas (nomes/referências), medições realizadas, relatos dos trabalhadores, observações técnicas adicionais..."
            >${p.evidencias || ''}</textarea>
          </div>
          <div class="aviso-tecnico info">
            <span>📷</span>
            <span>Registro fotográfico: anexe as fotos ao relatório final (PDF/ZIP).
            Referências no campo acima (ex.: "Foto 01 — postura de pescoço em extensão").</span>
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
    av.aep.posto.tipoAtividade  = get('posto-tipo-atividade');
    av.aep.posto.turno          = get('posto-turno');
    av.aep.posto.cicloTrabalho  = get('posto-ciclo');
    av.aep.posto.ciclosHora     = get('posto-ciclos-hora');
    av.aep.posto.ferramentas    = get('posto-ferramentas');
    av.aep.posto.layout         = get('posto-layout');
    av.aep.posto.atividadeReal  = get('posto-atividade-real');
    av.aep.posto.evidencias     = get('posto-evidencias');

    /* Exposições marcadas */
    av.aep.posto.exposicoes = Array.from(
      document.querySelectorAll('input[name="exposicao"]:checked')
    ).map(el => el.value);
  }

  function salvarPosto() {
    _salvarPosto();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Posto salvo', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: CHECKLIST NR-17
     (código preservado da versão original)
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

  /* Handlers do checklist */
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

  function _htmlAnalise() {
    const av = App.obterAvaliacaoAtual();
    const a  = av?.aep?.analise || {};

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>🔬</span>
          <span>Com base no checklist e na observação do posto, registre a análise técnica,
          classifique o risco geral e formule as recomendações.</span>
        </div>

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
              <option value="baixo"    ${a.nivelRiscoGeral === 'baixo'    ? 'selected' : ''}>🟢 Baixo — Situação adequada, ações de melhoria opcionais</option>
              <option value="medio"    ${a.nivelRiscoGeral === 'medio'    ? 'selected' : ''}>🟡 Médio — Não conformidades identificadas, ação planejada necessária</option>
              <option value="alto"     ${a.nivelRiscoGeral === 'alto'     ? 'selected' : ''}>🔴 Alto — Risco significativo, ação corretiva prioritária</option>
              <option value="critico"  ${a.nivelRiscoGeral === 'critico'  ? 'selected' : ''}>🚨 Crítico — Risco iminente, intervenção imediata necessária</option>
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
                <option value="imediata"  ${a.prioridadeIntervencao === 'imediata'  ? 'selected' : ''}>Imediata (até 30 dias)</option>
                <option value="curto"     ${a.prioridadeIntervencao === 'curto'     ? 'selected' : ''}>Curto prazo (até 90 dias)</option>
                <option value="medio"     ${a.prioridadeIntervencao === 'medio'     ? 'selected' : ''}>Médio prazo (até 6 meses)</option>
                <option value="longo"     ${a.prioridadeIntervencao === 'longo'     ? 'selected' : ''}>Longo prazo (até 1 ano)</option>
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
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _carregarAnalise() { /* dados já embutidos no HTML via _htmlAnalise() */ }

  function onAETChange(checked) {
    document.getElementById('div-justificativa-aet')?.classList.toggle('oculto', !checked);
  }

  function _salvarAnalise() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.aep) av.aep = {};
    if (!av.aep.analise) av.aep.analise = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.aep.analise.analiseTecnica       = get('an-analise');
    av.aep.analise.nivelRiscoGeral      = get('an-nivel-risco');
    av.aep.analise.justificativaRisco   = get('an-justificativa');
    av.aep.analise.prioridadeIntervencao= get('an-prioridade');
    av.aep.analise.prazoRetorno         = get('an-prazo-retorno');
    av.aep.analise.recomendacoes        = get('an-recomendacoes');
    av.aep.analise.indicaAET            = document.getElementById('an-indica-aet')?.checked || false;
    av.aep.analise.justificativaAET     = get('an-justificativa-aet');
    av.aep.analise.responsavelAcompanhamento = get('an-responsavel');
    /* Espelha para o campo relatorio (compatibilidade) */
    av.relatorio.necessitaAET      = av.aep.analise.indicaAET;
    av.relatorio.justificativaAET  = av.aep.analise.justificativaAET;
  }

  function salvarAnalise() {
    _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Análise salva', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO AEP
  ══════════════════════════════════════════════════════════ */

  function _htmlRelatorioAEP() {
    const av      = App.obterAvaliacaoAtual();
    const riscos  = calcularRiscoGeral(av);
    const analise = av?.aep?.analise || {};
    const posto   = av?.aep?.posto   || {};

    const NIVEL_LABEL = { baixo: '🟢 Baixo', medio: '🟡 Médio', alto: '🔴 Alto', critico: '🚨 Crítico' };

    const naoConformes = obterNaoConformes(av);

    return `
      <div class="container">
        <div style="margin-top:var(--s4);text-align:center;margin-bottom:var(--s5)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">
            Avaliação Ergonômica Preliminar — AEP
          </div>
          <div style="font-size:var(--txt-xl);font-weight:700">Relatório Técnico</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            ${av.empresa?.nome || 'Empresa'} · ${av.setor || ''} · ${_formatarData(av.empresa?.dataAvaliacao)}
          </div>
        </div>

        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="ModuloAEP.imprimirRelatorio()">🖨️ Imprimir PDF</button>
          <button class="btn btn-secundario" onclick="ModuloAEP.exportarJSON()">📤 Exportar JSON</button>
        </div>

        <!-- Resumo de riscos -->
        <div class="relatorio-resumo-risco">
          <div class="resumo-risco-card alto">
            <div class="numero">${riscos.alto}</div><div class="label">Risco Alto</div>
          </div>
          <div class="resumo-risco-card medio">
            <div class="numero">${riscos.medio}</div><div class="label">Risco Médio</div>
          </div>
          <div class="resumo-risco-card baixo">
            <div class="numero">${riscos.baixo}</div><div class="label">Risco Baixo</div>
          </div>
        </div>

        <!-- Dados de identificação -->
        <div class="relatorio-secao">
          <h3>Identificação</h3>
          <div class="card">
            ${_linhaInfo('Empresa', av.empresa?.nome)}
            ${_linhaInfo('CNPJ', av.empresa?.cnpj)}
            ${_linhaInfo('Setor', av.setor)}
            ${_linhaInfo('Função', av.funcao)}
            ${_linhaInfo('Nº Trabalhadores', av.numTrabalhadores)}
            ${_linhaInfo('Data', _formatarData(av.empresa?.dataAvaliacao))}
            ${_linhaInfo('Responsável', av.empresa?.responsavelTecnico)}
            ${_linhaInfo('Registro', av.empresa?.registroProfissional)}
          </div>
        </div>

        <!-- Posto de trabalho -->
        ${posto.atividadeReal ? `
        <div class="relatorio-secao">
          <h3>Caracterização do Posto</h3>
          <div class="card">
            ${_linhaInfo('Tipo de atividade', posto.tipoAtividade)}
            ${_linhaInfo('Turno', posto.turno)}
            ${_linhaInfo('Ciclo', posto.cicloTrabalho)}
            ${posto.exposicoes?.length ? _linhaInfo('Exposições', posto.exposicoes.join(', ')) : ''}
            ${posto.atividadeReal ? `<div style="margin-top:var(--s3)"><strong style="font-size:var(--txt-sm)">Atividade Real:</strong><p style="font-size:var(--txt-sm);margin-top:var(--s2)">${posto.atividadeReal}</p></div>` : ''}
          </div>
        </div>` : ''}

        <!-- Não conformidades -->
        ${naoConformes.length > 0 ? `
        <div class="relatorio-secao">
          <h3>Não Conformidades Identificadas</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>Bloco</th><th>Item</th><th>Risco</th></tr></thead>
              <tbody>
                ${naoConformes.map(nc => `
                  <tr>
                    <td style="white-space:nowrap">${nc.blocoTitulo}</td>
                    <td style="font-size:var(--txt-xs)">${nc.itemTexto.slice(0, 80)}${nc.itemTexto.length > 80 ? '…' : ''}</td>
                    <td><span class="badge badge-${nc.risco || 'medio'}">${NIVEL_LABEL[nc.risco] || nc.risco}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <!-- Análise técnica -->
        ${analise.analiseTecnica ? `
        <div class="relatorio-secao">
          <h3>Análise Técnica</h3>
          <div class="card">
            ${analise.nivelRiscoGeral ? `<div style="margin-bottom:var(--s3)"><strong>Nível de Risco: </strong><span class="badge badge-${analise.nivelRiscoGeral === 'baixo' ? 'baixo' : analise.nivelRiscoGeral === 'medio' ? 'medio' : 'alto'}">${NIVEL_LABEL[analise.nivelRiscoGeral] || analise.nivelRiscoGeral}</span></div>` : ''}
            <p style="font-size:var(--txt-sm)">${analise.analiseTecnica}</p>
          </div>
        </div>` : ''}

        <!-- Recomendações -->
        ${analise.recomendacoes ? `
        <div class="relatorio-secao">
          <h3>Recomendações Técnicas</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${analise.recomendacoes}</p></div>
        </div>` : ''}

        <!-- Indicação AET -->
        ${analise.indicaAET ? `
        <div class="aviso-tecnico aviso">
          <span>⚠️</span>
          <span><strong>Esta AEP indica necessidade de AET.</strong> ${analise.justificativaAET || ''}</span>
        </div>` : ''}

        <!-- Plano de ação resumido -->
        ${av.planoAcao?.length > 0 ? `
        <div class="relatorio-secao">
          <h3>Plano de Ação (${av.planoAcao.length} ação(ões))</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>#</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
              <tbody>
                ${av.planoAcao.map((a, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td style="font-size:var(--txt-xs)">${a.descricao?.slice(0,60)}${a.descricao?.length > 60 ? '…' : ''}</td>
                    <td style="font-size:var(--txt-xs)">${a.responsavel || '—'}</td>
                    <td style="font-size:var(--txt-xs)">${_formatarData(a.prazo)}</td>
                    <td><span class="status-chip status-${a.status}">${a.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <div style="text-align:center;padding:var(--s6) 0;color:var(--texto-sec);font-size:var(--txt-xs)">
          ErgoGRO — AEP conforme NR-17 / GRO-PGR · Documento técnico de uso profissional
        </div>
      </div>
    `;
  }

  function imprimirRelatorio() {
    _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) Storage.salvar(av);
    window.print();
  }

  function exportarJSON() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const json  = Storage.exportarJSON(av.id);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `AEP_${(av.empresa.nome || 'ergogro').replace(/\s+/g,'_')}_${(av.empresa.dataAvaliacao||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('JSON exportado', 'sucesso');
  }

  /* ── Helpers de cálculo (preservados) ───────────────────── */

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
    salvarPosto,
    /* análise */
    onAETChange, salvarAnalise,
    /* relatório */
    imprimirRelatorio, exportarJSON,
    /* cálculos (usados por outros módulos) */
    calcularRiscoGeral, obterNaoConformes,
    /* dados estáticos exportados */
    BLOCOS, ORDEM_BLOCOS
  };
})();
