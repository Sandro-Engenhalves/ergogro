/* ============================================================
   ErgoGRO — Camada de armazenamento v4.1
   Arquitetura: Empresa → ProjetoLaudo → Setores → Funções → Avaliações

   Modelo híbrido (v4.1):
   - Empresa possui CATÁLOGO MESTRE de setores/funções (estrutura padrão)
   - Cada ProjetoLaudo possui CÓPIAS INDEPENDENTES do catálogo mestre
   - Importar do catálogo não cria vínculo — alterações no projeto
     não afetam o cadastro mestre da empresa e vice-versa.
   ============================================================ */

const Storage = (() => {
  const CHAVE_AV              = 'ergogro_avaliacoes';
  const CHAVE_EMPRESAS        = 'ergogro_empresas';
  const CHAVE_SETORES         = 'ergogro_setores';        /* setores do projeto */
  const CHAVE_FUNCOES         = 'ergogro_funcoes';        /* funções do projeto */
  const CHAVE_PROJETOS        = 'ergogro_projetos';
  const CHAVE_SETORES_MASTER  = 'ergogro_setores_master'; /* catálogo mestre */
  const CHAVE_FUNCOES_MASTER  = 'ergogro_funcoes_master'; /* catálogo mestre */

  /* ─────────────────────────────────────────────────────────
     UTILITÁRIOS INTERNOS
  ───────────────────────────────────────────────────────── */

  function gerarId(pref = 'id') {
    return `${pref}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function _ler(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || '[]'); }
    catch { return []; }
  }

  function _gravar(chave, lista) {
    try { localStorage.setItem(chave, JSON.stringify(lista)); }
    catch (e) {
      console.error('ErgoGRO: erro ao gravar', e);
      throw new Error('Espaço insuficiente no dispositivo.');
    }
  }

  /* ─────────────────────────────────────────────────────────
     EMPRESAS
  ───────────────────────────────────────────────────────── */

  function listarEmpresas()    { return _ler(CHAVE_EMPRESAS); }
  function buscarEmpresa(id)   { return listarEmpresas().find(e => e.id === id) || null; }

  function salvarEmpresa(e) {
    const lista = listarEmpresas();
    const agora = new Date().toISOString();
    e.atualizadaEm = agora;
    const idx = lista.findIndex(x => x.id === e.id);
    if (idx >= 0) { lista[idx] = e; }
    else          { e.criadaEm = e.criadaEm || agora; lista.unshift(e); }
    _gravar(CHAVE_EMPRESAS, lista);
    return e;
  }

  function excluirEmpresa(id) {
    listarProjetos(id).forEach(p => excluirProjeto(p.id));
    /* Remove também o catálogo mestre da empresa */
    listarSetoresMaster(id).forEach(s => excluirSetorMaster(s.id));
    _gravar(CHAVE_EMPRESAS, listarEmpresas().filter(e => e.id !== id));
  }

  function criarEmpresa() {
    return { id: gerarId('emp'), nome:'', cnpj:'', endereco:'', cidade:'', estado:'',
             responsavelTecnico:'', registroProfissional:'', cargo:'',
             criadaEm: new Date().toISOString() };
  }

  /* ─────────────────────────────────────────────────────────
     PROJETOS DE LAUDO  (v4 — entidade central)
  ───────────────────────────────────────────────────────── */

  function listarProjetos(empresaId) {
    const todos = _ler(CHAVE_PROJETOS);
    return empresaId ? todos.filter(p => p.empresaId === empresaId) : todos;
  }

  function buscarProjeto(id) {
    return _ler(CHAVE_PROJETOS).find(p => p.id === id) || null;
  }

  function salvarProjeto(proj) {
    const lista = _ler(CHAVE_PROJETOS);
    const agora = new Date().toISOString();
    proj.atualizadoEm = agora;
    const idx = lista.findIndex(p => p.id === proj.id);
    if (idx >= 0) { lista[idx] = proj; }
    else          { proj.criadoEm = proj.criadoEm || agora; lista.unshift(proj); }
    _gravar(CHAVE_PROJETOS, lista);
    return proj;
  }

  function excluirProjeto(id) {
    /* Remove em cascata: setores, funcoes, avaliacoes */
    listarSetores(id).forEach(s => excluirSetor(s.id));
    _gravar(CHAVE_AV,       _ler(CHAVE_AV).filter(a => a.projetoId !== id));
    _gravar(CHAVE_PROJETOS, _ler(CHAVE_PROJETOS).filter(p => p.id !== id));
  }

  function criarProjeto(empresaId) {
    const emp = empresaId ? buscarEmpresa(empresaId) : null;
    return {
      id:                   gerarId('proj'),
      empresaId:            empresaId || null,
      nome:                 '',
      tipo:                 'aep',          /* aep | psicossocial | aet | integrado */
      dataInicio:           new Date().toISOString().slice(0, 10),
      dataFim:              '',
      responsavelTecnico:   emp?.responsavelTecnico   || '',
      registroProfissional: emp?.registroProfissional || '',
      cargoResponsavel:     emp?.cargo                || '',
      status:               'em_andamento',
      objetivo:             '',
      observacoesGerais:    '',
      conclusaoTecnica:     '',
      necessitaAET:         false,
      criadoEm:             new Date().toISOString(),
      atualizadoEm:         new Date().toISOString()
    };
  }

  /* ─────────────────────────────────────────────────────────
     SETORES  (agora pertencem a um ProjetoLaudo)
  ───────────────────────────────────────────────────────── */

  function listarSetores(projetoId) {
    return _ler(CHAVE_SETORES).filter(s => s.projetoId === projetoId || s.id === projetoId);
  }

  function buscarSetor(id) {
    return _ler(CHAVE_SETORES).find(s => s.id === id) || null;
  }

  function salvarSetor(s) {
    const lista = _ler(CHAVE_SETORES);
    const agora = new Date().toISOString();
    s.atualizadaEm = agora;
    const idx = lista.findIndex(x => x.id === s.id);
    if (idx >= 0) { lista[idx] = s; }
    else          { s.criadaEm = s.criadaEm || agora; lista.push(s); }
    _gravar(CHAVE_SETORES, lista);
    return s;
  }

  function excluirSetor(id) {
    listarFuncoes(id).forEach(f => excluirFuncao(f.id));
    _gravar(CHAVE_SETORES, _ler(CHAVE_SETORES).filter(s => s.id !== id));
  }

  function criarSetor(projetoId) {
    const proj = projetoId ? buscarProjeto(projetoId) : null;
    return { id: gerarId('set'), projetoId: projetoId || '',
             empresaId: proj?.empresaId || '',
             nome:'', descricaoAmbiente:'', observacoes:'',
             criadaEm: new Date().toISOString() };
  }

  /* ─────────────────────────────────────────────────────────
     FUNÇÕES
  ───────────────────────────────────────────────────────── */

  function listarFuncoes(setorId) {
    return _ler(CHAVE_FUNCOES).filter(f => f.setorId === setorId);
  }

  function listarFuncoesPorProjeto(projetoId) {
    const setorIds = new Set(listarSetores(projetoId).map(s => s.id));
    return _ler(CHAVE_FUNCOES).filter(f => setorIds.has(f.setorId));
  }

  function buscarFuncao(id) {
    return _ler(CHAVE_FUNCOES).find(f => f.id === id) || null;
  }

  function salvarFuncao(f) {
    const lista = _ler(CHAVE_FUNCOES);
    const agora = new Date().toISOString();
    f.atualizadaEm = agora;
    const idx = lista.findIndex(x => x.id === f.id);
    if (idx >= 0) { lista[idx] = f; }
    else          { f.criadaEm = f.criadaEm || agora; lista.push(f); }
    _gravar(CHAVE_FUNCOES, lista);
    return f;
  }

  function excluirFuncao(id) {
    _gravar(CHAVE_FUNCOES, _ler(CHAVE_FUNCOES).filter(f => f.id !== id));
  }

  function criarFuncao(projetoId, setorId) {
    return { id: gerarId('fun'), projetoId: projetoId || '', setorId: setorId || '',
             nome:'', numTrabalhadores:'', turno:'', descricaoAtividade:'', grupoHomogeneo:'',
             criadaEm: new Date().toISOString() };
  }

  /* ─────────────────────────────────────────────────────────
     CATÁLOGO MESTRE — SETORES DA EMPRESA
     Estrutura padrão da empresa, independente dos projetos.
     Importar para um projeto gera CÓPIAS independentes.
  ───────────────────────────────────────────────────────── */

  function listarSetoresMaster(empresaId) {
    const todos = _ler(CHAVE_SETORES_MASTER);
    return empresaId ? todos.filter(s => s.empresaId === empresaId) : todos;
  }

  function buscarSetorMaster(id) {
    return _ler(CHAVE_SETORES_MASTER).find(s => s.id === id) || null;
  }

  function salvarSetorMaster(s) {
    const lista = _ler(CHAVE_SETORES_MASTER);
    const agora = new Date().toISOString();
    s.atualizadaEm = agora;
    const idx = lista.findIndex(x => x.id === s.id);
    if (idx >= 0) { lista[idx] = s; }
    else { s.criadaEm = s.criadaEm || agora; lista.push(s); }
    _gravar(CHAVE_SETORES_MASTER, lista);
    return s;
  }

  function excluirSetorMaster(id) {
    listarFuncoesMaster(id).forEach(f => excluirFuncaoMaster(f.id));
    _gravar(CHAVE_SETORES_MASTER, _ler(CHAVE_SETORES_MASTER).filter(s => s.id !== id));
  }

  function criarSetorMaster(empresaId) {
    return { id: gerarId('sm'), empresaId: empresaId || '',
             nome: '', descricaoAmbiente: '', observacoes: '',
             criadaEm: new Date().toISOString() };
  }

  /* ─────────────────────────────────────────────────────────
     CATÁLOGO MESTRE — FUNÇÕES DA EMPRESA
  ───────────────────────────────────────────────────────── */

  function listarFuncoesMaster(setorMasterId) {
    return _ler(CHAVE_FUNCOES_MASTER).filter(f => f.setorMasterId === setorMasterId);
  }

  function listarFuncoesMasterPorEmpresa(empresaId) {
    return _ler(CHAVE_FUNCOES_MASTER).filter(f => f.empresaId === empresaId);
  }

  function buscarFuncaoMaster(id) {
    return _ler(CHAVE_FUNCOES_MASTER).find(f => f.id === id) || null;
  }

  function salvarFuncaoMaster(f) {
    const lista = _ler(CHAVE_FUNCOES_MASTER);
    const agora = new Date().toISOString();
    f.atualizadaEm = agora;
    const idx = lista.findIndex(x => x.id === f.id);
    if (idx >= 0) { lista[idx] = f; }
    else { f.criadaEm = f.criadaEm || agora; lista.push(f); }
    _gravar(CHAVE_FUNCOES_MASTER, lista);
    return f;
  }

  function excluirFuncaoMaster(id) {
    _gravar(CHAVE_FUNCOES_MASTER, _ler(CHAVE_FUNCOES_MASTER).filter(f => f.id !== id));
  }

  function criarFuncaoMaster(empresaId, setorMasterId) {
    return { id: gerarId('fm'), empresaId: empresaId || '',
             setorMasterId: setorMasterId || '',
             nome: '', numTrabalhadores: '', turno: '',
             descricaoAtividade: '', grupoHomogeneo: '',
             criadaEm: new Date().toISOString() };
  }

  /* ─────────────────────────────────────────────────────────
     IMPORTAR CATÁLOGO MESTRE → PROJETO
     Cria CÓPIAS independentes dos setores/funções selecionados.
     setorMasterIds = null → importa todos da empresa.
     Retorna número de setores importados.
  ───────────────────────────────────────────────────────── */

  function importarDoMestre(projetoId, setorMasterIds = null) {
    const proj = buscarProjeto(projetoId);
    if (!proj) return 0;

    const setoresSrc = setorMasterIds
      ? setorMasterIds.map(id => buscarSetorMaster(id)).filter(Boolean)
      : listarSetoresMaster(proj.empresaId);

    let total = 0;
    setoresSrc.forEach(sm => {
      /* Cria cópia do setor para o projeto */
      const novoSetor = {
        id:                gerarId('set'),
        projetoId,
        empresaId:         proj.empresaId,
        nome:              sm.nome,
        descricaoAmbiente: sm.descricaoAmbiente || '',
        observacoes:       sm.observacoes       || '',
        importadoDe:       sm.id,   /* referência informativa — sem vínculo */
        criadaEm:          new Date().toISOString()
      };
      salvarSetor(novoSetor);
      total++;

      /* Cria cópias das funções deste setor */
      listarFuncoesMaster(sm.id).forEach(fm => {
        salvarFuncao({
          id:                gerarId('fun'),
          projetoId,
          setorId:           novoSetor.id,
          nome:              fm.nome,
          numTrabalhadores:  fm.numTrabalhadores  || '',
          turno:             fm.turno             || '',
          descricaoAtividade:fm.descricaoAtividade|| '',
          grupoHomogeneo:    fm.grupoHomogeneo     || '',
          importadaDe:       fm.id,  /* referência informativa */
          criadaEm:          new Date().toISOString()
        });
      });
    });

    return total;
  }

  /* ─────────────────────────────────────────────────────────
     AVALIAÇÕES
  ───────────────────────────────────────────────────────── */

  function listar()          { try { return JSON.parse(localStorage.getItem(CHAVE_AV) || '[]'); } catch { return []; } }
  function buscar(id)        { return listar().find(a => a.id === id) || null; }
  function listarPorTipo(t)  { return listar().filter(a => (a.tipo || 'aep') === t); }
  function listarPorProjeto(projetoId) { return listar().filter(a => a.projetoId === projetoId); }

  function salvar(av) {
    const lista = listar();
    const agora = new Date().toISOString();
    av.atualizadaEm = agora;
    const idx = lista.findIndex(a => a.id === av.id);
    if (idx >= 0) { lista[idx] = av; }
    else { av.criadaEm = av.criadaEm || agora; lista.unshift(av); }
    _gravar(CHAVE_AV, lista);
    return av;
  }

  function excluir(id) {
    _gravar(CHAVE_AV, listar().filter(a => a.id !== id));
  }

  /* Cria avaliação vinculada ao ProjetoLaudo */
  function criarAvaliacao(tipo = 'aep', projetoId, setorId, funcaoId) {
    const proj   = projetoId ? buscarProjeto(projetoId)  : null;
    const emp    = proj      ? buscarEmpresa(proj.empresaId) : null;
    const setor  = setorId   ? buscarSetor(setorId)  : null;
    const funcao = funcaoId  ? buscarFuncao(funcaoId) : null;

    const base = {
      id:    gerarId(tipo),
      tipo,
      projetoId:    projetoId || null,
      empresaId:    proj?.empresaId || null,
      setorId:      setorId   || null,
      funcaoId:     funcaoId  || null,
      /* Snapshots para exibição rápida */
      _projetoNome: proj?.nome  || '',
      _empresaNome: emp?.nome   || '',
      _setorNome:   setor?.nome || '',
      _funcaoNome:  funcao?.nome|| '',
      /* Campos da avaliação */
      dataAvaliacao:        new Date().toISOString().slice(0, 10),
      responsavelTecnico:   proj?.responsavelTecnico   || emp?.responsavelTecnico   || '',
      registroProfissional: proj?.registroProfissional || emp?.registroProfissional || '',
      cargoResponsavel:     proj?.cargoResponsavel     || emp?.cargo                || '',
      /* Legado — mantido para compatibilidade de módulos existentes */
      empresa: emp ? { nome: emp.nome, cnpj: emp.cnpj, cidade: emp.cidade, estado: emp.estado,
                       dataAvaliacao: new Date().toISOString().slice(0, 10),
                       responsavelTecnico: emp.responsavelTecnico,
                       registroProfissional: emp.registroProfissional, cargo: emp.cargo }
                   : { nome:'', cnpj:'', cidade:'', estado:'', dataAvaliacao: new Date().toISOString().slice(0,10), responsavelTecnico:'', registroProfissional:'', cargo:'' },
      setor:              setor?.nome  || '',
      funcao:             funcao?.nome || '',
      numTrabalhadores:   funcao?.numTrabalhadores   || '',
      descricaoAtividade: funcao?.descricaoAtividade || '',
      status:      'em_andamento',
      criadaEm:    new Date().toISOString(),
      atualizadaEm:new Date().toISOString(),
      planoAcao:   [],
      relatorio:   { conclusao: '', necessitaAET: false, justificativaAET: '' }
    };

    if (tipo === 'aep')          { base.aep = _estruturaAEP(); base.copsoq = { modo:'grupo', respostas:{} }; }
    else if (tipo === 'psicossocial') { base.copsoq = { modo:'grupo', respostas:{} }; base.psicossocial = _estruturaPsicossocial(); }
    else if (tipo === 'aet')     { base.aet = _estruturaAET(); }

    return base;
  }

  /* ─────────────────────────────────────────────────────────
     MIGRAÇÃO  v1/v2/v3 → v4
     Cria ProjetoLaudo para cada empresa que tem dados.
  ───────────────────────────────────────────────────────── */

  function migrar() {
    _migrarV2();
    _migrarV3();
    _migrarV4();
  }

  function _migrarV2() {
    const lista = listar();
    let alt = false;
    const res = lista.map(av => {
      let m = false;
      if (!av.tipo) { av.tipo = 'aep'; m = true; }
      if (av.tipo === 'aep') {
        if (!av.aep) { av.aep = _estruturaAEP(); m = true; }
        if (!av.aep.posto)   { av.aep.posto   = {}; m = true; }
        if (!av.aep.analise) { av.aep.analise  = _estruturaAnaliseAEP(); m = true; }
      }
      if (!av.copsoq)     { av.copsoq     = { modo:'grupo', respostas:{} }; m = true; }
      if (av.tipo === 'psicossocial' && !av.psicossocial) { av.psicossocial = _estruturaPsicossocial(); m = true; }
      if (av.tipo === 'aet' && !av.aet) { av.aet = _estruturaAET(); m = true; }
      if (!av.planoAcao)  { av.planoAcao = []; m = true; }
      if (!av.relatorio)  { av.relatorio  = { conclusao:'', necessitaAET:false, justificativaAET:'' }; m = true; }
      if (m) alt = true;
      return av;
    });
    if (alt) _gravar(CHAVE_AV, res);
  }

  function _migrarV3() {
    const lista = listar();
    if (!lista.some(av => !av.empresaId && av.empresa?.nome)) return;
    let alt = false;
    const resultado = lista.map(av => {
      if (av.empresaId) return av;
      const nome = av.empresa?.nome;
      if (!nome) return av;
      let emp = listarEmpresas().find(e => (av.empresa?.cnpj && e.cnpj === av.empresa?.cnpj) || e.nome === nome);
      if (!emp) { emp = salvarEmpresa({ id: gerarId('emp'), nome: av.empresa.nome || '', cnpj: av.empresa.cnpj || '', endereco: av.empresa.endereco || '', cidade: av.empresa.cidade || '', estado: av.empresa.estado || '', responsavelTecnico: av.empresa.responsavelTecnico || '', registroProfissional: av.empresa.registroProfissional || '', cargo: av.empresa.cargo || '', criadaEm: new Date().toISOString() }); }
      const ns = av.setor || 'Setor Importado';
      let set = _ler(CHAVE_SETORES).find(s => s.nome === ns && s.empresaId === emp.id);
      if (!set) { set = salvarSetor({ id: gerarId('set'), empresaId: emp.id, nome: ns, descricaoAmbiente:'', observacoes:'', criadaEm: new Date().toISOString() }); }
      const nf = av.funcao || 'Função Importada';
      let fun = listarFuncoes(set.id).find(f => f.nome === nf);
      if (!fun) { fun = salvarFuncao({ id: gerarId('fun'), setorId: set.id, nome: nf, numTrabalhadores: av.numTrabalhadores || '', turno:'', descricaoAtividade: av.descricaoAtividade || '', grupoHomogeneo:'', criadaEm: new Date().toISOString() }); }
      av.empresaId = emp.id; av.setorId = set.id; av.funcaoId = fun.id;
      av._empresaNome = emp.nome; av._setorNome = set.nome; av._funcaoNome = fun.nome;
      av.dataAvaliacao = av.dataAvaliacao || av.empresa?.dataAvaliacao || '';
      av.responsavelTecnico = av.responsavelTecnico || av.empresa?.responsavelTecnico || '';
      av.registroProfissional = av.registroProfissional || av.empresa?.registroProfissional || '';
      av.cargoResponsavel = av.cargoResponsavel || av.empresa?.cargo || '';
      alt = true;
      return av;
    });
    if (alt) _gravar(CHAVE_AV, resultado);
  }

  function _migrarV4() {
    /* Cria um ProjetoLaudo por empresa que ainda não tem projeto */
    const empresas = listarEmpresas();
    const projExistentes = _ler(CHAVE_PROJETOS);
    let projetosAlterados = false;
    let setoresAlterados  = false;
    let avalAlteradas     = false;

    empresas.forEach(emp => {
      let proj = projExistentes.find(p => p.empresaId === emp.id);
      if (!proj) {
        const avs = listar().filter(a => a.empresaId === emp.id);
        if (avs.length === 0) return; /* sem dados, não cria projeto ainda */
        const tipos = [...new Set(avs.map(a => a.tipo || 'aep'))];
        const tipoProjeto = tipos.length === 1 ? tipos[0] : 'integrado';
        proj = {
          id:                   gerarId('proj'),
          empresaId:            emp.id,
          nome:                 `Laudo Técnico — ${emp.nome}`,
          tipo:                 tipoProjeto,
          dataInicio:           avs[0]?.empresa?.dataAvaliacao || new Date().toISOString().slice(0, 10),
          dataFim:              '',
          responsavelTecnico:   emp.responsavelTecnico   || '',
          registroProfissional: emp.registroProfissional || '',
          cargoResponsavel:     emp.cargo                || '',
          status:               'em_andamento',
          objetivo:             '',
          observacoesGerais:    '',
          conclusaoTecnica:     '',
          necessitaAET:         false,
          criadoEm:             new Date().toISOString(),
          atualizadoEm:         new Date().toISOString()
        };
        projExistentes.unshift(proj);
        projetosAlterados = true;
      }

      /* Atualiza setores órfãos (só com empresaId, sem projetoId) */
      const todosSetores = _ler(CHAVE_SETORES);
      todosSetores.forEach(s => {
        if (s.empresaId === emp.id && !s.projetoId) {
          s.projetoId = proj.id;
          setoresAlterados = true;
        }
      });
      if (setoresAlterados) _gravar(CHAVE_SETORES, todosSetores);

      /* Atualiza avaliações da empresa sem projetoId */
      const avs = listar();
      let avAlt = false;
      avs.forEach(a => {
        if (a.empresaId === emp.id && !a.projetoId) {
          a.projetoId = proj.id;
          a._projetoNome = proj.nome;
          avAlt = true;
          avalAlteradas = true;
        }
      });
      if (avAlt) _gravar(CHAVE_AV, avs);
    });

    if (projetosAlterados) _gravar(CHAVE_PROJETOS, projExistentes);
  }

  /* ─────────────────────────────────────────────────────────
     HELPERS DE EXIBIÇÃO
  ───────────────────────────────────────────────────────── */

  function nomeEmpresaAv(av) {
    if (av.projetoId) { const p = buscarProjeto(av.projetoId); if (p) return buscarEmpresa(p.empresaId)?.nome || ''; }
    if (av.empresaId) return buscarEmpresa(av.empresaId)?.nome || '';
    return av._empresaNome || av.empresa?.nome || '';
  }

  function nomeSetorAv(av) {
    if (av.setorId) return buscarSetor(av.setorId)?.nome || av._setorNome || '';
    return av._setorNome || av.setor || '';
  }

  function nomeFuncaoAv(av) {
    if (av.funcaoId) return buscarFuncao(av.funcaoId)?.nome || av._funcaoNome || '';
    return av._funcaoNome || av.funcao || '';
  }

  /* ─────────────────────────────────────────────────────────
     EXPORTAÇÃO / IMPORTAÇÃO
  ───────────────────────────────────────────────────────── */

  function exportarJSON(id) {
    const av = buscar(id);
    if (!av) throw new Error('Avaliação não encontrada');
    return JSON.stringify({ avaliacao: av, projeto: av.projetoId ? buscarProjeto(av.projetoId) : null, empresa: av.empresaId ? buscarEmpresa(av.empresaId) : null, setor: av.setorId ? buscarSetor(av.setorId) : null, funcao: av.funcaoId ? buscarFuncao(av.funcaoId) : null }, null, 2);
  }

  function exportarProjeto(projetoId) {
    const proj  = buscarProjeto(projetoId);
    if (!proj) throw new Error('Projeto não encontrado');
    return JSON.stringify({
      projeto:   proj,
      empresa:   buscarEmpresa(proj.empresaId),
      setores:   listarSetores(projetoId),
      funcoes:   listarFuncoesPorProjeto(projetoId),
      avaliacoes:listarPorProjeto(projetoId)
    }, null, 2);
  }

  function importarJSON(jsonStr) {
    let d; try { d = JSON.parse(jsonStr); } catch { throw new Error('JSON inválido'); }
    const av = d.avaliacao || d;
    if (!av) throw new Error('Estrutura inválida');
    av.id = gerarId(av.tipo || 'av');
    return salvar(av);
  }

  /* ─────────────────────────────────────────────────────────
     ESTATÍSTICAS
  ───────────────────────────────────────────────────────── */

  function estatisticas() {
    const lista = listar();
    return {
      projetos:     _ler(CHAVE_PROJETOS).length,
      empresas:     listarEmpresas().length,
      setores:      _ler(CHAVE_SETORES).length,
      funcoes:      _ler(CHAVE_FUNCOES).length,
      total:        lista.length,
      aep:          lista.filter(a => (a.tipo||'aep') === 'aep').length,
      psicossocial: lista.filter(a => a.tipo === 'psicossocial').length,
      aet:          lista.filter(a => a.tipo === 'aet').length,
      concluidas:   lista.filter(a => a.status === 'concluida').length,
      acoesPendentes: lista.reduce((n, a) => n + (a.planoAcao?.filter(x => x.status === 'pendente').length || 0), 0)
    };
  }

  /* ─────────────────────────────────────────────────────────
     ESTRUTURAS INTERNAS
  ───────────────────────────────────────────────────────── */

  function _estruturaAEP() {
    return { organizacao:{}, cargas:{}, mobiliario:{}, maquinas:{}, ambiente:{}, psicossocial:{}, posto:{}, analise: _estruturaAnaliseAEP() };
  }
  function _estruturaAnaliseAEP() {
    return { analiseTecnica:'', nivelRiscoGeral:'', justificativaRisco:'', recomendacoes:'', prioridadeIntervencao:'', indicaAET:false, justificativaAET:'', responsavelAcompanhamento:'', prazoRetorno:'' };
  }
  function _estruturaPsicossocial() {
    return { grupoAvaliado:{ descricao:'', numParticipantes:'', metodoColeta:'', dataColeta:'' }, observacaoTecnica:'', interpretacaoTecnica:'', fatoresCriticos:'', fatoresProtetores:'', medidasPreventivas:'', suporteEspecializado:false };
  }
  function _estruturaAET() {
    return { solicitante:'', motivoSolicitacao:'', demandaApresentada:'', dataInicio:'', tarefaPrescrita:'', atividadeReal:'', variabilidades:'', modosOperatorios:'', observacaoAtividade:'', exigenciasBiomecanicas:'', exigenciasCognitivas:'', exigenciasOrganizacionais:'', ferramentasAplicadas:[], diagnosticoErgonomico:'', recomendacoes:'', planoTransformacao:[], conclusaoTecnica:'', necessitaReavaliacao:false, prazoReavaliacao:'' };
  }

  return {
    gerarId,
    /* Empresas */
    listarEmpresas, buscarEmpresa, salvarEmpresa, excluirEmpresa, criarEmpresa,
    /* Projetos */
    listarProjetos, buscarProjeto, salvarProjeto, excluirProjeto, criarProjeto,
    /* Setores do projeto */
    listarSetores, buscarSetor, salvarSetor, excluirSetor, criarSetor,
    /* Funções do projeto */
    listarFuncoes, listarFuncoesPorProjeto, buscarFuncao, salvarFuncao, excluirFuncao, criarFuncao,
    /* Catálogo mestre — setores */
    listarSetoresMaster, buscarSetorMaster, salvarSetorMaster, excluirSetorMaster, criarSetorMaster,
    /* Catálogo mestre — funções */
    listarFuncoesMaster, listarFuncoesMasterPorEmpresa, buscarFuncaoMaster, salvarFuncaoMaster, excluirFuncaoMaster, criarFuncaoMaster,
    /* Importação do catálogo mestre para projeto */
    importarDoMestre,
    /* Avaliações */
    listar, buscar, listarPorTipo, listarPorProjeto, salvar, excluir, criarAvaliacao,
    /* Migração */
    migrar,
    /* Helpers */
    nomeEmpresaAv, nomeSetorAv, nomeFuncaoAv,
    /* Export */
    exportarJSON, exportarProjeto, importarJSON,
    /* Stats */
    estatisticas
  };
})();
