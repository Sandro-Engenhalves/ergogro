/* ============================================================
   ErgoGRO — Módulo: Consolidação Técnica Psicossocial

   FLUXO:
   1. Sistema analisa AFP (COPSOQ-III) + AEP e propõe riscos
   2. Profissional aprova ou descarta cada proposta com base
      no que avaliou em campo (a decisão é humana)
   3. Aprovados ficam registrados prontos para o GRO/PGR

   BASE LEGAL: NR-17 (Portaria MTP 1.467/2023) — organização
   do trabalho. Nomenclatura em condições de trabalho, não em
   estados psicológicos (aceito pelo cliente, defensável em laudo).
   ============================================================ */

const ModuloConsolidacao = (() => {

  /* ══════════════════════════════════════════════════════════
     CATÁLOGO DE CONDIÇÕES DE RISCO PSICOSSOCIAL

     Cada condição tem:
     - descricaoUI  : linguagem simples para o profissional
     - textoGRO     : texto técnico pronto para o GRO/PGR
     - fundamentoLegal : base normativa
     - dimensoesAfp : IDs das dimensões COPSOQ-III relacionadas
     - itensAep     : IDs dos itens AEP que corroboram
     - limiarAfp    : score AFP que ativa a proposta automática
  ══════════════════════════════════════════════════════════ */
  const CATALOGO = [
    {
      id: 'cr_exigencias',
      titulo: 'Exigências de trabalho além da capacidade operacional',
      descricaoUI: 'Ritmo, metas ou jornada acima do que os trabalhadores conseguem executar com segurança.',
      textoGRO: 'Fator de risco psicossocial: condições de organização do trabalho com exigências de ritmo, produtividade e/ou carga horária que ultrapassam a capacidade operacional dos trabalhadores. Base: NR-17 (2023) — organização do trabalho.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — organização do trabalho',
      dimensoesAfp: ['demandas'],
      itensAep: ['org_01', 'org_02', 'org_05'],
      limiarAfp: 66, /* propõe se score ≤ 66 (intermediário ou desfavorável) */
    },
    {
      id: 'cr_autonomia',
      titulo: 'Restrição de autonomia e participação no trabalho',
      descricaoUI: 'Trabalhador sem controle sobre ritmo, método ou planejamento do próprio trabalho.',
      textoGRO: 'Fator de risco psicossocial: baixo nível de influência do trabalhador sobre o planejamento, método e ritmo de execução das próprias tarefas. Base: NR-17 (2023) — organização do trabalho.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — organização do trabalho',
      dimensoesAfp: ['organizacao'],
      itensAep: ['org_03', 'org_04'],
      limiarAfp: 66,
    },
    {
      id: 'cr_suporte',
      titulo: 'Déficit de suporte social e reconhecimento',
      descricaoUI: 'Falta de apoio da liderança ou colegas, comunicação deficiente, ausência de reconhecimento pelo trabalho.',
      textoGRO: 'Fator de risco psicossocial: insuficiência de suporte social da chefia e/ou colegas, ausência de reconhecimento e deficiências nos canais de comunicação organizacional. Base: NR-17 (2023) — relacionamento interpessoal.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — relacionamento interpessoal e comunicação',
      dimensoesAfp: ['relacoes', 'valores'],
      itensAep: ['psi_01', 'psi_02', 'psi_03'],
      limiarAfp: 55,
    },
    {
      id: 'cr_conflitos',
      titulo: 'Conflitos e deterioração das relações de trabalho',
      descricaoUI: 'Conflitos interpessoais frequentes, situações de constrangimento ou tratamento desrespeitoso no ambiente de trabalho.',
      textoGRO: 'Fator de risco psicossocial: condições de trabalho com presença de conflitos interpessoais, situações de constrangimento ou deterioração do ambiente relacional. Base: NR-17 (2023) — relacionamento interpessoal.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — relacionamento interpessoal',
      dimensoesAfp: ['relacoes', 'valores'],
      itensAep: ['psi_06', 'psi_05'],
      limiarAfp: 45, /* só propõe se bem abaixo — mais sensível */
    },
    {
      id: 'cr_emocional',
      titulo: 'Exigências emocionais sem suporte adequado',
      descricaoUI: 'Trabalho com alta carga emocional (lidar com conflitos, sofrimento, usuários) sem que a organização ofereça apoio para isso.',
      textoGRO: 'Fator de risco psicossocial: exigências emocionais intensas no trabalho sem disponibilização de suporte técnico ou organizacional adequado para o manejo dessas situações. Base: NR-17 (2023) — condições psicossociais.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — organização do trabalho',
      dimensoesAfp: ['interface', 'saude'],
      itensAep: ['psi_04', 'psi_05'],
      limiarAfp: 50,
    },
    {
      id: 'cr_previsibilidade',
      titulo: 'Falta de clareza e previsibilidade organizacional',
      descricaoUI: 'Papéis indefinidos, mudanças sem comunicação, processos pouco claros — os trabalhadores não sabem o que se espera deles.',
      textoGRO: 'Fator de risco psicossocial: condições organizacionais com indefinição de papéis, ausência de comunicação estruturada e falta de previsibilidade sobre as condições de trabalho. Base: NR-17 (2023) — organização do trabalho.',
      fundamentoLegal: 'NR-17 (Portaria MTP 1.467/2023) — organização do trabalho e comunicação',
      dimensoesAfp: ['organizacao', 'valores'],
      itensAep: ['psi_02', 'org_03'],
      limiarAfp: 50,
    },
  ];

  /* Hierarquia de controles NR-01 */
  const HIERARQUIA = [
    { id: 'eliminacao',     label: 'Eliminação',    desc: 'Remover a condição na fonte' },
    { id: 'reducao',        label: 'Redução',        desc: 'Reduzir a exposição' },
    { id: 'administrativo', label: 'Administrativo', desc: 'Procedimentos, treinamento, gestão' },
    { id: 'monitoramento',  label: 'Monitoramento',  desc: 'Vigilância periódica' },
  ];

  /* Nomes curtos para exibição */
  const DIM_NOME = {
    demandas: 'Demandas de Trabalho', organizacao: 'Organização do Trabalho',
    relacoes: 'Relações Sociais', interface: 'Interface Trabalho-Indivíduo',
    valores: 'Valores no Trabalho', saude: 'Saúde e Bem-Estar',
  };
  const ITEM_NOME = {
    org_01:'Jornada e pausas', org_02:'Ritmo e produtividade', org_03:'Distribuição de tarefas',
    org_04:'Autonomia', org_05:'Metas e pressão', psi_01:'Suporte social',
    psi_02:'Comunicação', psi_03:'Reconhecimento', psi_04:'Demanda-recurso',
    psi_05:'Limites emocionais', psi_06:'Assédio / violência',
  };

  let _afpDados = null;

  /* ══════════════════════════════════════════════════════════
     RENDERIZAÇÃO PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  async function renderizar(el) {
    if (!el) el = document.getElementById('projeto-conteudo');
    if (!el) return;
    el.innerHTML = '<div class="container" style="padding-top:var(--s6)"><div class="loading-inline">Analisando dados da avaliação...</div></div>';

    const proj   = App.obterProjetoAtual();
    const temAFP = proj && ['aep_afp','aet','integrado','psicossocial'].includes(proj.tipo);
    _afpDados = null;
    if (temAFP && typeof listarCampanhas === 'function') {
      try {
        const campanhas = await listarCampanhas(proj.id);
        const comResp   = campanhas.filter(c => c.totalRespostas > 0)
          .sort((a,b) => (b.criadoEm||'') > (a.criadoEm||'') ? 1 : -1);
        if (comResp.length > 0) {
          const c = comResp[0];
          _afpDados = { relatorio: await calcularRelatorio(c.id, c.minRespostasSetor||5) };
        }
      } catch(e) { console.warn('Consolidação AFP:', e.message); }
    }
    el.innerHTML = _htmlConsolidacao();
  }

  /* ══════════════════════════════════════════════════════════
     LÓGICA DE PROPOSTAS
     Analisa AFP + AEP e gera lista de riscos sugeridos
  ══════════════════════════════════════════════════════════ */

  function _gerarPropostas(afpConsolidado, itensNC) {
    const scoreAfp = {}; /* id → {media, nivel} */
    (afpConsolidado || []).forEach(d => { scoreAfp[d.id] = d; });

    return CATALOGO.map(cond => {
      /* Evidências AFP: dimensões com score ≤ limiar ou desfavorável */
      const evidAfp = cond.dimensoesAfp
        .filter(d => scoreAfp[d] && (
          scoreAfp[d].nivel === 'desfavoravel' ||
          (scoreAfp[d].nivel === 'intermediario' && scoreAfp[d].media <= cond.limiarAfp)
        ))
        .map(d => ({ id: d, nome: DIM_NOME[d]||d, media: scoreAfp[d].media, nivel: scoreAfp[d].nivel }));

      /* Evidências AEP: itens não conformes com risco alto ou médio */
      const evidAep = cond.itensAep
        .filter(id => itensNC.some(i => i.itemId === id && i.risco !== 'baixo'))
        .map(id => {
          const item = itensNC.find(i => i.itemId === id);
          return { id, nome: ITEM_NOME[id]||id, risco: item?.risco, texto: item?.itemTexto||'' };
        });

      const temEvidencia = evidAfp.length > 0 || evidAep.length > 0;
      const temDesfavoravel = evidAfp.some(d => d.nivel === 'desfavoravel') || evidAep.some(i => i.risco === 'alto');

      return { ...cond, evidAfp, evidAep, temEvidencia, temDesfavoravel };
    });
  }

  /* ══════════════════════════════════════════════════════════
     HTML PRINCIPAL
  ══════════════════════════════════════════════════════════ */

  function _htmlConsolidacao() {
    const proj    = App.obterProjetoAtual();
    const cons    = proj?.consolidacaoPsicossocial || {};
    const avsAEP  = Storage.listarPorProjeto(proj.id).filter(a => a.tipo === 'aep');
    const itensNC = _getItensNaoConformes(avsAEP);
    const afpCons = _afpDados?.relatorio?.consolidado || [];
    const propostas = _gerarPropostas(afpCons, itensNC);
    const comEvidencia  = propostas.filter(p => p.temEvidencia);
    const semEvidencia  = propostas.filter(p => !p.temEvidencia);
    const salvos = cons.riscosConsolidados || [];
    const nAprovados  = salvos.filter(r => r.decisao === 'aprovado').length;
    const nMonitorar  = salvos.filter(r => r.decisao === 'monitorar').length;
    const nDescartados = salvos.filter(r => r.decisao === 'descartado').length;
    const nPendentes  = propostas.length - salvos.filter(r => r.decisao).length;

    const temAFP = ['aep_afp','aet','integrado','psicossocial'].includes(proj.tipo);

    return `
      <div class="container">

        <!-- Cabeçalho -->
        <div style="margin-top:var(--s4);margin-bottom:var(--s4)">
          <div style="font-size:var(--txt-xl);font-weight:700;margin-bottom:var(--s1)">Consolidação Técnica Psicossocial</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec);line-height:1.6">
            Com base na AFP (COPSOQ-III) e na AEP, o sistema identificou
            <strong>${comEvidencia.length}</strong> condição(ões) com evidência.
            Aprove as que são coerentes com o que você avaliou em campo.
            ${!temAFP || !_afpDados ? '<br><span style="color:var(--aviso)">⚠ Sem dados AFP carregados — análise baseada somente na AEP.</span>' : ''}
          </div>
        </div>

        <!-- Resumo de status -->
        ${nAprovados + nMonitorar + nDescartados > 0 ? `
        <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s4)">
          ${nAprovados  > 0 ? `<span class="badge badge-sucesso">✅ ${nAprovados} aprovado(s) para GRO</span>` : ''}
          ${nMonitorar  > 0 ? `<span class="badge badge-aviso">👁️ ${nMonitorar} em monitoramento</span>` : ''}
          ${nDescartados > 0 ? `<span class="badge">✗ ${nDescartados} descartado(s)</span>` : ''}
          ${nPendentes  > 0 ? `<span class="badge" style="opacity:.6">${nPendentes} pendente(s)</span>` : ''}
        </div>` : ''}

        <!-- Condições com evidência -->
        ${comEvidencia.length > 0 ? `
          <div style="font-size:var(--txt-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--texto-sec);margin-bottom:var(--s3)">
            Condições com evidência na avaliação
          </div>
          ${comEvidencia.map(p => _htmlCardProposta(p, salvos)).join('')}
        ` : `
          <div class="aviso-tecnico info">
            <span>ℹ️</span>
            <span>Nenhuma condição de risco atingiu o limiar de evidência nos dados disponíveis.
            Você pode adicionar uma condição manualmente abaixo se identificou algo em campo.</span>
          </div>
        `}

        <!-- Condições sem evidência (colapsadas) -->
        ${semEvidencia.length > 0 ? `
          <details style="margin-top:var(--s4)">
            <summary style="cursor:pointer;font-size:var(--txt-xs);color:var(--texto-sec);font-weight:700;text-transform:uppercase;letter-spacing:.5px;list-style:none;display:flex;align-items:center;gap:var(--s2)">
              <span>▸</span> Outras condições — sem evidência nos dados (${semEvidencia.length})
              <span style="font-weight:400;text-transform:none;letter-spacing:0">— disponíveis se você identificou algo em campo</span>
            </summary>
            <div style="margin-top:var(--s3)">
              ${semEvidencia.map(p => _htmlCardProposta(p, salvos)).join('')}
            </div>
          </details>
        ` : ''}

        <!-- Justificativa técnica (aparece quando há pelo menos 1 decisão) -->
        <div id="cons-bloco-fechamento" style="${salvos.some(r=>r.decisao) ? '' : 'display:none'}">
          <div class="card" style="margin-top:var(--s5)">
            <div class="card-titulo" style="margin-bottom:var(--s4)">Fechamento e Justificativa Técnica</div>
            <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
              <span>ℹ️</span>
              <span style="font-size:var(--txt-xs)">
                <strong>Nota metodológica para o laudo:</strong> A correlação entre AFP (COPSOQ-III) e AEP
                é baseada em correspondência de conteúdo entre os instrumentos, conforme prática técnica
                em ergonomia, fundamentada na NR-17 (Portaria MTP 1.467/2023). Resultados psicossociais
                mantidos em nível de grupo — LGPD (Lei 13.709/2018).
              </span>
            </div>
            <div class="grupo-campo">
              <label for="cons-justificativa">Observação do Profissional (campo)</label>
              <textarea id="cons-justificativa" rows="4"
                placeholder="Registre o que você observou em campo que fundamenta ou contradiz os dados da AFP/AEP. Esta observação complementa os dados quantitativos no laudo."
              >${cons.justificativaTecnica || ''}</textarea>
            </div>
            <div class="linha-campos">
              <div class="grupo-campo">
                <label for="cons-responsavel">Responsável Técnico</label>
                <input type="text" id="cons-responsavel"
                       value="${cons.responsavelConsolidacao || proj?.responsavelTecnico || ''}"
                       placeholder="Nome do profissional">
              </div>
              <div class="grupo-campo">
                <label for="cons-data">Data</label>
                <input type="date" id="cons-data"
                       value="${cons.dataConsolidacao || new Date().toISOString().slice(0,10)}">
              </div>
            </div>
          </div>
          <button class="btn-bloco" onclick="ModuloConsolidacao.salvar()">
            💾 Salvar Consolidação
          </button>
        </div>

        <div style="height:var(--s6)"></div>
      </div>
    `;
  }

  /* ── Card de proposta de risco ────────────────────────────── */
  function _htmlCardProposta(prop, salvos) {
    const salvo    = salvos.find(r => r.id === prop.id) || {};
    const decisao  = salvo.decisao || null;

    const STATUS = {
      aprovado:   { cor: '#3fb950', bg: 'var(--risco-baixo-bg)',  label: '✅ Aprovado para GRO'    },
      monitorar:  { cor: '#d29922', bg: 'var(--risco-medio-bg)',  label: '👁️ Em monitoramento'      },
      descartado: { cor: '#8b949e', bg: 'var(--superficie-alt)',  label: '✗ Descartado'             },
    };
    const st = STATUS[decisao];

    /* Cor da borda: verde se aprovado, amarelo se monitorar, cinza se descartado, azul se com evidência mas pendente */
    const bordaCor = decisao ? STATUS[decisao].cor
                   : prop.temDesfavoravel ? '#f85149'
                   : prop.temEvidencia    ? '#d29922'
                   : 'var(--borda)';

    return `
      <div class="cons-risco-card ${decisao ? 'revisado' : prop.temEvidencia ? 'com-evidencia' : ''}"
           id="cons-card-${prop.id}"
           style="border-color:${bordaCor};${decisao ? 'background:'+STATUS[decisao].bg : ''}">

        <!-- Cabeçalho da condição -->
        <div style="padding:var(--s3)">
          <div style="display:flex;align-items:flex-start;gap:var(--s3)">
            <div style="flex:1">
              <div class="cons-risco-titulo">${prop.titulo}</div>
              <div class="cons-risco-desc">${prop.descricaoUI}</div>
            </div>
            ${decisao ? `<span style="font-size:var(--txt-xs);font-weight:700;color:${STATUS[decisao].cor};white-space:nowrap;flex-shrink:0">${STATUS[decisao].label}</span>` : ''}
          </div>

          <!-- Evidências (só se houver) -->
          ${prop.evidAfp.length > 0 || prop.evidAep.length > 0 ? `
            <div style="margin-top:var(--s3);display:flex;gap:var(--s3);flex-wrap:wrap">
              ${prop.evidAfp.length > 0 ? `
                <div>
                  <div style="font-size:10px;color:var(--texto-sec);font-weight:700;text-transform:uppercase;margin-bottom:4px">AFP</div>
                  <div style="display:flex;gap:var(--s1);flex-wrap:wrap">
                    ${prop.evidAfp.map(d => `
                      <span class="cons-chip ${d.nivel==='desfavoravel' ? 'cons-chip-alert' : 'cons-chip-warn'}">
                        ${d.nome} · ${d.media}
                      </span>`).join('')}
                  </div>
                </div>` : ''}
              ${prop.evidAep.length > 0 ? `
                <div>
                  <div style="font-size:10px;color:var(--texto-sec);font-weight:700;text-transform:uppercase;margin-bottom:4px">AEP</div>
                  <div style="display:flex;gap:var(--s1);flex-wrap:wrap">
                    ${prop.evidAep.map(i => `
                      <span class="cons-chip ${i.risco==='alto' ? 'cons-chip-alert' : 'cons-chip-warn'}" title="${i.texto}">
                        ${i.nome} · ${i.risco}
                      </span>`).join('')}
                  </div>
                </div>` : ''}
            </div>
          ` : `
            <div style="margin-top:var(--s2);font-size:var(--txt-xs);color:var(--texto-sec)">
              Sem evidência nos dados — disponível se você identificou em campo.
            </div>
          `}

          <!-- Botões de decisão (só se não aprovado/monitoramento) -->
          ${decisao !== 'aprovado' && decisao !== 'monitorar' ? `
            <div style="display:flex;gap:var(--s2);margin-top:var(--s3);flex-wrap:wrap">
              <button class="btn btn-sm" style="background:#1a3a1a;border:1px solid #3fb950;color:#3fb950"
                      onclick="ModuloConsolidacao.decidir('${prop.id}','aprovado')">
                ✅ Aprovar para GRO
              </button>
              <button class="btn btn-sm" style="background:#2a2a10;border:1px solid #d29922;color:#d29922"
                      onclick="ModuloConsolidacao.decidir('${prop.id}','monitorar')">
                👁️ Monitorar
              </button>
              <button class="btn btn-sm btn-secundario"
                      onclick="ModuloConsolidacao.decidir('${prop.id}','descartado')">
                ✗ Descartar
              </button>
            </div>
          ` : `
            <div style="display:flex;gap:var(--s2);margin-top:var(--s3)">
              <button class="btn btn-sm btn-secundario" style="font-size:var(--txt-xs)"
                      onclick="ModuloConsolidacao.decidir('${prop.id}',null)">
                Refazer decisão
              </button>
            </div>
          `}
        </div>

        <!-- Campos de controle (visíveis quando aprovado ou monitorar) -->
        <div id="cons-det-${prop.id}"
             style="${decisao === 'aprovado' || decisao === 'monitorar' ? '' : 'display:none'};
                    border-top:1px solid var(--borda);padding:var(--s3)">

          ${decisao === 'aprovado' ? `
            <!-- Texto GRO (somente leitura, para copiar) -->
            <div style="margin-bottom:var(--s3)">
              <div style="font-size:var(--txt-xs);font-weight:700;color:var(--texto-sec);margin-bottom:var(--s1)">
                Texto para o GRO/PGR — copie ou ajuste conforme necessário
              </div>
              <div style="background:var(--fundo);border:1px solid var(--borda);border-left:3px solid #3fb950;
                          border-radius:var(--raio);padding:var(--s3);font-size:var(--txt-xs);
                          color:var(--texto-sec);line-height:1.6;user-select:all">
                ${prop.textoGRO}
              </div>
              <div style="font-size:10px;color:var(--texto-sec);margin-top:4px">
                📋 ${prop.fundamentoLegal}
              </div>
            </div>
            <div class="grupo-campo">
              <label style="font-size:var(--txt-xs)">Hierarquia de Controle (NR-01)</label>
              <select id="cons-hier-${prop.id}">
                <option value="">Selecione...</option>
                ${HIERARQUIA.map(h => `
                  <option value="${h.id}" ${salvo.hierarquia===h.id?'selected':''}>
                    ${h.label} — ${h.desc}
                  </option>`).join('')}
              </select>
            </div>
            <div class="grupo-campo">
              <label style="font-size:var(--txt-xs)">
                Ação para o Plano
                <span style="color:var(--texto-sec);font-weight:400"> — 1 frase objetiva</span>
              </label>
              <textarea id="cons-acao-plano-${prop.id}" rows="2"
                placeholder="Ex.: Revisar distribuição de tarefas e ajustar metas conforme capacidade da equipe."
              >${salvo.acaoPlano||''}</textarea>
            </div>
            <div class="grupo-campo">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1)">
                <label style="font-size:var(--txt-xs);margin:0">
                  Orientação Detalhada
                  <span style="color:var(--texto-sec);font-weight:400"> — seção de orientações</span>
                </label>
                <button id="btn-estrategia-ia-${prop.id}"
                        onclick="ModuloConsolidacao.gerarEstrategiaIA('${prop.id}')"
                        style="font-size:var(--txt-xs);padding:3px 9px;border-radius:var(--r2);border:1px solid #3949ab;background:rgba(57,73,171,.15);color:#90caf9;cursor:pointer;white-space:nowrap">
                  🤖 Gerar com IA
                </button>
              </div>
              <textarea id="cons-estrategia-${prop.id}" rows="3"
                placeholder="Orientação técnica detalhada sobre as medidas de controle para esta condição..."
              >${salvo.estrategia||''}</textarea>
            </div>
          ` : `
            <!-- Monitoramento -->
            <div class="grupo-campo">
              <label style="font-size:var(--txt-xs)">Critério de Monitoramento</label>
              <textarea id="cons-estrategia-${prop.id}" rows="2"
                placeholder="Como e quando esta condição será reavaliada? (ex.: reaplicar AFP em 12 meses, acompanhar absenteísmo trimestral)"
              >${salvo.estrategia||''}</textarea>
            </div>
          `}
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════
     INTERAÇÕES
  ══════════════════════════════════════════════════════════ */

  function decidir(condId, decisao) {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    const cons = proj.consolidacaoPsicossocial;
    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];

    let salvo = cons.riscosConsolidados.find(r => r.id === condId);
    if (!salvo) {
      const cond = CATALOGO.find(c => c.id === condId);
      salvo = { id: condId, titulo: cond?.titulo||'', textoGRO: cond?.textoGRO||'', fundamentoLegal: cond?.fundamentoLegal||'', hierarquia: '', estrategia: '', acaoPlano: '' };
      cons.riscosConsolidados.push(salvo);
    }
    salvo.decisao = decisao;
    salvo.decisaoEm = decisao ? new Date().toISOString() : null;

    try { Storage.salvarProjeto(proj); } catch(e) {}

    /* Re-renderiza só o card afetado + bloco de fechamento */
    const avsAEP  = Storage.listarPorProjeto(proj.id).filter(a => a.tipo === 'aep');
    const itensNC = _getItensNaoConformes(avsAEP);
    const afpCons = _afpDados?.relatorio?.consolidado || [];
    const propostas = _gerarPropostas(afpCons, itensNC);
    const prop = propostas.find(p => p.id === condId);

    if (prop) {
      const cardEl = document.getElementById(`cons-card-${condId}`);
      if (cardEl) {
        const tmp = document.createElement('div');
        tmp.innerHTML = _htmlCardProposta(prop, cons.riscosConsolidados);
        cardEl.replaceWith(tmp.firstElementChild);
      }
    }

    /* Mostra/oculta bloco de fechamento */
    const blocoFech = document.getElementById('cons-bloco-fechamento');
    if (blocoFech) {
      const temDecisao = cons.riscosConsolidados.some(r => r.decisao);
      blocoFech.style.display = temDecisao ? '' : 'none';
    }

    /* Atualiza badges de resumo */
    _atualizarResumo(cons);
  }

  function _atualizarResumo(cons) {
    const salvos = cons.riscosConsolidados || [];
    const nA = salvos.filter(r => r.decisao === 'aprovado').length;
    const nM = salvos.filter(r => r.decisao === 'monitorar').length;
    const nD = salvos.filter(r => r.decisao === 'descartado').length;
    /* Re-renderiza o cabeçalho via trocarSecao não é eficiente; só atualiza texto inline */
    const desc = document.querySelector('.container > div:first-child div[style*="txt-sm"]');
    if (desc) {
      const badges = [];
      if (nA) badges.push(`<span class="badge badge-sucesso">✅ ${nA} aprovado(s)</span>`);
      if (nM) badges.push(`<span class="badge badge-aviso">👁️ ${nM} monitoramento</span>`);
      if (nD) badges.push(`<span class="badge">✗ ${nD} descartado(s)</span>`);
    }
  }

  function salvar() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    if (!proj.consolidacaoPsicossocial) proj.consolidacaoPsicossocial = {};
    const cons = proj.consolidacaoPsicossocial;

    cons.justificativaTecnica    = document.getElementById('cons-justificativa')?.value?.trim() || '';
    cons.responsavelConsolidacao = document.getElementById('cons-responsavel')?.value?.trim()   || '';
    cons.dataConsolidacao        = document.getElementById('cons-data')?.value                  || '';

    if (!cons.riscosConsolidados) cons.riscosConsolidados = [];
    CATALOGO.forEach(cond => {
      const salvo = cons.riscosConsolidados.find(r => r.id === cond.id);
      if (!salvo) return;
      const h  = document.getElementById(`cons-hier-${cond.id}`);
      const e  = document.getElementById(`cons-estrategia-${cond.id}`);
      const ap = document.getElementById(`cons-acao-plano-${cond.id}`);
      if (h)  salvo.hierarquia = h.value;
      if (e)  salvo.estrategia = e.value.trim();
      if (ap) salvo.acaoPlano  = ap.value.trim();
    });
    cons.atualizadaEm = new Date().toISOString();

    try {
      Storage.salvarProjeto(proj);
      App.mostrarToast('Consolidação salva', 'sucesso');
    } catch(e) {
      App.mostrarToast('Erro: ' + e.message, 'erro');
    }
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */

  function _getItensNaoConformes(avsAEP) {
    if (typeof ModuloAEP === 'undefined') return [];
    const mapa = new Map();
    const ord  = { alto:3, medio:2, baixo:1 };
    avsAEP.forEach(av => {
      ModuloAEP.obterNaoConformes(av).forEach(nc => {
        const ex = mapa.get(nc.itemId);
        if (!ex || ord[nc.risco] > ord[ex.risco]) mapa.set(nc.itemId, nc);
      });
    });
    return [...mapa.values()];
  }

  /* Expõe condições aprovadas para o relatório */
  function obterAprovados() {
    const proj = App.obterProjetoAtual();
    return (proj?.consolidacaoPsicossocial?.riscosConsolidados || [])
      .filter(r => r.decisao === 'aprovado');
  }

  async function gerarEstrategiaIA(condId) {
    const prop = CATALOGO.find(c => c.id === condId);
    if (!prop) return;
    const proj = App.obterProjetoAtual();
    const emp  = proj?.empresaId ? Storage.buscarEmpresa(proj.empresaId) : null;

    const executar = async () => {
      const btn = document.getElementById(`btn-estrategia-ia-${condId}`);
      if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
      try {
        const prompt = `Você é um engenheiro de segurança do trabalho especialista em ergonomia e fatores psicossociais.

Para o fator de risco psicossocial abaixo, gere dois textos complementares:

Condição de risco: ${prop.titulo}
Descrição: ${prop.descricaoUI}
Base legal: ${prop.fundamentoLegal}
Empresa: ${emp?.nome || 'não informado'}
Atividade: ${emp?.atividadePrincipal || emp?.cnae || 'não informado'}

Retorne APENAS um JSON válido, sem markdown, com exatamente dois campos:
{
  "acaoPlano": "Uma frase objetiva de no máximo 120 caracteres para o plano de ação. Deve iniciar com um verbo no infinitivo. Use linguagem de condições de trabalho.",
  "orientacao": "Orientação técnica detalhada em 3 a 5 frases sobre as medidas de controle. Explique o que fazer, como fazer e como monitorar. Use linguagem de condições de trabalho, não de estados psicológicos."
}`;

        const texto = await ClaudeVision.gerarTextoIA(prompt, 700);
        let parsed = null;
        try {
          /* tenta extrair JSON mesmo que venha com texto ao redor */
          const match = texto.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(match ? match[0] : texto);
        } catch { /* fallback: coloca tudo na orientação */ }

        const campoAcao = document.getElementById(`cons-acao-plano-${condId}`);
        const campoEst  = document.getElementById(`cons-estrategia-${condId}`);
        if (parsed) {
          if (campoAcao && parsed.acaoPlano)  campoAcao.value = parsed.acaoPlano;
          if (campoEst  && parsed.orientacao) campoEst.value  = parsed.orientacao;
        } else if (campoEst && texto) {
          campoEst.value = texto;
        }
        App.mostrarToast('Gerado — revise os dois campos e salve', 'sucesso');
      } catch (err) {
        App.mostrarToast('Erro ao gerar: ' + err.message, 'erro');
      } finally {
        const btn = document.getElementById(`btn-estrategia-ia-${condId}`);
        if (btn) { btn.disabled = false; btn.textContent = '🤖 Gerar com IA'; }
      }
    };

    if (!ClaudeVision.temChave()) {
      ClaudeVision.solicitarChaveParaChamada(executar);
    } else {
      await executar();
    }
  }

  return { renderizar, decidir, salvar, obterAprovados, gerarEstrategiaIA };
})();
