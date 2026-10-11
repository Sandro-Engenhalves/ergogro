/* ============================================================
   ErgoGRO — Testes de AET + relatório consolidado do projeto (GATE 3.M3A)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m3a-aet-projeto.test.js

   Superfícies internas adequadas à Inscricao.exibir():
     aet.js     → _htmlIdentificacao (formulário), _htmlRelatorio (capa + tabela "1. Identificação")
     projeto.js → _htmlRelatorio (capa + tabela "Identificação do Projeto")

   Estratégia: carrega o MÓDULO REAL inteiro no vm (com stubs mínimos) e injeta um
   acessor antes do `return {` final para alcançar as funções privadas. O HTML gerado
   pelo código de produção é então inspecionado.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = { helper: 'js/inscricao.js', aet: 'js/modules/aet.js', projeto: 'js/modules/projeto.js' };

/* ── Utilitários ──────────────────────────────────────────── */

/* Fonte de uma função declarada com 2 espaços de indentação (estilo do projeto). */
function extrair(fonte, nome) {
  const ini = fonte.search(new RegExp(`^  (async )?function ${nome}\\(`, 'm'));
  assert.notEqual(ini, -1, `função ${nome} não encontrada`);
  const resto = fonte.slice(ini + 1);
  const fim = resto.search(/^  (async )?function \w+\(|^  return \{|^\}\)\(\)/m);
  return fonte.slice(ini, fim === -1 ? undefined : ini + 1 + fim);
}
const semComentarios = fonte => fonte.replace(/\/\*[\s\S]*?\*\//g, '');

/* Carrega o módulo real no vm e devolve as funções privadas pedidas. */
function carregar(rel, nomes, globais) {
  const ctx = vm.createContext({ ...globais });
  vm.runInContext(ler(ARQ.helper), ctx);
  let fonte = ler(rel);
  const i = fonte.lastIndexOf('\n  return {');
  assert.ok(i > 0, `return final não encontrado em ${rel}`);
  fonte = fonte.slice(0, i) + `\n  globalThis.__priv = { ${nomes.join(', ')} };` + fonte.slice(i);
  vm.runInContext(fonte, ctx);
  return ctx.__priv;
}

const semLixo = html => assert.ok(!/undefined|null|NaN|\[object/.test(html), 'HTML contém undefined/null/NaN/[object]');

/* Números de teste (públicos/válidos); CNO e CEI distintos para atribuir qualquer engano. */
const CNPJ = '11.222.333/0001-81', CPF = '529.982.247-25', CNO = '12.345.67890/12', CEI = '21.098.76543/21', CAEPF = '12345678901234';

/* Cada caso: empresa + o par (rotulo, valor) esperado. valor '' = inscrição vazia. */
const CASOS = [
  { nome: 'CNPJ novo',            rotulo: 'CNPJ',  valor: CNPJ,  emp: { tipoInscricao: 'cnpj', numeroInscricao: '11222333000181', cnpj: CNPJ } },
  { nome: 'CPF',                  rotulo: 'CPF',   valor: CPF,   emp: { tipoInscricao: 'cpf', numeroInscricao: '52998224725', cnpj: '' } },
  { nome: 'CNO',                  rotulo: 'CNO',   valor: CNO,   emp: { tipoInscricao: 'cno', numeroInscricao: '123456789012', cnpj: '' } },
  { nome: 'CAEPF',                rotulo: 'CAEPF', valor: CAEPF, emp: { tipoInscricao: 'caepf', numeroInscricao: '12345678901234', cnpj: '' } },
  { nome: 'CEI',                  rotulo: 'CEI',   valor: CEI,   emp: { tipoInscricao: 'cei', numeroInscricao: '210987654321', cnpj: '' } },
  { nome: 'CNPJ legado',          rotulo: 'CNPJ',  valor: CNPJ,  emp: { cnpj: CNPJ } },
  { nome: 'vazia (legado)',       rotulo: 'CNPJ',  valor: '',    emp: { cnpj: '' } },
  { nome: 'vazia (tipo CPF)',     rotulo: 'CPF',   valor: '',    emp: { tipoInscricao: 'cpf', numeroInscricao: '', cnpj: '' } },
  { nome: 'legado com DV inválido', rotulo: 'CNPJ', valor: '11.222.333/0001-99', emp: { cnpj: '11.222.333/0001-99' } },
  { nome: 'legado não normalizável', rotulo: 'CNPJ', valor: 'abc@#', emp: { cnpj: 'abc@#' } },
  { nome: 'CPF de tamanho inválido', rotulo: 'CPF', valor: '123', emp: { tipoInscricao: 'cpf', numeroInscricao: '123', cnpj: '' } },
];
/* Empresa completa (nome/cidade/UF fixos): só a inscrição varia entre os casos. */
const empresa = c => ({ id: 'e1', nome: 'Empresa Teste', cidade: 'Curitiba', estado: 'PR', endereco: 'Rua A, 1', ...c.emp });

/* ═════════════════════════════════════════════════════════════
   1. GUARDA ESTÁTICA (focada nas funções alteradas)
   ═════════════════════════════════════════════════════════════ */

const SUPERFICIES = [
  { arq: ARQ.aet,     fn: '_htmlIdentificacao' },
  { arq: ARQ.aet,     fn: '_htmlRelatorio' },
  { arq: ARQ.projeto, fn: '_htmlRelatorio' },
];

for (const { arq, fn } of SUPERFICIES) {
  test(`guarda estática: ${arq} › ${fn} usa Inscricao.exibir e não volta a emp.cnpj / rótulo fixo`, () => {
    const codigo = semComentarios(extrair(ler(arq), fn));
    assert.match(codigo, /Inscricao\.exibir\(emp\)/, 'deve usar o helper central');
    assert.doesNotMatch(codigo, /\.cnpj\b/, 'não pode ler emp.cnpj como fonte visual');
    assert.doesNotMatch(codigo, /empresaCnpj/);
    assert.doesNotMatch(codigo, />\s*CNPJ\s*<|CNPJ\s*:/, 'não pode ter rótulo "CNPJ" fixo');
    assert.match(codigo, /insc\.rotulo/);
    assert.match(codigo, /insc\.valor/);
  });
}

test('guarda estática: cache-busting de aet.js e projeto.js (novo bump, distinto da M2)', () => {
  const idx = ler('index.html');
  const v = arq => (idx.match(new RegExp(`${arq.replace(/[.]/g, '\\.')}\\?v=(\\w+)`)) || [])[1];
  /* aet.js foi bumpado na M3A (7 → 8) e de novo no M3C; aqui basta exigir que saiu da versão do HEAD
     (o valor exato atual é verificado em m3c-aet-nome.test.js). */
  assert.notEqual(v('js/modules/aet.js'), '7', 'aet.js deve ter sido bumpado desde o HEAD');
  assert.equal(v('js/modules/projeto.js'), '261011b');
  assert.notEqual(v('js/modules/projeto.js'), '260921', 'não reutilizar a versão da M2');
  /* nenhuma outra página carrega esses módulos */
  for (const html of ['consulta.html', 'pesquisa.html']) assert.doesNotMatch(ler(html), /aet\.js|projeto\.js/);
});

/* ═════════════════════════════════════════════════════════════
   2. AET
   ═════════════════════════════════════════════════════════════ */

function carregarAET(emp) {
  const av = { empresaId: 'e1', setorId: 's1', funcaoId: 'f1', projetoId: 'p1', aet: {} };
  return carregar(ARQ.aet, ['_htmlIdentificacao', '_htmlRelatorio'], {
    App:      { obterAvaliacaoAtual: () => av },
    Storage:  { buscarEmpresa: () => emp, buscarSetor: () => ({ nome: 'Setor A' }), buscarFuncao: () => ({ nome: 'Função B' }), buscarProjeto: () => ({}) },
    document: { getElementById: () => null },
  });
}

/* Campo de identificação do formulário: o form-grupo logo após "Empresa". */
function campoInscricaoAET(html) {
  const m = html.match(/<label class="form-label">Empresa<\/label>\s*<input[^>]*>\s*<\/div>\s*<div class="form-grupo">\s*<label class="form-label">([^<]*)<\/label>\s*<input class="form-input" value="([^"]*)" disabled>/);
  assert.ok(m, 'campo de identificação não encontrado no formulário AET');
  return { rotulo: m[1], valor: m[2] };
}
/* Capa: a linha "<rótulo>: <valor>" em rel-capa-detalhe. */
function capaAET(html) {
  const linhas = [...html.matchAll(/rel-capa-detalhe">([^<]*)<\/div>/g)].map(m => m[1]).filter(l => /^(CNPJ|CPF|CNO|CAEPF|CEI): /.test(l));
  assert.equal(linhas.length, 1, 'esperava exatamente 1 linha de inscrição na capa');
  return linhas[0];
}
/* Tabela "1. Identificação": <strong>rótulo</strong></td><td>valor</td> na linha da Empresa. */
function tabelaAET(html) {
  const m = html.match(/<tr><td><strong>Empresa<\/strong><\/td><td>[^<]*<\/td><td><strong>([^<]*)<\/strong><\/td><td>([^<]*)<\/td><\/tr>/);
  assert.ok(m, 'linha de identificação não encontrada na tabela AET');
  return { rotulo: m[1], valor: m[2] };
}

for (const c of CASOS) {
  test(`AET › ${c.nome}: formulário, capa e tabela`, () => {
    const aet = carregarAET(empresa(c));
    const form = aet._htmlIdentificacao();
    const rel  = aet._htmlRelatorio();
    semLixo(form); semLixo(rel);

    /* formulário: label dinâmico + valor formatado (vazio permanece vazio; continua disabled) */
    assert.deepEqual({ ...campoInscricaoAET(form) }, { rotulo: c.rotulo, valor: c.valor });
    /* capa e tabela: placeholder "—" quando vazio, como já era */
    assert.equal(capaAET(rel), `${c.rotulo}: ${c.valor || '—'}`);
    assert.deepEqual({ ...tabelaAET(rel) }, { rotulo: c.rotulo, valor: c.valor || '—' });
    /* sem " : —" nem separador solto */
    assert.doesNotMatch(rel, /rel-capa-detalhe">\s*:/);
  });
}

test('AET › empresa inexistente (buscarEmpresa → null) não quebra: rótulo de fallback + placeholder', () => {
  const aet = carregarAET(null);
  const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
  semLixo(form); semLixo(rel);
  assert.deepEqual({ ...campoInscricaoAET(form) }, { rotulo: 'CNPJ', valor: '' });
  assert.equal(capaAET(rel), 'CNPJ: —');
  assert.deepEqual({ ...tabelaAET(rel) }, { rotulo: 'CNPJ', valor: '—' });
});

test('AET › a inscrição é a ÚNICA parte que varia: o restante do HTML é idêntico entre os casos', () => {
  const normalizar = (html, c) => html
    .replace(new RegExp(`(<label class="form-label">)${c.rotulo}(</label>\\s*<input class="form-input" value=")[^"]*(" disabled>)`), '$1@@$2@@$3')
    .replace(/(rel-capa-detalhe">)(CNPJ|CPF|CNO|CAEPF|CEI): [^<]*/, '$1@@')
    .replace(/(<td><strong>Empresa<\/strong><\/td><td>[^<]*<\/td><td><strong>)[^<]*(<\/strong><\/td><td>)[^<]*/, '$1@@$2@@');
  const saidas = CASOS.map(c => {
    const aet = carregarAET(empresa(c));
    return [normalizar(aet._htmlIdentificacao(), c), normalizar(aet._htmlRelatorio(), c)];
  });
  for (const s of saidas.slice(1)) assert.deepEqual(s, saidas[0]);
});

/* Achado colateral do GATE 3 — CORRIGIDO no GATE 3.M3C. Este teste registra o comportamento
   corrigido: o nome da empresa vem de emp.nome (o modelo real; o cadastro nunca gravou
   razaoSocial/nomeFantasia). A cobertura completa do nome está em m3c-aet-nome.test.js. */
test('AET › [achado colateral, CORRIGIDO no M3C] nome da empresa vem de emp.nome', () => {
  const aet = carregarAET({ id: 'e1', nome: 'Só Nome', cnpj: CNPJ });
  const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
  assert.match(form, /<label class="form-label">Empresa<\/label>\s*<input class="form-input" value="Só Nome" disabled>/);
  assert.ok(rel.includes('rel-capa-empresa">Só Nome</div>'));
  assert.match(rel, /<td><strong>Empresa<\/strong><\/td><td>Só Nome<\/td>/);
  /* razaoSocial/nomeFantasia (campos que ninguém grava) deixaram de ser lidos */
  const aet2 = carregarAET({ id: 'e1', nome: 'Só Nome', razaoSocial: 'Razão Ltda', nomeFantasia: 'Fantasia', cnpj: CNPJ });
  assert.ok(aet2._htmlRelatorio().includes('rel-capa-empresa">Só Nome</div>'));
  assert.ok(!aet2._htmlRelatorio().includes('Razão Ltda'));
});

/* ═════════════════════════════════════════════════════════════
   3. RELATÓRIO CONSOLIDADO DO PROJETO
   ═════════════════════════════════════════════════════════════ */

function relatorioProjeto(emp) {
  const proj = { id: 'p1', empresaId: 'e1', tipo: 'aep', nome: 'Projeto X' };
  const mod = carregar(ARQ.projeto, ['_htmlRelatorio'], {
    App:        { obterProjetoAtual: () => proj },
    Storage:    { buscarEmpresa: () => emp, listarSetores: () => [], listarPorProjeto: () => [], listarFuncoes: () => [], listarAcoesSistemicas: () => [] },
    ModuloAEP:  { calcularRiscoGeral: () => ({}) },
    document:   { getElementById: () => null, addEventListener() {} },
    window:     { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  return mod._htmlRelatorio(null, false);
}

/* Capa: linha logo após "Empresa / Cliente". */
function capaProjeto(html) {
  const m = html.match(/Empresa \/ Cliente<\/td><td>[^<]*<\/td><\/tr>\s*<tr><td class="rpt-capa-td-label">([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/);
  assert.ok(m, 'linha de identificação não encontrada na capa do projeto');
  return { rotulo: m[1], valor: m[2] };
}
/* Tabela "Identificação do Projeto": linha logo após "Empresa / Cliente". */
function tabelaProjeto(html) {
  const m = html.match(/Empresa \/ Cliente<\/td><td style="text-align:left">[^<]*<\/td><\/tr>\s*<tr><td style="font-weight:600">([^<]*)<\/td><td style="text-align:left">([^<]*)<\/td><\/tr>/);
  assert.ok(m, 'linha de identificação não encontrada na tabela do projeto');
  return { rotulo: m[1], valor: m[2] };
}

for (const c of CASOS) {
  test(`Projeto › ${c.nome}: capa e tabela "Identificação do Projeto"`, () => {
    const html = relatorioProjeto(empresa(c));
    semLixo(html);
    const esperado = { rotulo: c.rotulo, valor: c.valor || '—' };
    assert.deepEqual({ ...capaProjeto(html) }, esperado);
    assert.deepEqual({ ...tabelaProjeto(html) }, esperado);
  });
}

test('Projeto › empresa inexistente (buscarEmpresa → undefined) não quebra: rótulo de fallback + placeholder', () => {
  const html = relatorioProjeto(undefined);
  semLixo(html);
  assert.deepEqual({ ...capaProjeto(html) }, { rotulo: 'CNPJ', valor: '—' });
  assert.deepEqual({ ...tabelaProjeto(html) }, { rotulo: 'CNPJ', valor: '—' });
});

test('Projeto › a inscrição é a ÚNICA parte que varia: nome, cidade/UF, endereço e demais campos idênticos', () => {
  const normalizar = html => html
    .replace(/(Empresa \/ Cliente<\/td><td>[^<]*<\/td><\/tr>\s*<tr><td class="rpt-capa-td-label">)[^<]*(<\/td><td>)[^<]*/, '$1@@$2@@')
    .replace(/(Empresa \/ Cliente<\/td><td style="text-align:left">[^<]*<\/td><\/tr>\s*<tr><td style="font-weight:600">)[^<]*(<\/td><td style="text-align:left">)[^<]*/, '$1@@$2@@');
  /* a numeração do laudo e a data de emissão dependem só de nome/hoje, fixos entre os casos */
  const saidas = CASOS.map(c => normalizar(relatorioProjeto(empresa(c))));
  for (const s of saidas.slice(1)) assert.equal(s, saidas[0]);
  /* preservados (checagem direta) */
  const html = relatorioProjeto(empresa(CASOS[1]));
  assert.ok(html.includes('Empresa Teste'));
  assert.ok(html.includes('Curitiba/PR'));
  assert.ok(html.includes('Rua A, 1'));
});

test('Projeto › CNPJ válido (legado) equivale ao comportamento anterior: "CNPJ" + valor formatado', () => {
  const html = relatorioProjeto({ id: 'e1', nome: 'N', cnpj: CNPJ });
  assert.ok(html.includes(`<td class="rpt-capa-td-label">CNPJ</td><td>${CNPJ}</td>`));
  assert.ok(html.includes(`<td style="font-weight:600">CNPJ</td><td style="text-align:left">${CNPJ}</td>`));
});
