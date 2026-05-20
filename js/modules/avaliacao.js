/* ============================================================
   ErgoGRO — Módulo: Identificação da Avaliação v4
   Exibe o contexto do ProjetoLaudo, setor e função.
   Apenas data e responsável técnico são editáveis por avaliação.
   ============================================================ */

const ModuloIdentificacao = (() => {

  function renderizar(containerId) {
    const tela = document.getElementById(containerId || 'tela-avaliacao');
    if (!tela) return;

    const av    = App.obterAvaliacaoAtual();
    if (!av) { tela.innerHTML = '<p>Nenhuma avaliação carregada.</p>'; return; }

    const proj   = av.projetoId ? Storage.buscarProjeto(av.projetoId)  : null;
    const emp    = proj ? Storage.buscarEmpresa(proj.empresaId)         : null;
    const setor  = av.setorId   ? Storage.buscarSetor(av.setorId)      : null;
    const funcao = av.funcaoId  ? Storage.buscarFuncao(av.funcaoId)    : null;

    /* Fallbacks para dados legados */
    const nomeProjeto = proj?.nome         || av._projetoNome || '';
    const nomeEmp     = emp?.nome          || av._empresaNome || av.empresa?.nome   || '';
    const nomeSet     = setor?.nome        || av._setorNome   || av.setor           || '';
    const nomeFun     = funcao?.nome       || av._funcaoNome  || av.funcao          || '';
    const nTrab       = funcao?.numTrabalhadores || av.numTrabalhadores || '';
    const descAct     = funcao?.descricaoAtividade || av.descricaoAtividade || '';
    const dataAv      = av.dataAvaliacao   || av.empresa?.dataAvaliacao  || '';
    const respTec     = av.responsavelTecnico  || av.empresa?.responsavelTecnico   || proj?.responsavelTecnico   || '';
    const regProf     = av.registroProfissional|| av.empresa?.registroProfissional || proj?.registroProfissional || '';
    const cargo       = av.cargoResponsavel    || av.empresa?.cargo                || proj?.cargoResponsavel    || '';

    const TIPO_NOME = { aep:'AEP — Avaliação Ergonômica Preliminar', psicossocial:'Avaliação de Fatores Psicossociais (COPSOQ-III)', aet:'AET — Análise Ergonômica do Trabalho' };

    tela.innerHTML = `
      <div class="container">
        <!-- Contexto: Projeto + Empresa -->
        <div class="card" style="margin-top:var(--s4)">
          <div class="card-titulo" style="margin-bottom:var(--s3)">
            📁 Projeto de Laudo
            ${proj ? `<button class="btn btn-fantasma btn-sm" style="margin-left:auto"
              onclick="App.voltarParaProjeto('visao-geral')">Ver projeto</button>` : ''}
          </div>

          ${nomeProjeto ? _li('Projeto',  nomeProjeto) : ''}
          ${nomeEmp     ? _li('Empresa',  nomeEmp)     : ''}
          ${nomeSet     ? _li('Setor',    nomeSet)     : ''}
          ${nomeFun     ? _li('Função',   nomeFun)     : ''}
          ${nTrab       ? _li('Trabalhadores', nTrab)  : ''}
          ${descAct ? `
          <div style="margin-top:var(--s3);padding-top:var(--s3);border-top:1px solid var(--borda)">
            <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;margin-bottom:var(--s2)">ATIVIDADE</div>
            <div style="font-size:var(--txt-sm)">${descAct}</div>
          </div>` : ''}

          <div class="aviso-tecnico info" style="margin-top:var(--s3);margin-bottom:0">
            <span>ℹ️</span>
            <span>Tipo: <strong>${TIPO_NOME[av.tipo] || av.tipo}</strong></span>
          </div>
        </div>

        <!-- Data e status (editável) -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📅 Dados da Avaliação</div>
          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="av-data">Data da Avaliação</label>
              <input type="date" id="av-data" value="${dataAv}">
            </div>
            <div class="grupo-campo">
              <label>Status</label>
              <select id="av-status">
                <option value="em_andamento" ${av.status!=='concluida'?'selected':''}>Em andamento</option>
                <option value="concluida"    ${av.status==='concluida'?'selected':''}>Concluída</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Responsável técnico (editável) -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📋 Responsável Técnico</div>
          <div class="grupo-campo">
            <label for="av-responsavel">Nome</label>
            <input type="text" id="av-responsavel" placeholder="Nome completo" value="${respTec}">
          </div>
          <div class="linha-campos">
            <div class="grupo-campo">
              <label for="av-registro">Registro Profissional</label>
              <input type="text" id="av-registro" placeholder="CREA, CRQ, CRP..." value="${regProf}">
            </div>
            <div class="grupo-campo">
              <label for="av-cargo">Cargo</label>
              <select id="av-cargo">
                <option value="">Selecione...</option>
                ${['Engenheiro de Segurança do Trabalho','Técnico de Segurança do Trabalho','Ergonomista','Médico do Trabalho','Psicólogo do Trabalho','Fisioterapeuta do Trabalho','Outro']
                  .map(c => `<option ${cargo===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:var(--s3);margin-bottom:var(--s6)">
          <button class="btn btn-primario" style="flex:1" onclick="ModuloIdentificacao.salvar()">
            💾 Salvar Identificação
          </button>
        </div>
      </div>
    `;
  }

  function _li(label, valor) {
    return `<div style="display:flex;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
      <span style="color:var(--texto-sec);font-size:var(--txt-sm);width:160px;flex-shrink:0">${label}</span>
      <span style="font-size:var(--txt-sm);font-weight:500">${valor}</span>
    </div>`;
  }

  /* Compatibilidade: carregar não é mais necessário (dados vêm do renderizar) */
  function carregar(av) {}

  function lerFormulario(av) {
    const get = id => (document.getElementById(id)||{}).value?.trim() || '';
    av.dataAvaliacao        = get('av-data');
    av.status               = get('av-status') || 'em_andamento';
    av.responsavelTecnico   = get('av-responsavel');
    av.registroProfissional = get('av-registro');
    av.cargoResponsavel     = get('av-cargo');
    /* Espelha para campos legados */
    if (!av.empresa) av.empresa = {};
    av.empresa.dataAvaliacao         = av.dataAvaliacao;
    av.empresa.responsavelTecnico    = av.responsavelTecnico;
    av.empresa.registroProfissional  = av.registroProfissional;
    av.empresa.cargo                 = av.cargoResponsavel;
  }

  function salvar() {
    const av = App.obterAvaliacaoAtual();
    if (!av) return;
    lerFormulario(av);
    try { Storage.salvar(av); App.mostrarToast('Identificação salva','sucesso'); }
    catch(e) { App.mostrarToast(e.message,'erro'); }
  }

  function salvarSilencioso() {
    const av = App.obterAvaliacaoAtual();
    if (!av || !document.getElementById('av-data')) return;
    lerFormulario(av);
    try { Storage.salvar(av); } catch(e) {}
  }

  return { renderizar, carregar, lerFormulario, salvar, salvarSilencioso };
})();

const ModuloAvaliacao = ModuloIdentificacao;
