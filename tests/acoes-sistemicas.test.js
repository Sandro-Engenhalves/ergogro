/* ============================================================
   ErgoGRO — Testes das AÇÕES SISTÊMICAS do Plano de Ação
   (abrangência: "Função específica" x "Todas as funções do estabelecimento")

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/acoes-sistemicas.test.js

   Estratégia: carrega storage.js e projeto.js REAIS em um contexto vm com
   stubs mínimos de DOM/App. O "localStorage" é um Map compartilhado, o que
   permite simular o recarregamento da página (novo contexto, mesmos dados).
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ROTULO = 'SISTÊMICA — TODAS AS FUNÇÕES';

/* Cria um "navegador" novo; `disco` simula o armazenamento persistente. */
/* IndexedDB mínimo (store 'kv') apoiado em disco, para exercitar Storage.inicializar() de verdade */
function criarIDBFalso(disco) {
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction() {
      const tx = {};
      const store = {
        put: (v, k) => { disco.set(k, JSON.parse(JSON.stringify(v))); },
        getAllKeys: () => ({ get result() { return [...disco.keys()]; } }),
        getAll: () => ({ get result() { return [...disco.values()]; } }),
      };
      tx.objectStore = () => store;
      setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
      return tx;
    },
  };
  return { open() {
    const req = {};
    setTimeout(() => { req.onsuccess && req.onsuccess({ target: { result: db } }); }, 0);
    return req;
  } };
}

async function novoAmbiente(disco = new Map()) {
  const campos = {};                       /* id -> { value } dos inputs do formulário */
  const toasts = [];
  const conteudo = { innerHTML: '' };
  let projAtual = null;

  const ctx = {
    console, Date, Math, JSON, Promise, setTimeout,
    indexedDB: criarIDBFalso(disco),
    localStorage: {
      getItem: k => (disco.has(k) ? disco.get(k) : null),
      setItem: (k, v) => disco.set(k, String(v)),
      removeItem: k => disco.delete(k),
    },
    document: {
      getElementById: id => (id === 'projeto-conteudo' ? conteudo : (campos[id] || null)),
      querySelectorAll: () => [],
    },
    window: { scrollTo() {}, addEventListener() {} },
    App: {
      obterProjetoAtual:   () => projAtual,
      obterAvaliacaoAtual: () => null,
      mostrarToast:        (m, t) => toasts.push([m, t]),
    },
    ModuloAEP: {
      calcularRiscoGeral: () => ({ alto: 0, medio: 0, baixo: 0 }),
      obterNaoConformes:  () => [],
      MOTOR_AEP: { calcularScore: () => ({ valor: 0 }), sugerirNivel: () => 'baixo' },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(ler('js/inscricao.js'), ctx);
  vm.runInContext(ler('js/storage.js'), ctx);

  /* Injeta um acessor antes do `return {` final para alcançar as funções privadas */
  const fonte = ler('js/modules/projeto.js');
  const pos = fonte.lastIndexOf('\n  return {');
  assert.notEqual(pos, -1, 'return final do ModuloProjeto não encontrado');
  vm.runInContext(
    fonte.slice(0, pos) + '\n  return { __t: { _htmlPlano, _htmlRelatorio },' +
    fonte.slice(pos + '\n  return {'.length), ctx);

  const Storage = vm.runInContext('Storage', ctx);
  await Storage.inicializar();
  const Modulo  = vm.runInContext('ModuloProjeto', ctx);

  return {
    ctx, Storage, Modulo, toasts, conteudo,
    abrirProjeto: id => { projAtual = Storage.buscarProjeto(id); return projAtual; },
    /* Preenche o formulário "Nova Ação Manual" */
    form(v) {
      for (const k of Object.keys(campos)) delete campos[k];
      Object.assign(campos, {
        'nova-acao-descricao': { value: v.descricao },
        'nova-acao-abrang':    { value: v.abrangencia },
        'nova-acao-avid':      { value: v.avId || '' },
        'nova-acao-resp':      { value: v.resp || '' },
        'nova-acao-prazo':     { value: v.prazo || '' },
        'nova-acao-prio':      { value: v.prio || 'media' },
        'nova-acao-medida':    { value: v.medida || '' },
      });
    },
    plano:     () => Modulo.__t._htmlPlano(),
    relatorio: () => Modulo.__t._htmlRelatorio(null),
  };
}

/* Cria empresa + 2 projetos (A com 2 avaliações, B com 1) */
function semear(env) {
  const { Storage } = env;
  const emp = Storage.criarEmpresa(); emp.nome = 'Empresa Teste';
  Storage.salvarEmpresa(emp);
  const mk = nome => { const p = Storage.criarProjeto(emp.id); p.nome = nome; Storage.salvarProjeto(p); return p; };
  const A = mk('Estabelecimento A');
  const B = mk('Estabelecimento B');
  const avA1 = Storage.criarAvaliacao('aep', A.id, null, null); Storage.salvar(avA1);
  const avA2 = Storage.criarAvaliacao('aep', A.id, null, null); Storage.salvar(avA2);
  const avB1 = Storage.criarAvaliacao('aep', B.id, null, null); Storage.salvar(avB1);
  return { emp, A, B, avA1, avA2, avB1 };
}

const contar = (texto, trecho) => texto.split(trecho).length - 1;

test('1. cadastra ação específica (vai para a avaliação, abrangencia=funcao)', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Ajustar bancada da função 1', abrangencia: 'funcao', avId: d.avA1.id, resp: 'João', prazo: '2026-12-01', prio: 'alta', medida: 'engenharia' });
  env.Modulo.adicionarAcaoManual();

  const av1 = env.Storage.buscar(d.avA1.id);
  assert.equal(av1.planoAcao.length, 1);
  assert.equal(av1.planoAcao[0].abrangencia, 'funcao');
  assert.equal(av1.planoAcao[0].responsavel, 'João');
  assert.equal(env.Storage.buscar(d.avA2.id).planoAcao.length, 0, 'outra avaliação não pode receber a ação');
  assert.equal((env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico || []).length, 0);
});

test('2. cadastra ação sistêmica (1 registro no projeto, sem vínculo de função/avaliação)', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Treinamento geral de ergonomia', abrangencia: 'estabelecimento', avId: d.avA1.id, resp: 'SESMT', prio: 'alta', medida: 'organizacional' });
  env.Modulo.adicionarAcaoManual();

  const sis = env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico;
  assert.equal(sis.length, 1);
  assert.equal(sis[0].abrangencia, 'estabelecimento');
  assert.equal(sis[0].responsavel, 'SESMT');
  for (const k of ['avaliacaoId', 'funcaoId', 'setorId', 'projetoId', '_avId'])
    assert.ok(!(k in sis[0]), `ação sistêmica não deve ter vínculo artificial (${k})`);
  assert.equal(env.Storage.buscar(d.avA1.id).planoAcao.length, 0, 'não duplicar na avaliação');
  assert.equal(env.Storage.buscar(d.avA2.id).planoAcao.length, 0, 'não duplicar na avaliação');
});

