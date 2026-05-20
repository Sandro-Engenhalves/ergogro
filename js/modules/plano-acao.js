/* ============================================================
   ErgoGRO — Módulo: Plano de Ação Global
   Consolida ações de todos os projetos e permite filtros por
   empresa, projeto, setor e tipo de avaliação.
   O plano de cada projeto é gerenciado em ModuloProjeto.
   ============================================================ */

const ModuloPlano = (() => {

  let _acoesCacheadas = [];

  /* ── Plano geral ─────────────────────────────────────────── */
  function renderizarGeral(filtroEmpresaId, filtroProjetoId, filtroTipo) {
    const tela     = document.getElementById('tela-plano-geral');
    const empresas = Storage.listarEmpresas();
    const projetos = Storage.listarProjetos();
    const lista    = Storage.listar();

    /* Coleta todas as ações */
    const todas = [];
    lista.forEach(av => {
      const proj   = av.projetoId ? Storage.buscarProjeto(av.projetoId)   : null;
      const emp    = proj ? Storage.buscarEmpresa(proj.empresaId)          : null;
      const setor  = av.setorId   ? Storage.buscarSetor(av.setorId)       : null;
      const funcao = av.funcaoId  ? Storage.buscarFuncao(av.funcaoId)     : null;
      (av.planoAcao || []).forEach(acao => {
        todas.push({
          ...acao,
          _avId:      av.id,
          _projetoId: av.projetoId || '',
          _empresaId: proj?.empresaId || av.empresaId || '',
          _tipo:      av.tipo || 'aep',
          _projeto:   proj?.nome   || '',
          _empresa:   emp?.nome    || '',
          _setor:     setor?.nome  || '',
          _funcao:    funcao?.nome || '',
          _tipoLabel: { aep:'AEP', psicossocial:'Psicossocial', aet:'AET' }[av.tipo] || 'AEP'
        });
      });
    });

    /* Aplica filtros */
    let filtradas = todas;
    if (filtroEmpresaId) filtradas = filtradas.filter(a => a._empresaId === filtroEmpresaId);
    if (filtroProjetoId) filtradas = filtradas.filter(a => a._projetoId === filtroProjetoId);
    if (filtroTipo)      filtradas = filtradas.filter(a => a._tipo       === filtroTipo);

    const pend    = filtradas.filter(a => a.status === 'pendente').length;
    const em_and  = filtradas.filter(a => a.status === 'em_andamento').length;
    const concl   = filtradas.filter(a => a.status === 'concluido').length;
    const altas   = filtradas.filter(a => a.prioridade === 'alta').length;

    /* Selects de filtro */
    const optsEmp  = ['<option value="">Todas as empresas</option>']
      .concat(empresas.map(e => `<option value="${e.id}" ${filtroEmpresaId===e.id?'selected':''}>${e.nome}</option>`))
      .join('');

    const projsFiltrados = filtroEmpresaId ? projetos.filter(p => p.empresaId === filtroEmpresaId) : projetos;
    const optsProjeto = ['<option value="">Todos os projetos</option>']
      .concat(projsFiltrados.map(p => `<option value="${p.id}" ${filtroProjetoId===p.id?'selected':''}>${p.nome}</option>`))
      .join('');

    const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
    const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

    const listaHTML = filtradas.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📌</div><p>Nenhuma ação com os filtros selecionados.</p></div>`
      : filtradas.map(acao => `
          <div class="item-plano prioridade-${acao.prioridade}">
            <div class="item-plano-header">
              <div>
                <div class="item-plano-titulo">${acao.descricao}</div>
                <div class="item-plano-meta">
                  <span class="status-chip status-${acao.status}">${STATUS_L[acao.status]||acao.status}</span>
                  <span class="badge-tipo badge-tipo-${acao._tipo}">${acao._tipoLabel}</span>
                  ${acao._projeto ? `<span>📁 ${acao._projeto}</span>` : ''}
                  ${acao._setor   ? `<span>📍 ${acao._setor}</span>`   : ''}
                  ${acao._funcao  ? `<span>👷 ${acao._funcao}</span>`  : ''}
                  ${acao.responsavel ? `<span>👤 ${acao.responsavel}</span>` : ''}
                  ${acao.prazo ? `<span>📅 ${_fd(acao.prazo)}</span>` : ''}
                </div>
              </div>
            </div>
            ${acao.medida ? `<div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s2)"><strong style="color:var(--texto)">Medida:</strong> ${acao.medida}</div>` : ''}
            <div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">
              ${['pendente','em_andamento','concluido'].map(s => `
                <button class="btn btn-sm ${acao.status===s?'btn-primario':'btn-secundario'}"
                        onclick="ModuloPlano.alterarStatusGeral('${acao._avId}','${acao.id}','${s}')">
                  ${STATUS_L[s]}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('');

    tela.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">

        <!-- Filtros -->
        <div class="card" style="margin-bottom:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">🔍 Filtrar por</div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
            <select id="filtro-empresa" style="flex:1;min-width:130px" class="campo"
                    onchange="ModuloPlano.renderizarGeral(this.value,'','')">
              ${optsEmp}
            </select>
            <select id="filtro-projeto" style="flex:1;min-width:130px" class="campo"
                    onchange="ModuloPlano.renderizarGeral(document.getElementById('filtro-empresa').value,this.value,'')">
              ${optsProjeto}
            </select>
            <select id="filtro-tipo" style="flex:1;min-width:110px" class="campo"
                    onchange="ModuloPlano.renderizarGeral(document.getElementById('filtro-empresa').value,document.getElementById('filtro-projeto').value,this.value)">
              <option value="">Todos os tipos</option>
              <option value="aep"          ${filtroTipo==='aep'?'selected':''}>AEP</option>
              <option value="psicossocial" ${filtroTipo==='psicossocial'?'selected':''}>Psicossocial</option>
              <option value="aet"          ${filtroTipo==='aet'?'selected':''}>AET</option>
            </select>
          </div>
        </div>

        <!-- Resumo -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2);margin-bottom:var(--s4)">
          ${[
            [pend,   'var(--aviso)',  'Pendentes'],
            [em_and, 'var(--info)',   'Em andamento'],
            [concl,  'var(--sucesso)','Concluídas'],
            [altas,  'var(--perigo)', 'Alta Prior.']
          ].map(([n, cor, lab]) => `
            <div class="card" style="text-align:center;padding:var(--s3)">
              <div style="font-size:22px;font-weight:700;color:${cor}">${n}</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec)">${lab}</div>
            </div>
          `).join('')}
        </div>

        <!-- Filtros rápidos -->
        <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s4)">
          <button class="btn btn-secundario btn-sm filtro-plano ativo" data-filtro="todos"
                  onclick="ModuloPlano.filtrar('todos')">Todos (${filtradas.length})</button>
          <button class="btn btn-secundario btn-sm filtro-plano" data-filtro="pendente"
                  onclick="ModuloPlano.filtrar('pendente')">Pendentes</button>
          <button class="btn btn-secundario btn-sm filtro-plano" data-filtro="alta"
                  onclick="ModuloPlano.filtrar('alta')">Alta prioridade</button>
          <button class="btn btn-secundario btn-sm filtro-plano" data-filtro="concluido"
                  onclick="ModuloPlano.filtrar('concluido')">Concluídos</button>
        </div>

        <div id="plano-geral-lista">${listaHTML}</div>
      </div>
    `;

    _acoesCacheadas = filtradas;
  }

  function filtrar(criterio) {
    document.querySelectorAll('.filtro-plano').forEach(btn => {
      btn.classList.toggle('ativo', btn.dataset.filtro === criterio);
    });
    const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
    const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

    let f = criterio === 'todos'    ? _acoesCacheadas
          : criterio === 'pendente' ? _acoesCacheadas.filter(a => a.status === 'pendente')
          : criterio === 'alta'     ? _acoesCacheadas.filter(a => a.prioridade === 'alta')
          : criterio === 'concluido'? _acoesCacheadas.filter(a => a.status === 'concluido')
          : _acoesCacheadas;

    document.getElementById('plano-geral-lista').innerHTML = f.length === 0
      ? '<div class="empty-state"><p>Nenhuma ação.</p></div>'
      : f.map(acao => `
          <div class="item-plano prioridade-${acao.prioridade}">
            <div class="item-plano-titulo">${acao.descricao}</div>
            <div class="item-plano-meta">
              <span class="status-chip status-${acao.status}">${STATUS_L[acao.status]||acao.status}</span>
              ${acao._projeto ? `<span>📁 ${acao._projeto}</span>` : ''}
              ${acao._setor   ? `<span>📍 ${acao._setor}</span>`   : ''}
              ${acao.responsavel ? `<span>👤 ${acao.responsavel}</span>` : ''}
              ${acao.prazo ? `<span>📅 ${_fd(acao.prazo)}</span>` : ''}
            </div>
          </div>
        `).join('');
  }

  function alterarStatusGeral(avId, acaoId, novoStatus) {
    const av = Storage.buscar(avId);
    if (!av) return;
    const acao = av.planoAcao?.find(a => a.id === acaoId);
    if (acao) { acao.status = novoStatus; Storage.salvar(av); }
    App.mostrarToast('Status atualizado','sucesso');
    renderizarGeral();
  }

  /* ── Plano de uma avaliação específica (chamado internamente por AEP) ── */
  function renderizar() {
    const tela = document.getElementById('tela-plano');
    if (!tela) return;
    const av   = App.obterAvaliacaoAtual();
    const itens= av?.planoAcao || [];

    const STATUS_L = { pendente:'⏳ Pendente', em_andamento:'🔄 Em andamento', concluido:'✅ Concluído' };
    const PRIO_L   = { alta:'🔴 Alta', media:'🟡 Média', baixa:'🟢 Baixa' };
    const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };

    const listaHTML = itens.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📌</div><p>Nenhuma ação cadastrada.</p>
          <p style="font-size:var(--txt-sm)">Clique em "Gerar do Checklist AEP" ou adicione manualmente.</p>
        </div>`
      : itens.map(item => `
          <div class="item-plano prioridade-${item.prioridade}" id="acao-${item.id}">
            <div class="item-plano-header">
              <div>
                <div class="item-plano-titulo">${item.descricao}</div>
                <div class="item-plano-meta">
                  <span class="status-chip status-${item.status}">${STATUS_L[item.status]||item.status}</span>
                  <span class="badge badge-${item.prioridade==='alta'?'alto':item.prioridade==='media'?'medio':'baixo'}">${PRIO_L[item.prioridade]||item.prioridade}</span>
                  ${item.responsavel ? `<span>👤 ${item.responsavel}</span>` : ''}
                  ${item.prazo ? `<span>📅 ${_fd(item.prazo)}</span>` : ''}
                </div>
              </div>
              <div style="display:flex;gap:var(--s2)">
                <button class="btn btn-fantasma btn-sm" onclick="ModuloPlano.editarAcao('${item.id}')">✏️</button>
                <button class="btn btn-perigo btn-sm" onclick="ModuloPlano.excluirAcao('${item.id}')">🗑️</button>
              </div>
            </div>
            ${item.medida ? `<div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-top:var(--s2)"><strong style="color:var(--texto)">Medida:</strong> ${item.medida}</div>` : ''}
            <div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">
              ${['pendente','em_andamento','concluido'].map(s => `
                <button class="btn btn-sm ${item.status===s?'btn-primario':'btn-secundario'}"
                        onclick="ModuloPlano.alterarStatus('${item.id}','${s}')">
                  ${STATUS_L[s]}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('');

    tela.innerHTML = `
      <div class="container">
        <div style="display:flex;gap:var(--s3);flex-wrap:wrap;margin:var(--s4) 0">
          <button class="btn btn-primario" style="flex:1" onclick="ModuloPlano.gerarDoAEP()">⚡ Gerar do Checklist AEP</button>
          <button class="btn btn-secundario" onclick="ModuloPlano.abrirFormNovaAcao()">+ Adicionar</button>
        </div>
        <div id="lista-plano">${listaHTML}</div>
      </div>

      <div class="modal-overlay oculto" id="modal-acao">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-acao-titulo">Nova Ação</span>
            <button class="btn-icone" onclick="ModuloPlano.fecharModal()">✕</button>
          </div>
          <div id="modal-acao-form"></div>
        </div>
      </div>
    `;
  }

  function gerarDoAEP() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const nc = ModuloAEP.obterNaoConformes(av);
    if (nc.length === 0) { App.mostrarToast('Nenhuma não conformidade no AEP','erro'); return; }
    const jaAdd = new Set(av.planoAcao.filter(i => i.origemId).map(i => i.origemId));
    let n = 0;
    nc.forEach(nc => {
      if (jaAdd.has(nc.itemId)) return;
      av.planoAcao.push({
        id: `plano_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        origem:'aep', origemId:nc.itemId, blocoTitulo:nc.blocoTitulo,
        descricao: nc.itemTexto.length > 120 ? nc.itemTexto.slice(0,120)+'…' : nc.itemTexto,
        medida:'', responsavel:'', prazo:'',
        prioridade: nc.risco==='alto'?'alta':nc.risco==='medio'?'media':'baixa',
        status:'pendente'
      });
      n++;
    });
    if (n === 0) { App.mostrarToast('Todos os itens já estão no plano','info'); return; }
    Storage.salvar(av);
    App.mostrarToast(`${n} ação(ões) gerada(s)`,'sucesso');
    renderizar();
  }

  function abrirFormNovaAcao(id) {
    const av   = App.obterAvaliacaoAtual();
    const item = id ? av?.planoAcao?.find(i => i.id === id) : null;
    document.getElementById('modal-acao-titulo').textContent = item ? 'Editar Ação' : 'Nova Ação';
    document.getElementById('modal-acao-form').innerHTML = `
      <div class="grupo-campo"><label>Descrição</label>
        <textarea id="form-descricao" rows="3">${item?.descricao||''}</textarea></div>
      <div class="grupo-campo"><label>Medida Proposta</label>
        <textarea id="form-medida" rows="2">${item?.medida||''}</textarea></div>
      <div class="linha-campos">
        <div class="grupo-campo"><label>Responsável</label>
          <input type="text" id="form-responsavel" value="${item?.responsavel||''}"></div>
        <div class="grupo-campo"><label>Prazo</label>
          <input type="date" id="form-prazo" value="${item?.prazo||''}"></div>
      </div>
      <div class="linha-campos">
        <div class="grupo-campo"><label>Prioridade</label>
          <select id="form-prioridade">
            <option value="alta"  ${item?.prioridade==='alta' ?'selected':''}>🔴 Alta</option>
            <option value="media" ${!item||item.prioridade==='media'?'selected':''}>🟡 Média</option>
            <option value="baixa" ${item?.prioridade==='baixa'?'selected':''}>🟢 Baixa</option>
          </select></div>
        <div class="grupo-campo"><label>Status</label>
          <select id="form-status">
            <option value="pendente"     ${!item||item.status==='pendente'?'selected':''}>⏳ Pendente</option>
            <option value="em_andamento" ${item?.status==='em_andamento'?'selected':''}>🔄 Em andamento</option>
            <option value="concluido"    ${item?.status==='concluido'?'selected':''}>✅ Concluído</option>
          </select></div>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1" onclick="ModuloPlano.salvarAcaoForm('${id||''}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloPlano.fecharModal()">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-acao').classList.remove('oculto');
  }

  function editarAcao(id) { abrirFormNovaAcao(id); }

  function salvarAcaoForm(id) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const desc = document.getElementById('form-descricao')?.value?.trim();
    if (!desc) { App.mostrarToast('Informe a descrição','erro'); return; }
    const dados = {
      descricao:   desc,
      medida:      document.getElementById('form-medida')?.value?.trim()||'',
      responsavel: document.getElementById('form-responsavel')?.value?.trim()||'',
      prazo:       document.getElementById('form-prazo')?.value||'',
      prioridade:  document.getElementById('form-prioridade')?.value||'media',
      status:      document.getElementById('form-status')?.value||'pendente',
    };
    if (id) {
      const idx = av.planoAcao.findIndex(i => i.id === id);
      if (idx >= 0) Object.assign(av.planoAcao[idx], dados);
    } else {
      av.planoAcao.push({ id:`plano_${Date.now()}`, origem:'manual', origemId:null, ...dados });
    }
    Storage.salvar(av);
    fecharModal();
    App.mostrarToast('Ação salva','sucesso');
    renderizar();
  }

  function alterarStatus(id, novoStatus) {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    const item = av.planoAcao?.find(i => i.id === id);
    if (item) { item.status = novoStatus; Storage.salvar(av); }
    /* Atualiza o DOM do item sem re-renderizar toda a lista */
    renderizar();
  }

  function excluirAcao(id) {
    if (!confirm('Excluir esta ação?')) return;
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    av.planoAcao = av.planoAcao.filter(i => i.id !== id);
    Storage.salvar(av);
    App.mostrarToast('Ação excluída','sucesso');
    renderizar();
  }

  function fecharModal() {
    document.getElementById('modal-acao')?.classList.add('oculto');
  }

  return { renderizarGeral, filtrar, alterarStatusGeral, renderizar, gerarDoAEP, abrirFormNovaAcao, editarAcao, salvarAcaoForm, alterarStatus, excluirAcao, fecharModal };
})();
