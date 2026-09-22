/* ============================================================
   ErgoGRO — Testes das saídas internas simples (GATE 3.M2)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m2-saidas-internas.test.js

   Cobre as superfícies internas adequadas à Inscricao.exibir():
     app.js          → _renderizarContextoEmpresa, abrirModalLinksGrupo
     projeto.js      → _htmlVisaoGeral
     consulta-aep.js → _criarTokenProjeto (retorno local) e _mostrarModalGrupo

   Estratégia: executa o CÓDIGO DE PRODUÇÃO (funções extraídas do fonte, ou o arquivo
   inteiro no caso de consulta-aep.js) num contexto vm com stubs mínimos e confere o
   HTML gerado e, principalmente, o que seria GRAVADO no Firestore público.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = {
  helper:   'js/inscricao.js',
  app:      'js/app.js',
  projeto:  'js/modules/projeto.js',
  consulta: 'js/consulta-aep.js',
};

/* ── Utilitários ──────────────────────────────────────────── */

/* Extrai o fonte de uma função declarada com 2 espaços de indentação (estilo do projeto),
   do cabeçalho até o próximo cabeçalho de função no mesmo nível / fim do módulo. */
function extrair(fonte, nome) {
  const ini = fonte.search(new RegExp(`^  (async )?function ${nome}\\(`, 'm'));
  assert.notEqual(ini, -1, `função ${nome} não encontrada`);
  const resto = fonte.slice(ini + 1);
  const fim = resto.search(/^  (async )?function \w+\(|^  return \{|^\}\)\(\)/m);
  return fonte.slice(ini, fim === -1 ? undefined : ini + 1 + fim);
}

