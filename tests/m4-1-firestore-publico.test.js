/* ============================================================
   ErgoGRO — Testes do portão de privacidade no Firestore público (GATE 3.M4.1)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m4-1-firestore-publico.test.js

   Decisão de política aprovada (GATE 3.M4.D → 3.M4.1):
     empresaCnpj, nos DOIS destinos públicos gravados por _criarTokenProjeto
     (doc individual em ergogro_consultas_aep e item de
     ergogro_grupos_aep.projetos[]), passa a vir de Inscricao.publico(emp) em
     vez de emp?.cnpj cru. Só CNPJ com DV válido é publicado; CPF, CNO, CAEPF,
     CEI e CNPJ inválido/não normalizável viram ''. _criarOuAtualizar (link
     único/por setor) continua SEM o campo empresaCnpj — não foi tocado.

   Estratégia: roda o consulta-aep.js REAL no vm (helper Inscricao real
   carregado junto), com Firestore/Storage simulados, e inspeciona tudo que
   seria gravado nas duas coleções públicas.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = { helper: 'js/inscricao.js', consulta: 'js/consulta-aep.js' };

/* ── Utilitários de guarda estática (mesmo padrão dos arquivos anteriores) ── */

function extrair(fonte, nome) {
  const ini = fonte.search(new RegExp(`^  (async )?function ${nome}\\(`, 'm'));
  assert.notEqual(ini, -1, `função ${nome} não encontrada`);
  const resto = fonte.slice(ini + 1);
  const fim = resto.search(/^  (async )?function \w+\(|^  return \{|^\}\)\(\)/m);
  return fonte.slice(ini, fim === -1 ? undefined : ini + 1 + fim);
}
const semComentarios = fonte => fonte.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── Harness: roda abrirConsultaGrupo (que chama _criarTokenProjeto) com o
   consulta-aep.js REAL, para UMA empresa, e devolve os dois destinos públicos
   gravados: o doc individual (ergogro_consultas_aep) e o item dentro do doc
   de grupo (ergogro_grupos_aep.projetos[0]). Nada é escrito de verdade — o
   Firestore é um stub em memória local. ── */
async function rodarUm(emp, { projetoId = 'p1', empresaId = emp?.id ?? null } = {}) {
  const gravacoes = [];
  const ctx = vm.createContext({
    window:   { location: { origin: 'https://exemplo.test', pathname: '/index.html' } },
    document: { getElementById: () => null, body: { insertAdjacentHTML() {} } },
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
      buscarProjeto:    id => (id === projetoId ? { id: projetoId, empresaId } : null),
      buscarEmpresa:    id => (emp && id === empresaId ? emp : null),
      listarPorProjeto: () => [{ id: 'av1', setorId: 's1', funcaoId: 'f1' }],
      buscarSetor:      () => ({ nome: 'Setor' }),
      buscarFuncao:     () => ({ nome: 'Função' }),
    },
    ModuloAEP: { ORDEM_BLOCOS: ['a'], BLOCOS: { a: { titulo: 'T', icone: 'i', itens: [{ id: 'a01', texto: 'x' }] } } },
  });
  vm.runInContext(ler(ARQ.helper), ctx);
  vm.runInContext(ler(ARQ.consulta), ctx);
  await vm.runInContext('ConsultaAEP', ctx).abrirConsultaGrupo('rh', [projetoId]);

  const docIndividual = gravacoes.find(g => g.col === 'ergogro_consultas_aep');
  const docGrupo      = gravacoes.find(g => g.col === 'ergogro_grupos_aep');
  return {
    gravacoes,
    docIndividual: docIndividual?.dados,
    itemGrupo:     docGrupo?.dados?.projetos?.[0],
  };
}

/* Números de teste (públicos/válidos). CNO e CEI distintos entre si. */
const CNPJ_NUM = '11222333000181', CNPJ_MASC = '11.222.333/0001-81';
const CNPJ_INVALIDO_MASC = '11.222.333/0001-99';   /* DV errado */
const CPF_NUM = '52998224725', CNO_NUM = '123456789012', CAEPF_NUM = '12345678901234', CEI_NUM = '210987654321';

/* Cada caso: empresa + empresaCnpj público esperado (idêntico ao que
   Inscricao.publico(emp) devolveria — conferido também por asserção direta). */
