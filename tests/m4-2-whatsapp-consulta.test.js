/* ============================================================
   ErgoGRO — Testes do WhatsApp da consulta AEP (GATE 3.M4.2)

   Sem dependências externas: node:test, node:assert e node:vm.
   Executar (na raiz do projeto):   node --test tests/m4-2-whatsapp-consulta.test.js

   Decisão de política aprovada (M4.D → M4.2): a mensagem de WhatsApp do link
   único/projeto (_mostrarModalLink, via abrirConsulta) mostra nome + CNPJ
   SOMENTE quando Inscricao.publico(emp) devolve algo (CNPJ com DV válido).
   CPF/CNO/CAEPF/CEI e CNPJ inválido/não normalizável ficam de fora, e o nome
   da empresa permanece sempre. _mostrarModalGrupo (mensagem de grupo) e a
   mensagem de link por setor não mudam — nunca tiveram identificação
   numérica individual. pesquisa-admin.js (WhatsApp da pesquisa psicossocial)
   não foi tocado neste GATE.

   Estratégia: roda o consulta-aep.js REAL no vm (helper Inscricao real
   carregado junto, Firestore/Storage simulados) e captura a URL wa.me final
   gerada por abrirConsulta — a SAÍDA efetiva, não uma variável intermediária.
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

/* ── Harness: roda abrirConsulta (que chama _mostrarModalLink) com o
   consulta-aep.js REAL, e captura o modal HTML inserido — de onde extraímos
   a URL wa.me FINAL, já codificada, exatamente como sai para o botão
   "💬 WhatsApp". Nada é escrito de verdade; Firestore/DOM são stubs locais. ── */
async function rodarAbrirConsulta(emp, { projetoId = 'p1', empresaId = emp?.id ?? null } = {}) {
  const modais = [];
  const ctx = vm.createContext({
    window:   { location: { origin: 'https://exemplo.test', pathname: '/index.html' } },
    document: { getElementById: () => null, body: { insertAdjacentHTML: (_, html) => modais.push(html) } },
    firebase: {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async () => {},
          }),
        }),
      }),
    },
    inicializarFirebase: () => true,
    App: {
      mostrarToast: () => {},
      obterAvaliacaoAtual: () => ({ projetoId }),
    },
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
  await vm.runInContext('ConsultaAEP', ctx).abrirConsulta('rh');

  assert.equal(modais.length, 1, 'esperava exatamente 1 modal inserido');
  const html = modais[0];
  const hrefWa = (html.match(/href="(https:\/\/wa\.me\/\?text=[^"]+)"/) || [])[1];
  assert.ok(hrefWa, 'link wa.me não encontrado no modal');
  const textoDecodificado = decodeURIComponent(hrefWa.replace('https://wa.me/?text=', ''));
  return { html, hrefWa, textoDecodificado };
}

/* Números de teste (públicos/válidos). CNO, CAEPF e CEI distintos entre si — sentinelas. */
const CNPJ_NUM = '11222333000181', CNPJ_MASC = '11.222.333/0001-81';
const CNPJ_INVALIDO_MASC = '11.222.333/0001-99';
const CPF_NUM = '52998224725', CPF_MASC = '529.982.247-25';
const CNO_NUM = '123456789012', CNO_MASC = '12.345.67890/12';
const CAEPF_NUM = '99988877766655';
const CEI_NUM = '210987654321', CEI_MASC = '21.098.76543/21';

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

test('fluxo real: abrirConsulta chama _mostrarModalLink(perfil, link, numFuncoes, empresaNome, empresaCnpj)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), 'abrirConsulta'));
  assert.match(codigo, /_mostrarModalLink\(perfil, link, funcoes\.length, emp\?\.nome \|\| '', Inscricao\.publico\(emp\)\)/);
});

/* ═════════════════════════════════════════════════════════════
   2. GUARDA ESTÁTICA
   ═════════════════════════════════════════════════════════════ */

test('guarda estática: abrirConsulta usa Inscricao.publico(emp) para a mensagem de WhatsApp', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), 'abrirConsulta'));
  assert.match(codigo, /Inscricao\.publico\(emp\)/, 'deve usar o portão de privacidade');
});

test('guarda estática: abrirConsulta não passa mais emp?.cnpj cru a _mostrarModalLink', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), 'abrirConsulta'));
  assert.doesNotMatch(codigo, /_mostrarModalLink\([^)]*emp\?\.cnpj/, 'não pode voltar a passar emp?.cnpj cru');
});

