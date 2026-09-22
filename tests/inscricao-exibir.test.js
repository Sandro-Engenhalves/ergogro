/* ============================================================
   ErgoGRO — Testes de Inscricao.exibir() (GATE 3.M1)

   Sem dependências externas: usa apenas node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/inscricao-exibir.test.js

   O helper é um script de navegador (const Inscricao = ...), então é
   carregado num contexto isolado do vm — nenhum Storage/DOM/rede existe ali,
   o que também comprova que exibir() é puro.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const CAMINHO = path.join(__dirname, '..', 'js', 'inscricao.js');

/* Carrega uma instância nova do helper em contexto vazio (sem globais do navegador). */
function carregar() {
  const ctx = vm.createContext({});
  return vm.runInContext(fs.readFileSync(CAMINHO, 'utf8') + '\n;Inscricao', ctx);
}

const Inscricao = carregar();

/* Números de teste públicos e válidos (DV conferido pelo próprio validar()). */
const CNPJ_NUM  = '11222333000181', CNPJ_MASC  = '11.222.333/0001-81';
const CPF_NUM   = '52998224725',    CPF_MASC   = '529.982.247-25';
const CNO_NUM   = '123456789012',   CNO_MASC   = '12.345.67890/12';
const CAEPF_NUM = '12345678901234';

/* Compara o contrato { tipo, rotulo, valor, texto, vazio }.
   O objeto nasce no contexto do vm (outro Object.prototype); o spread o traz para
   o contexto do teste, senão o deepStrictEqual falha só pela diferença de protótipo. */
function esperar(emp, esperado) {
  assert.deepEqual({ ...Inscricao.exibir(emp) }, esperado);
}

/* ── Contrato e API pública ───────────────────────────────── */

test('exibir está exposta na API pública, congelada, e as funções existentes permanecem', () => {
  assert.equal(typeof Inscricao.exibir, 'function');
  assert.ok(Object.isFrozen(Inscricao));
  assert.deepEqual(
    Object.keys(Inscricao),
    ['tipos', 'normalizar', 'formatar', 'validar', 'rotulo', 'obter', 'aplicar', 'campos', 'chave', 'publico', 'exibir']
  );
});

test('exibir devolve exatamente as chaves do contrato', () => {
  assert.deepEqual(Object.keys(Inscricao.exibir({})).sort(), ['rotulo', 'texto', 'tipo', 'valor', 'vazio']);
});

/* ── 1 a 5: cadastro novo (tipoInscricao + numeroInscricao) ── */

test('1. CNPJ novo válido', () => {
  esperar({ tipoInscricao: 'cnpj', numeroInscricao: CNPJ_NUM, cnpj: CNPJ_MASC },
    { tipo: 'cnpj', rotulo: 'CNPJ', valor: CNPJ_MASC, texto: `CNPJ: ${CNPJ_MASC}`, vazio: false });
});

