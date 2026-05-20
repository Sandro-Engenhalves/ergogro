/* ============================================================
   ErgoGRO — Módulo: Cadastro de Empresas + Catálogo Mestre
   Cada empresa tem um catálogo mestre de setores e funções.
   Este catálogo é a estrutura padrão da empresa, reutilizável
   em todos os Projetos de Laudo via importação.

   Fluxo:
   1. Cadastrar empresa
   2. Adicionar setores e funções padrão (catálogo mestre)
   3. Criar Projeto → importar do catálogo → ajustar escopo → avaliar
   ============================================================ */

const ModuloCadastro = (() => {

  function renderizar() {
    const tela     = document.getElementById('tela-empresas');
    const empresas = Storage.listarEmpresas();

    tela.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">
        <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
          <span>🏢</span>
          <span>Cadastre empresas e defina o <strong>catálogo mestre</strong> de setores e funções.
          Ao criar um Projeto de Laudo, você poderá importar este catálogo como ponto de partida.</span>
        </div>

        <button class="btn-bloco" onclick="ModuloCadastro.abrirFormEmpresa()" style="margin-bottom:var(--s4)">
          + Nova Empresa
        </button>

        <div id="lista-empresas">
          ${empresas.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🏢</div>
               <p><strong>Nenhuma empresa cadastrada.</strong></p>
               <p style="font-size:var(--txt-sm)">Cadastre a empresa para depois criar Projetos de Laudo.</p></div>`
            : empresas.map(emp => _htmlCardEmpresa(emp)).join('')}
        </div>
      </div>

      <!-- Modal Empresa -->
      <div class="modal-overlay oculto" id="modal-empresa">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-emp-titulo">Nova Empresa</span>
            <button class="btn-icone" onclick="ModuloCadastro.fecharModal('modal-empresa')">✕</button>
          </div>
          <div id="modal-emp-form"></div>
        </div>
      </div>

      <!-- Modal Setor Master -->
      <div class="modal-overlay oculto" id="modal-setor-master">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-sm-titulo">Setor do Catálogo Mestre</span>
            <button class="btn-icone" onclick="ModuloCadastro.fecharModal('modal-setor-master')">✕</button>
          </div>
          <div id="modal-sm-form"></div>
        </div>
      </div>

      <!-- Modal Função Master -->
      <div class="modal-overlay oculto" id="modal-funcao-master">
        <div class="modal-panel">
          <div class="modal-titulo">
            <span id="modal-fm-titulo">Função do Catálogo Mestre</span>
            <button class="btn-icone" onclick="ModuloCadastro.fecharModal('modal-funcao-master')">✕</button>
          </div>
          <div id="modal-fm-form"></div>
        </div>
      </div>
    `;
  }

  /* ── Card de empresa ─────────────────────────────────────── */
  function _htmlCardEmpresa(emp) {
    const projetos     = Storage.listarProjetos(emp.id);
    const setoresMstr  = Storage.listarSetoresMaster(emp.id);
    const totalFuncoes = setoresMstr.reduce((n, s) => n + Storage.listarFuncoesMaster(s.id).length, 0);
    const totalAvs     = projetos.reduce((n, p) => n + Storage.listarPorProjeto(p.id).length, 0);

    const catalogoHTML = setoresMstr.length === 0
      ? `<p style="font-size:var(--txt-sm);color:var(--texto-sec);padding:var(--s2) 0">
           Nenhum setor no catálogo. Adicione setores e funções padrão da empresa.
         </p>`
      : setoresMstr.map(s => {
          const fns = Storage.listarFuncoesMaster(s.id);
          return `
            <div class="card-setor" id="card-sm-${s.id}" style="margin-bottom:var(--s2)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--s3)">
                <div style="flex:1">
                  <div style="font-size:var(--txt-sm);font-weight:600">📍 ${s.nome}</div>
                  ${s.descricaoAmbiente ? `<div style="font-size:var(--txt-xs);color:var(--texto-sec)">${s.descricaoAmbiente.slice(0,60)}</div>` : ''}
                </div>
                <button class="btn btn-fantasma btn-sm"
                        onclick="ModuloCadastro.abrirFormSetorMaster('${emp.id}','${s.id}')">✏️</button>
                <button class="btn btn-perigo btn-sm"
                        onclick="ModuloCadastro.excluirSetorMaster('${s.id}','${emp.id}')">🗑️</button>
              </div>
              <!-- Funções do setor master -->
              <div style="margin-top:var(--s2)">
                ${fns.length === 0
                  ? `<p style="font-size:var(--txt-xs);color:var(--texto-sec)">Nenhuma função.</p>`
                  : fns.map(f => `
                      <div class="item-funcao">
                        <div style="flex:1">
                          <div style="font-size:var(--txt-sm);font-weight:500">👷 ${f.nome}</div>
                          <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                            ${f.numTrabalhadores ? f.numTrabalhadores+' trab.' : ''}
                            ${f.turno ? '· '+f.turno : ''}
                            ${f.grupoHomogeneo ? '· GHE: '+f.grupoHomogeneo : ''}
                          </div>
                        </div>
                        <button class="btn btn-fantasma btn-sm"
                                onclick="ModuloCadastro.abrirFormFuncaoMaster('${emp.id}','${s.id}','${f.id}')">✏️</button>
                        <button class="btn btn-perigo btn-sm"
                                onclick="ModuloCadastro.excluirFuncaoMaster('${f.id}','${emp.id}')">🗑️</button>
                      </div>
                    `).join('')}
              </div>
              <button class="btn btn-fantasma btn-sm" style="margin-top:var(--s2);font-size:var(--txt-xs)"
                      onclick="ModuloCadastro.abrirFormFuncaoMaster('${emp.id}','${s.id}')">
                + Função
              </button>
            </div>
          `;
        }).join('');

    return `
      <div class="card" style="margin-bottom:var(--s5)">
        <!-- Dados da empresa -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s4)">
          <div style="flex:1">
            <div style="font-size:var(--txt-md);font-weight:700;margin-bottom:var(--s1)">🏢 ${emp.nome||'Sem nome'}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);display:flex;gap:var(--s3);flex-wrap:wrap">
              ${emp.cnpj ? `<span>${emp.cnpj}</span>` : ''}
              ${emp.cidade ? `<span>📍 ${emp.cidade}${emp.estado?'/'+emp.estado:''}</span>` : ''}
              ${emp.responsavelTecnico ? `<span>👤 ${emp.responsavelTecnico}</span>` : ''}
            </div>
            <div style="margin-top:var(--s2);display:flex;gap:var(--s2);flex-wrap:wrap">
              <span class="badge badge-info">${projetos.length} projeto(s)</span>
              <span class="badge badge-sucesso">${totalAvs} avaliação(ões)</span>
              <span class="badge badge-na">${setoresMstr.length} setor(es) mestre · ${totalFuncoes} função(ões)</span>
            </div>
          </div>
          <div style="display:flex;gap:var(--s2);flex-shrink:0">
            <button class="btn btn-secundario btn-sm" onclick="ModuloCadastro.abrirFormEmpresa('${emp.id}')">✏️</button>
            <button class="btn btn-perigo btn-sm" onclick="ModuloCadastro.confirmarExcluir('${emp.id}')">🗑️</button>
          </div>
        </div>

        <!-- Catálogo Mestre -->
        <div style="border-top:1px solid var(--borda);padding-top:var(--s4)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3)">
            <div>
              <div style="font-size:var(--txt-sm);font-weight:700">📋 Catálogo Mestre de Setores e Funções</div>
              <div style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:2px">
                Estrutura padrão da empresa. Reutilize nos Projetos de Laudo via importação.
              </div>
            </div>
            <button class="btn btn-secundario btn-sm"
                    onclick="ModuloCadastro.abrirFormSetorMaster('${emp.id}')">
              + Setor
            </button>
          </div>
          <div id="catalogo-${emp.id}">${catalogoHTML}</div>
        </div>

        <!-- Projetos da empresa -->
        ${projetos.length > 0 ? `
        <div style="border-top:1px solid var(--borda);padding-top:var(--s4);margin-top:var(--s3)">
          <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;margin-bottom:var(--s2)">PROJETOS DE LAUDO:</div>
          ${projetos.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
              <span style="font-size:var(--txt-sm)">📁 ${p.nome}</span>
              <button class="btn btn-fantasma btn-sm" onclick="App.abrirProjeto('${p.id}')">Abrir →</button>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════
     FORMULÁRIO — EMPRESA
  ══════════════════════════════════════════════════════════ */

  function abrirFormEmpresa(id) {
    const emp = id ? Storage.buscarEmpresa(id) : Storage.criarEmpresa();
    document.getElementById('modal-emp-titulo').textContent = id ? 'Editar Empresa' : 'Nova Empresa';
    document.getElementById('modal-emp-form').innerHTML = `
      <div class="grupo-campo">
        <label>Razão Social / Nome</label>
        <input type="text" id="emp-nome" placeholder="Ex.: Indústria Alfa Ltda." value="${emp.nome||''}">
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>CNPJ</label>
          <input type="text" id="emp-cnpj" placeholder="00.000.000/0000-00" maxlength="18" value="${emp.cnpj||''}">
        </div>
        <div class="grupo-campo">
          <label>Estado (UF)</label>
          <select id="emp-estado">
            <option value="">UF</option>
            ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
              .map(uf => `<option value="${uf}" ${emp.estado===uf?'selected':''}>${uf}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grupo-campo">
        <label>Endereço</label>
        <input type="text" id="emp-endereco" placeholder="Rua, número, bairro" value="${emp.endereco||''}">
      </div>
      <div class="grupo-campo">
        <label>Cidade</label>
        <input type="text" id="emp-cidade" value="${emp.cidade||''}">
      </div>
      <hr class="separador">
      <div class="grupo-campo">
        <label>Responsável Técnico Padrão</label>
        <input type="text" id="emp-responsavel" placeholder="Nome completo" value="${emp.responsavelTecnico||''}">
        <div class="campo-descricao">Preenchido automaticamente nos projetos desta empresa.</div>
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Registro</label>
          <input type="text" id="emp-registro" placeholder="CREA, CRQ..." value="${emp.registroProfissional||''}">
        </div>
        <div class="grupo-campo">
          <label>Cargo</label>
          <select id="emp-cargo">
            <option value="">Selecione...</option>
            ${['Engenheiro de Segurança do Trabalho','Técnico de Segurança do Trabalho','Ergonomista','Médico do Trabalho','Psicólogo do Trabalho','Fisioterapeuta do Trabalho','Outro']
              .map(c => `<option ${emp.cargo===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s5)">
        <button class="btn btn-primario" style="flex:1" onclick="ModuloCadastro.salvarEmpresa('${emp.id}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloCadastro.fecharModal('modal-empresa')">Cancelar</button>
      </div>
    `;
    document.getElementById('emp-cnpj').addEventListener('input', function() {
      let v = this.value.replace(/\D/g,'').slice(0,14);
      v = v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
           .replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
      this.value = v;
    });
    document.getElementById('modal-empresa').classList.remove('oculto');
  }

  function salvarEmpresa(id) {
    const get = el => document.getElementById(el)?.value?.trim() || '';
    const emp = Storage.buscarEmpresa(id) || { id };
    emp.nome                 = get('emp-nome');
    emp.cnpj                 = get('emp-cnpj');
    emp.estado               = get('emp-estado');
    emp.endereco             = get('emp-endereco');
    emp.cidade               = get('emp-cidade');
    emp.responsavelTecnico   = get('emp-responsavel');
    emp.registroProfissional = get('emp-registro');
    emp.cargo                = get('emp-cargo');
    if (!emp.nome) { App.mostrarToast('Informe o nome da empresa','erro'); return; }
    Storage.salvarEmpresa(emp);
    fecharModal('modal-empresa');
    App.mostrarToast('Empresa salva','sucesso');
    renderizar();
  }

  function confirmarExcluir(id) {
    const emp  = Storage.buscarEmpresa(id);
    const pros = Storage.listarProjetos(id).length;
    const sms  = Storage.listarSetoresMaster(id).length;
    const msg  = `Excluir "${emp?.nome}"?${pros>0?' Inclui '+pros+' projeto(s).':''}${sms>0?' O catálogo mestre ('+sms+' setor(es)) também será excluído.':''}`;
    if (!confirm(msg)) return;
    Storage.excluirEmpresa(id);
    App.mostrarToast('Empresa excluída','sucesso');
    renderizar();
  }

  /* ══════════════════════════════════════════════════════════
     FORMULÁRIO — SETOR MESTRE
  ══════════════════════════════════════════════════════════ */

  function abrirFormSetorMaster(empresaId, setorMasterId) {
    const s = setorMasterId ? Storage.buscarSetorMaster(setorMasterId) : Storage.criarSetorMaster(empresaId);
    document.getElementById('modal-sm-titulo').textContent = setorMasterId ? 'Editar Setor Mestre' : 'Novo Setor Mestre';
    document.getElementById('modal-sm-form').innerHTML = `
      <div class="aviso-tecnico info" style="margin-bottom:var(--s3)">
        <span>📋</span>
        <span>Este setor faz parte do catálogo mestre da empresa.
        Será copiado para projetos quando importado.</span>
      </div>
      <div class="grupo-campo">
        <label>Nome do Setor / Área</label>
        <input type="text" id="sm-nome" placeholder="Ex.: Produção, Administrativo" value="${s.nome||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição do Ambiente</label>
        <textarea id="sm-amb" rows="3" placeholder="Descreva o ambiente de trabalho padrão...">${s.descricaoAmbiente||''}</textarea>
      </div>
      <div class="grupo-campo">
        <label>Observações</label>
        <textarea id="sm-obs" rows="2">${s.observacoes||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1"
                onclick="ModuloCadastro.salvarSetorMaster('${s.id}','${empresaId}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloCadastro.fecharModal('modal-setor-master')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-setor-master').classList.remove('oculto');
  }

  function salvarSetorMaster(id, empresaId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const s = Storage.buscarSetorMaster(id) || { id };
    s.nome               = get('sm-nome');
    s.empresaId          = empresaId;
    s.descricaoAmbiente  = get('sm-amb');
    s.observacoes        = get('sm-obs');
    if (!s.nome) { App.mostrarToast('Informe o nome do setor','erro'); return; }
    Storage.salvarSetorMaster(s);
    fecharModal('modal-setor-master');
    App.mostrarToast('Setor salvo no catálogo mestre','sucesso');
    renderizar();
  }

  function excluirSetorMaster(id, empresaId) {
    const s   = Storage.buscarSetorMaster(id);
    const fns = Storage.listarFuncoesMaster(id).length;
    if (!confirm(`Excluir setor mestre "${s?.nome}"${fns>0?' e suas '+fns+' função(ões)':''}?`)) return;
    Storage.excluirSetorMaster(id);
    App.mostrarToast('Setor excluído do catálogo','sucesso');
    renderizar();
  }

  /* ══════════════════════════════════════════════════════════
     FORMULÁRIO — FUNÇÃO MESTRE
  ══════════════════════════════════════════════════════════ */

  function abrirFormFuncaoMaster(empresaId, setorMasterId, funcaoMasterId) {
    const f = funcaoMasterId ? Storage.buscarFuncaoMaster(funcaoMasterId) : Storage.criarFuncaoMaster(empresaId, setorMasterId);
    const sm = Storage.buscarSetorMaster(setorMasterId);
    document.getElementById('modal-fm-titulo').textContent = funcaoMasterId ? 'Editar Função Mestre' : 'Nova Função Mestre';
    document.getElementById('modal-fm-form').innerHTML = `
      <div style="font-size:var(--txt-sm);color:var(--texto-sec);margin-bottom:var(--s3)">
        Setor: <strong>${sm?.nome||''}</strong>
      </div>
      <div class="grupo-campo">
        <label>Nome da Função / Cargo</label>
        <input type="text" id="fm-nome" placeholder="Ex.: Operador de Prensa" value="${f.nome||''}">
      </div>
      <div class="linha-campos">
        <div class="grupo-campo">
          <label>Nº Trabalhadores (padrão)</label>
          <input type="number" id="fm-num" min="1" placeholder="Ex.: 12" value="${f.numTrabalhadores||''}">
        </div>
        <div class="grupo-campo">
          <label>Turno (padrão)</label>
          <select id="fm-turno">
            <option value="">Selecione...</option>
            ${['Diurno','Vespertino','Noturno','12x36','Misto'].map(t => `<option ${f.turno===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grupo-campo">
        <label>Grupo Homogêneo (GHE)</label>
        <input type="text" id="fm-ghe" placeholder="Ex.: GHE-01" value="${f.grupoHomogeneo||''}">
      </div>
      <div class="grupo-campo">
        <label>Descrição da Atividade (padrão)</label>
        <textarea id="fm-desc" rows="3" placeholder="Tarefas principais realizadas nesta função...">${f.descricaoAtividade||''}</textarea>
      </div>
      <div style="display:flex;gap:var(--s3);margin-top:var(--s4)">
        <button class="btn btn-primario" style="flex:1"
                onclick="ModuloCadastro.salvarFuncaoMaster('${f.id}','${setorMasterId}','${empresaId}')">💾 Salvar</button>
        <button class="btn btn-secundario" onclick="ModuloCadastro.fecharModal('modal-funcao-master')">Cancelar</button>
      </div>
    `;
    document.getElementById('modal-funcao-master').classList.remove('oculto');
  }

  function salvarFuncaoMaster(id, setorMasterId, empresaId) {
    const get = el => (document.getElementById(el)||{}).value?.trim() || '';
    const f = Storage.buscarFuncaoMaster(id) || { id };
    f.nome               = get('fm-nome');
    f.setorMasterId      = setorMasterId;
    f.empresaId          = empresaId;
    f.numTrabalhadores   = get('fm-num');
    f.turno              = get('fm-turno');
    f.grupoHomogeneo     = get('fm-ghe');
    f.descricaoAtividade = get('fm-desc');
    if (!f.nome) { App.mostrarToast('Informe o nome da função','erro'); return; }
    Storage.salvarFuncaoMaster(f);
    fecharModal('modal-funcao-master');
    App.mostrarToast('Função salva no catálogo mestre','sucesso');
    renderizar();
  }

  function excluirFuncaoMaster(id, empresaId) {
    const f = Storage.buscarFuncaoMaster(id);
    if (!confirm(`Excluir função mestre "${f?.nome}"?`)) return;
    Storage.excluirFuncaoMaster(id);
    App.mostrarToast('Função excluída do catálogo','sucesso');
    renderizar();
  }

  function fecharModal(modalId) {
    document.getElementById(modalId)?.classList.add('oculto');
  }

  return {
    renderizar,
    /* Empresa */
    abrirFormEmpresa, salvarEmpresa, confirmarExcluir,
    /* Setor mestre */
    abrirFormSetorMaster, salvarSetorMaster, excluirSetorMaster,
    /* Função mestre */
    abrirFormFuncaoMaster, salvarFuncaoMaster, excluirFuncaoMaster,
    /* Util */
    fecharModal
  };
})();