test('guarda estática: _mostrarModalLink preserva a assinatura e continua com rótulo fixo "CNPJ:" (o valor que chega já é sempre CNPJ ou vazio)', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_mostrarModalLink'));
  assert.match(codigo, /function _mostrarModalLink\(perfil, link, numFuncoes, empresaNome, empresaCnpj\)/);
  assert.match(codigo, /empresaCnpj \? `CNPJ: \$\{empresaCnpj\}` : ''/);
});

test('guarda estática: a MENSAGEM de WhatsApp do grupo (waMsg) permanece sem identificação individual', () => {
  /* _mostrarModalGrupo legitimamente usa Inscricao.exibir/empresaCnpj na lista de empresas
     exibida no modal administrativo (aprovado no M2) — o que este GATE precisa garantir é
     que a MENSAGEM DE WHATSAPP (waMsg), especificamente, continua só com a contagem total. */
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_mostrarModalGrupo'));
  const waMsg = codigo.match(/const waMsg\s*=\s*encodeURIComponent\(([\s\S]*?)\);/);
  assert.ok(waMsg, 'const waMsg não encontrada em _mostrarModalGrupo');
  assert.doesNotMatch(waMsg[1], /Inscricao|empresaCnpj|empresaNome|p\.|local\./i, 'a mensagem de WhatsApp do grupo não deve ganhar identificação individual');
  assert.match(waMsg[1], /\$\{total\}/, 'a mensagem de WhatsApp do grupo deve continuar baseada só na contagem total');
});

test('guarda estática: mensagem de link por setor (_gerarLinkSelecionados) permanece sem identificação numérica do cliente', () => {
  const codigo = semComentarios(extrair(ler(ARQ.consulta), '_gerarLinkSelecionados'));
  assert.doesNotMatch(codigo, /Inscricao|empresaCnpj|CNPJ|CPF|CNO|CAEPF|CEI/i);
  assert.match(codigo, /setorNomes/, 'a mensagem de setor deve continuar baseada em setorNomes');
});

/* Este teste (M4.2) originalmente travava compartilharWhatsApp lendo emp?.cnpj cru, "como
   antes" — correto NAQUELE momento, pois o M4.2 tratou só do WhatsApp da consulta AEP. O
   GATE 3.M4.3 formalizou depois a mesma política também para a pesquisa psicossocial
   (cobertura completa em tests/m4-3-whatsapp-pesquisa.test.js). Atualizado para refletir o
   estado corrigido, no mesmo espírito do ajuste já feito em M3A/M3C/M4.1 para testes de
   GATEs anteriores cujo comportamento mudou por decisão posterior aprovada. */
test('guarda estática: pesquisa-admin.js — compartilharWhatsApp usa Inscricao.publico(emp) desde o GATE 3.M4.3', () => {
  const codigo = semComentarios(extrair(ler('js/modules/pesquisa-admin.js'), 'compartilharWhatsApp'));
  assert.match(codigo, /const cnpj\s*=\s*Inscricao\.publico\(emp\);/, 'ver tests/m4-3-whatsapp-pesquisa.test.js para a cobertura completa');
});

test('guarda estática: cache-busting de consulta-aep.js (M4.2: 3 → 4) coerente nos dois HTMLs', () => {
  const idx = ler('index.html'), cons = ler('consulta.html');
  const v = html => (html.match(/consulta-aep\.js\?v=(\w+)/) || [])[1];
  assert.equal(v(idx), '4');
  assert.equal(v(cons), '4');
  assert.notEqual(v(idx), '3', 'não reutilizar a versão do M4.1');
});

/* ═════════════════════════════════════════════════════════════
   3. MENSAGEM FINAL — casos e não vazamento (URL wa.me FINAL, decodificada)
   ═════════════════════════════════════════════════════════════ */

for (const c of CASOS) {
  test(`WhatsApp consulta › ${c.nome}`, async () => {
    const { textoDecodificado } = await rodarAbrirConsulta(c.emp);
    if (c.publicoEsperado) {
      assert.ok(textoDecodificado.includes(`Emp — CNPJ: ${c.publicoEsperado}`), `esperava "Emp — CNPJ: ${c.publicoEsperado}" em: ${textoDecodificado}`);
    } else {
      /* nome sozinho, sem cláusula de identificação numérica nenhuma */
      assert.ok(textoDecodificado.includes('da Emp.'), `esperava só o nome, sem cláusula, em: ${textoDecodificado}`);
      for (const proibido of ['CPF:', 'CNO:', 'CAEPF:', 'CEI:', 'CNPJ:', 'CNPJ: —', 'CNPJ: '])
        assert.ok(!textoDecodificado.includes(proibido), `"${proibido}" não deveria aparecer em: ${textoDecodificado}`);
    }
  });
}