test('2. CPF válido', () => {
  esperar({ tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' },
    { tipo: 'cpf', rotulo: 'CPF', valor: CPF_MASC, texto: `CPF: ${CPF_MASC}`, vazio: false });
});

test('3. CNO', () => {
  esperar({ tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' },
    { tipo: 'cno', rotulo: 'CNO', valor: CNO_MASC, texto: `CNO: ${CNO_MASC}`, vazio: false });
});

test('4. CAEPF (sem máscara oficial confirmada)', () => {
  esperar({ tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' },
    { tipo: 'caepf', rotulo: 'CAEPF', valor: CAEPF_NUM, texto: `CAEPF: ${CAEPF_NUM}`, vazio: false });
});

test('5. CEI (legado): rótulo curto "CEI", sem o "(legado)"', () => {
  esperar({ tipoInscricao: 'cei', numeroInscricao: CNO_NUM, cnpj: '' },
    { tipo: 'cei', rotulo: 'CEI', valor: CNO_MASC, texto: `CEI: ${CNO_MASC}`, vazio: false });
});

/* ── 6 a 8: legado (somente emp.cnpj) ─────────────────────── */

test('6. CNPJ legado válido (somente emp.cnpj) é interpretado como CNPJ', () => {
  esperar({ cnpj: CNPJ_MASC },
    { tipo: 'cnpj', rotulo: 'CNPJ', valor: CNPJ_MASC, texto: `CNPJ: ${CNPJ_MASC}`, vazio: false });
});

test('7. CNPJ legado com DV inválido NÃO é ocultado', () => {
  esperar({ cnpj: '11.222.333/0001-99' },
    { tipo: 'cnpj', rotulo: 'CNPJ', valor: '11.222.333/0001-99', texto: 'CNPJ: 11.222.333/0001-99', vazio: false });
});

test('8. legado não normalizável (abc@#) NÃO é ocultado e volta como está', () => {
  esperar({ cnpj: 'abc@#' },
    { tipo: 'cnpj', rotulo: 'CNPJ', valor: 'abc@#', texto: 'CNPJ: abc@#', vazio: false });
});

/* ── 9 a 11: vazios e ausentes ────────────────────────────── */

const VAZIO_CNPJ = { tipo: 'cnpj', rotulo: 'CNPJ', valor: '', texto: '', vazio: true };

test('9. objeto vazio {}', () => { esperar({}, VAZIO_CNPJ); });

test('10. null (e undefined)', () => {
  esperar(null, VAZIO_CNPJ);
  esperar(undefined, VAZIO_CNPJ);
});

test('11. snapshot legado {nome, cnpj:""} é vazio, nunca inferido como outro tipo', () => {
  esperar({ nome: 'Empresa X', cnpj: '', cidade: 'Y' }, VAZIO_CNPJ);
});

test('11b. novo cadastro com tipo declarado e número vazio mantém o rótulo do tipo', () => {
  esperar({ tipoInscricao: 'cpf', numeroInscricao: '', cnpj: '' },
    { tipo: 'cpf', rotulo: 'CPF', valor: '', texto: '', vazio: true });
});

/* ── 12: tamanho inválido ─────────────────────────────────── */

test('12. CPF de tamanho inválido NÃO é ocultado', () => {
  esperar({ tipoInscricao: 'cpf', numeroInscricao: '123', cnpj: '' },
    { tipo: 'cpf', rotulo: 'CPF', valor: '123', texto: 'CPF: 123', vazio: false });
});

/* ── Não regressão: exibir().valor ≡ obter().formatado ────── */

test('NÃO REGRESSÃO: CNPJ legado válido — exibir().valor equivale a obter().formatado', () => {
  const legados = [
    { cnpj: CNPJ_MASC },                 /* como gravado hoje                    */
    { cnpj: CNPJ_NUM },                  /* sem máscara                          */
    { cnpj: `  ${CNPJ_MASC}  ` },        /* espaços nas pontas                   */
    { cnpj: Number(CNPJ_NUM) },          /* número (aceito por obter())          */
  ];
  for (const emp of legados) {
    const antes = Inscricao.obter(emp).formatado;
    assert.equal(Inscricao.exibir(emp).valor, antes, JSON.stringify(emp));
    assert.equal(Inscricao.exibir(emp).valor, CNPJ_MASC, JSON.stringify(emp));
    assert.equal(Inscricao.exibir(emp).tipo, 'cnpj');
  }
});

test('NÃO REGRESSÃO: para qualquer entrada com inscrição, valor === obter().formatado', () => {
  const entradas = [
    { tipoInscricao: 'cnpj', numeroInscricao: CNPJ_NUM, cnpj: CNPJ_MASC },
    { tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' },
    { tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' },
    { tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' },
    { tipoInscricao: 'cei', numeroInscricao: CNO_NUM, cnpj: '' },
    { tipoInscricao: 'cpf', numeroInscricao: '123', cnpj: '' },
    { tipoInscricao: 'cno', numeroInscricao: '123', cnpj: '' },
    { cnpj: '11.222.333/0001-99' },
    { cnpj: 'abc@#' },
  ];
  for (const emp of entradas) {
    const o = Inscricao.obter(emp), x = Inscricao.exibir(emp);
    assert.equal(x.valor, o.formatado, JSON.stringify(emp));
    assert.equal(x.tipo, o.tipo);
    assert.equal(x.vazio, o.vazio);
    assert.equal(x.rotulo, Inscricao.rotulo(o.tipo, true));
  }
});

/* ── Funções existentes intactas / pureza ─────────────────── */

test('obter() e publico() seguem com o comportamento anterior', () => {
  /* obter */
  const o = Inscricao.obter({ cnpj: CNPJ_MASC });
  assert.equal(o.tipo, 'cnpj'); assert.equal(o.legado, true); assert.equal(o.valido, true);
  assert.equal(Inscricao.obter({ tipoInscricao: 'cpf', numeroInscricao: CPF_NUM }).formatado, CPF_MASC);
  /* publico: só CNPJ válido; nunca CPF/CNO/CAEPF/CEI; legado inválido é omitido */
  assert.equal(Inscricao.publico({ cnpj: CNPJ_MASC }), CNPJ_MASC);
  assert.equal(Inscricao.publico({ tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' }), '');
  assert.equal(Inscricao.publico({ tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' }), '');
  assert.equal(Inscricao.publico({ tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' }), '');
  assert.equal(Inscricao.publico({ tipoInscricao: 'cei', numeroInscricao: CNO_NUM, cnpj: '' }), '');
  assert.equal(Inscricao.publico({ cnpj: '11.222.333/0001-99' }), '');
});

test('exibir() é pura: não altera o objeto recebido e é determinística', () => {
  const emp = { tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '', nome: 'X' };
  const copia = JSON.parse(JSON.stringify(emp));
  const a = Inscricao.exibir(emp), b = Inscricao.exibir(emp);
  assert.deepEqual(emp, copia);
  assert.deepEqual(a, b);
  assert.notEqual(a, b);            /* nova cópia a cada chamada */
});

test('exibir() não lança com entradas atípicas', () => {
  for (const entrada of [null, undefined, 0, '', 'texto', [], { cnpj: null }, { cnpj: {} }, { tipoInscricao: 'rg', numeroInscricao: '1' }]) {
    assert.doesNotThrow(() => Inscricao.exibir(entrada));
    const x = Inscricao.exibir(entrada);
    if (x.vazio) { assert.equal(x.valor, ''); assert.equal(x.texto, ''); }
    else assert.equal(x.texto, `${x.rotulo}: ${x.valor}`);
  }
});