test('2b. ação sistêmica é permitida em projeto sem avaliações', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  const C = env.Storage.criarProjeto(d.emp.id); C.nome = 'Vazio'; env.Storage.salvarProjeto(C);
  env.abrirProjeto(C.id);
  env.form({ descricao: 'Política de pausas', abrangencia: 'estabelecimento' });
  env.Modulo.adicionarAcaoManual();
  assert.equal(env.Storage.buscarProjeto(C.id).planoAcaoSistemico.length, 1);
  env.form({ descricao: 'Específica sem avaliação', abrangencia: 'funcao' });
  env.Modulo.adicionarAcaoManual();
  assert.ok(env.toasts.some(([m]) => /sem avalia/.test(m)), 'ação específica continua exigindo avaliação');
});

test('3. edita ambos os tipos (campos e status)', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Esp', abrangencia: 'funcao', avId: d.avA1.id });   env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Sis', abrangencia: 'estabelecimento' });          env.Modulo.adicionarAcaoManual();
  const esp = env.Storage.buscar(d.avA1.id).planoAcao[0];
  const sis = env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico[0];

  env.Modulo.salvarCampoAcao(d.avA1.id, esp.id, 'descricao', 'Esp editada');
  env.Modulo.salvarCampoAcao('@sistemica', sis.id, 'descricao', 'Sis editada');
  env.Modulo.salvarCampoAcao('@sistemica', sis.id, 'prazo', '2027-01-31');
  env.Modulo.alterarStatusAcao(d.avA1.id, esp.id, 'concluido');
  env.Modulo.alterarStatusAcao('@sistemica', sis.id, 'em_andamento');

  const esp2 = env.Storage.buscar(d.avA1.id).planoAcao[0];
  const sis2 = env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico[0];
  assert.equal(esp2.descricao, 'Esp editada'); assert.equal(esp2.status, 'concluido');
  assert.equal(sis2.descricao, 'Sis editada'); assert.equal(sis2.status, 'em_andamento');
  assert.equal(sis2.prazo, '2027-01-31');
  assert.equal(sis2.abrangencia, 'estabelecimento', 'abrangência preservada após edição');
});

