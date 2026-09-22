/* ============================================================
   ErgoGRO — Testes da identificação NOMINAL da empresa na AET (GATE 3.M3C)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m3c-aet-nome.test.js

   Bug corrigido: aet.js lia emp.razaoSocial / emp.nomeFantasia — campos que nenhum
   código grava (o modelo real é emp.nome; a BrasilAPI alimenta emp.nome). Corrigidos:
     A) formulário (campo "Empresa")      B) capa do relatório      C) tabela "1. Identificação"

   DECISÃO DELIBERADA (privacidade, GATE 3.V1): _ctxBase() — contexto dos PROMPTS DE IA —
   mantém o fallback literal 'empresa'. O nome real do cliente NÃO deve ser enviado à API
   externa de IA; portanto emp.razaoSocial/nomeFantasia ali NÃO são um bug pendente e NÃO
   devem ser trocados por emp.nome. Os testes do fim deste arquivo travam essa decisão.
   Não existe nome de arquivo derivado da empresa na AET (exportarJSON usa av.codigo/av.id).
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = { helper: 'js/inscricao.js', aet: 'js/modules/aet.js' };

/* ── Utilitários ──────────────────────────────────────────── */

function extrair(fonte, nome) {
  const ini = fonte.search(new RegExp(`^  (async )?function ${nome}\\(`, 'm'));
  assert.notEqual(ini, -1, `função ${nome} não encontrada`);
  const resto = fonte.slice(ini + 1);
  const fim = resto.search(/^  (async )?function \w+\(|^  return \{|^\}\)\(\)/m);
  return fonte.slice(ini, fim === -1 ? undefined : ini + 1 + fim);
}
const semComentarios = fonte => fonte.replace(/\/\*[\s\S]*?\*\//g, '');
const semLixo = html => assert.ok(!/undefined|null|NaN|\[object/.test(html), 'HTML contém undefined/null/NaN/[object]');

/* Carrega o aet.js REAL no vm e devolve as funções privadas pedidas. */
function carregarAET(emp, nomes = ['_htmlIdentificacao', '_htmlRelatorio'], extra = {}) {
  const av = { empresaId: 'e1', setorId: 's1', funcaoId: 'f1', projetoId: 'p1', aet: {} };
  const ctx = vm.createContext({
    App:      { obterAvaliacaoAtual: () => av, mostrarToast() {} },
    Storage:  { buscarEmpresa: () => emp, buscarSetor: () => ({ nome: 'Setor A' }), buscarFuncao: () => ({ nome: 'Função B' }), buscarProjeto: () => ({}), salvar() {} },
    document: { getElementById: () => null },
    ...extra,
  });
  vm.runInContext(ler(ARQ.helper), ctx);
  let fonte = ler(ARQ.aet);
  const i = fonte.lastIndexOf('\n  return {');
  assert.ok(i > 0, 'return final não encontrado em aet.js');
  vm.runInContext(fonte.slice(0, i) + `\n  globalThis.__priv = { ${nomes.join(', ')} };` + fonte.slice(i), ctx);
  return ctx.__priv;
}

/* Extratores do nome nas três superfícies. */
const nomeForm  = html => { const m = html.match(/<label class="form-label">Empresa<\/label>\s*<input class="form-input" value="([^"]*)" disabled>/); assert.ok(m, 'campo Empresa não encontrado'); return m[1]; };
const nomeCapa  = html => { const m = html.match(/<div class="rel-capa-empresa">([^<]*)<\/div>/); assert.ok(m, 'capa: empresa não encontrada'); return m[1]; };
const nomeTab   = html => { const m = html.match(/<tr><td><strong>Empresa<\/strong><\/td><td>([^<]*)<\/td><td><strong>[^<]*<\/strong><\/td><td>[^<]*<\/td><\/tr>/); assert.ok(m, 'tabela: empresa não encontrada'); return m[1]; };

/* Extratores da inscrição (idênticos aos da M3A). */
const inscForm = html => { const m = html.match(/<label class="form-label">Empresa<\/label>\s*<input[^>]*>\s*<\/div>\s*<div class="form-grupo">\s*<label class="form-label">([^<]*)<\/label>\s*<input class="form-input" value="([^"]*)" disabled>/); assert.ok(m); return [m[1], m[2]]; };
const inscCapa = html => { const l = [...html.matchAll(/rel-capa-detalhe">([^<]*)<\/div>/g)].map(m => m[1]).filter(t => /^(CNPJ|CPF|CNO|CAEPF|CEI): /.test(t)); assert.equal(l.length, 1); return l[0]; };
const inscTab  = html => { const m = html.match(/<tr><td><strong>Empresa<\/strong><\/td><td>[^<]*<\/td><td><strong>([^<]*)<\/strong><\/td><td>([^<]*)<\/td><\/tr>/); assert.ok(m); return [m[1], m[2]]; };

/* ═════════════════════════════════════════════════════════════
   1. GUARDA ESTÁTICA
   ═════════════════════════════════════════════════════════════ */

for (const fn of ['_htmlIdentificacao', '_htmlRelatorio']) {
  test(`guarda estática: aet.js › ${fn} lê o nome de emp.nome e não de razaoSocial/nomeFantasia`, () => {
    const codigo = semComentarios(extrair(ler(ARQ.aet), fn));
    assert.doesNotMatch(codigo, /razaoSocial|nomeFantasia/);
    assert.match(codigo, /emp\.nome/);
  });
}

test('guarda estática: a inscrição continua via Inscricao.exibir nas mesmas funções (M3A intacta)', () => {
  for (const fn of ['_htmlIdentificacao', '_htmlRelatorio']) {
    const codigo = semComentarios(extrair(ler(ARQ.aet), fn));
    assert.match(codigo, /Inscricao\.exibir\(emp\)/);
    assert.match(codigo, /insc\.rotulo/);
    assert.match(codigo, /insc\.valor/);
    assert.doesNotMatch(codigo, /\.cnpj\b/);
  }
});

test('guarda estática: NÃO existe nome de arquivo derivado da empresa na AET (exportarJSON usa av.codigo/av.id)', () => {
  const exp = semComentarios(extrair(ler(ARQ.aet), 'exportarJSON'));
  assert.match(exp, /a\.download\s*=\s*`aet_\$\{\(av\.codigo \|\| av\.id \|\| 'export'\)/);
  assert.doesNotMatch(exp, /emp\b|empresa|nome/i);
});

test('guarda estática: cache-busting de aet.js (novo bump, distinto da M3A) e nenhuma outra página o carrega', () => {
  const idx = ler('index.html');
  const v = (idx.match(/js\/modules\/aet\.js\?v=(\w+)/) || [])[1];
  assert.equal(v, '9');
  assert.notEqual(v, '8', 'não reutilizar a versão da M3A');
  for (const html of ['consulta.html', 'pesquisa.html']) assert.doesNotMatch(ler(html), /modules\/aet\.js/);
});

/* ═════════════════════════════════════════════════════════════
   2. COMPORTAMENTO: formulário, capa e tabela
   ═════════════════════════════════════════════════════════════ */

const CNPJ = '11.222.333/0001-81';

test('AET › nome preenchido aparece no formulário, na capa e na tabela', () => {
  const aet = carregarAET({ id: 'e1', nome: 'Indústria Alfa Ltda.', cnpj: CNPJ });
  const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
  semLixo(form); semLixo(rel);
  assert.equal(nomeForm(form), 'Indústria Alfa Ltda.');
  assert.equal(nomeCapa(rel), 'Indústria Alfa Ltda.');
  assert.equal(nomeTab(rel), 'Indústria Alfa Ltda.');
});

test('AET › nome com espaços e caracteres especiais é exibido como está (sem transformação)', () => {
  const nome = 'Ação  &  Cia — Filial 2';
  const aet = carregarAET({ id: 'e1', nome, cnpj: CNPJ });
  const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
  assert.equal(nomeForm(form), nome);
  assert.equal(nomeCapa(rel), nome);
  assert.equal(nomeTab(rel), nome);
});

/* Fallbacks visuais preservados: formulário '' | capa 'Empresa não identificada' | tabela '—'. */
const SEM_NOME = [
  ['nome vazio ("")',        { id: 'e1', nome: '', cnpj: CNPJ }],
  ['nome ausente',           { id: 'e1', cnpj: CNPJ }],
  ['nome null',              { id: 'e1', nome: null, cnpj: CNPJ }],
  ['empresa null (→ {})',    null],
  ['empresa undefined',      undefined],
];
for (const [rotulo, emp] of SEM_NOME) {
  test(`AET › ${rotulo}: fallbacks preservados (formulário vazio / capa "Empresa não identificada" / tabela "—")`, () => {
    const aet = carregarAET(emp);
    const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
    semLixo(form); semLixo(rel);
    assert.equal(nomeForm(form), '');
    assert.equal(nomeCapa(rel), 'Empresa não identificada');
    assert.equal(nomeTab(rel), '—');
  });
}

test('AET › razaoSocial/nomeFantasia deixaram de ser lidos (mesmo presentes, nome vem de emp.nome)', () => {
  const aet = carregarAET({ id: 'e1', nome: 'Nome Real', razaoSocial: 'Razão X', nomeFantasia: 'Fantasia Y', cnpj: CNPJ });
  const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
  for (const html of [form, rel]) { assert.ok(!html.includes('Razão X')); assert.ok(!html.includes('Fantasia Y')); }
  assert.equal(nomeForm(form), 'Nome Real');
  assert.equal(nomeCapa(rel), 'Nome Real');
  assert.equal(nomeTab(rel), 'Nome Real');
  /* sem emp.nome, razaoSocial/nomeFantasia NÃO são fallback (nunca foram gravados) */
  const semNome = carregarAET({ id: 'e1', razaoSocial: 'Razão X', nomeFantasia: 'Fantasia Y', cnpj: CNPJ });
  assert.equal(nomeCapa(semNome._htmlRelatorio()), 'Empresa não identificada');
});

/* ═════════════════════════════════════════════════════════════
   3. REGRESSÃO — a correção do nome não altera inscrição nem demais campos
   ═════════════════════════════════════════════════════════════ */

const EMPRESAS = [
  { rotulo: 'CNPJ',  valor: CNPJ,             emp: { tipoInscricao: 'cnpj', numeroInscricao: '11222333000181', cnpj: CNPJ } },
  { rotulo: 'CPF',   valor: '529.982.247-25', emp: { tipoInscricao: 'cpf', numeroInscricao: '52998224725', cnpj: '' } },
  { rotulo: 'CNO',   valor: '12.345.67890/12', emp: { tipoInscricao: 'cno', numeroInscricao: '123456789012', cnpj: '' } },
  { rotulo: 'CAEPF', valor: '12345678901234', emp: { tipoInscricao: 'caepf', numeroInscricao: '12345678901234', cnpj: '' } },
  { rotulo: 'CEI',   valor: '21.098.76543/21', emp: { tipoInscricao: 'cei', numeroInscricao: '210987654321', cnpj: '' } },
  { rotulo: 'CNPJ',  valor: CNPJ,             emp: { cnpj: CNPJ } },                              /* legado */
  { rotulo: 'CNPJ',  valor: '',               emp: { cnpj: '' } },                                /* vazio  */
  { rotulo: 'CNPJ',  valor: '11.222.333/0001-99', emp: { cnpj: '11.222.333/0001-99' } },        /* DV inválido */
  { rotulo: 'CNPJ',  valor: 'abc@#',          emp: { cnpj: 'abc@#' } },                          /* não normalizável */
];

test('AET › REGRESSÃO: tipo/número da inscrição idênticos com ou sem nome (formulário, capa e tabela)', () => {
  for (const c of EMPRESAS) {
    for (const nome of ['Empresa Teste', '', undefined]) {
      const aet = carregarAET({ id: 'e1', ...(nome === undefined ? {} : { nome }), ...c.emp });
      const form = aet._htmlIdentificacao(), rel = aet._htmlRelatorio();
      assert.deepEqual(inscForm(form), [c.rotulo, c.valor], `form ${c.rotulo} nome=${nome}`);
      assert.equal(inscCapa(rel), `${c.rotulo}: ${c.valor || '—'}`, `capa ${c.rotulo} nome=${nome}`);
      assert.deepEqual(inscTab(rel), [c.rotulo, c.valor || '—'], `tabela ${c.rotulo} nome=${nome}`);
    }
  }
});

test('AET › REGRESSÃO: o nome é a ÚNICA parte do HTML que varia — todos os demais campos permanecem idênticos', () => {
  /* neutraliza só os três fragmentos do nome; o resto (inscrição, setor, função, seções…) deve ser igual */
  const neutro = html => html
    .replace(/(<label class="form-label">Empresa<\/label>\s*<input class="form-input" value=")[^"]*(" disabled>)/, '$1@@$2')
    .replace(/(<div class="rel-capa-empresa">)[^<]*(<\/div>)/, '$1@@$2')
    .replace(/(<tr><td><strong>Empresa<\/strong><\/td><td>)[^<]*(<\/td>)/, '$1@@$2');
  for (const c of EMPRESAS) {
    const saidas = ['Empresa Teste', 'Outro Nome S/A', '', undefined].map(nome => {
      const aet = carregarAET({ id: 'e1', ...(nome === undefined ? {} : { nome }), ...c.emp });
      return [neutro(aet._htmlIdentificacao()), neutro(aet._htmlRelatorio())];
    });
    for (const s of saidas.slice(1)) assert.deepEqual(s, saidas[0], `${c.rotulo}`);
  }
});

/* ═════════════════════════════════════════════════════════════
   4. OCORRÊNCIA D — _ctxBase (contexto dos prompts de IA): NÃO ALTERADA
   ═════════════════════════════════════════════════════════════ */

/* DECISÃO DELIBERADA (privacidade): _ctxBase() alimenta PROMPTS enviados à IA (API externa) e
   mantém o fallback genérico 'empresa'. Não é superfície visual nem bug pendente: o nome real
   do cliente não deve ser acrescentado aos prompts. Mudar isso exige nova decisão explícita. */
test('AET › [decisão deliberada] _ctxBase mantém o fallback genérico "empresa": nome real do cliente NÃO vai aos prompts de IA', async () => {
  /* 1) _ctxBase e seu código-fonte */
  const base = carregarAET({ id: 'e1', nome: 'Nome Real', cnpj: CNPJ }, ['_ctxBase']);
  const ctxBase = base._ctxBase();
  assert.equal(ctxBase.empresa, 'empresa');
  assert.equal(ctxBase.emp.nome, 'Nome Real');    /* o objeto continua disponível */
  const codigo = semComentarios(extrair(ler(ARQ.aet), '_ctxBase'));
  assert.match(codigo, /emp\.razaoSocial \|\| emp\.nomeFantasia \|\| 'empresa'/);
  assert.doesNotMatch(codigo, /emp\.nome\b/, '_ctxBase não pode passar a usar emp.nome');

  /* 2) os 9 prompts REAIS enviados à IA (uma chamada por função que usa _ctxBase) */
  const CLIENTE = 'Cliente Sigiloso Ltda';
  const prompts = [];
  const el = () => ({ value: '', disabled: false, textContent: '', innerHTML: '' });
  const aet = carregarAET(
    { id: 'e1', nome: CLIENTE, tipoInscricao: 'cpf', numeroInscricao: '52998224725', cnpj: '', razaoSocial: '', nomeFantasia: '' },
    ['gerarSinteseDemandaIA', 'gerarCaracterizacaoIA', 'gerarComparacaoAtividadeIA', 'gerarAnaliseExigenciasIA',
     'sugerirFerramentasIA', 'interpretarToolIA', 'gerarDiagnosticoIA', 'gerarRecomendacoesIA', 'gerarConclusaoAETIA'],
    {
      document:     { getElementById: () => el() },
      ClaudeVision: { temChave: () => true, solicitarChaveParaChamada() {}, gerarTextoIA: async prompt => { prompts.push(prompt); return 'texto'; } },
    });
  aet.gerarSinteseDemandaIA();  aet.gerarCaracterizacaoIA();  aet.gerarComparacaoAtividadeIA();
  aet.gerarAnaliseExigenciasIA(); aet.sugerirFerramentasIA();  aet.interpretarToolIA('rula');
  aet.gerarDiagnosticoIA();     aet.gerarRecomendacoesIA();    aet.gerarConclusaoAETIA();
  await new Promise(r => setImmediate(r));   /* deixa as promessas dos _iaExec chamarem gerarTextoIA */

  assert.equal(prompts.length, 9, 'esperava 9 prompts (uma chamada por função de IA que usa _ctxBase)');
  for (const p of prompts) {
    assert.ok(/Empresa: empresa \| Setor: Setor A \| Função: Função B/.test(p), `fallback genérico ausente: ${p.slice(0, 120)}`);
    for (const proibido of [CLIENTE, 'Sigiloso', '52998224725', '529.982.247-25', 'CPF']) {
      assert.ok(!p.includes(proibido), `prompt de IA contém dado do cliente: ${proibido}`);
    }
  }
});
