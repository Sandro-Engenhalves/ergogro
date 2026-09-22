/* ============================================================
   ErgoGRO — Testes do WhatsApp da pesquisa psicossocial (GATE 3.M4.3)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m4-3-whatsapp-pesquisa.test.js

   Decisão de política aprovada (M4.D → M4.3): compartilharWhatsApp() (convite
   da pesquisa psicossocial, enviado pelo ergonomista ao RH/responsável do
   cliente) mostra nome + CNPJ SOMENTE quando Inscricao.publico(emp) devolve
   algo (CNPJ com DV válido). CPF/CNO/CAEPF/CEI e CNPJ inválido/não
   normalizável ficam de fora; o nome da empresa permanece sempre, com a
   mesma precedência de antes (c.empresaNome || emp?.nome || ''). _gerarQRCode,
   criarCampanha e o restante da campanha não são tocados.

   Estratégia: roda o pesquisa-admin.js REAL no vm (helper Inscricao real
   carregado junto, window.open interceptado como stub) e captura a URL
   wa.me final — a SAÍDA efetiva, não uma variável intermediária.
   ============================================================ */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const ler  = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ARQ  = { helper: 'js/inscricao.js', pesquisa: 'js/modules/pesquisa-admin.js' };

/* ── Utilitários de guarda estática (mesmo padrão dos arquivos anteriores) ── */

function extrair(fonte, nome) {
  const ini = fonte.search(new RegExp(`^  (async )?function ${nome}\\(`, 'm'));
  assert.notEqual(ini, -1, `função ${nome} não encontrada`);
  const resto = fonte.slice(ini + 1);
  const fim = resto.search(/^  (async )?function \w+\(|^  return \{|^\}\)\(\)/m);
  return fonte.slice(ini, fim === -1 ? undefined : ini + 1 + fim);
}
const semComentarios = fonte => fonte.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── Harness: carrega pesquisa-admin.js REAL no vm (com Inscricao real),
   injeta um acessor para as funções privadas, define uma campanha aberta e
   chama compartilharWhatsApp(). window.open é interceptado — nada abre de
   verdade. Devolve a URL final capturada, já decodificada. ── */
function rodar({ campanha, emp, projetoEmpresaId }) {
  const aberturas = [];
  const ctx = vm.createContext({
    window: {
      location: { origin: 'https://exemplo.test', pathname: '/index.html' },
      open: url => { aberturas.push(url); },
      PS_BASE_URL: undefined,
    },
    App: {
      obterProjetoAtual: () => (projetoEmpresaId !== undefined ? { empresaId: projetoEmpresaId } : null),
      mostrarToast: () => {},
    },
    Storage: {
      buscarEmpresa: id => (emp && id === emp.id ? emp : null),
    },
    document: { getElementById: () => null },
  });
  vm.runInContext(ler(ARQ.helper), ctx);
  let fonte = ler(ARQ.pesquisa);
  const i = fonte.lastIndexOf('\n  return {');
  assert.ok(i > 0, 'return final não encontrado em pesquisa-admin.js');
  vm.runInContext(fonte.slice(0, i) + "\n  globalThis.__priv = { compartilharWhatsApp, _set: c => { _campanhaAberta = c; } };" + fonte.slice(i), ctx);
  ctx.__priv._set(campanha);
  ctx.__priv.compartilharWhatsApp();

  assert.equal(aberturas.length, 1, 'esperava exatamente 1 chamada a window.open');
  const href = aberturas[0];
  assert.match(href, /^https:\/\/wa\.me\/\?text=/, 'URL não é do wa.me');
  const textoDecodificado = decodeURIComponent(href.replace('https://wa.me/?text=', ''));
  return { href, textoDecodificado };
}

/* Números de teste (públicos/válidos). CNO, CAEPF e CEI distintos entre si — sentinelas. */
const CNPJ_NUM = '11222333000181', CNPJ_MASC = '11.222.333/0001-81';
const CNPJ_INVALIDO_MASC = '11.222.333/0001-99';
const CPF_NUM = '52998224725', CPF_MASC = '529.982.247-25';
const CNO_NUM = '123456789012', CNO_MASC = '12.345.67890/12';
const CAEPF_NUM = '99988877766655';
const CEI_NUM = '210987654321', CEI_MASC = '21.098.76543/21';