test('4. exclui sem afetar as demais', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Esp1', abrangencia: 'funcao', avId: d.avA1.id }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Esp2', abrangencia: 'funcao', avId: d.avA2.id }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Sis1', abrangencia: 'estabelecimento' });        env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Sis2', abrangencia: 'estabelecimento' });        env.Modulo.adicionarAcaoManual();
  env.abrirProjeto(d.A.id);

  const [s1, s2] = env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico;
  env.Modulo.excluirAcao('@sistemica', s1.id);
  let p = env.Storage.buscarProjeto(d.A.id);
  assert.deepEqual(Array.from(p.planoAcaoSistemico.map(a => a.descricao)), ['Sis2']);
  assert.equal(env.Storage.buscar(d.avA1.id).planoAcao.length, 1);
  assert.equal(env.Storage.buscar(d.avA2.id).planoAcao.length, 1);

  const e1 = env.Storage.buscar(d.avA1.id).planoAcao[0];
  env.Modulo.excluirAcao(d.avA1.id, e1.id);
  assert.equal(env.Storage.buscar(d.avA1.id).planoAcao.length, 0);
  assert.equal(env.Storage.buscar(d.avA2.id).planoAcao.length, 1, 'específica de outra função intacta');
  assert.deepEqual(Array.from(env.Storage.buscarProjeto(d.A.id).planoAcaoSistemico.map(a => a.id)), [s2.id], 'sistêmica intacta');
});

test('5. persiste após recarregar a página', async () => {
  const disco = new Map();
  const env = await novoAmbiente(disco); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Esp persistida', abrangencia: 'funcao', avId: d.avA1.id }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Sis persistida', abrangencia: 'estabelecimento' });        env.Modulo.adicionarAcaoManual();

  const env2 = await novoAmbiente(disco);               /* "F5": novo contexto, mesmo armazenamento */
  env2.abrirProjeto(d.A.id);
  assert.equal(env2.Storage.buscar(d.avA1.id).planoAcao[0].descricao, 'Esp persistida');
  assert.equal(env2.Storage.listarAcoesSistemicas(d.A.id)[0].descricao, 'Sis persistida');
  const html = env2.plano();
  assert.ok(html.includes('Esp persistida') && html.includes('Sis persistida'));
});

test('6. compatibilidade: registros antigos (sem abrangencia) = função específica, intactos', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  const av = env.Storage.buscar(d.avA1.id);
  const antiga = { id: 'acao_antiga', descricao: 'Ação legada', prioridade: 'alta', prazo: '2026-05-05',
                   responsavel: 'Maria', medida: 'epi', status: 'em_andamento', origem: 'aep_motor', criadaEm: '2025-01-01T00:00:00.000Z' };
  av.planoAcao = [{ ...antiga }]; env.Storage.salvar(av);

  assert.equal(env.Storage.abrangenciaAcao(antiga), 'funcao');
  env.abrirProjeto(d.A.id);
  const html = env.plano();
  assert.ok(html.includes('Ação legada'));
  assert.equal(contar(html, ROTULO), 0, 'registro antigo não pode ser marcado como sistêmico');

  /* Nenhuma migração: o registro continua exatamente como estava */
  assert.deepEqual(JSON.parse(JSON.stringify(env.Storage.buscar(d.avA1.id).planoAcao[0])), antiga);
  /* Projeto antigo sem o campo planoAcaoSistemico funciona */
  assert.equal(env.Storage.listarAcoesSistemicas(d.A.id).length, 0);
  /* Edição de registro antigo não injeta abrangência indevida */
  env.Modulo.salvarCampoAcao(d.avA1.id, 'acao_antiga', 'responsavel', 'Ana');
  const edit = env.Storage.buscar(d.avA1.id).planoAcao[0];
  assert.equal(edit.responsavel, 'Ana'); assert.equal(edit.medida, 'epi'); assert.equal(edit.prazo, '2026-05-05');
});