/* Fonte sem comentários de bloco (a guarda estática só olha código). */
const semComentarios = fonte => fonte.replace(/\/\*[\s\S]*?\*\//g, '');

/* Contexto vm limpo já com o helper real carregado (Inscricao). */
function contexto(globais = {}) {
  const ctx = vm.createContext({ ...globais });
  vm.runInContext(ler(ARQ.helper), ctx);
  return ctx;
}

/* Números de teste (públicos/válidos). CNO e CEI usam números diferentes para que
   qualquer vazamento seja atribuível ao tipo correto. */
const CNPJ = { num: '11222333000181', masc: '11.222.333/0001-81' };
const CPF  = { num: '52998224725',    masc: '529.982.247-25' };
const CNO  = { num: '123456789012',   masc: '12.345.67890/12' };
const CEI  = { num: '210987654321',   masc: '21.098.76543/21' };
const CAEPF = { num: '12345678901234', masc: '12345678901234' };

/* Empresas de teste: cada tipo, CNPJ legado (somente `cnpj`) e inscrição vazia. */
const EMPRESAS = [
  { id: 'e-cnpj',   nome: 'Emp CNPJ',   tipoInscricao: 'cnpj',  numeroInscricao: CNPJ.num,  cnpj: CNPJ.masc, cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-cpf',    nome: 'Emp CPF',    tipoInscricao: 'cpf',   numeroInscricao: CPF.num,   cnpj: '',        cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-cno',    nome: 'Emp CNO',    tipoInscricao: 'cno',   numeroInscricao: CNO.num,   cnpj: '',        cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-caepf',  nome: 'Emp CAEPF',  tipoInscricao: 'caepf', numeroInscricao: CAEPF.num, cnpj: '',        cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-cei',    nome: 'Emp CEI',    tipoInscricao: 'cei',   numeroInscricao: CEI.num,   cnpj: '',        cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-legado', nome: 'Emp Legado', cnpj: CNPJ.masc,                                                    cidade: 'Curitiba', estado: 'PR' },
  { id: 'e-vazia',  nome: 'Emp Vazia',  cnpj: '',                                                           cidade: 'Curitiba', estado: 'PR' },
];
const ESPERADO = {
  'e-cnpj': `CNPJ: ${CNPJ.masc}`, 'e-cpf': `CPF: ${CPF.masc}`, 'e-cno': `CNO: ${CNO.masc}`,
  'e-caepf': `CAEPF: ${CAEPF.masc}`, 'e-cei': `CEI: ${CEI.masc}`, 'e-legado': `CNPJ: ${CNPJ.masc}`, 'e-vazia': '',
};

/* Escapa texto literal para uso dentro de RegExp. */
const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

const semLixo = html => {
  assert.ok(!/undefined|null|NaN|\[object/.test(html), 'HTML contém undefined/null/NaN/[object]');
};

/* ═════════════════════════════════════════════════════════════
   1. GUARDA ESTÁTICA
   ═════════════════════════════════════════════════════════════ */

const SUPERFICIES = [
  { arq: ARQ.app,      fn: '_renderizarContextoEmpresa' },
  { arq: ARQ.app,      fn: 'abrirModalLinksGrupo' },
  { arq: ARQ.projeto,  fn: '_htmlVisaoGeral' },
];

for (const { arq, fn } of SUPERFICIES) {
  test(`guarda estática: ${fn} usa Inscricao.exibir e não lê cnpj direto`, () => {
    const codigo = semComentarios(extrair(ler(arq), fn));
    assert.match(codigo, /Inscricao\.exibir\(/, 'deve usar o helper central');
    assert.doesNotMatch(codigo, /cnpj/i, 'não pode usar emp.cnpj/empresaCnpj como fonte visual');
  });
}

test('guarda estática: _mostrarModalGrupo exibe local.inscricao e não depende de empresaCnpj', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_mostrarModalGrupo'));
  assert.match(codigo, /local\.inscricao\.texto/);
  assert.doesNotMatch(codigo, /cnpj/i);
});

test('guarda estática: o payload PÚBLICO de _criarTokenProjeto não ganhou identificação', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_criarTokenProjeto'));
  /* doc individual gravado no Firestore: bloco ref.set({...}) sem qualquer Inscricao */
  const bloco = codigo.match(/await ref\.set\(\{[\s\S]*?\n    \}\);/);
  assert.ok(bloco, 'bloco ref.set não encontrado');
  assert.doesNotMatch(bloco[0], /inscri/i);
  /* Desde o GATE 3.M4.1, empresaCnpj vem de Inscricao.publico(emp) (portão de privacidade),
     não mais de emp?.cnpj cru — decisão de política aprovada, coberta integralmente em
     tests/m4-1-firestore-publico.test.js. Aqui só resta confirmar que o bloco usa a variável
     (não volta a inlinar emp?.cnpj) e que nenhum outro campo de identificação foi ganho. */
  assert.match(bloco[0], /empresaCnpj,/, 'empresaCnpj deve vir da variável calculada (Inscricao.publico), não inline');
  assert.doesNotMatch(bloco[0], /empresaCnpj:\s*emp\?\.cnpj/, 'não pode voltar a ler emp?.cnpj cru');
  /* Inscricao.exibir só aparece no objeto LOCAL */
  const usos = codigo.match(/Inscricao\.exibir/g) || [];
  assert.equal(usos.length, 1);
  assert.match(codigo, /local:\s*\{\s*inscricao:\s*Inscricao\.exibir\(emp\)\s*\}/);
});

test('guarda estática: abrirConsultaGrupo persiste somente itens[].publico', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), 'abrirConsultaGrupo'));
  assert.match(codigo, /const projetos = itens\.map\(r => r\.publico\)/);
  const gravacao = codigo.match(/\.set\(\{[\s\S]*?\n      \}\);/);
  assert.ok(gravacao, 'bloco .set do grupo não encontrado');
  assert.doesNotMatch(gravacao[0], /itens|local|inscri/i, 'nada do dado local pode ir ao doc do grupo');
  assert.match(gravacao[0], /\bprojetos,/);
  /* o modal recebe o dado completo (itens), não o array público */
  assert.match(codigo, /_mostrarModalGrupo\(perfil, link, itens\)/);
});

test('guarda estática: cache-busting coerente (inscricao/app/projeto/consulta-aep)', () => {
  const idx = ler('index.html'), cons = ler('consulta.html');
  const v = (html, arq) => (html.match(new RegExp(`${arq.replace(/[.]/g, '\\.')}\\?v=([\\w]+)`)) || [])[1];
  assert.equal(v(idx, 'js/inscricao.js'), '2');
  assert.equal(v(idx, 'js/app.js'), '13');
  /* projeto.js foi bumpado na M2 (260706 → 260921) e de novo na M3A; aqui basta exigir que
     saiu da versão do HEAD (o valor exato atual é verificado em m3a-aet-projeto.test.js). */
  assert.notEqual(v(idx, 'js/modules/projeto.js'), '260706', 'projeto.js deve ter sido bumpado desde o HEAD');
  /* consulta-aep.js foi bumpado na M2 (1 → 2) e de novo no M4.1; aqui basta exigir que os dois
     HTMLs continuam coerentes entre si (o valor exato atual é verificado em
     tests/m4-1-firestore-publico.test.js). */
  assert.notEqual(v(idx, 'js/consulta-aep.js'), '1', 'consulta-aep.js deve ter sido bumpado desde o HEAD');
  assert.equal(v(cons, 'js/consulta-aep.js'), v(idx, 'js/consulta-aep.js'), 'consulta.html deve carregar a mesma versão de consulta-aep.js que index.html');
  /* consulta.html continua sem carregar o helper de inscrição */
  assert.doesNotMatch(cons, /inscricao\.js/);
});