const CAMP_BASE = { id: 'camp1', empresaId: 'e1' };   /* empresaNome ausente: nome vem de emp.nome */

const CASOS = [
  { nome: 'CNPJ novo válido (tipo+número)', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cnpj', numeroInscricao: CNPJ_NUM, cnpj: CNPJ_MASC }, publicoEsperado: CNPJ_MASC },
  { nome: 'CNPJ legado válido (mascarado)', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_MASC }, publicoEsperado: CNPJ_MASC },
  { nome: 'CNPJ legado válido (sem máscara)', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_NUM }, publicoEsperado: CNPJ_MASC },
  { nome: 'CNPJ com DV inválido', emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_INVALIDO_MASC }, publicoEsperado: '' },
  { nome: 'CNPJ legado não normalizável (abc@#)', emp: { id: 'e1', nome: 'Emp', cnpj: 'abc@#' }, publicoEsperado: '' },
  { nome: 'CPF', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' }, publicoEsperado: '' },
  { nome: 'CNO', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' }, publicoEsperado: '' },
  { nome: 'CAEPF', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' }, publicoEsperado: '' },
  { nome: 'CEI', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cei', numeroInscricao: CEI_NUM, cnpj: '' }, publicoEsperado: '' },
  { nome: 'inscrição vazia (legado)', emp: { id: 'e1', nome: 'Emp', cnpj: '' }, publicoEsperado: '' },
  { nome: 'inscrição vazia (tipo cpf declarado, número vazio)', emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: '', cnpj: '' }, publicoEsperado: '' },
];

/* ═════════════════════════════════════════════════════════════
   1. FLUXO REAL — confirmação (mesma checagem do pré-check, travada em teste)
   ═════════════════════════════════════════════════════════════ */

test('fluxo real: compartilharWhatsApp lê nome/cnpj de emp e não persiste nada novo na campanha', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), 'compartilharWhatsApp'));
  assert.match(codigo, /const empId = c\.empresaId \|\| App\.obterProjetoAtual\(\)\?\.empresaId;/);
  assert.match(codigo, /const emp\s*=\s*empId \? Storage\.buscarEmpresa\(empId\) : null;/);
  assert.match(codigo, /const nome\s*=\s*c\.empresaNome \|\| emp\?\.nome \|\| '';/);
  assert.doesNotMatch(codigo, /criarCampanha|\.set\(|\.update\(|\.add\(/, 'compartilharWhatsApp não deve gravar nada');
});

/* ═════════════════════════════════════════════════════════════
   2. GUARDA ESTÁTICA
   ═════════════════════════════════════════════════════════════ */

test('guarda estática: compartilharWhatsApp usa Inscricao.publico(emp) para a origem do CNPJ', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), 'compartilharWhatsApp'));
  assert.match(codigo, /const cnpj\s*=\s*Inscricao\.publico\(emp\);/);
});

test('guarda estática: compartilharWhatsApp não usa mais emp?.cnpj como origem de cnpj', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), 'compartilharWhatsApp'));
  assert.doesNotMatch(codigo, /const cnpj\s*=\s*emp\?\.cnpj/, 'não pode voltar a ler emp?.cnpj cru');
});

test('guarda estática: clienteInfo continua composto por nome + CNPJ condicional (mensagem não reformulada)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), 'compartilharWhatsApp'));
  assert.match(codigo, /const clienteInfo = \[nome, cnpj \? `CNPJ: \$\{cnpj\}` : ''\]\.filter\(Boolean\)\.join\(' — '\);/);
});

test('guarda estática: precedência de nome/empresaNome preservada (c.empresaNome || emp?.nome || \'\')', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), 'compartilharWhatsApp'));
  assert.match(codigo, /const nome\s*=\s*c\.empresaNome \|\| emp\?\.nome \|\| '';/);
});

test('guarda estática: _gerarQRCode está intocado (sem Inscricao, sem CNPJ, só a URL da pesquisa)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.pesquisa), '_gerarQRCode'));
  assert.doesNotMatch(codigo, /Inscricao|CNPJ|cnpj/i);
  assert.match(codigo, /api\.qrserver\.com/, '_gerarQRCode deve continuar usando a API pública do QR Server');
  assert.match(codigo, /encodeURIComponent\(url\)/, '_gerarQRCode deve continuar codificando só a URL da pesquisa');
});