test('7. plano e relatório: sistêmica aparece UMA vez, com abrangência; específicas preservadas', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Esp A1 unica', abrangencia: 'funcao', avId: d.avA1.id }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Esp A2 unica', abrangencia: 'funcao', avId: d.avA2.id }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Sis unica',    abrangencia: 'estabelecimento', prio: 'alta' }); env.Modulo.adicionarAcaoManual();
  env.abrirProjeto(d.A.id);

  const plano = env.plano();
  assert.equal(contar(plano, 'Sis unica'), 1, 'sistêmica 1x no plano consolidado (mesmo com 2 avaliações)');
  assert.equal(contar(plano, ROTULO), 1);
  assert.equal(contar(plano, 'Esp A1 unica'), 1);
  assert.equal(contar(plano, 'Esp A2 unica'), 1);
  /* contadores: Total = 2 específicas + 1 sistêmica = 3 ; alta prioridade = 1 (a sistêmica) */
  assert.match(plano, />3<\/div>\s*<div[^>]*>Total</);
  assert.match(plano, />1<\/div>\s*<div[^>]*>Alta Prior\./);

  const rel = env.relatorio();
  assert.equal(contar(rel, 'Sis unica'), 1, 'sistêmica 1x no relatório');
  assert.equal(contar(rel, ROTULO), 1, 'abrangência exibida no relatório');
  assert.equal(contar(rel, 'Esp A1 unica'), 1);
  assert.equal(contar(rel, 'Esp A2 unica'), 1);
  assert.ok(!/undefined|NaN|\[object/.test(plano + rel), 'HTML sem undefined/NaN/[object]');
});

test('8. isolamento entre estabelecimentos', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Sis exclusiva de A', abrangencia: 'estabelecimento' }); env.Modulo.adicionarAcaoManual();

  assert.equal(env.Storage.listarAcoesSistemicas(d.A.id).length, 1);
  assert.equal(env.Storage.listarAcoesSistemicas(d.B.id).length, 0);
  env.abrirProjeto(d.B.id);
  assert.ok(!env.plano().includes('Sis exclusiva de A'));
  assert.ok(!env.relatorio().includes('Sis exclusiva de A'));
  assert.equal(contar(env.plano(), ROTULO), 0);

  /* Estatística global conta a sistêmica uma única vez */
  assert.equal(env.Storage.estatisticas().acoesPendentes, 1);
  /* Excluir B não afeta A */
  env.Storage.excluirProjeto(d.B.id);
  assert.equal(env.Storage.listarAcoesSistemicas(d.A.id).length, 1);
});

test('9. plano global (plano-acao.js): 1 entrada por sistêmica e status editável', async () => {
  const env = await novoAmbiente(); const d = semear(env);
  env.abrirProjeto(d.A.id);
  env.form({ descricao: 'Sis global', abrangencia: 'estabelecimento' }); env.Modulo.adicionarAcaoManual();
  env.form({ descricao: 'Esp global', abrangencia: 'funcao', avId: d.avA1.id }); env.Modulo.adicionarAcaoManual();

  const tela = { innerHTML: '' };
  env.ctx.document.getElementById = id => (id === 'tela-plano-geral' ? tela : null);
  vm.runInContext(ler('js/modules/plano-acao.js'), env.ctx);
  const Plano = vm.runInContext('ModuloPlano', env.ctx);

  Plano.renderizarGeral('', '', '');
  assert.equal(contar(tela.innerHTML, 'Sis global'), 1);
  assert.equal(contar(tela.innerHTML, 'Esp global'), 1);
  assert.equal(contar(tela.innerHTML, ROTULO), 1);

  const sis = env.Storage.listarAcoesSistemicas(d.A.id)[0];
  Plano.alterarStatusGeral('@sistemica', sis.id, 'concluido', d.A.id);
  assert.equal(env.Storage.listarAcoesSistemicas(d.A.id)[0].status, 'concluido');

  Plano.renderizarGeral('', '', 'aep');            /* filtro por tipo de avaliação oculta sistêmicas */
  assert.equal(contar(tela.innerHTML, 'Sis global'), 0);
  Plano.renderizarGeral('', '', 'sistemico');
  assert.equal(contar(tela.innerHTML, 'Sis global'), 1);
  assert.equal(contar(tela.innerHTML, 'Esp global'), 0);
});