/* ═════════════════════════════════════════════════════════════
   2. app.js — _renderizarContextoEmpresa
   ═════════════════════════════════════════════════════════════ */

function renderizarContextoEmpresa(emp) {
  const ctx = contexto();
  const fabrica = vm.runInContext(
    `(function (document, Storage, _empresaAtual, _htmlProjetoItem, _preencherFormNovoProjeto) {
       ${extrair(ler(ARQ.app), '_renderizarContextoEmpresa')}
       return _renderizarContextoEmpresa;
     })`, ctx);
  const el = { innerHTML: '' };
  fabrica(
    { getElementById: id => (id === 'tela-empresa' ? el : null) },
    { listarProjetos: () => [{ id: 'p1', empresaId: emp.id }], listarPorProjeto: () => [1, 2] },
    emp, () => '', () => {}
  )();
  return el.innerHTML;
}

for (const emp of EMPRESAS) {
  test(`_renderizarContextoEmpresa: ${emp.nome}`, () => {
    const html = renderizarContextoEmpresa(emp);
    semLixo(html);
    const esperado = ESPERADO[emp.id];
    if (esperado) {
      assert.ok(html.includes(`color:var(--texto-sec)">${esperado}</div>`), `esperava linha "${esperado}"`);
    } else {
      assert.doesNotMatch(html, />(CNPJ|CPF|CNO|CAEPF|CEI):/, 'inscrição vazia não pode gerar linha');
    }
    /* demais informações preservadas */
    assert.ok(html.includes('📍 Curitiba / PR'));
    assert.ok(html.includes('<strong>1</strong> projeto(s)'));
    assert.ok(html.includes('<strong>2</strong> avaliação(ões)'));
  });
}

/* ═════════════════════════════════════════════════════════════
   3. app.js — abrirModalLinksGrupo
   ═════════════════════════════════════════════════════════════ */

function abrirModalLinksGrupo(empresas, buscarEmpresa = id => empresas.find(e => e.id === id) || null) {
  const ctx = contexto();
  const fabrica = vm.runInContext(
    `(function (document, Storage, mostrarToast) {
       ${extrair(ler(ARQ.app), 'abrirModalLinksGrupo')}
       return abrirModalLinksGrupo;
     })`, ctx);
  const saidas = [];
  fabrica(
    { getElementById: () => null, body: { insertAdjacentHTML: (_, html) => saidas.push(html) } },
    {
      listarProjetos: () => empresas.map((e, i) => ({ id: `p${i}`, empresaId: e.id, nome: `Proj ${i}` })),
      buscarEmpresa,
      listarPorProjeto: () => [],
    },
    () => {}
  )();
  return saidas.join('');
}