const CASOS = [
  { nome: 'CNPJ novo válido (tipo+número)', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cnpj', numeroInscricao: CNPJ_NUM, cnpj: CNPJ_MASC }, esperado: CNPJ_MASC },
  { nome: 'CNPJ legado válido (mascarado)', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_MASC }, esperado: CNPJ_MASC },
  { nome: 'CNPJ legado válido (sem máscara)', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_NUM }, esperado: CNPJ_MASC },
  { nome: 'CNPJ com DV inválido', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_INVALIDO_MASC }, esperado: '' },
  { nome: 'CNPJ legado não normalizável (abc@#)', emp: { id: 'e1', nome: 'Emp', cnpj: 'abc@#' }, esperado: '' },
  { nome: 'CPF', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' }, esperado: '' },
  { nome: 'CNO', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' }, esperado: '' },
  { nome: 'CAEPF', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' }, esperado: '' },
  { nome: 'CEI', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cei', numeroInscricao: CEI_NUM, cnpj: '' }, esperado: '' },
  { nome: 'inscrição vazia (legado)', emp: { id: 'e1', nome: 'Emp', cnpj: '' }, esperado: '' },
  { nome: 'inscrição vazia (tipo cpf declarado, número vazio)', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: '', cnpj: '' }, esperado: '' },
];

const CHAVES_PROJETO_PUBLICO = ['projetoId', 'token', 'empresaNome', 'empresaCnpj', 'funcoes', 'totalItens'];
const CHAVES_DOC_CONSULTA = ['token', 'projetoId', 'perfil', 'perfilLabel', 'empresaNome', 'empresaCnpj', 'funcoes', 'totalItens',
  'status', 'criadaEm', 'atualizadaEm', 'respondidaEm', 'respondidoPor', 'respostas'];

/* ═════════════════════════════════════════════════════════════
   1. GUARDA ESTÁTICA
   ═════════════════════════════════════════════════════════════ */

test('guarda estática: _criarTokenProjeto usa Inscricao.publico(emp) para empresaCnpj', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_criarTokenProjeto'));
  assert.match(codigo, /Inscricao\.publico\(emp\)/, 'deve calcular empresaCnpj via Inscricao.publico(emp)');
  /* empresaCnpj não pode mais ler emp?.cnpj cru (nem no ref.set, nem no retorno publico) */
  assert.doesNotMatch(codigo, /empresaCnpj:\s*emp\?\.cnpj/, 'não pode usar emp?.cnpj cru como origem de empresaCnpj');
});

test('guarda estática: Inscricao.publico é chamado uma única vez (valor calculado e reaproveitado)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_criarTokenProjeto'));
  const usos = codigo.match(/Inscricao\.publico\(/g) || [];
  assert.equal(usos.length, 1, `esperava 1 chamada a Inscricao.publico, achou ${usos.length}`);
});

test('guarda estática: o payload PÚBLICO não usa Inscricao.exibir (isso é só para o objeto local)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_criarTokenProjeto'));
  const blocoPublico = codigo.match(/publico:\s*\{[^}]*\}/);
  assert.ok(blocoPublico, 'bloco "publico: {...}" não encontrado no retorno');
  assert.doesNotMatch(blocoPublico[0], /Inscricao\.exibir/, 'Inscricao.exibir não pode aparecer no objeto publico');
  /* Inscricao.exibir segue existindo, mas só dentro do objeto local */
  assert.match(codigo, /local:\s*\{\s*inscricao:\s*Inscricao\.exibir\(emp\)\s*\}/);
});

test('guarda estática: _criarOuAtualizar continua sem empresaCnpj (não tocado)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_criarOuAtualizar'));
  assert.doesNotMatch(codigo, /empresaCnpj/, '_criarOuAtualizar não deve gravar empresaCnpj');
  assert.doesNotMatch(codigo, /Inscricao\./, '_criarOuAtualizar não deve usar o helper Inscricao');
});

test('guarda estática: cache-busting de consulta-aep.js coerente em index.html e consulta.html', () => {
  const idx = ler('index.html'), cons = ler('consulta.html');
  const v = html => (html.match(/consulta-aep\.js\?v=(\w+)/) || [])[1];
  /* consulta-aep.js foi bumpado de novo no M4.2; aqui basta exigir que os dois HTMLs
     continuam coerentes entre si e que saiu da versão do M2 (o valor exato atual é
     verificado em tests/m4-2-whatsapp-consulta.test.js). */
  assert.equal(v(idx), v(cons), 'index.html e consulta.html devem carregar a mesma versão');
  assert.notEqual(v(idx), '2', 'não reutilizar a versão anterior (M2)');
});

