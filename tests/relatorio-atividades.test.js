/* ============================================================
   ErgoGRO — Regressão: coluna "Atividades" da tabela de escopo do relatório

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/relatorio-atividades.test.js

   Causa original: o relatório lia f.atividadesPrincipais (propriedade que nenhum
   formulário grava) enquanto o cadastro grava f.descricaoAtividade. Resultado:
   coluna sempre "—". Estes testes fixam o contrato correto.

   Estratégia: carrega o projeto.js REAL no vm (mesmo padrão de m3a-aet-projeto.test.js)
   e inspeciona o HTML gerado por _htmlRelatorio.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

/* Gera o HTML do relatório com setores/funções/avaliações fornecidos. */
function relatorio({ funcoes, avaliacoes = [] }) {
  const ctx = vm.createContext({
    App:        { obterProjetoAtual: () => ({ id: 'p1', empresaId: 'e1', tipo: 'aep', nome: 'Projeto X' }) },
    Storage:    {
      buscarEmpresa: () => ({ id: 'e1', nome: 'Empresa Teste' }),
      listarSetores: () => [{ id: 's1', nome: 'Setor A' }],
      listarPorProjeto: () => avaliacoes,
      listarFuncoes: () => funcoes,
      buscarFuncao: id => funcoes.find(f => f.id === id) || null,
      buscarSetor: () => ({ id: 's1', nome: 'Setor A' }),
      listarAcoesSistemicas: () => [],
    },
    ModuloAEP:  {
      calcularRiscoGeral: () => ({}),
      obterNaoConformes: () => [],
      MOTOR_AEP: { calcularScore: () => ({ valor: 0 }), sugerirNivel: () => 'baixo' },
    },
    document:   { getElementById: () => null, addEventListener() {} },
    window:     { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  vm.runInContext(ler('js/inscricao.js'), ctx);
  let fonte = ler('js/modules/projeto.js');
  const i = fonte.lastIndexOf('\n  return {');
  fonte = fonte.slice(0, i) + '\n  globalThis.__priv = { _htmlRelatorio };' + fonte.slice(i);
  vm.runInContext(fonte, ctx);
  return ctx.__priv._htmlRelatorio(null, false);
}

/* Células <td> da linha da função (nome → [td do nome, trab, atividades, tipo]). */
function celulasDaFuncao(html, nome) {
  const m = html.match(new RegExp(`<td[^>]*>${nome}</td>\\s*<td[^>]*>[^<]*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`));
  assert.ok(m, `linha da função "${nome}" não encontrada na tabela de escopo`);
  return m[1].trim();
}
const celulaAtividades = (html, nome) => celulasDaFuncao(html, nome);

test('atividade preenchida (descricaoAtividade) aparece na coluna Atividades', () => {
  const html = relatorio({ funcoes: [{ id: 'f1', setorId: 's1', nome: 'Vendedor de Pista', numTrabalhadores: '15',
    descricaoAtividade: 'Abastecimento de veículos e atendimento ao cliente' }] });
  assert.equal(celulaAtividades(html, 'Vendedor de Pista'), 'Abastecimento de veículos e atendimento ao cliente');
});

test('texto longo não é truncado', () => {
  const longo = 'Tarefa '.repeat(30).trim();
  const html = relatorio({ funcoes: [{ id: 'f1', setorId: 's1', nome: 'Lubrificador', numTrabalhadores: '6', descricaoAtividade: longo }] });
  assert.equal(celulaAtividades(html, 'Lubrificador'), longo);
});

test('atividade vazia permanece identificada como não informada ("—"), sem texto inventado', () => {
  for (const vazio of ['', undefined, null]) {
    const html = relatorio({ funcoes: [{ id: 'f1', setorId: 's1', nome: 'Estoquista', numTrabalhadores: '1', descricaoAtividade: vazio }] });
    assert.equal(celulaAtividades(html, 'Estoquista'), '—');
  }
});

test('dados antigos: função sem descrição usa a da avaliação vinculada (snapshot legado)', () => {
  const html = relatorio({
    funcoes:   [{ id: 'f1', setorId: 's1', nome: 'Zelador (A)', numTrabalhadores: '4' }],
    avaliacoes:[{ id: 'a1', funcaoId: 'f1', tipo: 'aep', descricaoAtividade: 'Limpeza de banheiros' }],
  });
  assert.equal(celulaAtividades(html, 'Zelador \\(A\\)'), 'Limpeza de banheiros');
});

test('a descrição da função prevalece sobre a da avaliação', () => {
  const html = relatorio({
    funcoes:   [{ id: 'f1', setorId: 's1', nome: 'Chefe de Pista', numTrabalhadores: '4', descricaoAtividade: 'Supervisão da pista' }],
    avaliacoes:[{ id: 'a1', funcaoId: 'f1', tipo: 'aep', descricaoAtividade: 'Texto antigo' }],
  });
  assert.equal(celulaAtividades(html, 'Chefe de Pista'), 'Supervisão da pista');
});

test('a propriedade inexistente atividadesPrincipais não é mais lida', () => {
  const fonte = ler('js/modules/projeto.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(fonte, /atividadesPrincipais/);
});

/* ── Legibilidade dos nomes das funções ──────────────────────── */

test('nome da função não força cor fixa na tela (tema escuro) e a impressão força texto escuro', () => {
  const html = relatorio({ funcoes: [{ id: 'f1', setorId: 's1', nome: 'Motorista', numTrabalhadores: '1' }] });
  /* tela: sem cor inline → herda o tema (claro no dark mode) */
  const td = html.match(/<td[^>]*>Motorista<\/td>/)[0];
  assert.doesNotMatch(td, /color\s*:/, 'célula do nome não pode fixar cor (ficava preta sobre fundo escuro)');
  /* impressão: regra @media print dá cor escura às células e fundo branco ao corpo */
  assert.match(html, /td \{[^}]*color:#111 !important/);
  assert.match(html, /body \{ background:#fff !important; color:#000 !important/);
});

test('seção 5 (resultados AEP): função e setor também não forçam cor fixa', () => {
  const html = relatorio({
    funcoes:   [{ id: 'f1', setorId: 's1', nome: 'Vendedor de Pista', numTrabalhadores: '15' }],
    avaliacoes:[{ id: 'a1', funcaoId: 'f1', setorId: 's1', tipo: 'aep', projetoId: 'p1' }],
  });
  for (const nome of ['Vendedor de Pista', 'Setor A']) {
    const tds = [...html.matchAll(new RegExp(`<td[^>]*>${nome}</td>`, 'g'))].map(m => m[0]);
    assert.ok(tds.length > 0, `célula "${nome}" não encontrada`);
    for (const td of tds) assert.doesNotMatch(td, /color\s*:/, `"${nome}" não pode fixar cor`);
  }
});

test('nenhuma célula do relatório fixa color:#000 !important inline', () => {
  const fonte = ler('js/modules/projeto.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(fonte, /style="[^"]*color:#000 !important/);
});