test('WhatsApp consulta › empresa ausente/null: não quebra e omite identificação', async () => {
  const { textoDecodificado } = await rodarAbrirConsulta(null, { empresaId: 'inexistente' });
  assert.ok(textoDecodificado.includes('Avaliação Ergonômica.'), `sem nome nem CNPJ: ${textoDecodificado}`);
  assert.doesNotMatch(textoDecodificado, /CNPJ:|CPF:|CNO:|CAEPF:|CEI:/);
});

test('WhatsApp consulta › projeto sem empresaId: não quebra e omite identificação', async () => {
  const { textoDecodificado } = await rodarAbrirConsulta(null, { empresaId: null });
  assert.ok(textoDecodificado.includes('Avaliação Ergonômica.'));
  assert.doesNotMatch(textoDecodificado, /CNPJ:|CPF:|CNO:|CAEPF:|CEI:/);
});

/* ── Não vazamento: sentinelas distintos por tipo, verificados na SAÍDA final
   (HTML do modal, href wa.me codificado, e texto decodificado) — não só na
   variável intermediária. ── */
test('NÃO VAZAMENTO: CPF/CNO/CAEPF/CEI não aparecem em nenhuma forma na saída final (html, href codificado, texto decodificado)', async () => {
  const sentinelas = [
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cpf', numeroInscricao: CPF_NUM, cnpj: '' }, crus: [CPF_NUM, CPF_MASC] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cno', numeroInscricao: CNO_NUM, cnpj: '' }, crus: [CNO_NUM, CNO_MASC] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'caepf', numeroInscricao: CAEPF_NUM, cnpj: '' }, crus: [CAEPF_NUM] },
    { emp: { id: 'e1', nome: 'Emp', tipoInscricao: 'cei', numeroInscricao: CEI_NUM, cnpj: '' }, crus: [CEI_NUM, CEI_MASC] },
  ];
  for (const { emp, crus } of sentinelas) {
    const { html, hrefWa, textoDecodificado } = await rodarAbrirConsulta(emp);
    for (const valor of crus) {
      assert.ok(!html.includes(valor), `vazou no HTML do modal: ${valor}`);
      assert.ok(!hrefWa.includes(valor), `vazou no href wa.me codificado: ${valor}`);
      assert.ok(!hrefWa.includes(encodeURIComponent(valor)), `vazou no href wa.me (percent-encoded): ${valor}`);
      assert.ok(!textoDecodificado.includes(valor), `vazou no texto decodificado: ${valor}`);
    }
    /* nenhum rótulo de tipo não-CNPJ aparece de forma alguma */
    for (const rotulo of ['CPF:', 'CNO:', 'CAEPF:', 'CEI:']) assert.ok(!textoDecodificado.includes(rotulo));
  }
});

test('CNPJ válido: a mensagem contém exatamente "CNPJ: <valor público formatado>"', async () => {
  const { textoDecodificado } = await rodarAbrirConsulta({ id: 'e1', nome: 'Indústria Alfa', cnpj: CNPJ_MASC });
  assert.match(textoDecodificado, /CNPJ: 11\.222\.333\/0001-81(?!\d)/);
  assert.ok(textoDecodificado.includes('da Indústria Alfa — CNPJ: 11.222.333/0001-81.'));
});

test('CNPJ inválido/legado ruim: a mensagem NUNCA mostra o valor cru nem "CNPJ:" vazio', async () => {
  const { textoDecodificado: t1 } = await rodarAbrirConsulta({ id: 'e1', nome: 'Emp', cnpj: CNPJ_INVALIDO_MASC });
  assert.ok(!t1.includes(CNPJ_INVALIDO_MASC));
  assert.doesNotMatch(t1, /CNPJ:/);
  const { textoDecodificado: t2 } = await rodarAbrirConsulta({ id: 'e1', nome: 'Emp', cnpj: 'abc@#' });
  assert.ok(!t2.includes('abc@#'));
  assert.doesNotMatch(t2, /CNPJ:/);
});