test('abrirModalLinksGrupo: cada empresa mostra rótulo + valor do PRÓPRIO tipo', () => {
  const html = abrirModalLinksGrupo(EMPRESAS);
  semLixo(html);
  for (const emp of EMPRESAS.filter(e => ESPERADO[e.id])) {
    /* nome da empresa seguido da sua identificação */
    const re = new RegExp(`${emp.nome}\\s*<span style="font-weight:400;opacity:\\.7"> — ${esc(ESPERADO[emp.id])}</span>`);
    assert.match(html, re, `${emp.nome}: esperava "${ESPERADO[emp.id]}"`);
  }
  /* 6 identificações (a empresa vazia não gera span nem " — " órfão) */
  assert.equal((html.match(/opacity:\.7"> — /g) || []).length, 6);
  assert.doesNotMatch(html, /Emp Vazia\s*<span/);
  assert.match(html, /Emp Vazia\s*<\/div>/);
});

test('abrirModalLinksGrupo: projeto cuja empresa não existe mais (null) não quebra e não inventa identificação', () => {
  const html = abrirModalLinksGrupo([{ id: 'fantasma' }], () => null);
  assert.ok(html.includes('modal-links-grupo'));
  assert.match(html, /Empresa\s*<\/div>/);
  assert.doesNotMatch(html, /opacity:\.7"> — /);
  semLixo(html);
});

/* ═════════════════════════════════════════════════════════════
   4. projeto.js — _htmlVisaoGeral
   ═════════════════════════════════════════════════════════════ */

function htmlVisaoGeral(emp) {
  const ctx = contexto();
  const fabrica = vm.runInContext(
    `(function (App, Storage, _carregarPerfil) {
       ${extrair(ler(ARQ.projeto), '_htmlVisaoGeral')}
       return _htmlVisaoGeral;
     })`, ctx);
  return fabrica(
    { obterProjetoAtual: () => ({ empresaId: 'e1', nome: 'Proj' }) },
    { buscarEmpresa: () => emp },
    () => ({})
  )();
}

/* Texto da linha de identificação/cidade (o div logo após o nome da empresa). */
const linhaVisaoGeral = html => (html.match(/margin-top:var\(--s1\)">\s*([^<]*?)\s*<\/div>/) || [])[1];

for (const emp of EMPRESAS) {
  test(`_htmlVisaoGeral: ${emp.nome}`, () => {
    const html = htmlVisaoGeral(emp);
    semLixo(html);
    const insc = ESPERADO[emp.id];
    assert.equal(linhaVisaoGeral(html), insc ? `${insc} · Curitiba/PR` : 'Curitiba/PR');
  });
}

test('_htmlVisaoGeral: vazio NÃO deixa separador órfão (com e sem cidade/UF)', () => {
  const l = e => linhaVisaoGeral(htmlVisaoGeral(e));
  assert.equal(l({ nome: 'X', cnpj: '', cidade: 'Curitiba', estado: 'PR' }), 'Curitiba/PR');   /* sem "·" inicial */
  assert.equal(l({ nome: 'X', cnpj: '', cidade: 'Curitiba' }), 'Curitiba');                      /* sem "/undefined" */
  assert.equal(l({ nome: 'X', cnpj: '' }), '');                                                  /* nada */
  assert.equal(l({ nome: 'X', tipoInscricao: 'cpf', numeroInscricao: CPF.num }), `CPF: ${CPF.masc}`); /* sem "·" final */
  assert.equal(l({ nome: 'X', cnpj: CNPJ.masc, estado: 'PR' }), `CNPJ: ${CNPJ.masc}`);           /* UF sem cidade é ignorada, como antes */
});

test('_htmlVisaoGeral: sem empresa vinculada mantém o aviso e não lança', () => {
  const html = htmlVisaoGeral(null);
  assert.ok(html.includes('Nenhuma empresa vinculada.'));
  semLixo(html);
});

test('_htmlVisaoGeral: legado inválido/não normalizável continua visível', () => {
  assert.equal(linhaVisaoGeral(htmlVisaoGeral({ nome: 'X', cnpj: '11.222.333/0001-99' })), 'CNPJ: 11.222.333/0001-99');
  assert.equal(linhaVisaoGeral(htmlVisaoGeral({ nome: 'X', cnpj: 'abc@#' })), 'CNPJ: abc@#');
});

/* ═════════════════════════════════════════════════════════════
   5. consulta-aep.js — retorno local x payload público
   ═════════════════════════════════════════════════════════════ */

/* Roda abrirConsultaGrupo do consulta-aep.js REAL com Firestore/Storage simulados.
   Devolve tudo que seria gravado (coleção, doc, dados) e os modais gerados. */
async function rodarGrupo(empresas, { comHelper = true } = {}) {
  const gravacoes = [], modais = [];
  const projetos = empresas.map((e, i) => ({ id: `p${i}`, empresaId: e.id }));
  const ctx = vm.createContext({
    window:   { location: { origin: 'https://exemplo.test', pathname: '/index.html' } },
    document: { getElementById: () => null, body: { insertAdjacentHTML: (_, html) => modais.push(html) } },
    firebase: {
      firestore: () => ({
        collection: col => ({
          doc: id => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async dados => { gravacoes.push({ col, id, dados: JSON.parse(JSON.stringify(dados)) }); },
          }),
        }),
      }),
    },
    inicializarFirebase: () => true,
    App: { mostrarToast: () => {} },
    Storage: {
      buscarProjeto:    id => projetos.find(p => p.id === id) || null,
      buscarEmpresa:    id => empresas.find(e => e.id === id) || null,
      listarPorProjeto: pid => [{ id: `av-${pid}`, setorId: 's1', funcaoId: 'f1' }],
      buscarSetor:      () => ({ nome: 'Setor' }),
      buscarFuncao:     () => ({ nome: 'Função' }),
    },
    ModuloAEP: { ORDEM_BLOCOS: ['a'], BLOCOS: { a: { titulo: 'T', icone: 'i', itens: [{ id: 'a01', texto: 'x' }] } } },
  });
  if (comHelper) vm.runInContext(ler(ARQ.helper), ctx);
  vm.runInContext(ler(ARQ.consulta), ctx);
  await vm.runInContext('ConsultaAEP', ctx).abrirConsultaGrupo('rh', projetos.map(p => p.id));
  return { gravacoes, modais };
}

const CHAVES_PROJETO_PUBLICO = ['projetoId', 'token', 'empresaNome', 'empresaCnpj', 'funcoes', 'totalItens'];
const CHAVES_DOC_CONSULTA = ['token', 'projetoId', 'perfil', 'perfilLabel', 'empresaNome', 'empresaCnpj', 'funcoes', 'totalItens',
  'status', 'criadaEm', 'atualizadaEm', 'respondidaEm', 'respondidoPor', 'respostas'];
const CHAVES_DOC_GRUPO = ['grupoToken', 'perfil', 'perfilLabel', 'projetos', 'totalProjetos', 'criadaEm', 'atualizadaEm'];

test('modal administrativo do grupo mostra rótulo + valor dos cinco tipos, legado e vazio', async () => {
  const { modais } = await rodarGrupo(EMPRESAS);
  assert.equal(modais.length, 1);
  const html = modais[0];
  semLixo(html);
  for (const emp of EMPRESAS.filter(e => ESPERADO[e.id])) {
    assert.match(html, new RegExp(`${emp.nome}\\s*<span style="opacity:\\.7"> — ${esc(ESPERADO[emp.id])}</span>`),
      `${emp.nome}: esperava "${ESPERADO[emp.id]}"`);
  }
  assert.equal((html.match(/opacity:\.7"> — /g) || []).length, 6);
  assert.doesNotMatch(html, /Emp Vazia\s*<span/);
  assert.ok(html.includes('Link do Grupo (7 empresas)'));
});

test('PAYLOAD PÚBLICO: nenhuma inscrição CPF/CNO/CAEPF/CEI é gravada em coleção alguma', async () => {
  const { gravacoes } = await rodarGrupo(EMPRESAS);
  assert.equal(gravacoes.filter(g => g.col === 'ergogro_grupos_aep').length, 1);
  assert.equal(gravacoes.filter(g => g.col === 'ergogro_consultas_aep').length, 7);
  const tudo = JSON.stringify(gravacoes);
  for (const proibido of [CPF.num, CPF.masc, CNO.num, CNO.masc, CEI.num, CEI.masc, CAEPF.num,
                          'tipoInscricao', 'numeroInscricao', 'inscricao', '"local"', '"rotulo"']) {
    assert.ok(!tudo.includes(proibido), `vazamento no payload público: ${proibido}`);
  }
});

test('PAYLOAD PÚBLICO: estrutura e valores idênticos ao contrato anterior', async () => {
  const { gravacoes } = await rodarGrupo(EMPRESAS);

  const grupo = gravacoes.find(g => g.col === 'ergogro_grupos_aep').dados;
  assert.deepEqual(Object.keys(grupo), CHAVES_DOC_GRUPO);
  assert.equal(grupo.totalProjetos, 7);
  assert.equal(grupo.projetos.length, 7);

  /* empresaCnpj público segue exatamente o comportamento antigo (emp.cnpj || '') */
  const cnpjEsperado = { 'Emp CNPJ': CNPJ.masc, 'Emp Legado': CNPJ.masc, 'Emp CPF': '', 'Emp CNO': '', 'Emp CAEPF': '', 'Emp CEI': '', 'Emp Vazia': '' };
  for (const p of grupo.projetos) {
    assert.deepEqual(Object.keys(p), CHAVES_PROJETO_PUBLICO, `chaves de ${p.empresaNome}`);
    assert.equal(p.empresaCnpj, cnpjEsperado[p.empresaNome], `empresaCnpj de ${p.empresaNome}`);
  }

  const consultas = gravacoes.filter(g => g.col === 'ergogro_consultas_aep');
  for (const c of consultas) {
    assert.deepEqual(Object.keys(c.dados), CHAVES_DOC_CONSULTA, `chaves do doc ${c.id}`);
    assert.equal(c.dados.empresaCnpj, cnpjEsperado[c.dados.empresaNome]);
  }
});

test('consulta-aep.js carrega sem Inscricao (consulta.html não carrega o helper)', async () => {
  /* Simula consulta.html: sem helper e sem #consulta-body; o carregamento não pode lançar. */
  const ctx = vm.createContext({ window: { location: { origin: 'https://exemplo.test', pathname: '/consulta.html' } },
                                 document: { getElementById: () => null } });
  assert.doesNotThrow(() => vm.runInContext(ler(ARQ.consulta), ctx));
  assert.equal(vm.runInContext('typeof Inscricao', ctx), 'undefined');
});
