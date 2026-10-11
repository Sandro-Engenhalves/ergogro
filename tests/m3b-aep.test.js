/* ============================================================
   ErgoGRO — Testes do relatório AEP (GATE 3.M3B)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m3b-aep.test.js

   Regra aprovada para a identificação do cliente no AEP:
     1. empresa ATUAL por av.empresaId (Storage.buscarEmpresa);
     2. se não existir/não puder ser resolvida → snapshot av.empresa (legado);
     3. Inscricao.exibir(empresa resolvida).
   Somente a INSCRIÇÃO usa a empresa atual: nome, data, responsável e registro
   continuam vindo do snapshot av.empresa (semântica histórica preservada).

   Estratégia: carrega o js/modules/aep.js REAL no vm (stubs mínimos) e injeta um
   acessor antes do `return {` final para alcançar _htmlRelatorioAEP.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = { helper: 'js/inscricao.js', aep: 'js/modules/aep.js' };

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

/* Renderiza o relatório AEP REAL.
   { empresaId, atual, snapshot }:
     atual    → o que Storage.buscarEmpresa(empresaId) devolve (null/undefined = não encontrada)
     snapshot → av.empresa (undefined = ausente)
   Devolve { html, consultas } — consultas = ids passados a Storage.buscarEmpresa. */