test('guarda estática: criarCampanha (firebase-pesquisa.js) está intocado e não ganhou campo de inscrição', () => {
  const codigo = ler('js/firebase-pesquisa.js');
  const bloco = codigo.match(/async function criarCampanha\(dados\) \{[\s\S]*?\n\}/);
  assert.ok(bloco, 'criarCampanha não encontrada');
  assert.doesNotMatch(bloco[0], /empresaCnpj|tipoInscricao|numeroInscricao|Inscricao/i, 'criarCampanha não deve ganhar campo de inscrição');
  assert.match(bloco[0], /\.\.\.dados,/, 'criarCampanha continua gravando só o que o chamador passar em "dados"');
});

test('guarda estática: consulta-aep.js NÃO foi alterado neste GATE (M4.1/M4.2 preservados)', () => {
  const codigo = ler('js/consulta-aep.js');
  assert.match(codigo, /const empresaCnpj = Inscricao\.publico\(emp\);/, 'M4.1 deve seguir intacto');
  assert.match(codigo, /_mostrarModalLink\(perfil, link, funcoes\.length, emp\?\.nome \|\| '', Inscricao\.publico\(emp\)\);/, 'M4.2 deve seguir intacto');
});

test('guarda estática: cache-busting de pesquisa-admin.js (14 → 15) só em index.html', () => {
  const idx = ler('index.html');
  const v = (html, arq) => (html.match(new RegExp(`${arq.replace(/[.]/g, '\\.')}\\?v=(\\w+)`)) || [])[1];
  assert.equal(v(idx, 'js/modules/pesquisa-admin.js'), '15');
  assert.notEqual(v(idx, 'js/modules/pesquisa-admin.js'), '14', 'não reutilizar a versão anterior');
  /* consulta-aep.js não pode ter sido bumpado de novo neste GATE (continua no valor do M4.2) */
  assert.equal(v(idx, 'js/consulta-aep.js'), '4');
  assert.equal(v(ler('consulta.html'), 'js/consulta-aep.js'), '4');
});

/* ═════════════════════════════════════════════════════════════
   3. MENSAGEM FINAL — casos e não vazamento (URL wa.me FINAL, decodificada)
   ═════════════════════════════════════════════════════════════ */

for (const c of CASOS) {
  test(`WhatsApp pesquisa › ${c.nome}`, () => {
    const { textoDecodificado } = rodar({ campanha: CAMP_BASE, emp: c.emp });
    if (c.publicoEsperado) {
      assert.ok(textoDecodificado.includes(`Emp — CNPJ: ${c.publicoEsperado}`), `esperava "Emp — CNPJ: ${c.publicoEsperado}" em: ${textoDecodificado}`);
    } else {
      assert.ok(textoDecodificado.includes('da Emp.'), `esperava só o nome, sem cláusula, em: ${textoDecodificado}`);
      for (const proibido of ['CPF:', 'CNO:', 'CAEPF:', 'CEI:', 'CNPJ:', 'CNPJ: —', 'CNPJ: '])
        assert.ok(!textoDecodificado.includes(proibido), `"${proibido}" não deveria aparecer em: ${textoDecodificado}`);
    }
  });
}

test('WhatsApp pesquisa › empresa null (empId sem correspondência): não quebra e omite identificação', () => {
  const { textoDecodificado } = rodar({ campanha: { id: 'camp1', empresaId: 'inexistente' }, emp: null });
  assert.ok(textoDecodificado.includes('Pesquisa Psicossocial.'));
  assert.doesNotMatch(textoDecodificado, /CNPJ:|CPF:|CNO:|CAEPF:|CEI:/);
});

test('WhatsApp pesquisa › empresaId ausente (nem na campanha, nem no projeto atual): não quebra e omite identificação', () => {
  const { textoDecodificado } = rodar({ campanha: { id: 'camp1' }, emp: null, projetoEmpresaId: null });
  assert.ok(textoDecodificado.includes('Pesquisa Psicossocial.'));
  assert.doesNotMatch(textoDecodificado, /CNPJ:|CPF:|CNO:|CAEPF:|CEI:/);
});

