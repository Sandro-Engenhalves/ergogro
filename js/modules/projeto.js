/* ============================================================
   ErgoGRO — Módulo: Projeto de Laudo
   Módulo central da v4. Um Projeto de Laudo é um dossiê técnico
   que consolida todas as avaliações (AEP, FP, AET) de um cliente.

   Seções do projeto:
   - visao-geral  : dados do projeto e empresa
   - setores      : setores e funções do projeto (CRUD)
   - avaliacoes   : avaliações vinculadas + criação
   - plano        : plano de ação consolidado
   - relatorio    : relatório técnico consolidado
   ============================================================ */

const ModuloProjeto = (() => {

  let _secaoAtual = 'visao-geral';

  /* Wizard interno para criar avaliação */
  let _wiz = { setorId: null, funcaoId: null, tipo: null };

  const SECOES = [
    { id: 'visao-geral', icone: '📁', label: 'Projeto'    },
    { id: 'setores',     icone: '📍', label: 'Setores'    },
    { id: 'avaliacoes',  icone: '📋', label: 'Avaliações' },
    { id: 'pesquisas',   icone: '🧠', label: 'Pesquisas'  },
    { id: 'plano',       icone: '📌', label: 'Plano'      },
    { id: 'relatorio',   icone: '📄', label: 'Relatório'  },
  ];

  const TIPO_LABEL = { aep:'AEP', psicossocial:'Psicossocial', aet:'AET' };
  const TIPO_ICON  = { aep:'📋', psicossocial:'🧠', aet:'🔬' };
  const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

  /* ── Renderiza o shell do projeto ────────────────────────── */
  function renderizar(secao) {
    _secaoAtual = secao || _secaoAtual;
    const tela  = document.getElementById('tela-projeto');
    const abasHTML = SECOES.map(s => `
      <button class="aba-bloco ${s.id === _secaoAtual ? 'ativa' : ''}"
              data-secao="${s.id}"
              onclick="ModuloProjeto.trocarSecao('${s.id}')">
        <span>${s.icone}</span><span>${s.label}</span>
      </button>
    `).join('');
    tela.innerHTML = `
      <nav class="subnav-abas" id="subnav-projeto">${abasHTML}</nav>
      <div id="projeto-conteudo"></div>
    `;
    _renderizarConteudo(_secaoAtual);
  }

  function trocarSecao(secao) {
    _salvarSecaoAtual();
    _secaoAtual = secao;
    document.querySelectorAll('#subnav-projeto .aba-bloco').forEach(b => {
      b.classList.toggle('ativa', b.dataset.secao === secao);
    });
    _renderizarConteudo(secao);
    window.scrollTo({ top: 0 });
  }

  function _renderizarConteudo(secao) {
    const el = document.getElementById('projeto-conteudo');
    if (!el) return;
    if      (secao === 'visao-geral') el.innerHTML = _htmlVisaoGeral();
    else if (secao === 'setores')     el.innerHTML = _htmlSetores();
    else if (secao === 'avaliacoes')  el.innerHTML = _htmlAvaliacoes();
    else if (secao === 'pesquisas')   ModuloPesquisaAdmin.renderizar();
    else if (secao === 'plano')       el.innerHTML = _htmlPlano();
    else if (secao === 'relatorio')   el.innerHTML = _htmlRelatorio();
  }

  function _salvarSecaoAtual() {
    if (_secaoAtual === 'visao-geral') _salvarVisaoGeralSilencioso();
    const proj = App.obterProjetoAtual();
    if (proj) try { Storage.salvarProjeto(proj); } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: VISÃO GERAL
  ══════════════════════════════════════════════════════════ */

  function _htmlVisaoGeral() {
    const proj = App.obterProjetoAtual();
    if (!proj) return '';
    const emp = Storage.buscarEmpresa(proj.empresaId);

    return `
      <div class="container">
        <!-- Empresa vinculada -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">
            🏢 Empresa Cliente
            <button class="btn btn-fantasma btn-sm" style="margin-left:auto"
                    onclick="App.navegarPara('empresas')">✏️ Editar</button>
          </div>
          ${emp ? `
            <div style="font-size:var(--txt-base);font-weight:600">${emp.nome}</div>
            <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s1)">
              ${emp.cnpj||''} ${emp.cidade ? '· '+emp.cidade+(emp.estado?'/'+emp.estado:'') : ''}
            </div>
          ` : `<div class="aviso-tecnico aviso" style="margin:0">
            <span>⚠️</span><span>Nenhuma empresa vinculada.</span>
          </div>`}
        </div>

        <!-- Dados do projeto -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📁 Dados do Projeto</div>

          <div class="grupo-campo">
            <label for="proj-nome">Nome do Projeto / Dossiê</label>
            <input type="text" id="proj-nome" placeholder="Ex.: AEP 2026 — Engenhalves"
                   value="${proj.nome || ''}">
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-tipo">Tipo do Projeto</label>
              <select id="proj-tipo">
                <option value="aep"          ${proj.tipo==='aep'?'selected':''}>📋 AEP — Avaliação Ergonômica Preliminar</option>
                <option value="psicossocial" ${proj.tipo==='psicossocial'?'selected':''}>🧠 Fatores Psicossociais</option>
                <option value="aet"          ${proj.tipo==='aet'?'selected':''}>🔬 AET — Análise Ergonômica do Trabalho</option>
                <option value="integrado"    ${proj.tipo==='integrado'?'selected':''}>📊 Integrado (AEP + FP + AET)</option>
              </select>
            </div>
            <div class="grupo-campo">
              <label for="proj-status">Status</label>
              <select id="proj-status">
                <option value="em_andamento" ${proj.status!=='concluido'?'selected':''}>🔄 Em andamento</option>
                <option value="concluido"    ${proj.status==='concluido'?'selected':''}>✅ Concluído</option>
              </select>
            </div>
          </div>

          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-inicio">Data de Início</label>
              <input type="date" id="proj-inicio" value="${proj.dataInicio || ''}">
            </div>
            <div class="grupo-campo">
              <label for="proj-fim">Data de Conclusão</label>
              <input type="date" id="proj-fim" value="${proj.dataFim || ''}">
            </div>
          </div>

          <div class="grupo-campo">
            <label for="proj-objetivo">Objetivo do Projeto</label>
            <textarea id="proj-objetivo" rows="3"
              placeholder="Descreva o objetivo técnico do projeto de laudo..."
            >${proj.objetivo || ''}</textarea>
          </div>

          <div class="grupo-campo">
            <label for="proj-obs">Observações Gerais</label>
            <textarea id="proj-obs" rows="2"
              placeholder="Contexto, demandas específicas do cliente, restrições..."
            >${proj.observacoesGerais || ''}</textarea>
          </div>
        </div>

        <!-- Responsável técnico -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📋 Responsável Técnico</div>
          <div class="grupo-campo">
            <label for="proj-responsavel">Nome</label>
            <input type="text" id="proj-responsavel" placeholder="Nome completo"
                   value="${proj.responsavelTecnico || ''}">
          </div>
          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="proj-registro">Registro Profissional</label>
              <input type="text" id="proj-registro" placeholder="CREA, CRQ, CRP..."
                     value="${proj.registroProfissional || ''}">
            </div>
            <div class="grupo-campo">
              <label for="proj-cargo">Cargo</label>
              <select id="proj-cargo">
                <option value="">Selecione...</option>
                ${['Engenheiro de Segurança do Trabalho','Técnico de Segurança do Trabalho','Ergonomista','Médico do Trabalho','Psicólogo do Trabalho','Fisioterapeuta do Trabalho','Outro']
                  .map(c => `<option ${proj.cargoResponsavel===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <button class="btn-bloco" onclick="ModuloProjeto.salvarVisaoGeral()">💾 Salvar Projeto</button>
        <div style="height:var(--s4)"></div>
      </div>
    `;
  }

  function salvarVisaoGeral() {
    _salvarVisaoGeralSilencioso();
    const proj = App.obterProjetoAtual();
    if (proj) try { Storage.salvarProjeto(proj); App.mostrarToast('Projeto salvo', 'sucesso'); } catch(e) {}
  }

  function _salvarVisaoGeralSilencioso() {
    const proj = App.obterProjetoAtual();
    if (!proj || !document.getElementById('proj-nome')) return;
    const get = id => (document.getElementById(id)||{}).value?.trim() || '';
    proj.nome                 = get('proj-nome');
    proj.tipo                 = get('proj-tipo') || 'aep';
    proj.status               = get('proj-status') || 'em_andamento';
    proj.dataInicio           = get('proj-inicio');
    proj.dataFim              = get('proj-fim');
    proj.objetivo             = get('proj-objetivo');
    proj.observacoesGerais    = get('proj-obs');
    proj.responsavelTecnico   = get('proj-responsavel');
    proj.registroProfissional = get('proj-registro');
    proj.cargoResponsavel     = get('proj-cargo');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: SETORES E FUNÇÕES
  ══════════════════════════════════════════════════════════ */

  function _htmlSetores() {
    const proj    = App.obterProjetoAtual();
    const setores = Storage.listarSetores(proj.id);

    const listaHTML = setores.length === 0
      ? `<div class="empty-state" style="padding:var(--s5)">
           <div class="empty-icon">📍</div>
           <p>Nenhum setor cadastrado neste projeto.</p>
           <p style="font-size:var(--txt-sm)">Adicione setores para organizar as avaliações por área.</p>
         </div>`
      : setores.map(s => _htmlCardSetor(s)).join('');

    return `
      <div class="container">
        <div class="aviso-tecnico info" style="margin-top:var(--s4)">
          <span>📍</span>
          <span>Estes setores e funções pertencem ao <strong>projeto atual</strong>.
          Alterações aqui <strong>não modificam</strong> o catálogo mestre da empresa.
          Para editar o catálogo mestre, acesse <strong>Empresas</strong>.</span>
        </div>

        <button class="btn-bloco" onclick="ModuloProjeto.abrirFormSetor()" style="margin:var(--s3) 0">
          + Adicionar Setor
        </button>

        <div id="lista-setores-projeto">${listaHTML}</div>
      </div>

      <!-- Modal setor -->
      <div class="modal-overlay oculto" id="modal-proj-setor">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-ps-titulo">Novo Setor</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-proj-setor')">✕</button>
          </div>
          <div id="modal-ps-form"></div>
        </div>
      </div>

      <!-- Modal função -->
      <div class="modal-overlay oculto" id="modal-proj-funcao">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-pf-titulo">Nova Função</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-proj-funcao')">✕</button>
          </div>
          <div id="modal-pf-form"></div>
        </div>
      </div>
    `;
  }

  function _htmlCardSetor(s) {
    const funcoes  = Storage.listarFuncoes(s.id);
    const numAvs   = Storage.listar().filter(a => a.setorId === s.id).length;

    return `
      <div class="card" style="margin-bottom:var(--s4)" id="card-set-${s.id}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s3)">
          <div>
            <div style="font-size:var(--txt-base);font-weight:700">📍 ${s.nome}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:2px">
              ${funcoes.length} função(ões) · ${numAvs} avaliação(ões)
            </div>
            ${s.descricaoAmbiente ? `<div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s1)">${s.descricaoAmbiente.slice(0,80)}${s.descricaoAmbiente.length>80?'…':''}</div>` : ''}
          </div>
          <div style="display:flex;gap:var(--s2)">
            <button class="btn btn-fantasma btn-sm" onclick="ModuloProjeto.abrirFormSetor('${s.id}')">✏️</button>
            <button class="btn btn-perigo btn-sm" onclick="ModuloProjeto.excluirSetor('${s.id}')">🗑️</button>
          </div>
        </div>

        <!-- Funções -->
        <div style="border-top:1px solid var(--borda);padding-top:var(--s3)">
          ${funcoes.length === 0
            ? `<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhuma função.</p>`
            : funcoes.map(f => `
                <div class="item-funcao">
                  <div style="flex:1">
                    <div style="font-size:var(--txt-sm);font-weight:600">👷 ${f.nome}</div>
                    <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                      ${f.numTrabalhadores ? f.numTrabalhadores+' trab.' : ''}
                      ${f.turno ? '· '+f.turno : ''}
                      ${f.grupoHomogeneo ? '· GHE: '+f.grupoHomogeneo : ''}
                    </div>
                  </div>
                  <button class="btn btn-fantasma btn-sm" onclick="ModuloProjeto.abrirFormFuncao('${s.id}','${f.id}')">✏️</button>
                  <button class="btn btn-perigo btn-sm" onclick="ModuloProjeto.excluirFuncao('${f.id}')">🗑️</button>
                </div>
              `).join('')}
          <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s2);font-size:var(--txt-xs)"
                  onclick="ModuloProjeto.abrirFormFuncao('${s.id}')">
            + Adicionar Função
          </button>
        </div>
      </div>
    `;
  }

  function abrirFormSetor(setorId) {
    const proj = App.obterProjetoAtual();
    const s    = setorId ? Storage.buscarSetor(setorId) : Storage.criarSetor(proj.id);
    document.getElementById('modal-ps-titulo').textContent = setorId ? 'Editar Setor' : 'Novo Setor';
    document.getElementById('modal-ps-form').innerHTML = `
      <div class="grupo-campo">
        <label>Nome do Setor / Área</label>
        <input type="text" id="ps-nome" placeholder="Ex.: Produção, Administrativo" value="${s.nome||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição do Ambiente</label>
        <textarea id="ps-amb" rows="3" placeholder="Descreva o ambiente de trabalho...">${s.descricaoAmbiente||''}</textarea>
      </div>
      <div class="grupo-campo">
        <label>Observações</label>
        <textarea id="ps-obs" rows="2" placeholder="Observações adicionais...">${s.observacoes||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1" onclick="ModuloProjeto.salvarSetor('${s.id}','${proj.id}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloProjeto.fecharModal('modal-proj-setor')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-proj-setor').classList.remove('oculto');
  }

  function salvarSetor(id, projetoId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const s   = Storage.buscarSetor(id) || { id };
    s.nome              = get('ps-nome');
    s.projetoId         = projetoId;
    s.descricaoAmbiente = get('ps-amb');
    s.observacoes       = get('ps-obs');
    if (!s.nome) { App.mostrarToast('Informe o nome do setor','erro'); return; }
    Storage.salvarSetor(s);
    fecharModal('modal-proj-setor');
    App.mostrarToast('Setor salvo','sucesso');
    trocarSecao('setores');
  }

  function excluirSetor(id) {
    const s = Storage.buscarSetor(id);
    const avs = Storage.listar().filter(a => a.setorId === id).length;
    if (!confirm(`Excluir setor "${s?.nome}"${avs>0?' e suas '+avs+' avaliação(ões)':''}?`)) return;
    Storage.listar().filter(a => a.setorId === id).forEach(a => Storage.excluir(a.id));
    Storage.excluirSetor(id);
    App.mostrarToast('Setor excluído','sucesso');
    trocarSecao('setores');
  }

  function abrirFormFuncao(setorId, funcaoId) {
    const proj = App.obterProjetoAtual();
    const f    = funcaoId ? Storage.buscarFuncao(funcaoId) : Storage.criarFuncao(proj.id, setorId);
    document.getElementById('modal-pf-titulo').textContent = funcaoId ? 'Editar Função' : 'Nova Função';
    document.getElementById('modal-pf-form').innerHTML = `
      <div class="grupo-campo">
        <label>Nome da Função / Cargo</label>
        <input type="text" id="pf-nome" placeholder="Ex.: Operador de Prensa" value="${f.nome||''}">
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Nº de Trabalhadores (GHE)</label>
          <input type="number" id="pf-num" min="1" placeholder="Ex.: 12" value="${f.numTrabalhadores||''}">
        </div>
        <div class="grupo-campo">
          <label>Turno</label>
          <select id="pf-turno">
            <option value="">Selecione...</option>
            ${['Diurno','Vespertino','Noturno','12x36','Misto'].map(t=>`<option ${f.turno===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grupo-campo">
        <label>Grupo Homogêneo (GHE)</label>
        <input type="text" id="pf-ghe" placeholder="Ex.: GHE-01" value="${f.grupoHomogeneo||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição da Atividade</label>
        <textarea id="pf-desc" rows="3" placeholder="Principais tarefas realizadas...">${f.descricaoAtividade||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1"
                onclick="ModuloProjeto.salvarFuncao('${f.id}','${setorId}','${proj.id}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloProjeto.fecharModal('modal-proj-funcao')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-proj-funcao').classList.remove('oculto');
  }

  function salvarFuncao(id, setorId, projetoId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const f   = Storage.buscarFuncao(id) || { id };
    f.nome               = get('pf-nome');
    f.setorId            = setorId;
    f.projetoId          = projetoId;
    f.numTrabalhadores   = get('pf-num');
    f.turno              = get('pf-turno');
    f.grupoHomogeneo     = get('pf-ghe');
    f.descricaoAtividade = get('pf-desc');
    if (!f.nome) { App.mostrarToast('Informe o nome da função','erro'); return; }
    Storage.salvarFuncao(f);
    fecharModal('modal-proj-funcao');
    App.mostrarToast('Função salva','sucesso');
    trocarSecao('setores');
  }

  function excluirFuncao(id) {
    const f = Storage.buscarFuncao(id);
    if (!confirm(`Excluir função "${f?.nome}"?`)) return;
    Storage.excluirFuncao(id);
    App.mostrarToast('Função excluída','sucesso');
    trocarSecao('setores');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: AVALIAÇÕES
  ══════════════════════════════════════════════════════════ */

  function _htmlAvaliacoes() {
    const proj    = App.obterProjetoAtual();
    const avs     = Storage.listarPorProjeto(proj.id);
    const setores = Storage.listarSetores(proj.id);

    /* Agrupa avaliações por setor → função */
    const grupos = {};
    setores.forEach(s => {
      const funcoes = Storage.listarFuncoes(s.id);
      grupos[s.id]  = { setor: s, funcoes: {}, avsSoltas: [] };
      funcoes.forEach(f => { grupos[s.id].funcoes[f.id] = { funcao: f, avs: [] }; });
    });
    avs.forEach(av => {
      if (av.setorId && grupos[av.setorId]) {
        if (av.funcaoId && grupos[av.setorId].funcoes[av.funcaoId]) {
          grupos[av.setorId].funcoes[av.funcaoId].avs.push(av);
        } else {
          grupos[av.setorId].avsSoltas.push(av);
        }
      }
    });

    const listaHTML = Object.values(grupos).map(g => {
      const funcoesHTML = Object.values(g.funcoes).map(fg => {
        const avsFun = fg.avs.map(av => _htmlItemAv(av)).join('');
        return `
          <div class="item-funcao-avs">
            <div style="font-size:var(--txt-sm);font-weight:600;color:var(--texto-sec);margin-bottom:var(--s2)">
              👷 ${fg.funcao.nome}
              ${fg.funcao.numTrabalhadores ? `<span style="font-weight:400"> · ${fg.funcao.numTrabalhadores} trab.</span>` : ''}
            </div>
            ${avsFun || '<p style="font-size:var(--txt-xs);color:var(--texto-sec);padding:var(--s1) 0">Nenhuma avaliação</p>'}
            <button class="btn btn-fantasma" style="width:100%;font-size:var(--txt-xs);margin-top:var(--s2)"
                    onclick="ModuloProjeto.abrirWizardAv('${g.setor.id}','${fg.funcao.id}')">
              + Adicionar Avaliação
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="card" style="margin-bottom:var(--s4)">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:var(--s3)">
            📍 ${g.setor.nome}
          </div>
          ${funcoesHTML || '<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhuma função neste setor.</p>'}
          ${g.avsSoltas.map(av => _htmlItemAv(av)).join('')}
        </div>
      `;
    }).join('');

    /* Avaliações sem setor vinculado (legadas) */
    const avsSemSetor = avs.filter(av => !av.setorId || !grupos[av.setorId]);
    const legadasHTML = avsSemSetor.length > 0
      ? `<div class="card" style="margin-bottom:var(--s4)">
           <div style="font-weight:700;margin-bottom:var(--s3)">📋 Avaliações sem setor definido</div>
           ${avsSemSetor.map(av => _htmlItemAv(av)).join('')}
         </div>`
      : '';

    const vazioHTML = setores.length === 0 && avs.length === 0
      ? `<div class="empty-state" style="padding:var(--s6)">
           <div class="empty-icon">📊</div>
           <p>Nenhuma avaliação neste projeto.</p>
           <p style="font-size:var(--txt-sm)">Primeiro adicione setores e funções na aba <strong>Setores</strong>,
           depois crie as avaliações aqui.</p>
         </div>`
      : '';

    return `
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--s4);margin-bottom:var(--s4)">
          <div>
            <div style="font-weight:600">${avs.length} avaliação(ões)</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              AEP: ${avs.filter(a=>a.tipo==='aep').length} ·
              Psicossocial: ${avs.filter(a=>a.tipo==='psicossocial').length} ·
              AET: ${avs.filter(a=>a.tipo==='aet').length}
            </div>
          </div>
          <button class="btn btn-primario btn-sm" onclick="ModuloProjeto.abrirWizardAv()">
            + Nova Avaliação
          </button>
        </div>

        ${listaHTML}
        ${legadasHTML}
        ${vazioHTML}
      </div>

      <!-- Modal wizard de nova avaliação -->
      <div class="modal-overlay oculto" id="modal-nova-av">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-nav-titulo">Nova Avaliação</span>
            <button class="btn-icone" onclick="ModuloProjeto.fecharModal('modal-nova-av')">✕</button>
          </div>
          <div id="modal-nav-form"></div>
        </div>
      </div>
    `;
  }

  function _htmlItemAv(av) {
    const funcao = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
    return `
      <div class="item-avaliacao" style="margin-bottom:var(--s2)"
           onclick="App.abrirAvaliacao('${av.id}')">
        <div class="item-icon">${TIPO_ICON[av.tipo]||'📋'}</div>
        <div class="item-info">
          <div class="item-empresa" style="font-size:var(--txt-sm)">
            <span class="badge-tipo badge-tipo-${av.tipo}">${TIPO_LABEL[av.tipo]||av.tipo}</span>
            ${funcao ? ' · '+funcao.nome : ''}
          </div>
          <div class="item-meta">
            ${av.dataAvaliacao ? `<span>${_fd(av.dataAvaliacao)}</span>` : ''}
            <span class="badge ${av.status==='concluida'?'badge-sucesso':'badge-info'}">
              ${av.status==='concluida'?'Concluída':'Em andamento'}
            </span>
          </div>
        </div>
        <div onclick="event.stopPropagation()">
          <button class="btn-icone" onclick="App.confirmarExclusao('${av.id}')">🗑️</button>
        </div>
      </div>
    `;
  }

  /* Wizard de criação de avaliação (dentro do projeto) */
  function abrirWizardAv(setorId, funcaoId) {
    const proj = App.obterProjetoAtual();
    _wiz = { setorId: setorId || null, funcaoId: funcaoId || null, tipo: null };
    _renderizarWizardAv(proj);
    document.getElementById('modal-nova-av').classList.remove('oculto');
  }

  function _renderizarWizardAv(proj) {
    const el = document.getElementById('modal-nav-form');
    if (!el) return;

    const setores = Storage.listarSetores(proj.id);

    if (!_wiz.setorId) {
      /* Passo 1: setor */
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 1 de 3 — Selecione o setor:
        </div>
        ${setores.map(s => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetSetor('${s.id}')">
            <div>
              <div style="font-weight:600">📍 ${s.nome}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                ${Storage.listarFuncoes(s.id).length} função(ões)
              </div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        ${setores.length === 0 ? `<div class="aviso-tecnico aviso"><span>⚠️</span><span>Nenhum setor. Vá à aba <strong>Setores</strong> para adicionar.</span></div>` : ''}
      `;
    } else if (!_wiz.funcaoId) {
      /* Passo 2: função */
      const funcoes = Storage.listarFuncoes(_wiz.setorId);
      const set = Storage.buscarSetor(_wiz.setorId);
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 2 de 3 — Setor: <strong>${set?.nome}</strong> · Selecione a função:
        </div>
        ${funcoes.map(f => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetFuncao('${f.id}')">
            <div>
              <div style="font-weight:600">👷 ${f.nome}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                ${f.numTrabalhadores ? f.numTrabalhadores+' trab.' : ''} ${f.turno ? '· '+f.turno : ''}
              </div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        ${funcoes.length === 0 ? `<div class="aviso-tecnico aviso"><span>⚠️</span><span>Nenhuma função neste setor.</span></div>` : ''}
        <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s3)"
                onclick="ModuloProjeto._wizVoltarSetor()">← Voltar</button>
      `;
    } else if (!_wiz.tipo) {
      /* Passo 3: tipo */
      const funcao = Storage.buscarFuncao(_wiz.funcaoId);
      el.innerHTML = `
        <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
          Passo 3 de 3 — <strong>${funcao?.nome}</strong> · Selecione o tipo:
        </div>
        ${[
          { tipo:'aep',          icone:'📋', titulo:'AEP', desc:'Avaliação Ergonômica Preliminar — NR-17' },
          { tipo:'psicossocial', icone:'🧠', titulo:'Fatores Psicossociais', desc:'Riscos psicossociais — COPSOQ-III' },
          { tipo:'aet',          icone:'🔬', titulo:'AET', desc:'Análise Ergonômica do Trabalho' }
        ].map(op => `
          <div class="item-selecao" onclick="ModuloProjeto._wizSetTipo('${op.tipo}')">
            <div>
              <div style="font-weight:600">${op.icone} ${op.titulo}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">${op.desc}</div>
            </div>
            <span>›</span>
          </div>
        `).join('')}
        <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s3)"
                onclick="ModuloProjeto._wizVoltarFuncao()">← Voltar</button>
      `;
    }
  }

  function _wizSetSetor(id)  { _wiz.setorId = id; _renderizarWizardAv(App.obterProjetoAtual()); }
  function _wizSetFuncao(id) { _wiz.funcaoId = id; _renderizarWizardAv(App.obterProjetoAtual()); }
  function _wizVoltarSetor() { _wiz.setorId = null; _wiz.funcaoId = null; _renderizarWizardAv(App.obterProjetoAtual()); }
  function _wizVoltarFuncao(){ _wiz.funcaoId = null; _renderizarWizardAv(App.obterProjetoAtual()); }

  function _wizSetTipo(tipo) {
    _wiz.tipo = tipo;
    fecharModal('modal-nova-av');
    const proj = App.obterProjetoAtual();
    const av   = Storage.criarAvaliacao(tipo, proj.id, _wiz.setorId, _wiz.funcaoId);
    Storage.salvar(av);
    App.abrirAvaliacao(av.id);
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: PLANO DE AÇÃO (consolidado do projeto)
  ══════════════════════════════════════════════════════════ */

  function _htmlPlano() {
    const proj = App.obterProjetoAtual();
    const avs  = Storage.listarPorProjeto(proj.id);

    /* Consolida planoAcao de todas as avaliações do projeto */
    const todasAcoes = [];
    avs.forEach(av => {
      const setor  = av.setorId  ? Storage.buscarSetor(av.setorId)   : null;
      const funcao = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
      (av.planoAcao || []).forEach(acao => {
        todasAcoes.push({ ...acao, _avId: av.id, _tipo: av.tipo,
          _setor: setor?.nome || '', _funcao: funcao?.nome || '' });
      });
    });

    if (todasAcoes.length === 0) {
      return `
        <div class="container">
          <div class="empty-state" style="padding:var(--s8)">
            <div class="empty-icon">📌</div>
            <p>Nenhuma ação no plano ainda.</p>
            <p style="font-size:var(--txt-sm)">Ações são adicionadas dentro de cada avaliação (AEP, FP, AET)
            e consolidadas aqui.</p>
          </div>
        </div>
      `;
    }

    const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
    const _fdl = iso => _fd(iso);

    const porPrioridade = (lista, p) => lista.filter(a => a.prioridade === p);
    const altas  = porPrioridade(todasAcoes, 'alta');
    const medias = porPrioridade(todasAcoes, 'media');
    const baixas = porPrioridade(todasAcoes, 'baixa');
    const concl  = todasAcoes.filter(a => a.status === 'concluido').length;

    const listaHTML = todasAcoes.map(acao => `
      <div class="item-plano prioridade-${acao.prioridade}">
        <div class="item-plano-header">
          <div>
            <div class="item-plano-titulo">${acao.descricao}</div>
            <div class="item-plano-meta">
              <span class="status-chip status-${acao.status}">${STATUS_L[acao.status]||acao.status}</span>
              <span class="badge-tipo badge-tipo-${acao._tipo}">${TIPO_LABEL[acao._tipo]||acao._tipo}</span>
              ${acao._setor ? `<span>${acao._setor}</span>` : ''}
              ${acao._funcao ? `<span>· ${acao._funcao}</span>` : ''}
              ${acao.responsavel ? `<span>👤 ${acao.responsavel}</span>` : ''}
              ${acao.prazo ? `<span>📅 ${_fdl(acao.prazo)}</span>` : ''}
            </div>
          </div>
        </div>
        ${acao.medida ? `<div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s2)"><strong style="color:var(--texto)">Medida:</strong> ${acao.medida}</div>` : ''}
        <div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">
          ${['pendente','em_andamento','concluido'].map(s => `
            <button class="btn btn-sm ${acao.status===s?'btn-primario':'btn-secundario'}"
                    onclick="ModuloProjeto.alterarStatusAcao('${acao._avId}','${acao.id}','${s}')">
              ${STATUS_L[s]}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div class="container">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2);margin-top:var(--s4);margin-bottom:var(--s5)">
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--perigo)">${altas.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Alta Prior.</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--aviso)">${medias.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Média Prior.</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700;color:var(--sucesso)">${concl}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Concluídas</div>
          </div>
          <div class="card" style="text-align:center;padding:var(--s3)">
            <div style="font-size:22px;font-weight:700">${todasAcoes.length}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">Total</div>
          </div>
        </div>
        ${listaHTML}
      </div>
    `;
  }

  function alterarStatusAcao(avId, acaoId, novoStatus) {
    const av = Storage.buscar(avId);
    if (!av) return;
    const acao = av.planoAcao?.find(a => a.id === acaoId);
    if (acao) { acao.status = novoStatus; Storage.salvar(av); }
    /* Também atualiza avaliação em memória se for a atual */
    const avAtual = App.obterAvaliacaoAtual();
    if (avAtual?.id === avId) {
      const a2 = avAtual.planoAcao?.find(a => a.id === acaoId);
      if (a2) a2.status = novoStatus;
    }
    App.mostrarToast('Status atualizado','sucesso');
    trocarSecao('plano');
  }

  /* ══════════════════════════════════════════════════════════
     SEÇÃO: RELATÓRIO CONSOLIDADO
  ══════════════════════════════════════════════════════════ */

  function _htmlRelatorio() {
    const proj    = App.obterProjetoAtual();
    const emp     = Storage.buscarEmpresa(proj.empresaId);
    const setores = Storage.listarSetores(proj.id);
    const avs     = Storage.listarPorProjeto(proj.id);

    /* Totais gerais */
    const totalAlt  = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.alto  || 0), 0);
    const totalMed  = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.medio || 0), 0);
    const totalBx   = avs.reduce((n, a) => n + (ModuloAEP?.calcularRiscoGeral(a)?.baixo || 0), 0);
    const totalAcoes= avs.reduce((n, a) => n + (a.planoAcao?.length || 0), 0);

    /* Seções por setor/função */
    const secoesPorSetor = setores.map(s => {
      const funcoes = Storage.listarFuncoes(s.id);
      const funcoesSecs = funcoes.map(f => {
        const avsF = avs.filter(a => a.funcaoId === f.id);
        const avTipos = avsF.map(av => `
          <div style="margin:var(--s2) 0 var(--s2) var(--s4)">
            <span class="badge-tipo badge-tipo-${av.tipo}">${TIPO_LABEL[av.tipo]}</span>
            <span style="font-size:var(--txt-xs);color:var(--texto-sec);margin-left:var(--s2)">${_fd(av.dataAvaliacao)}</span>
            ${av.tipo === 'aep' && ModuloAEP ? (() => {
              const r = ModuloAEP.calcularRiscoGeral(av);
              return r.alto > 0 || r.medio > 0
                ? `<span class="badge badge-${r.alto>0?'alto':'medio'}" style="margin-left:var(--s2)">${r.alto>0?r.alto+' alto':''} ${r.medio>0?r.medio+' médio':''}</span>`
                : '<span class="badge badge-sucesso" style="margin-left:var(--s2)">Sem não conformidades</span>';
            })() : ''}
            ${av.aep?.analise?.nivelRiscoGeral ? `<span style="font-size:var(--txt-xs);margin-left:var(--s2);color:var(--texto-sec)">Risco geral: ${av.aep.analise.nivelRiscoGeral}</span>` : ''}
          </div>
        `).join('');
        return avsF.length > 0 ? `
          <div style="padding:var(--s2) 0 var(--s2) var(--s4)">
            <div style="font-size:var(--txt-sm);font-weight:600">👷 ${f.nome}
              ${f.numTrabalhadores ? `<span style="font-weight:400;color:var(--texto-sec)"> · ${f.numTrabalhadores} trab.</span>` : ''}
            </div>
            ${avTipos}
          </div>
        ` : '';
      }).join('');

      return `
        <div style="margin-bottom:var(--s4)">
          <div style="font-size:var(--txt-base);font-weight:700;margin-bottom:var(--s2)">
            📍 ${s.nome}
          </div>
          ${funcoesSecs || '<p style="font-size:var(--txt-sm);color:var(--texto-sec);padding-left:var(--s4)">Sem avaliações neste setor.</p>'}
        </div>
      `;
    }).join('');

    /* Conclusão técnica (editável) */
    return `
      <div class="container">
        <!-- Cabeçalho -->
        <div style="margin-top:var(--s4);text-align:center;margin-bottom:var(--s5)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);text-transform:uppercase;letter-spacing:.5px">
            Projeto de Laudo Técnico
          </div>
          <div style="font-size:var(--txt-xl);font-weight:700">${proj.nome || 'Laudo Técnico'}</div>
          <div style="font-size:var(--txt-sm);color:var(--texto-sec)">
            ${emp?.nome || ''} · ${_fd(proj.dataInicio)}
          </div>
        </div>

        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin-bottom:var(--s5)">
          <button class="btn btn-primario" onclick="ModuloProjeto.imprimir()">🖨️ Imprimir PDF</button>
          <button class="btn btn-secundario" onclick="ModuloProjeto.exportarProjeto()">📤 Exportar Projeto</button>
        </div>

        <!-- Resumo -->
        <div class="relatorio-resumo-risco">
          <div class="resumo-risco-card alto"><div class="numero">${totalAlt}</div><div class="label">Risco Alto</div></div>
          <div class="resumo-risco-card medio"><div class="numero">${totalMed}</div><div class="label">Risco Médio</div></div>
          <div class="resumo-risco-card baixo"><div class="numero">${totalBx}</div><div class="label">Risco Baixo</div></div>
        </div>

        <!-- Identificação -->
        <div class="relatorio-secao">
          <h3>1. Identificação do Projeto</h3>
          <div class="card">
            ${_li('Empresa', emp?.nome)} ${_li('CNPJ', emp?.cnpj)}
            ${_li('Cidade / Estado', [emp?.cidade, emp?.estado].filter(Boolean).join('/'))}
            ${_li('Projeto', proj.nome)}
            ${_li('Tipo', { aep:'AEP', psicossocial:'Fatores Psicossociais', aet:'AET', integrado:'Integrado (AEP+FP+AET)' }[proj.tipo]||proj.tipo)}
            ${_li('Data de Início', _fd(proj.dataInicio))}
            ${_li('Data de Conclusão', _fd(proj.dataFim))}
            ${_li('Responsável Técnico', proj.responsavelTecnico)}
            ${_li('Registro', proj.registroProfissional)}
          </div>
        </div>

        <!-- Objetivo -->
        ${proj.objetivo ? `
        <div class="relatorio-secao">
          <h3>2. Objetivo</h3>
          <div class="card"><p style="font-size:var(--txt-sm)">${proj.objetivo}</p></div>
        </div>` : ''}

        <!-- Escopo: setores e funções -->
        <div class="relatorio-secao">
          <h3>${proj.objetivo ? '3' : '2'}. Escopo — Setores e Avaliações</h3>
          <div class="card">
            ${_li('Total de Setores', setores.length)}
            ${_li('Total de Avaliações', avs.length)}
            ${_li('Ações no Plano', totalAcoes)}
          </div>
          <div style="margin-top:var(--s3)">${secoesPorSetor}</div>
        </div>

        <!-- Plano de ação resumido -->
        ${totalAcoes > 0 ? `
        <div class="relatorio-secao">
          <h3>${proj.objetivo ? '4' : '3'}. Plano de Ação</h3>
          <div style="overflow-x:auto">
            <table class="tabela-simples">
              <thead><tr><th>#</th><th>Ação</th><th>Setor</th><th>Função</th><th>Prior.</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
              <tbody>
                ${(() => {
                  let n = 0;
                  return avs.flatMap(av => {
                    const s = av.setorId ? Storage.buscarSetor(av.setorId) : null;
                    const f = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
                    return (av.planoAcao || []).map(acao => `<tr>
                      <td>${++n}</td>
                      <td style="font-size:var(--txt-xs)">${acao.descricao?.slice(0,50)||''}…</td>
                      <td style="font-size:var(--txt-xs)">${s?.nome||'—'}</td>
                      <td style="font-size:var(--txt-xs)">${f?.nome||'—'}</td>
                      <td><span class="badge badge-${acao.prioridade==='alta'?'alto':acao.prioridade==='media'?'medio':'baixo'}">${acao.prioridade}</span></td>
                      <td style="font-size:var(--txt-xs)">${acao.responsavel||'—'}</td>
                      <td style="font-size:var(--txt-xs)">${_fd(acao.prazo)}</td>
                      <td style="font-size:var(--txt-xs)">${acao.status}</td>
                    </tr>`);
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <!-- Conclusão técnica -->
        <div class="relatorio-secao">
          <h3>Conclusão Técnica</h3>
          <div class="card">
            <div class="grupo-campo">
              <textarea id="proj-conclusao" rows="6"
                placeholder="Redija a conclusão técnica consolidada do projeto: principais achados, nível de risco geral, recomendações gerais e perspectivas de acompanhamento..."
                onblur="ModuloProjeto.onConclusaoChange(this.value)"
              >${proj.conclusaoTecnica || ''}</textarea>
            </div>
            <label class="check-item" style="cursor:pointer">
              <input type="checkbox" id="proj-aet" ${proj.necessitaAET?'checked':''}
                     onchange="ModuloProjeto.onNecessitaAETChange(this.checked)">
              <div class="check-box">✓</div>
              <span>Este projeto indica necessidade de AET para alguma função</span>
            </label>
            <button class="btn btn-primario" style="margin-top:var(--s3)" onclick="ModuloProjeto.salvarConclusao()">
              💾 Salvar Conclusão
            </button>
          </div>
        </div>

        <div style="text-align:center;padding:var(--s6) 0;color:var(--texto-sec);font-size:var(--txt-xs)">
          ErgoGRO · Projeto de Laudo Técnico · NR-17 / GRO-PGR<br>
          Documento técnico de uso profissional — não substitui laudo assinado por profissional habilitado
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

  function onConclusaoChange(texto) {
    const proj = App.obterProjetoAtual();
    if (proj) proj.conclusaoTecnica = texto.trim();
  }

  function onNecessitaAETChange(checked) {
    const proj = App.obterProjetoAtual();
    if (proj) proj.necessitaAET = checked;
  }

  function salvarConclusao() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    proj.conclusaoTecnica = document.getElementById('proj-conclusao')?.value?.trim() || '';
    proj.necessitaAET     = document.getElementById('proj-aet')?.checked || false;
    Storage.salvarProjeto(proj);
    App.mostrarToast('Conclusão salva','sucesso');
  }

  function imprimir() {
    salvarConclusao();
    window.print();
  }

  function exportarProjeto() {
    const proj = App.obterProjetoAtual();
    if (!proj) return;
    const json = Storage.exportarProjeto(proj.id);
    const blob = new Blob([json], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Projeto_${(proj.nome||'laudo').replace(/\s+/g,'_')}_${(proj.dataInicio||'').replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('Projeto exportado','sucesso');
  }

  /* ── Modal util ───────────────────────────────────────────── */
  function fecharModal(id) {
    document.getElementById(id)?.classList.add('oculto');
  }

  return {
    renderizar, trocarSecao,
    salvarVisaoGeral, onConclusaoChange, onNecessitaAETChange, salvarConclusao, imprimir, exportarProjeto,
    abrirFormSetor, salvarSetor, excluirSetor,
    abrirFormFuncao, salvarFuncao, excluirFuncao,
    abrirWizardAv, _wizSetSetor, _wizSetFuncao, _wizVoltarSetor, _wizVoltarFuncao, _wizSetTipo,
    alterarStatusAcao, fecharModal
  };
})();
