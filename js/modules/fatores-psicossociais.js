/* ============================================================
   ErgoGRO — Módulo: Avaliação de Fatores Psicossociais
   Gerencia as seções: identificacao | grupo | copsoq | analise | relatorio

   AVISO TÉCNICO:
   - Resultados analisados em nível de GRUPO/SETOR
   - NÃO individualizar resultados
   - NÃO utilizar como diagnóstico médico/psicológico
   - Profissional habilitado é responsável pela interpretação
   ============================================================ */

const ModuloFP = (() => {

  let _secaoAtual = 'identificacao';

  const SECOES = [
    { id: 'identificacao', icone: '📋', label: 'Identificação' },
    { id: 'grupo',         icone: '👥', label: 'Grupo'         },
    { id: 'copsoq',        icone: '📊', label: 'COPSOQ'        },
    { id: 'analise',       icone: '🔬', label: 'Análise'       },
    { id: 'relatorio',     icone: '📄', label: 'Relatório'     },
  ];

  /* ── Renderiza o shell FP ────────────────────────────────── */
  function renderizar(secao) {
    _secaoAtual = secao || _secaoAtual;
    const tela = document.getElementById('tela-fp');

    const abasHTML = SECOES.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-secao="${s.id}"
              onclick="ModuloFP.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');

    tela.innerHTML = `
      <nav class="subnav-abas" id="subnav-fp">${abasHTML}</nav>
      <div id="fp-conteudo"></div>
    `;

    _renderizarConteudo(_secaoAtual);
  }

  function trocarSecao(secao) {
    _salvarSecaoAtual();
    _secaoAtual = secao;
    document.querySelectorAll('#subnav-fp .aba-bloco').forEach(btn => {
      btn.classList.toggle('ativa', btn.dataset.secao === secao);
    });
    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('fp-conteudo');
    if (!el) return;

    if (secao === 'identificacao') {
      ModuloIdentificacao.renderizar('fp-conteudo');
      ModuloIdentificacao.carregar(App.obterAvaliacaoAtual());
    } else if (secao === 'grupo') {
      el.innerHTML = _htmlGrupo();
    } else if (secao === 'copsoq') {
      _renderizarCOPSOQ(el);
    } else if (secao === 'analise') {
      el.innerHTML = _htmlAnalise();
    } else if (secao === 'relatorio') {
      el.innerHTML = _htmlRelatorio();
    }
  }

  function _salvarSecaoAtual() {
    if (_secaoAtual === 'identificacao') ModuloIdentificacao.salvarSilencioso();
    else if (_secaoAtual === 'grupo')    _salvarGrupo();
    else if (_secaoAtual === 'copsoq')   _salvarCOPSOQSilencioso();
    else if (_secaoAtual === 'analise')  _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: GRUPO AVALIADO
  ══════════════════════════════════════════════════════════ */

  function _htmlGrupo() {
    const av = App.obterAvaliacaoAtual();
    const g  = av?.psicossocial?.grupoAvaliado || {};

    return `
      <div class="container">
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span><strong>Aviso Técnico:</strong> Esta avaliação deve ser realizada e
          interpretada em nível de <strong>grupo</strong>. Os dados de identificação
          do grupo não devem ser utilizados para individualizar os resultados.</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">👥 Caracterização do Grupo</div>

          <div class="grupo-campo">
            <label for="fp-grupo-descricao">Descrição do Grupo Avaliado</label>
            <textarea id="fp-grupo-descricao" rows="3"
              placeholder="Descreva o grupo: cargo/função, setor, características relevantes..."
            >${g.descricao || ''}</textarea>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="fp-num-participantes">Nº de Participantes</label>
              <input type="number" id="fp-num-participantes" min="1" placeholder="Ex.: 18"
                     value="${g.numParticipantes || ''}">
            </div>
            <div class="grupo-campo">
              <label for="fp-data-coleta">Data de Aplicação</label>
              <input type="date" id="fp-data-coleta" value="${g.dataColeta || ''}">
            </div>
          </div>

          <div class="grupo-campo">
            <label for="fp-metodo-coleta">Método de Coleta dos Dados</label>
            <select id="fp-metodo-coleta">
              <option value="">Selecione...</option>
              <option value="questionario_anonimo" ${g.metodoColeta === 'questionario_anonimo' ? 'selected' : ''}>
                Questionário anônimo autopreenchido
              </option>
              <option value="entrevista_coletiva" ${g.metodoColeta === 'entrevista_coletiva' ? 'selected' : ''}>
                Entrevista coletiva / grupo focal
              </option>
              <option value="entrevista_individual" ${g.metodoColeta === 'entrevista_individual' ? 'selected' : ''}>
                Entrevistas individuais (consolidadas)
              </option>
              <option value="observacao_direta" ${g.metodoColeta === 'observacao_direta' ? 'selected' : ''}>
                Observação direta + entrevistas
              </option>
              <option value="misto" ${g.metodoColeta === 'misto' ? 'selected' : ''}>
                Método misto
              </option>
            </select>
          </div>

          <div class="grupo-campo">
            <label for="fp-grupo-obs">Observações sobre o Processo de Coleta</label>
            <textarea id="fp-grupo-obs" rows="3"
              placeholder="Contexto da aplicação, limitações observadas, condições da coleta..."
            >${g.observacoesColeta || ''}</textarea>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloFP.salvarGrupo()">
          💾 Salvar Dados do Grupo
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function _salvarGrupo() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.psicossocial) av.psicossocial = {};
    if (!av.psicossocial.grupoAvaliado) av.psicossocial.grupoAvaliado = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.psicossocial.grupoAvaliado.descricao        = get('fp-grupo-descricao');
    av.psicossocial.grupoAvaliado.numParticipantes = get('fp-num-participantes');
    av.psicossocial.grupoAvaliado.dataColeta       = get('fp-data-coleta');
    av.psicossocial.grupoAvaliado.metodoColeta     = get('fp-metodo-coleta');
    av.psicossocial.grupoAvaliado.observacoesColeta= get('fp-grupo-obs');
  }

  function salvarGrupo() {
    _salvarGrupo();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Dados do grupo salvos', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: COPSOQ (reutiliza ModuloCOPSOQ como ferramenta interna)
  ══════════════════════════════════════════════════════════ */

  function _renderizarCOPSOQ(container) {
    /* Injeta o HTML do COPSOQ diretamente no container FP */
    const av       = App.obterAvaliacaoAtual();
    const respostas = av?.copsoq?.respostas || {};
    const ESCALAS  = ModuloCOPSOQ._ESCALAS;
    const QUESTOES = ModuloCOPSOQ.QUESTOES;

    const dimensoes = {};
    QUESTOES.forEach(q => {
      if (!dimensoes[q.dim]) dimensoes[q.dim] = [];
      dimensoes[q.dim].push(q);
    });

    const respondidas = Object.keys(respostas).length;
    const pct = Math.round((respondidas / QUESTOES.length) * 100);

    const dimensoesHTML = Object.entries(dimensoes).map(([dim, questoes]) => {
      const questoesHTML = questoes.map((q, idx) => {
        const escala   = ESCALAS[q.escala];
        const resposta = respostas[q.id];
        const opcoesHTML = escala.map(op => `
          <label>
            <input type="radio" name="${q.id}" value="${op.valor}"
                   ${resposta == op.valor ? 'checked' : ''}
                   onchange="ModuloFP.onCopsoqChange('${q.id}', ${op.valor})">
            <span class="valor">${op.valor}</span>
            <span class="rotulo">${op.rotulo}</span>
          </label>
        `).join('');
        return `
          <div class="copsoq-questao" id="fpq-${q.id}">
            <div class="q-num">Q${q.id.replace('c','').padStart(2,'0')} / ${QUESTOES.length}</div>
            <div class="q-texto">${q.texto}</div>
            <div class="escala-copsoq">${opcoesHTML}</div>
          </div>
        `;
      }).join('');
      return `
        <div class="copsoq-dimensao">
          <div class="copsoq-dimensao-titulo">📊 ${dim}</div>
          ${questoesHTML}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="container">
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span><strong>COPSOQ — Ferramenta de avaliação psicossocial.</strong>
          Resultados em nível de grupo. NÃO individualizar.
          NÃO utilizar como diagnóstico médico ou psicológico.</span>
        </div>
        <div class="copsoq-intro">
          <strong>Progresso:</strong> ${respondidas} / ${QUESTOES.length} questões (${pct}%)
          <div class="barra-progresso" style="margin-top:var(--s2);margin-bottom:0">
            <div class="barra-progresso-fill" id="fp-copsoq-progresso" style="width:${pct}%"></div>
          </div>
        </div>
        ${dimensoesHTML}
        <div style="display:flex;gap:var(--s3);margin-bottom:var(--s6)">
          <button class="btn btn-primario" style="flex:1" onclick="ModuloFP.salvarCOPSOQ()">💾 Salvar Respostas</button>
          <button class="btn btn-secundario" onclick="ModuloFP.verResultadosCOPSOQ()">📊 Ver Resultado</button>
        </div>
      </div>
      <!-- Modal de resultado COPSOQ FP -->
      <div class="modal-overlay oculto" id="modal-fp-copsoq">
        <div class="modal-panel">
          <div class="modal-titulo">
            📊 Resultado por Dimensão
            <button class="btn-icone" onclick="document.getElementById('modal-fp-copsoq').classList.add('oculto')">✕</button>
          </div>
          <div id="modal-fp-copsoq-conteudo"></div>
        </div>
      </div>
    `;
  }

  function onCopsoqChange(questaoId, valor) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.copsoq) av.copsoq = { modo: 'grupo', respostas: {} };
    av.copsoq.respostas[questaoId] = valor;
    const respondidas = Object.keys(av.copsoq.respostas).length;
    const pct = Math.round((respondidas / ModuloCOPSOQ.QUESTOES.length) * 100);
    const barra = document.getElementById('fp-copsoq-progresso');
    if (barra) barra.style.width = `${pct}%`;
  }

  function _salvarCOPSOQSilencioso() {
    const av = App.obterAvaliacaoAtual();
    if (!av || !av.copsoq) return;
    try { Storage.salvar(av); } catch(e) {}
  }

  function salvarCOPSOQ() {
    _salvarCOPSOQSilencioso();
    App.mostrarToast('Respostas COPSOQ salvas', 'sucesso');
  }

  function verResultadosCOPSOQ() {
    salvarCOPSOQ();
    const av       = App.obterAvaliacaoAtual();
    const result   = ModuloCOPSOQ.calcularResultados(av);
    const LABEL    = {
      favoravel:     { texto: 'Favorável',     badge: 'badge-sucesso' },
      intermediario: { texto: 'Intermediário', badge: 'badge-aviso'   },
      desfavoravel:  { texto: 'Desfavorável',  badge: 'badge-alto'    },
      sem_dados:     { texto: 'Sem dados',     badge: 'badge-na'      }
    };
    const html = Object.entries(result).map(([dim, r]) => {
      const info = LABEL[r.nivel];
      return `
        <div class="resultado-dimensao">
          <div class="dim-nome">${dim}
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">${r.respondidas}/${r.total}</div>
          </div>
          <div class="dim-barra">
            <div class="dim-barra-fill ${r.nivel}" style="width:${r.media ?? 0}%"></div>
          </div>
          <span class="badge ${info.badge}">${info.texto}</span>
        </div>
      `;
    }).join('');
    document.getElementById('modal-fp-copsoq-conteudo').innerHTML = `
      <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
        <span>ℹ️</span>
        <span>Escala 0–100. Favorável ≥ 67 · Intermediário 34–66 · Desfavorável ≤ 33.
        Análise consolidada do grupo — não individualizar.</span>
      </div>
      ${html}
    `;
    document.getElementById('modal-fp-copsoq').classList.remove('oculto');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: ANÁLISE TÉCNICA PSICOSSOCIAL
  ══════════════════════════════════════════════════════════ */

  function _htmlAnalise() {
    const av = App.obterAvaliacaoAtual();
    const ps = av?.psicossocial || {};

    return `
      <div class="container">
        <div class="aviso-tecnico aviso" style="margin-top:var(--s4)">
          <span>⚠️</span>
          <span>A interpretação técnica deve considerar o contexto organizacional do grupo.
          Resultados não devem ser individualizados. Profissional habilitado é responsável pela conclusão.</span>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Interpretação Técnica</div>
          <div class="grupo-campo">
            <label for="fp-interpretacao">Interpretação Técnica Geral</label>
            <textarea id="fp-interpretacao" rows="6"
              placeholder="Com base nos resultados do COPSOQ e nas observações do grupo, descreva os principais achados e sua interpretação técnica..."
            >${ps.interpretacaoTecnica || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Fatores Identificados</div>
          <div class="grupo-campo">
            <label for="fp-criticos">Fatores de Risco Psicossocial Críticos</label>
            <textarea id="fp-criticos" rows="4"
              placeholder="Liste e descreva os fatores psicossociais desfavoráveis identificados (dimensões com pontuação desfavorável no COPSOQ, observações qualitativas)..."
            >${ps.fatoresCriticos || ''}</textarea>
          </div>
          <div class="grupo-campo">
            <label for="fp-protetores">Fatores Protetores Identificados</label>
            <textarea id="fp-protetores" rows="3"
              placeholder="Liste aspectos positivos do ambiente psicossocial de trabalho (dimensões favoráveis, recursos organizacionais disponíveis)..."
            >${ps.fatoresProtetores || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Observação Técnica</div>
          <div class="grupo-campo">
            <label for="fp-observacao">Observações do Profissional</label>
            <textarea id="fp-observacao" rows="4"
              placeholder="Registre observações sobre o processo de avaliação, limitações, contexto organizacional relevante..."
            >${ps.observacaoTecnica || ''}</textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">Medidas Preventivas</div>
          <div class="grupo-campo">
            <label for="fp-medidas">Medidas Preventivas Propostas</label>
            <textarea id="fp-medidas" rows="5"
              placeholder="Descreva as medidas preventivas e de promoção da saúde psicossocial recomendadas para o grupo..."
            >${ps.medidasPreventivas || ''}</textarea>
          </div>

          <label class="check-item" style="cursor:pointer">
            <input type="checkbox" id="fp-suporte" ${ps.suporteEspecializado ? 'checked' : ''}>
            <div class="check-box">✓</div>
            <span>Recomenda encaminhamento para suporte especializado (psicólogo do trabalho / serviço de saúde mental)</span>
          </label>
        </div>

        <button class="btn-bloco" onclick="ModuloFP.salvarAnalise()">
          💾 Salvar Análise Técnica
        </button>

        <!-- Gerar Plano de Ação a partir das medidas -->
        <button onclick="ModuloFP.gerarPlanoDeAcao()"
                style="width:100%;margin-top:var(--s3);padding:var(--s3);
                       background:var(--fundo-card);border:1px solid var(--primario);
                       color:var(--primario);font-size:var(--txt-sm);font-weight:700;
                       border-radius:var(--raio);cursor:pointer;
                       display:flex;align-items:center;justify-content:center;gap:var(--s2)">
          📋 Gerar Plano de Ação a partir das Medidas Preventivas
        </button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function gerarPlanoDeAcao() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;

    _salvarAnalise();

    const medidas = av.psicossocial?.medidasPreventivas?.trim() || '';
    if (!medidas) {
      App.mostrarToast('Preencha as Medidas Preventivas antes de gerar o plano', 'info');
      return;
    }

    if (!av.planoAcao) av.planoAcao = [];

    /* Cada linha não-vazia vira uma ação */
    const hoje    = new Date();
    const addDias = n => { const d = new Date(hoje); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const linhas  = medidas.split('\n').map(l => l.replace(/^[•\-\*\d\.]+\s*/, '').trim()).filter(l => l.length > 10);

    let adicionadas = 0;
    linhas.forEach(linha => {
      const jaExiste = av.planoAcao.some(a => a.descricao === linha && a.origem === 'afp_medidas');
      if (jaExiste) return;
      av.planoAcao.push({
        id:          Storage.gerarId('acao'),
        descricao:   linha,
        prioridade:  'media',
        prazo:       addDias(180),
        responsavel: '',
        medida:      'organizacional',
        status:      'pendente',
        origem:      'afp_medidas',
        criadaEm:    new Date().toISOString(),
      });
      adicionadas++;
    });

    /* Se indicou suporte especializado, adiciona ação específica */
    if (av.psicossocial?.suporteEspecializado) {
      const descSuporte = 'Encaminhar para suporte especializado: psicólogo do trabalho / serviço de saúde mental';
      if (!av.planoAcao.some(a => a.descricao === descSuporte)) {
        av.planoAcao.push({
          id: Storage.gerarId('acao'), descricao: descSuporte,
          prioridade: 'alta', prazo: addDias(90),
          responsavel: '', medida: 'administrativa',
          status: 'pendente', origem: 'afp_medidas',
          criadaEm: new Date().toISOString(),
        });
        adicionadas++;
      }
    }

    try {
      Storage.salvar(av);
      const msg = adicionadas > 0
        ? `${adicionadas} ação(ões) adicionada(s) ao Plano — acesse a aba Plano para editar`
        : 'Todas as medidas já estão no Plano de Ação';
      App.mostrarToast(msg, adicionadas > 0 ? 'sucesso' : 'info');
    } catch (e) {
      App.mostrarToast('Erro: ' + e.message, 'erro');
    }
  }

  function _salvarAnalise() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    if (!av.psicossocial) av.psicossocial = {};
    const get = id => (document.getElementById(id) || {}).value?.trim() || '';
    av.psicossocial.interpretacaoTecnica = get('fp-interpretacao');
    av.psicossocial.fatoresCriticos      = get('fp-criticos');
    av.psicossocial.fatoresProtetores    = get('fp-protetores');
    av.psicossocial.observacaoTecnica    = get('fp-observacao');
    av.psicossocial.medidasPreventivas   = get('fp-medidas');
    av.psicossocial.suporteEspecializado = document.getElementById('fp-suporte')?.checked || false;
  }

  function salvarAnalise() {
    _salvarAnalise();
    const av = App.obterAvaliacaoAtual();
    if (av) try { Storage.salvar(av); App.mostrarToast('Análise salva', 'sucesso'); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO FP
  ══════════════════════════════════════════════════════════ */

  function _htmlRelatorio() {
    const av   = App.obterAvaliacaoAtual();
    const ps   = av?.psicossocial || {};
    const g    = ps.grupoAvaliado || {};
    const res  = ModuloCOPSOQ.calcularResultados(av);
    const _fd  = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

    const NIVEL_L = {
      favoravel:     { t: 'Favorável',     b: 'badge-sucesso' },
      intermediario: { t: 'Intermediário', b: 'badge-aviso'   },
      desfavoravel:  { t: 'Desfavorável',  b: 'badge-alto'    },
      sem_dados:     { t: 'Sem dados',     b: 'badge-na'      }
    };

    const tabelaCOPSOQ = `
      <table class="tabela-simples">
        <thead><tr><th>Dimensão</th><th>Respond.</th><th>Pontuação</th><th>Classificação</th></tr></thead>
        <tbody>${Object.entries(res).map(([dim, r]) => `
          <tr>
            <td>${dim}</td>
            <td>${r.respondidas}/${r.total}</td>
            <td>${r.media !== null ? r.media + '/100' : '—'}</td>
            <td><span class="badge ${NIVEL_L[r.nivel]?.b}">${NIVEL_L[r.nivel]?.t}</span></td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;

    return `
      <div class="container">
        <div style="margin-top:var(--s4);text-align:center;margin-bottom:var(--s5)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">Avaliação de Fatores Psicossociais</div>
          <div style="font-size:var(--txt-xl);font-weight:700">Relatório Técnico</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            ${av.empresa?.nome || ''} · ${av.setor || ''} · ${_fd(g.dataColeta || av.empresa?.dataAvaliacao)}
          </div>
        </div>

        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="window.print()">🖨️ Imprimir PDF</button>
          <button class="btn btn-secundario" onclick="ModuloFP.exportarJSON()">📤 Exportar JSON</button>
        </div>

        <div class="aviso-tecnico aviso" style="margin-bottom:var(--s5)">
          <span>⚠️</span>
          <span>Documento de uso técnico profissional. Resultados referem-se ao <strong>grupo avaliado</strong>.
          Não constituem diagnóstico médico ou psicológico individual.</span>
        </div>

        <div class="relatorio-secao">
          <h3>Identificação</h3>
          <div class="card">
            ${_li('Empresa', av.empresa?.nome)}
            ${_li('Setor / Função', [av.setor, av.funcao].filter(Boolean).join(' / '))}
            ${_li('Grupo', g.descricao)}
            ${_li('Nº Participantes', g.numParticipantes)}
            ${_li('Método de Coleta', g.metodoColeta)}
            ${_li('Data de Aplicação', _fd(g.dataColeta))}
            ${_li('Responsável', av.empresa?.responsavelTecnico)}
          </div>
        </div>

        <div class="relatorio-secao">
          <h3>Resultado COPSOQ por Dimensão</h3>
          <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
            <span>ℹ️</span>
            <span>Escala 0–100. Favorável ≥ 67 · Intermediário 34–66 · Desfavorável ≤ 33.</span>
          </div>
          ${tabelaCOPSOQ}
        </div>

        ${ps.fatoresCriticos ? `
        <div class="relatorio-secao">
          <h3>Fatores de Risco Identificados</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${ps.fatoresCriticos}</p></div>
        </div>` : ''}

        ${ps.fatoresProtetores ? `
        <div class="relatorio-secao">
          <h3>Fatores Protetores</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${ps.fatoresProtetores}</p></div>
        </div>` : ''}

        ${ps.interpretacaoTecnica ? `
        <div class="relatorio-secao">
          <h3>Interpretação Técnica</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${ps.interpretacaoTecnica}</p></div>
        </div>` : ''}

        ${ps.medidasPreventivas ? `
        <div class="relatorio-secao">
          <h3>Medidas Preventivas Propostas</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${ps.medidasPreventivas}</p></div>
        </div>` : ''}

        ${ps.suporteEspecializado ? `
        <div class="aviso-tecnico aviso">
          <span>🩺</span>
          <span>Recomenda-se encaminhamento para suporte especializado em saúde mental no trabalho.</span>
        </div>` : ''}

        <div style="text-align:center;padding:var(--s6) 0;color:var(--texto-sec);font-size:var(--txt-xs)">
          ErgoGRO · Avaliação de Fatores Psicossociais · Instrumento: COPSOQ-III Reduzido<br>
          Documento técnico — não substitui avaliação clínica individual
        </div>
      </div>
    `;
  }

  function _li(label, valor) {
    if (!valor && valor !== 0) return '';
    return `<div style="display:flex;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
      <span style="color:var(--texto-sec);font-size:var(--txt-sm);width:160px;flex-shrink:0">${label}</span>
      <span style="font-size:var(--txt-sm);font-weight:500">${valor}</span>
    </div>`;
  }

  function exportarJSON() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const blob = new Blob([Storage.exportarJSON(av.id)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `FP_${(av.empresa?.nome||'ergogro').replace(/\s+/g,'_')}_${(av.empresa?.dataAvaliacao||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('JSON exportado', 'sucesso');
  }

  return { renderizar, trocarSecao, salvarGrupo, onCopsoqChange, salvarCOPSOQ, verResultadosCOPSOQ, salvarAnalise, gerarPlanoDeAcao, exportarJSON };
})();