test('WhatsApp pesquisa › empresaId vem do projeto atual quando a campanha não tem empresaId', () => {
  const emp = { id: 'e9', nome: 'Via Projeto', cnpj: CNPJ_MASC };
  const { textoDecodificado } = rodar({ campanha: { id: 'camp1' }, emp, projetoEmpresaId: 'e9' });
  assert.ok(textoDecodificado.includes(`da Via Projeto — CNPJ: ${CNPJ_MASC}.`));
});

/* ── Não vazamento: sentinelas distintos por tipo, verificados nas 3 camadas
   pedidas: texto antes da codificação, href final wa.me, e href decodificado. ── */
test('NÃO VAZAMENTO: CPF/CNO/CAEPF/CEI não aparecem em nenhuma forma na saída final (texto, href codificado, href decodificado)', () => {
  const sentinelas = [
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' }, crus: [CPF_NUM, CPF_MASC] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' }, crus: [CNO_NUM, CNO_MASC] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' }, crus: [CAEPF_NUM] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cei', numeroInscricao: CEI_NUM, cnpj: '' }, crus: [CEI_NUM, CEI_MASC] },
  ];
  for (const { emp, crus } of sentinelas) {
    const { href, textoDecodificado } = rodar({ campanha: CAMP_BASE, emp });
    for (const valor of crus) {
      assert.ok(!textoDecodificado.includes(valor), `vazou no texto (antes da codificação, aqui já decodificado de volta): ${valor}`);
      assert.ok(!href.includes(valor), `vazou cru no href wa.me: ${valor}`);
      assert.ok(!href.includes(encodeURIComponent(valor)), `vazou percent-encoded no href wa.me: ${valor}`);
    }
    for (const rotulo of ['CPF:', 'CNO:', 'CAEPF:', 'CEI:']) assert.ok(!textoDecodificado.includes(rotulo));
  }
});

test('CNPJ válido: a mensagem contém exatamente "CNPJ: <valor público formatado>"', () => {
  const { textoDecodificado } = rodar({ campanha: CAMP_BASE, emp: { id: 'e1', nome: 'Indústria Alfa', cnpj: CNPJ_MASC } });
  assert.match(textoDecodificado, /CNPJ: 11\.222\.333\/0001-81(?!\d)/);
  assert.ok(textoDecodificado.includes('da Indústria Alfa — CNPJ: 11.222.333/0001-81.'));
});

test('CNPJ inválido/legado ruim: a mensagem NUNCA mostra o valor cru nem "CNPJ:" vazio', () => {
  const { textoDecodificado: t1 } = rodar({ campanha: CAMP_BASE, emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_INVALIDO_MASC } });
  assert.ok(!t1.includes(CNPJ_INVALIDO_MASC));
  assert.doesNotMatch(t1, /CNPJ:/);
  const { textoDecodificado: t2 } = rodar({ campanha: CAMP_BASE, emp: { id: 'e1', nome: 'Emp', cnpj: 'abc@#' } });
  assert.ok(!t2.includes('abc@#'));
  assert.doesNotMatch(t2, /CNPJ:/);
});

test('empresaNome do snapshot da campanha tem precedência sobre emp.nome (regra preservada)', () => {
  const { textoDecodificado } = rodar({
    campanha: { id: 'camp1', empresaId: 'e1', empresaNome: 'Nome do Snapshot' },
    emp: { id: 'e1', nome: 'Nome Atual Diferente', cnpj: CNPJ_MASC },
  });
  assert.ok(textoDecodificado.includes('da Nome do Snapshot — CNPJ: 11.222.333/0001-81.'));
  assert.ok(!textoDecodificado.includes('Nome Atual Diferente'));
});

test('URL da pesquisa (wa.me) permanece igual: mesma base, mesmo formato pesquisa.html?c=<id>', () => {
  const { textoDecodificado } = rodar({ campanha: CAMP_BASE, emp: { id: 'e1', nome: 'Emp', cnpj: CNPJ_MASC } });
  assert.ok(textoDecodificado.includes('https://exemplo.test/pesquisa.html?c=camp1'));
  assert.ok(textoDecodificado.includes('anônimo e leva de 5 a 10 minutos'));
});