test('10. o código novo não referencia o motor de cálculo de risco', async () => {
  /* Garantia estática: o código novo não referencia o motor de risco */
  const novo = ler('js/storage.js').match(/Ações sistêmicas[\s\S]*?function excluirProjeto/)[0];
  assert.ok(!/calcularRisco|score|matriz/i.test(novo));
});

/* ── Relatório AEP por função (aep.js real) ─────────────────── */
function renderizarAEP({ projetoId, planoAcao, sistemicasPorProjeto }) {
  const av = { id: 'a1', tipo: 'aep', projetoId, setor: 'Setor X', funcao: 'Função Y', numTrabalhadores: '5',
               aep: { posto: {}, analise: {} }, planoAcao, relatorio: {} };
  const ctx = vm.createContext({
    App:          { obterAvaliacaoAtual: () => av },
    Storage:      { buscarEmpresa: () => null, listarAcoesSistemicas: id => sistemicasPorProjeto[id] || [] },
    document:     { getElementById: () => null, addEventListener() {} },
    window:       { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  vm.runInContext(ler('js/inscricao.js'), ctx);
  const fonte = ler('js/modules/aep.js');
  const i = fonte.lastIndexOf('\n  return {');
  vm.runInContext(fonte.slice(0, i) + '\n  globalThis.__priv = { _htmlRelatorioAEP };' + fonte.slice(i), ctx);
  return ctx.__priv._htmlRelatorioAEP();
}

test('11. relatório AEP por função: sistêmica exibida uma vez, específicas preservadas, isolada por projeto', () => {
  const sis = { id: 's1', descricao: 'Sis AEP unica', abrangencia: 'estabelecimento', prioridade: 'alta', status: 'pendente', medida: 'organizacional' };
  const esp = [
    { id: 'e1', descricao: 'Esp AEP um',  prioridade: 'media', status: 'pendente' },
    { id: 'e2', descricao: 'Esp AEP dois', prioridade: 'baixa', status: 'concluido' },
  ];
  const html = renderizarAEP({ projetoId: 'pA', planoAcao: esp, sistemicasPorProjeto: { pA: [sis], pB: [] } });
  assert.equal(contar(html, 'Sis AEP unica'), 1);
  assert.equal(contar(html, ROTULO), 1);
  assert.equal(contar(html, 'Esp AEP um'), 1);
  assert.equal(contar(html, 'Esp AEP dois'), 1);
  assert.match(html, /11\. Plano de Ação \(2 ação\(ões\)\)/, 'contagem da função não inclui a sistêmica');
  assert.ok(!/undefined|NaN|\[object/.test(html.slice(html.indexOf('11. Plano de Ação'), html.indexOf('12. Conclusão'))));

  /* só sistêmica (função sem ações próprias): seção aparece, 0 específicas */
  const so = renderizarAEP({ projetoId: 'pA', planoAcao: [], sistemicasPorProjeto: { pA: [sis] } });
  assert.equal(contar(so, 'Sis AEP unica'), 1);
  assert.match(so, /11\. Plano de Ação \(0 ação\(ões\)\)/);

  /* outro estabelecimento: nada da sistêmica de A; sem ações → sem seção (comportamento anterior) */
  const b = renderizarAEP({ projetoId: 'pB', planoAcao: [], sistemicasPorProjeto: { pA: [sis], pB: [] } });
  assert.equal(contar(b, 'Sis AEP unica'), 0);
  assert.equal(contar(b, ROTULO), 0);
  assert.ok(!b.includes('<h3>11. Plano de Ação'));

  /* sem sistêmicas: relatório idêntico ao legado (sem marcador) */
  const leg = renderizarAEP({ projetoId: 'pB', planoAcao: esp, sistemicasPorProjeto: {} });
  assert.equal(contar(leg, ROTULO), 0);
  assert.equal(contar(leg, 'Esp AEP um'), 1);
});