/* ═════════════════════════════════════════════════════════════
   2. COMPORTAMENTO — empresaCnpj nos DOIS destinos públicos
   ═════════════════════════════════════════════════════════════ */

for (const c of CASOS) {
  test(`empresaCnpj › ${c.nome}: "${c.esperado}" nos dois destinos públicos`, async () => {
    const { docIndividual, itemGrupo } = await rodarUm(c.emp);
    assert.ok(docIndividual, 'doc individual (ergogro_consultas_aep) não foi gravado');
    assert.ok(itemGrupo, 'item do grupo (ergogro_grupos_aep.projetos[0]) não foi gravado');
    assert.equal(docIndividual.empresaCnpj, c.esperado, 'doc individual');
    assert.equal(itemGrupo.empresaCnpj, c.esperado, 'item do grupo');
  });
}

test('empresaCnpj › empresa null/ausente (empresaId sem correspondência): "" nos dois destinos', async () => {
  const { docIndividual, itemGrupo } = await rodarUm(null, { empresaId: 'inexistente' });
  assert.equal(docIndividual.empresaCnpj, '');
  assert.equal(itemGrupo.empresaCnpj, '');
});

test('empresaCnpj › projeto sem empresaId (empresaId null): "" nos dois destinos', async () => {
  const { docIndividual, itemGrupo } = await rodarUm(null, { empresaId: null });
  assert.equal(docIndividual.empresaCnpj, '');
  assert.equal(itemGrupo.empresaCnpj, '');
});

/* ═════════════════════════════════════════════════════════════
   3. CONTRATO — chaves públicas inalteradas
   ═════════════════════════════════════════════════════════════ */

test('contrato de chaves: doc individual (ergogro_consultas_aep) mantém exatamente as mesmas chaves de antes', async () => {
  const { docIndividual } = await rodarUm(CASOS[0].emp);
  assert.deepEqual(Object.keys(docIndividual), CHAVES_DOC_CONSULTA);
});

test('contrato de chaves: item do grupo (projetos[]) mantém exatamente as mesmas chaves de antes', async () => {
  const { itemGrupo } = await rodarUm(CASOS[0].emp);
  assert.deepEqual(Object.keys(itemGrupo), CHAVES_PROJETO_PUBLICO);
});

test('contrato de chaves: vale para todos os 11 cenários, incluindo os que zeram empresaCnpj', async () => {
  for (const c of CASOS) {
    const { docIndividual, itemGrupo } = await rodarUm(c.emp);
    assert.deepEqual(Object.keys(docIndividual), CHAVES_DOC_CONSULTA, c.nome);
    assert.deepEqual(Object.keys(itemGrupo), CHAVES_PROJETO_PUBLICO, c.nome);
  }
});

/* ═════════════════════════════════════════════════════════════
   4. AUSÊNCIA DE OUTROS IDENTIFICADORES NO PAYLOAD PÚBLICO
   ═════════════════════════════════════════════════════════════ */

test('CPF/CNO/CAEPF/CEI não aparecem em NENHUMA forma no payload público (número cru, máscara, tipoInscricao, numeroInscricao, inscricao, local)', async () => {
  const proibidos = [CPF_NUM, '529.982.247-25', CNO_NUM, '12.345.67890/12', CAEPF_NUM, CEI_NUM, '21.098.76543/21',
    'tipoInscricao', 'numeroInscricao', 'inscricao', '"local"', '"rotulo"'];
  for (const c of CASOS.filter(x => x.esperado === '')) {
    const { gravacoes } = await rodarUm(c.emp);
    const tudo = JSON.stringify(gravacoes);
    for (const p of proibidos) assert.ok(!tudo.includes(p), `${c.nome}: vazamento de "${p}" no payload público`);
  }
});

test('empresaNome permanece inalterado (não passa pelo portão) e demais campos não mudam de valor', async () => {
  const emp = { id: 'e1', nome: 'Empresa Teste Ltda', tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' };
  const { docIndividual, itemGrupo } = await rodarUm(emp);
  assert.equal(docIndividual.empresaNome, 'Empresa Teste Ltda');
  assert.equal(itemGrupo.empresaNome, 'Empresa Teste Ltda');
  assert.equal(docIndividual.status, 'pendente');
  assert.equal(docIndividual.totalItens, 1);
  assert.deepEqual(docIndividual.respostas, {});
});
