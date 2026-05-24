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

  let _isNovaEmpresa  = false; /* controla redirecionamento após salvar */
  let _importPreview  = null;  /* { empId, rows } — estado temporário do import */

  function renderizar() {
    const tela     = document.getElementById('tela-empresas');
    const empresas = Storage.listarEmpresas();

    tela.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">

        <!-- Busca -->
        <input type="search" id="cl-busca"
          placeholder="🔍  Buscar cliente..."
          oninput="ModuloCadastro._filtrar()"
          style="width:100%;padding:var(--s3) var(--s4);border-radius:var(--raio);
                 border:1px solid var(--borda);background:var(--superficie-alt);
                 color:var(--texto);font-size:var(--txt-sm);box-sizing:border-box;
                 margin-bottom:var(--s3)">

        <!-- Novo cliente -->
        <button class="btn-bloco" onclick="ModuloCadastro.abrirFormEmpresa()" style="margin-bottom:var(--s4)">
          + Novo Cliente
        </button>

        <!-- Lista -->
        <div id="lista-empresas">
          ${empresas.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🏢</div>
               <p><strong>Nenhum cliente cadastrado.</strong></p>
               <p style="font-size:var(--txt-sm)">Cadastre o primeiro cliente para criar projetos de laudo.</p></div>`
            : empresas.map(emp => _htmlCardClienteLista(emp)).join('')}
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

      <!-- Modal Importar Planilha -->
      <div class="modal-overlay oculto" id="modal-importar-catalogo">
        <div class="modal-panel" style="max-width:580px">
          <div class="modal-titulo">
            <span>📊 Importar Catálogo por Planilha</span>
            <button class="btn-icone" onclick="ModuloCadastro.fecharModal('modal-importar-catalogo')">✕</button>
          </div>
          <div style="padding:var(--s4)">
            <input type="hidden" id="import-emp-id">

            <!-- Fase 1: instrução + upload -->
            <div id="import-phase-1">
              <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
                <span>ℹ️</span>
                <div>
                  <strong>Como importar:</strong>
                  <ol style="margin:var(--s2) 0 0 var(--s4);font-size:var(--txt-xs);line-height:1.8">
                    <li>Baixe o modelo abaixo e abra no Excel</li>
                    <li>Preencha uma função por linha (mesma linha para repetir o setor)</li>
                    <li>Salve o arquivo como <strong>.xlsx</strong> (recomendado) ou <strong>.csv</strong></li>
                    <li>Clique em "Selecionar arquivo" e escolha o arquivo salvo</li>
                  </ol>
                </div>
              </div>
              <button class="btn btn-secundario btn-sm" style="margin-bottom:var(--s4)"
                      onclick="ModuloCadastro._baixarModelo()">
                ⬇️ Baixar Modelo (.xlsx)
              </button>
              <div class="grupo-campo">
                <label>Arquivo da planilha (.xlsx ou .csv)</label>
                <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls"
                       style="padding:var(--s2);border:1px dashed var(--borda);border-radius:var(--raio);background:var(--superficie-alt);color:var(--texto);width:100%;box-sizing:border-box;cursor:pointer"
                       onchange="ModuloCadastro._onArquivoSelecionado(this)">
              </div>
              <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s2)">
                Colunas esperadas: <strong>Setor · Função/Cargo · Nº Trab. · Turno · GHE · Descrição</strong>
              </p>
            </div>

            <!-- Fase 2: preview -->
            <div id="import-phase-2" style="display:none"></div>
          </div>
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
  /* ── Card simples da lista de clientes ──────────────────── */
  function _htmlCardClienteLista(emp) {
    const projetos  = Storage.listarProjetos(emp.id);
    const totalAvs  = projetos.reduce((n, p) => n + Storage.listarPorProjeto(p.id).length, 0);
    const setoresMstr = Storage.listarSetoresMaster(emp.id);
    const catalogoHTML = _htmlCatalogoInline(emp, setoresMstr);

    return `
      <div class="card" style="margin-bottom:var(--s3);padding:0;overflow:hidden">
        <!-- Área principal clicável -->
        <div onclick="App.abrirEmpresa('${emp.id}')"
             style="display:flex;align-items:center;gap:var(--s3);padding:var(--s4);cursor:pointer">
          <div class="item-projeto-icon">🏢</div>
          <div style="flex:1">
            <div style="font-size:var(--txt-base);font-weight:700">${emp.nome || 'Sem nome'}</div>
            <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
              ${emp.cnpj ? `${emp.cnpj} · ` : ''}
              ${emp.cidade ? `📍 ${emp.cidade}${emp.estado?'/'+emp.estado:''} · ` : ''}
              ${projetos.length} projeto(s) · ${totalAvs} av.
            </div>
          </div>
          <span style="color:var(--primaria);font-size:var(--txt-sm);font-weight:600;white-space:nowrap">Abrir →</span>
        </div>
        <!-- Barra de ações -->
        <div onclick="event.stopPropagation()"
             style="border-top:1px solid var(--borda);padding:var(--s2) var(--s4);
                    display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap">
          <button class="btn btn-fantasma btn-sm"
                  onclick="ModuloCadastro.abrirFormEmpresa('${emp.id}')">✏️ Editar dados</button>
          <button class="btn btn-fantasma btn-sm"
                  onclick="ModuloCadastro._toggleCatalogo('${emp.id}')">
            📋 Catálogo (${setoresMstr.length})
          </button>
          <button class="btn btn-perigo btn-sm" style="margin-left:auto"
                  onclick="ModuloCadastro.confirmarExcluir('${emp.id}')">🗑️</button>
        </div>
        <!-- Catálogo inline (colapsado por padrão) -->
        <div id="catalogo-${emp.id}" class="oculto"
             onclick="event.stopPropagation()"
             style="border-top:1px solid var(--borda);padding:var(--s4);background:var(--superficie-alt)">
          ${catalogoHTML}
          <div style="display:flex;gap:var(--s2);margin-top:var(--s2)">
            <button class="btn btn-fantasma btn-sm"
                    onclick="ModuloCadastro.abrirFormSetorMaster('${emp.id}')">+ Setor</button>
            <button class="btn btn-fantasma btn-sm"
                    onclick="ModuloCadastro.abrirModalImport('${emp.id}')">📊 Importar</button>
          </div>
        </div>
      </div>`;
  }

  function _htmlCatalogoInline(emp, setoresMstr) {
    if (setoresMstr.length === 0) {
      return `<p style="font-size:var(--txt-sm);color:var(--texto-sec)">Nenhum setor no catálogo.</p>`;
    }
    return setoresMstr.map(s => {
      const fns = Storage.listarFuncoesMaster(s.id);
      return `
        <div style="margin-bottom:var(--s3)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1)">
            <span style="font-size:var(--txt-sm);font-weight:600">📍 ${s.nome}</span>
            <div style="display:flex;gap:var(--s1)">
              <button class="btn btn-fantasma btn-sm"
                      onclick="ModuloCadastro.abrirFormSetorMaster('${emp.id}','${s.id}')">✏️</button>
              <button class="btn btn-perigo btn-sm"
                      onclick="ModuloCadastro.excluirSetorMaster('${s.id}','${emp.id}')">🗑️</button>
            </div>
          </div>
          ${fns.map(f => `
            <div style="display:flex;align-items:center;padding:2px 0 2px var(--s4);gap:var(--s2)">
              <span style="flex:1;font-size:var(--txt-xs)">👷 ${f.nome}</span>
              <button class="btn btn-fantasma btn-sm"
                      onclick="ModuloCadastro.abrirFormFuncaoMaster('${emp.id}','${s.id}','${f.id}')">✏️</button>
              <button class="btn btn-perigo btn-sm"
                      onclick="ModuloCadastro.excluirFuncaoMaster('${f.id}','${emp.id}')">🗑️</button>
            </div>
          `).join('')}
          <button class="btn btn-fantasma btn-sm" style="margin-left:var(--s4);font-size:var(--txt-xs)"
                  onclick="ModuloCadastro.abrirFormFuncaoMaster('${emp.id}','${s.id}')">+ Função</button>
        </div>`;
    }).join('');
  }

  function _toggleCatalogo(empId) {
    document.getElementById(`catalogo-${empId}`)?.classList.toggle('oculto');
  }

  function _filtrar() {
    const busca = (document.getElementById('cl-busca')?.value || '').toLowerCase().trim();
    const todos = Storage.listarEmpresas();
    const filtrados = busca
      ? todos.filter(e => (e.nome||'').toLowerCase().includes(busca) ||
                          (e.cidade||'').toLowerCase().includes(busca) ||
                          (e.cnpj||'').includes(busca))
      : todos;
    const lista = document.getElementById('lista-empresas');
    if (!lista) return;
    lista.innerHTML = filtrados.length === 0
      ? `<p style="color:var(--texto-sec);font-size:var(--txt-sm);text-align:center;padding:var(--s5)">Nenhum cliente encontrado.</p>`
      : filtrados.map(emp => _htmlCardClienteLista(emp)).join('');
  }

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
            <div style="display:flex;gap:var(--s2);flex-shrink:0">
              <button class="btn btn-fantasma btn-sm"
                      onclick="ModuloCadastro.abrirModalImport('${emp.id}')">
                📊 Importar
              </button>
              <button class="btn btn-secundario btn-sm"
                      onclick="ModuloCadastro.abrirFormSetorMaster('${emp.id}')">
                + Setor
              </button>
            </div>
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
    _isNovaEmpresa = !id;
    const emp = id ? Storage.buscarEmpresa(id) : Storage.criarEmpresa();
    document.getElementById('modal-emp-titulo').textContent = id ? 'Editar Cliente' : 'Novo Cliente';
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
    if (!emp.nome) { App.mostrarToast('Informe o nome do cliente','erro'); return; }
    Storage.salvarEmpresa(emp);
    fecharModal('modal-empresa');
    App.mostrarToast('Cliente salvo','sucesso');
    if (_isNovaEmpresa) {
      _isNovaEmpresa = false;
      App.abrirEmpresa(emp.id);   /* novo cliente → entra direto no ambiente */
    } else {
      renderizar();               /* edição → atualiza a lista */
    }
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

  /* ══════════════════════════════════════════════════════════
     IMPORTAÇÃO DE PLANILHA
  ══════════════════════════════════════════════════════════ */

  function abrirModalImport(empId) {
    _importPreview = null;
    const modal = document.getElementById('modal-importar-catalogo');
    if (!modal) return;
    document.getElementById('import-emp-id').value = empId;
    document.getElementById('import-phase-1').style.display = '';
    document.getElementById('import-phase-2').style.display = 'none';
    const fi = document.getElementById('import-file-input');
    if (fi) fi.value = '';
    modal.classList.remove('oculto');
  }

  async function _baixarModelo() {
    /* Gera XLSX via SheetJS — sem problemas de encoding ou delimitador */
    try {
      if (typeof XLSX === 'undefined') {
        App.mostrarToast('Carregando gerador...', 'info');
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload  = resolve;
          s.onerror = () => reject(new Error('Sem conexão para baixar gerador'));
          document.head.appendChild(s);
        });
      }
      const dados = [
        ['Setor', 'Função/Cargo', 'Nº Trabalhadores', 'Turno', 'GHE', 'Descrição da Atividade'],
        ['Administrativo', 'Analista de RH',        2, 'Diurno', 'GHE-01', 'Realiza processos de recrutamento e seleção de pessoal'],
        ['Administrativo', 'Assistente Financeiro',  1, 'Diurno', 'GHE-01', 'Controla contas a pagar e receber'],
        ['Produção',       'Operador de Máquina',    5, '12x36',  'GHE-02', 'Opera prensas hidráulicas e realiza setup de equipamentos'],
        ['Produção',       'Auxiliar de Produção',   8, '12x36',  'GHE-02', 'Auxilia nas operações de produção e abastecimento de linha'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(dados);
      ws['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 52 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
      XLSX.writeFile(wb, 'modelo_catalogo_ergogro.xlsx');
    } catch (err) {
      App.mostrarToast('Erro ao gerar modelo: ' + err.message, 'erro');
    }
  }

  function _onArquivoSelecionado(input) {
    const file  = input.files?.[0];
    const empId = document.getElementById('import-emp-id')?.value;
    if (file && empId) _processarArquivoImport(file, empId);
  }

  async function _processarArquivoImport(file, empId) {
    try {
      let rows;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || file.type === 'text/csv' || file.type === 'text/plain') {
        const text = await file.text();
        rows = _parseCsv(text);
      } else {
        rows = await _parseXlsx(file);
      }
      if (!rows || rows.length === 0) {
        App.mostrarToast('Nenhum dado encontrado. Verifique o formato do arquivo.', 'erro');
        return;
      }
      _importPreview = { empId, rows };
      _renderizarPreviewImport(rows, empId);
    } catch (err) {
      App.mostrarToast('Erro ao processar arquivo: ' + err.message, 'erro');
    }
  }

  function _parseCsv(text) {
    text = text.replace(/^﻿/, ''); /* remove BOM */
    const primeiraLinha = text.split('\n')[0] || '';
    const delim = primeiraLinha.split(';').length > primeiraLinha.split(',').length ? ';' : ',';
    const linhas = text.split(/\r?\n/).filter(l => l.trim());
    if (linhas.length < 2) return [];
    return linhas.slice(1).map(l => {
      const c = _parseCsvLinha(l, delim);
      return { setor: (c[0]||'').trim(), funcao: (c[1]||'').trim(), numTrab: (c[2]||'').trim(),
               turno: (c[3]||'').trim(), ghe: (c[4]||'').trim(), descricao: (c[5]||'').trim() };
    }).filter(r => r.setor && r.funcao);
  }

  function _parseCsvLinha(linha, delim) {
    const res = []; let cur = ''; let aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (aspas && linha[i+1] === '"') { cur += '"'; i++; }
        else aspas = !aspas;
      } else if (c === delim && !aspas) { res.push(cur); cur = ''; }
      else cur += c;
    }
    res.push(cur);
    return res;
  }

  async function _parseXlsx(file) {
    if (typeof XLSX === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload  = resolve;
        s.onerror = () => reject(new Error('Não foi possível carregar o leitor de XLSX. Salve o arquivo como .csv e tente novamente.'));
        document.head.appendChild(s);
      });
    }
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data.length < 2) return [];
    return data.slice(1).map(row => ({
      setor:     String(row[0]||'').trim(), funcao:    String(row[1]||'').trim(),
      numTrab:   String(row[2]||'').trim(), turno:     String(row[3]||'').trim(),
      ghe:       String(row[4]||'').trim(), descricao: String(row[5]||'').trim(),
    })).filter(r => r.setor && r.funcao);
  }

  function _renderizarPreviewImport(rows, empId) {
    const setores = [...new Set(rows.map(r => r.setor))];
    const tbody   = rows.map(r => `
      <tr>
        <td style="padding:3px 6px;font-size:11px;border:1px solid var(--borda)">${r.setor}</td>
        <td style="padding:3px 6px;font-size:11px;border:1px solid var(--borda);font-weight:500">${r.funcao}</td>
        <td style="padding:3px 6px;font-size:11px;border:1px solid var(--borda);text-align:center">${r.numTrab||'—'}</td>
        <td style="padding:3px 6px;font-size:11px;border:1px solid var(--borda)">${r.turno||'—'}</td>
        <td style="padding:3px 6px;font-size:11px;border:1px solid var(--borda)">${r.ghe||'—'}</td>
      </tr>`).join('');

    document.getElementById('import-phase-1').style.display = 'none';
    const ph2 = document.getElementById('import-phase-2');
    ph2.style.display = '';
    ph2.innerHTML = `
      <div style="display:flex;gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)">
        <span class="badge badge-info">${rows.length} função(ões)</span>
        <span class="badge badge-na">${setores.length} setor(es)</span>
      </div>
      <div style="overflow:auto;max-height:280px;margin-bottom:var(--s3);border:1px solid var(--borda);border-radius:var(--raio)">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:var(--primaria);color:#fff;position:sticky;top:0">
              <th style="padding:4px 6px;font-size:11px;text-align:left">Setor</th>
              <th style="padding:4px 6px;font-size:11px;text-align:left">Função</th>
              <th style="padding:4px 6px;font-size:11px">Trab.</th>
              <th style="padding:4px 6px;font-size:11px">Turno</th>
              <th style="padding:4px 6px;font-size:11px">GHE</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-bottom:var(--s3)">
        Setores com mesmo nome serão agrupados. Funções duplicadas no mesmo setor serão ignoradas.
      </p>
      <div style="display:flex;gap:var(--s2)">
        <button class="btn btn-primario" onclick="ModuloCadastro.confirmarImport()">
          ✅ Importar ${rows.length} função(ões)
        </button>
        <button class="btn btn-secundario" onclick="ModuloCadastro._voltarImportPhase1()">
          ← Voltar
        </button>
      </div>`;
  }

  function _voltarImportPhase1() {
    document.getElementById('import-phase-1').style.display = '';
    document.getElementById('import-phase-2').style.display = 'none';
    _importPreview = null;
  }

  function confirmarImport() {
    if (!_importPreview) return;
    const { empId, rows } = _importPreview;

    const setoresMstr  = Storage.listarSetoresMaster(empId);
    const mapaSetores  = {};
    setoresMstr.forEach(s => { mapaSetores[s.nome.toLowerCase()] = s; });

    let novosSetores = 0, novasFuncoes = 0, ignoradas = 0;

    rows.forEach(r => {
      const chave = r.setor.toLowerCase();
      let setor   = mapaSetores[chave];
      if (!setor) {
        setor = Storage.criarSetorMaster(empId);
        setor.nome = r.setor;
        Storage.salvarSetorMaster(setor);
        mapaSetores[chave] = setor;
        novosSetores++;
      }
      const existentes = Storage.listarFuncoesMaster(setor.id);
      if (existentes.some(f => f.nome.toLowerCase() === r.funcao.toLowerCase())) {
        ignoradas++; return;
      }
      const fn = Storage.criarFuncaoMaster(empId, setor.id);
      fn.nome              = r.funcao;
      fn.numTrabalhadores  = r.numTrab;
      fn.turno             = r.turno;
      fn.grupoHomogeneo    = r.ghe;
      fn.descricaoAtividade = r.descricao;
      Storage.salvarFuncaoMaster(fn);
      novasFuncoes++;
    });

    fecharModal('modal-importar-catalogo');
    _importPreview = null;

    let msg = `${novosSetores} setor(es) e ${novasFuncoes} função(ões) importados`;
    if (ignoradas > 0) msg += ` · ${ignoradas} duplicada(s) ignorada(s)`;
    App.mostrarToast(msg, 'sucesso');
    renderizar();
  }

  return {
    renderizar,
    /* Lista de clientes */
    _filtrar, _toggleCatalogo,
    /* Empresa */
    abrirFormEmpresa, salvarEmpresa, confirmarExcluir,
    /* Setor mestre */
    abrirFormSetorMaster, salvarSetorMaster, excluirSetorMaster,
    /* Função mestre */
    abrirFormFuncaoMaster, salvarFuncaoMaster, excluirFuncaoMaster,
    /* Import planilha */
    abrirModalImport, _baixarModelo, _onArquivoSelecionado, _voltarImportPhase1, confirmarImport,
    /* Util */
    fecharModal
  };
})();