function renderizar({ empresaId, atual, snapshot }) {
  const consultas = [];
  const av = { id: 'a1', tipo: 'aep', setor: 'Setor X', funcao: 'Função Y', numTrabalhadores: '5',
               aep: { posto: {}, analise: {} }, planoAcao: [], relatorio: {} };
  if (empresaId !== undefined) av.empresaId = empresaId;
  if (snapshot !== undefined) av.empresa = snapshot;

  const ctx = vm.createContext({
    App:          { obterAvaliacaoAtual: () => av },
    Storage:      { buscarEmpresa: id => { consultas.push(id); return atual; } },
    document:     { getElementById: () => null, addEventListener() {} },
    window:       { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  vm.runInContext(ler(ARQ.helper), ctx);
  let fonte = ler(ARQ.aep);
  const i = fonte.lastIndexOf('\n  return {');
  assert.ok(i > 0, 'return final não encontrado em aep.js');
  vm.runInContext(fonte.slice(0, i) + '\n  globalThis.__priv = { _htmlRelatorioAEP };' + fonte.slice(i), ctx);
  return { html: ctx.__priv._htmlRelatorioAEP(), consultas, av };
}

/* Linha de identificação: a <tr> logo após "Empresa / Cliente" na tabela "1. Informações Gerais". */
const RE_LINHA = /<tr><td style="font-weight:600;width:40%">Empresa \/ Cliente<\/td><td>[^<]*<\/td><\/tr>\s*<tr><td style="font-weight:600">([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/;
function linhaInscricao(html) {
  const m = html.match(RE_LINHA);
  assert.ok(m, 'linha de identificação não encontrada em "1. Informações Gerais"');
  return { rotulo: m[1], valor: m[2] };
}

/* Números de teste (públicos/válidos); CNO e CEI distintos para atribuir qualquer engano. */
const CNPJ = '11.222.333/0001-81', CPF = '529.982.247-25', CNO = '12.345.67890/12', CEI = '21.098.76543/21', CAEPF = '12345678901234';
const EMP = {   /* empresas ATUAIS no cadastro */
  cnpj:  { id: 'e1', nome: 'Atual', tipoInscricao: 'cnpj', numeroInscricao: '11222333000181', cnpj: CNPJ },
  cpf:   { id: 'e1', nome: 'Atual', tipoInscricao: 'cpf', numeroInscricao: '52998224725', cnpj: '' },
  cno:   { id: 'e1', nome: 'Atual', tipoInscricao: 'cno', numeroInscricao: '123456789012', cnpj: '' },
  caepf: { id: 'e1', nome: 'Atual', tipoInscricao: 'caepf', numeroInscricao: '12345678901234', cnpj: '' },
  cei:   { id: 'e1', nome: 'Atual', tipoInscricao: 'cei', numeroInscricao: '210987654321', cnpj: '' },
};
/* Snapshot antigo típico de cliente que hoje é CPF/CNO/…: só `cnpj` (vazio), sem tipo/número. */
const SNAP_SEM_CNPJ = { nome: 'Empresa Histórica', cnpj: '', cidade: 'Curitiba', estado: 'PR' };
const SNAP_CNPJ     = { nome: 'Empresa Histórica', cnpj: CNPJ, cidade: 'Curitiba', estado: 'PR' };

/* ═════════════════════════════════════════════════════════════
   1. GUARDA ESTÁTICA (focada em _htmlRelatorioAEP)
   ═════════════════════════════════════════════════════════════ */

test('guarda estática: _htmlRelatorioAEP usa Inscricao.exibir, sem rótulo fixo e sem depender só de av.empresa.cnpj', () => {
  const codigo = semComentarios(extrair(ler(ARQ.aep), '_htmlRelatorioAEP'));
  assert.match(codigo, /Inscricao\.exibir\(/, 'deve usar o helper central');
  assert.match(codigo, /insc\.rotulo/);
  assert.match(codigo, /insc\.valor/);
  assert.doesNotMatch(codigo, /\.cnpj\b/, 'não pode ler .cnpj (snapshot nem empresa) como fonte visual');
  assert.doesNotMatch(codigo, />\s*CNPJ\s*<|CNPJ\s*:/, 'não pode ter rótulo "CNPJ" fixo');
  /* fonte da identificação: empresa atual por empresaId, com fallback no snapshot */
  assert.match(codigo, /Storage\.buscarEmpresa\(av\.empresaId\)/);
  assert.match(codigo, /Inscricao\.exibir\([^;]*\|\|\s*av\.empresa\s*\|\|\s*\{\}\)/, 'fallback: av.empresa e depois {}');
});

test('guarda estática: nome, data, responsável e registro continuam vindo do snapshot av.empresa', () => {
  const codigo = semComentarios(extrair(ler(ARQ.aep), '_htmlRelatorioAEP'));
  for (const trecho of [
    "av.empresa?.nome||'ERG'",                    /* nº do laudo */
    'av.empresa?.responsavelTecnico',
    'av.empresa?.registroProfissional',
    '<td>${av.empresa?.nome || \'—\'}</td>',       /* capa e tabela */
    '_formatarData(av.empresa?.dataAvaliacao)',
  ]) assert.ok(codigo.includes(trecho), `fonte histórica alterada: ${trecho}`);
  /* nenhuma leitura de nome/data/responsável passou para a empresa atual */
  assert.doesNotMatch(codigo, /buscarEmpresa\([^)]*\)\??\.(nome|dataAvaliacao|responsavelTecnico|registroProfissional|cidade|estado|endereco)/);
});

test('guarda estática: cache-busting de aep.js e nenhuma outra página o carrega', () => {
  const idx = ler('index.html');
  assert.equal((idx.match(/js\/modules\/aep\.js\?v=(\w+)/) || [])[1], '13');
  for (const html of ['consulta.html', 'pesquisa.html']) assert.doesNotMatch(ler(html), /modules\/aep\.js/);
});

/* ═════════════════════════════════════════════════════════════
   2. RESOLUÇÃO: empresa atual → fallback snapshot
   ═════════════════════════════════════════════════════════════ */

/* Cada caso: entrada + linha esperada. valor '—' = placeholder. */
const CASOS = [
  /* empresa atual manda (snapshot antigo NÃO tem tipo/número) */
  { nome: 'CNPJ novo via empresa atual',            in: { empresaId: 'e1', atual: EMP.cnpj,  snapshot: SNAP_SEM_CNPJ }, rotulo: 'CNPJ',  valor: CNPJ },
  { nome: 'CPF via empresa atual',                  in: { empresaId: 'e1', atual: EMP.cpf,   snapshot: SNAP_SEM_CNPJ }, rotulo: 'CPF',   valor: CPF },
  { nome: 'CNO via empresa atual',                  in: { empresaId: 'e1', atual: EMP.cno,   snapshot: SNAP_SEM_CNPJ }, rotulo: 'CNO',   valor: CNO },
  { nome: 'CAEPF via empresa atual',                in: { empresaId: 'e1', atual: EMP.caepf, snapshot: SNAP_SEM_CNPJ }, rotulo: 'CAEPF', valor: CAEPF },
  { nome: 'CEI via empresa atual',                  in: { empresaId: 'e1', atual: EMP.cei,   snapshot: SNAP_SEM_CNPJ }, rotulo: 'CEI',   valor: CEI },
  /* CASO A */
  { nome: 'CASO A: snapshot só com CNPJ legado + empresa atual existe → usa a atual',
    in: { empresaId: 'e1', atual: { id: 'e1', cnpj: '22.333.444/0001-81' }, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: '22.333.444/0001-81' },
  /* CASO B: o cenário do bug */
  { nome: 'CASO B: empresa atual CPF + snapshot antigo { nome, cnpj:"" } → mostra CPF',
    in: { empresaId: 'e1', atual: EMP.cpf, snapshot: { nome: 'Empresa Histórica', cnpj: '' } }, rotulo: 'CPF', valor: CPF },
  /* CASO C */
  { nome: 'CASO C: empresaId ausente → usa o snapshot',
    in: { atual: EMP.cpf, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  { nome: 'CASO C: empresaId null → usa o snapshot',
    in: { empresaId: null, atual: EMP.cpf, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  { nome: 'CASO C: empresaId "" → usa o snapshot',
    in: { empresaId: '', atual: EMP.cpf, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  /* CASO D */
  { nome: 'CASO D: buscarEmpresa → null → usa o snapshot',
    in: { empresaId: 'e1', atual: null, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  { nome: 'CASO D: buscarEmpresa → undefined → usa o snapshot',
    in: { empresaId: 'e1', atual: undefined, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  /* CASO E */
  { nome: 'CASO E: snapshot legado com CNPJ válido (fallback) → CNPJ',
    in: { empresaId: 'e1', atual: null, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: CNPJ },
  { nome: 'CASO E: snapshot legado com CNPJ sem máscara (fallback) → CNPJ formatado',
    in: { empresaId: 'e1', atual: null, snapshot: { nome: 'H', cnpj: '11222333000181' } }, rotulo: 'CNPJ', valor: CNPJ },
  /* CASO F */
  { nome: 'CASO F: snapshot legado com DV inválido (fallback) → não oculta',
    in: { empresaId: 'e1', atual: null, snapshot: { nome: 'H', cnpj: '11.222.333/0001-99' } }, rotulo: 'CNPJ', valor: '11.222.333/0001-99' },
  { nome: 'CASO F: snapshot legado não normalizável abc@# (fallback) → não oculta',
    in: { empresaId: 'e1', atual: null, snapshot: { nome: 'H', cnpj: 'abc@#' } }, rotulo: 'CNPJ', valor: 'abc@#' },
  { nome: 'CASO F: atual legado não normalizável (empresa atual) → não oculta',
    in: { empresaId: 'e1', atual: { id: 'e1', cnpj: 'abc@#' }, snapshot: SNAP_SEM_CNPJ }, rotulo: 'CNPJ', valor: 'abc@#' },
  /* CASO G: vazios e ausentes */
  { nome: 'CASO G: empresa atual vazia + snapshot vazio → placeholder',
    in: { empresaId: 'e1', atual: { id: 'e1', nome: 'A', cnpj: '' }, snapshot: SNAP_SEM_CNPJ }, rotulo: 'CNPJ', valor: '—' },
  { nome: 'CASO G: empresa atual tipada (CPF) sem número → "CPF: —"',
    in: { empresaId: 'e1', atual: { id: 'e1', tipoInscricao: 'cpf', numeroInscricao: '', cnpj: '' }, snapshot: SNAP_SEM_CNPJ }, rotulo: 'CPF', valor: '—' },
  { nome: 'CASO G: sem empresa atual e snapshot vazio → placeholder',
    in: { empresaId: 'e1', atual: null, snapshot: SNAP_SEM_CNPJ }, rotulo: 'CNPJ', valor: '—' },
  { nome: 'CASO G: snapshot vazio ({}) e empresaId ausente → placeholder',
    in: { snapshot: {} }, rotulo: 'CNPJ', valor: '—' },
  { nome: 'CASO G: snapshot ausente (undefined) e empresaId ausente → placeholder',
    in: {}, rotulo: 'CNPJ', valor: '—' },
  { nome: 'CASO G: snapshot null e empresa atual inexistente → placeholder',
    in: { empresaId: 'e1', atual: null, snapshot: null }, rotulo: 'CNPJ', valor: '—' },
  /* regra aprovada: empresa atual manda, mesmo quando sua inscrição está vazia */
  { nome: 'regra aprovada: empresa atual existe com inscrição vazia → NÃO recorre ao snapshot com CNPJ',
    in: { empresaId: 'e1', atual: { id: 'e1', nome: 'A', cnpj: '' }, snapshot: SNAP_CNPJ }, rotulo: 'CNPJ', valor: '—' },
];

for (const c of CASOS) {
  test(`AEP › ${c.nome}`, () => {
    const { html } = renderizar(c.in);
    semLixo(html);
    assert.deepEqual({ ...linhaInscricao(html) }, { rotulo: c.rotulo, valor: c.valor });
    assert.doesNotMatch(html, /<td style="font-weight:600">\s*:/);
  });
}

test('AEP › empresaId ausente NÃO consulta o cadastro; empresaId presente consulta exatamente esse id', () => {
  assert.deepEqual(renderizar({ atual: EMP.cpf, snapshot: SNAP_CNPJ }).consultas, []);
  assert.deepEqual(renderizar({ empresaId: null, atual: EMP.cpf, snapshot: SNAP_CNPJ }).consultas, []);
  assert.deepEqual(renderizar({ empresaId: 'e1', atual: EMP.cpf, snapshot: SNAP_CNPJ }).consultas, ['e1']);
});

test('AEP › CNPJ legado válido (mascarado): linha idêntica ao formato anterior', () => {
  const { html } = renderizar({ empresaId: 'e1', atual: null, snapshot: SNAP_CNPJ });
  assert.ok(html.includes(`<tr><td style="font-weight:600">CNPJ</td><td>${CNPJ}</td></tr>`));
});

/* ═════════════════════════════════════════════════════════════
   3. REGRESSÃO — demais campos continuam no snapshot
   ═════════════════════════════════════════════════════════════ */

const SNAP_HIST = { nome: 'Histórica Ltda', cnpj: '', cidade: 'Cidade Histórica', estado: 'PR', dataAvaliacao: '2025-03-10',
                    responsavelTecnico: 'RT Histórico', registroProfissional: 'CREA-HIST', cargo: 'Cargo Histórico' };
const ATUAL_DIF = { id: 'e1', nome: 'Atual SA', tipoInscricao: 'cpf', numeroInscricao: '52998224725', cnpj: '',
                    cidade: 'Cidade Atual', estado: 'SP', endereco: 'Rua Atual, 99',
                    responsavelTecnico: 'RT Atual', registroProfissional: 'CREA-ATUAL', cargo: 'Cargo Atual' };

test('AEP › REGRESSÃO: nome, data, responsável e registro seguem do snapshot; empresa atual só fornece a inscrição', () => {
  const { html } = renderizar({ empresaId: 'e1', atual: ATUAL_DIF, snapshot: SNAP_HIST });
  /* inscrição: da empresa atual */
  assert.deepEqual({ ...linhaInscricao(html) }, { rotulo: 'CPF', valor: CPF });
  /* histórico preservado nos lugares de sempre */
  assert.ok(html.includes('<td class="rpt-capa-td-label">Empresa / Cliente</td><td>Histórica Ltda</td>'), 'capa: nome');
  assert.ok(html.includes('<td style="font-weight:600;width:40%">Empresa / Cliente</td><td>Histórica Ltda</td>'), 'tabela: nome');
  assert.ok(html.includes('Histórica Ltda · 10/03/2025'), 'cabeçalho: nome + data');
  assert.ok(html.includes('<td style="font-weight:600">Data da Avaliação</td><td>10/03/2025</td>'), 'tabela: data');
  assert.ok(html.includes('<td style="font-weight:600">Responsável Técnico</td><td>RT Histórico</td>'), 'tabela: responsável');
  assert.ok(html.includes('<td style="font-weight:600">Registro Profissional</td><td>CREA-HIST</td>'), 'tabela: registro');
  assert.ok(html.includes('AEP-HIST-'), 'nº do laudo derivado do nome do snapshot');
  /* nenhum valor atual da empresa vazou para o relatório */
  for (const atual of ['Atual SA', 'Cidade Atual', 'Rua Atual', 'RT Atual', 'CREA-ATUAL', 'Cargo Atual', 'AEP-ATUA-']) {
    assert.ok(!html.includes(atual), `valor atual vazou para o relatório: ${atual}`);
  }
});

test('AEP › REGRESSÃO: a inscrição é a ÚNICA parte do HTML que varia entre os casos', () => {
  const normalizar = html => html.replace(RE_LINHA, (m, r, v) => m.replace(`<td style="font-weight:600">${r}</td><td>${v}</td>`, '<td style="font-weight:600">@@</td><td>@@</td>'));
  const saidas = CASOS.map(c => {
    /* snapshot histórico idêntico em todos; só a inscrição (empresa atual / snapshot.cnpj) muda */
    const entrada = { ...c.in, snapshot: c.in.snapshot === undefined ? undefined : c.in.snapshot === null ? null : { ...SNAP_HIST, cnpj: c.in.snapshot.cnpj } };
    return normalizar(renderizar(entrada).html);
  }).filter((_, i) => CASOS[i].in.snapshot);   /* só casos com snapshot: mesmo nome/data/responsável */
  assert.ok(saidas.length > 10);
  for (const s of saidas.slice(1)) assert.equal(s, saidas[0]);
});

test('AEP › a empresa e o snapshot recebidos não são alterados (nada é gravado ou regravado)', () => {
  const atual = JSON.parse(JSON.stringify(ATUAL_DIF)), snap = JSON.parse(JSON.stringify(SNAP_HIST));
  const { av } = renderizar({ empresaId: 'e1', atual, snapshot: snap });
  assert.deepEqual(atual, ATUAL_DIF);
  assert.deepEqual(snap, SNAP_HIST);
  assert.deepEqual(JSON.parse(JSON.stringify(av.empresa)), SNAP_HIST);   /* av.empresa continua exatamente o snapshot */
  assert.equal(av.empresa.tipoInscricao, undefined);
  assert.equal(av.empresa.numeroInscricao, undefined);
});
