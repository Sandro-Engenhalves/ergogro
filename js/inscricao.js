/* ============================================================
   ErgoGRO — Helper central de inscrições do cliente v1
   Tipos: CNPJ (numérico e alfanumérico), CPF, CNO, CAEPF e CEI (legado)

   MÓDULO PURO E INERTE: não lê nem grava Storage/IndexedDB/Firebase,
   não acessa DOM nem rede. Toda regra de inscrição mora aqui; os demais
   módulos apenas chamam (nada deve reimplementar máscara/validação).

   MODELO (camelCase), gravado SOMENTE por Inscricao.aplicar():
     tipoInscricao   : 'cnpj' | 'cpf' | 'cno' | 'caepf' | 'cei'
     numeroInscricao : valor normalizado (sem máscara; CNPJ em maiúsculas)
     cnpj            : campo LEGADO — só preenchido quando tipo === 'cnpj'
                       (valor formatado); '' nos demais tipos

   CONTRATO DE validar(tipo, valor) → objeto:
     nivel      : 'vazio'  inscrição não informada — PERMITIDO (opcional)
                  'valido' conferido conforme `verificacao`
                  'aviso'  inválido, mas o formulário NÃO deve bloquear
                  'erro'   inválido; o formulário PODE bloquear valor novo ou
                           alterado (nunca bloquear dado legado inalterado)
     ok         : true para 'vazio' e 'valido'
     bloqueante : true somente para 'erro'
     motivo     : null | 'tipo_desconhecido' | 'caractere_invalido' | 'tamanho'
                  | 'posicoes_13_14_nao_numericas' | 'todos_zeros' | 'repetido'
                  | 'dv_invalido'
     mensagem   : texto curto em português para a interface
     numero     : valor normalizado ('' se vazio; null se não normalizável)
     verificacao: 'digito-verificador' (CNPJ, CPF) | 'estrutural' (CNO, CAEPF,
                  CEI: só formato/tamanho — não existe DV oficial confirmado)
   Caractere não permitido é sempre 'erro' (não há como persisti-lo);
   tamanho errado em CNO/CAEPF/CEI é apenas 'aviso'.
   ============================================================ */

const Inscricao = (() => {

  /* ─────────────────────────────────────────────────────────
     DEFINIÇÃO DOS TIPOS
     grupos/seps: máscara de apresentação (progressiva). CAEPF não tem
     máscara: o formato oficial não foi confirmado em fonte primária.
  ───────────────────────────────────────────────────────── */

  const TIPOS = {
    cnpj:  { rotulo: 'CNPJ',         curto: 'CNPJ',  tamanho: 14, letras: true,
             grupos: [2, 3, 3, 4, 2], seps: ['.', '.', '/', '-'], placeholder: '00.000.000/0000-00',
             busca: true,  politica: 'bloqueante', verificacao: 'digito-verificador', legado: false, inputMode: 'text' },
    cpf:   { rotulo: 'CPF',          curto: 'CPF',   tamanho: 11, letras: false,
             grupos: [3, 3, 3, 2],    seps: ['.', '.', '-'],      placeholder: '000.000.000-00',
             busca: false, politica: 'bloqueante', verificacao: 'digito-verificador', legado: false, inputMode: 'numeric' },
    cno:   { rotulo: 'CNO',          curto: 'CNO',   tamanho: 12, letras: false,
             grupos: [2, 3, 5, 2],    seps: ['.', '.', '/'],      placeholder: '00.000.00000/00',
             busca: false, politica: 'aviso',      verificacao: 'estrutural',        legado: false, inputMode: 'numeric' },
    caepf: { rotulo: 'CAEPF',        curto: 'CAEPF', tamanho: 14, letras: false,
             grupos: [14],            seps: [],                   placeholder: '00000000000000',
             busca: false, politica: 'aviso',      verificacao: 'estrutural',        legado: false, inputMode: 'numeric' },
    cei:   { rotulo: 'CEI (legado)', curto: 'CEI',   tamanho: 12, letras: false,
             grupos: [2, 3, 5, 2],    seps: ['.', '.', '/'],      placeholder: '00.000.00000/00',
             busca: false, politica: 'aviso',      verificacao: 'estrutural',        legado: true,  inputMode: 'numeric' },
  };
  const ORDEM = ['cnpj', 'cpf', 'cno', 'caepf', 'cei'];

  /* Únicos caracteres de FORMATAÇÃO removidos: ponto, barra, hífen e espaços.
     Qualquer outro caractere é tratado como inválido (nunca descartado). */
  const FORMATACAO = /[.\/\-\s]/g;

  /* ─────────────────────────────────────────────────────────
     UTILITÁRIOS INTERNOS
  ───────────────────────────────────────────────────────── */

  /* Devolve a chave do tipo em minúsculas, ou null se desconhecido. */
  function _tipoValido(tipo) {
    if (typeof tipo !== 'string') return null;
    const k = tipo.trim().toLowerCase();
    return ORDEM.includes(k) ? k : null;
  }

  /* Texto seguro: null/undefined → ''; valores não convertíveis → null. */
  function _texto(valor) {
    try { return valor == null ? '' : String(valor); } catch (e) { return null; }
  }

  /* Máscara progressiva sobre valor JÁ normalizado. O separador só aparece
     quando existe um próximo caractere; excesso além do tamanho é mantido
     após a máscara (nunca se trunca nem se descarta dado). */
  function _mascarar(t, norm) {
    const { grupos, seps } = TIPOS[t];
    let saida = '', g = 0, usados = 0;
    for (const c of norm) {
      if (g < grupos.length && usados === grupos[g]) {
        g++; usados = 0;
        if (g < grupos.length) saida += seps[g - 1];
      }
      saida += c; usados++;
    }
    return saida;
  }

  /* DV do CNPJ (Manual oficial Receita/SERPRO, 05/11/2024): valor de cada
     caractere = código ASCII − 48 (0-9 → 0-9; A → 17 … Z → 42); pesos 2..9
     da direita para a esquerda, reiniciando em 2; resto < 2 → 0, senão 11 − resto. */
  function _dvCnpj(base) {
    let soma = 0, peso = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      soma += (base.charCodeAt(i) - 48) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  /* DV do CPF: pesos (n+1)..2 sobre os n primeiros dígitos; mesma regra do resto. */
  function _dvCpf(base) {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  /* Confere a regra específica do tipo sobre o valor normalizado de tamanho
     correto. Devolve null se estiver ok ou o código do motivo da falha. */
  function _conferir(t, n) {
    if (t === 'cnpj') {
      if (!/^[0-9]{2}$/.test(n.slice(12))) return 'posicoes_13_14_nao_numericas';
      if (/^0+$/.test(n)) return 'todos_zeros';
      const d1 = _dvCnpj(n.slice(0, 12)), d2 = _dvCnpj(n.slice(0, 12) + d1);
      return n.slice(12) === `${d1}${d2}` ? null : 'dv_invalido';
    }
    if (t === 'cpf') {
      if (/^(\d)\1{10}$/.test(n)) return 'repetido';
      return (_dvCpf(n.slice(0, 9)) === Number(n[9]) && _dvCpf(n.slice(0, 10)) === Number(n[10])) ? null : 'dv_invalido';
    }
    return null;   /* CNO, CAEPF, CEI: sem algoritmo confirmado → só estrutura */
  }

  const MENSAGENS = {
    tipo_desconhecido: 'Tipo de inscrição desconhecido.',
    posicoes_13_14_nao_numericas: 'As duas últimas posições (dígitos verificadores) devem ser números.',
    todos_zeros: 'CNPJ com todos os dígitos zero não é válido.',
    repetido: 'CPF com todos os dígitos iguais não é válido.',
    dv_invalido: 'Os dígitos verificadores não conferem.',
  };

  function _res(nivel, motivo, mensagem, numero, t) {
    return {
      nivel, ok: nivel === 'vazio' || nivel === 'valido', bloqueante: nivel === 'erro',
      motivo, mensagem, numero, verificacao: t ? TIPOS[t].verificacao : null,
    };
  }

  /* Compara dois valores legados/novos de CNPJ ignorando a formatação. */
  function _iguais(a, b) {
    const na = normalizar('cnpj', a), nb = normalizar('cnpj', b);
    return (na !== null && nb !== null) ? na === nb : String(a).trim() === String(b).trim();
  }

  /* ─────────────────────────────────────────────────────────
     API — TIPOS E RÓTULOS
  ───────────────────────────────────────────────────────── */

  /* Metadados para montar o seletor/campo da interface (nova cópia a cada chamada).
     buscaAutomatica só informa a capacidade — este módulo não executa busca. */
  function tipos() {
    return ORDEM.map(t => {
      const d = TIPOS[t];
      return {
        tipo: t, value: t, rotulo: d.rotulo, rotuloCurto: d.curto, placeholder: d.placeholder,
        tamanho: d.tamanho, tamanhoMaximo: d.tamanho + d.seps.length,
        alfanumerico: d.letras, inputMode: d.inputMode,
        buscaAutomatica: d.busca, politicaValidacao: d.politica, verificacao: d.verificacao, legado: d.legado,
      };
    });
  }

  /* 'CEI (legado)' por padrão; com curto=true devolve 'CEI'. Tipo desconhecido → ''. */
  function rotulo(tipo, curto) {
    const t = _tipoValido(tipo);
    return t ? (curto ? TIPOS[t].curto : TIPOS[t].rotulo) : '';
  }

  /* ─────────────────────────────────────────────────────────
     API — NORMALIZAR / FORMATAR / VALIDAR
  ───────────────────────────────────────────────────────── */

  /* Remove só a formatação conhecida e põe letras em maiúsculas.
     Devolve null se sobrar caractere não permitido (nada é descartado em silêncio)
     ou se o tipo for desconhecido. Não trunca: excesso de tamanho é mantido
     (validar() acusa). O teste de caracteres vem ANTES do toUpperCase para que
     letras não-ASCII (ex.: ß, ı, ſ) não virem A-Z. */
  function normalizar(tipo, valor) {
    const t = _tipoValido(tipo);
    const bruto = _texto(valor);
    if (!t || bruto === null) return null;
    const s = bruto.replace(FORMATACAO, '');
    const permitido = TIPOS[t].letras ? /^[0-9A-Za-z]*$/ : /^[0-9]*$/;
    return permitido.test(s) ? s.toUpperCase() : null;
  }

  /* Máscara PROGRESSIVA para digitação e exibição. Nunca perde dado: valor com
     caractere não permitido volta exatamente como veio (a validação acusa) e o
     excesso além do tamanho permanece após a máscara. Idempotente. */
  function formatar(tipo, valor) {
    const t = _tipoValido(tipo);
    const bruto = _texto(valor);
    if (bruto === null) return '';
    if (!t) return bruto;
    const n = normalizar(t, bruto);
    return n === null ? bruto : _mascarar(t, n);
  }

  /* Validação conforme o contrato descrito no cabeçalho. */
  function validar(tipo, valor) {
    const t = _tipoValido(tipo);
    if (!t) return _res('erro', 'tipo_desconhecido', MENSAGENS.tipo_desconhecido, null, null);
    const d = TIPOS[t];
    const n = normalizar(t, valor);
    if (n === null) {
      return _res('erro', 'caractere_invalido',
        d.letras ? `${d.curto} aceita apenas números e letras (A-Z).` : `${d.curto} aceita apenas números.`, null, t);
    }
    if (n === '') return _res('vazio', null, 'Inscrição não informada (opcional).', '', t);
    const falha = d.politica === 'bloqueante' ? 'erro' : 'aviso';
    if (n.length !== d.tamanho) {
      return _res(falha, 'tamanho',
        `${d.curto} deve ter ${d.tamanho} ${d.letras ? 'posições' : 'dígitos'} (informado: ${n.length}).`, n, t);
    }
    const motivo = _conferir(t, n);
    if (motivo) return _res(falha, motivo, MENSAGENS[motivo], n, t);
    return _res('valido', null, d.verificacao === 'digito-verificador' ? 'Inscrição válida.' : 'Formato válido (sem verificação de DV).', n, t);
  }

  /* ─────────────────────────────────────────────────────────
     API — LEITURA DO CLIENTE (compatível com legado)
  ───────────────────────────────────────────────────────── */

  /* Interpreta a inscrição de uma empresa (ou do snapshot av.empresa).
       A) tipoInscricao reconhecido → usa tipoInscricao + numeroInscricao.
          Exceção (compatibilidade com JS antigo): se tipo === 'cnpj' e o campo
          legado `cnpj` existir como texto, ele PREVALECE sobre numeroInscricao
          (inclusive vazio); a diferença é sinalizada em `divergente`.
       B) sem tipoInscricao (ou desconhecido) → CNPJ legado: numero vem de `cnpj`,
          legado = true. NUNCA se infere CPF/CNO/CEI pelo tamanho.
       C) sem tipo e sem cnpj → CNPJ legado vazio (estado normal).
     Nada é corrigido nem truncado. Retorna:
       tipo, rotulo, numero (normalizado; null se houver caractere não permitido),
       formatado (máscara; se não normalizável, o texto original), vazio,
       valido (true só se nivelValidacao === 'valido'; para vazio use `vazio`),
       legado, divergente, nivelValidacao, motivo, verificacao.
     Um legado inválido NÃO deve bloquear a edição do cliente. */
  function obter(emp) {
    const e = emp && typeof emp === 'object' ? emp : {};
    const declarado = _tipoValido(e.tipoInscricao);
    const legado = declarado === null;
    const tipo = declarado || 'cnpj';
    const espelho = (typeof e.cnpj === 'string' || typeof e.cnpj === 'number') ? String(e.cnpj) : null;
    const numeroNovo = e.numeroInscricao == null ? null : _texto(e.numeroInscricao);

    let bruto, divergente = false;
    if (tipo === 'cnpj') {
      if (legado) bruto = espelho === null ? '' : espelho;
      else if (espelho !== null) { bruto = espelho; divergente = numeroNovo !== null && !_iguais(numeroNovo, espelho); }
      else bruto = numeroNovo === null ? '' : numeroNovo;
    } else {
      bruto = numeroNovo === null ? '' : numeroNovo;
      divergente = espelho !== null && espelho.replace(FORMATACAO, '') !== '';   /* cnpj deveria estar vazio */
    }

    const v = validar(tipo, bruto);
    const numero = v.numero;
    return {
      tipo, rotulo: TIPOS[tipo].rotulo, numero,
      formatado: numero === null ? (_texto(bruto) || '').trim() : _mascarar(tipo, numero),
      vazio: numero === '', valido: v.nivel === 'valido', legado, divergente,
      nivelValidacao: v.nivel, motivo: v.motivo, verificacao: v.verificacao,
    };
  }

  /* ─────────────────────────────────────────────────────────
     API — ESCRITA EM MEMÓRIA (única função que grava os campos)
  ───────────────────────────────────────────────────────── */

  /* Grava tipoInscricao, numeroInscricao e o espelho legado `cnpj` no PRÓPRIO
     objeto recebido e devolve esse mesmo objeto (sem cópia). Não persiste nada:
     não chama Storage nem Firebase. Não valida regra de negócio (use validar()
     antes); lança erro se o tipo for desconhecido ou o valor tiver caractere não
     permitido — nesse caso o objeto NÃO é alterado. Aceita vazio.
       cnpj → cnpj = valor formatado | demais tipos → cnpj = '' */
  function aplicar(emp, tipo, valor) {
    if (!emp || typeof emp !== 'object') throw new TypeError('Inscricao.aplicar: informe o objeto da empresa.');
    const t = _tipoValido(tipo);
    if (!t) throw new TypeError('Inscricao.aplicar: tipo de inscrição desconhecido.');
    const n = normalizar(t, valor);
    if (n === null) throw new RangeError(`Inscricao.aplicar: caractere não permitido para ${TIPOS[t].curto}.`);
    emp.tipoInscricao = t;
    emp.numeroInscricao = n;
    emp.cnpj = t === 'cnpj' ? _mascarar(t, n) : '';
    return emp;
  }

  /* Somente os campos para snapshot (ex.: criarAvaliacao), com as mesmas regras
     de obter(). Legado: o texto original de `cnpj` é preservado como está. */
  function campos(emp) {
    const o = obter(emp);
    const e = emp && typeof emp === 'object' ? emp : {};
    const numero = o.numero === null ? '' : o.numero;
    if (o.tipo !== 'cnpj') return { tipoInscricao: o.tipo, numeroInscricao: numero, cnpj: '' };
    const espelho = (typeof e.cnpj === 'string' || typeof e.cnpj === 'number') ? String(e.cnpj) : (numero ? _mascarar('cnpj', numero) : '');
    return { tipoInscricao: 'cnpj', numeroInscricao: numero, cnpj: espelho };
  }

  /* Chave de identificação/duplicidade: 'tipo:numero' (ex.: 'cnpj:12345678000195').
     Inscrição vazia (ou não normalizável) → '' (neutro: não entra em duplicidade).
     O tipo nunca é inferido pelo tamanho. */
  function chave(emp) {
    const o = obter(emp);
    return (o.numero === null || o.numero === '') ? '' : `${o.tipo}:${o.numero}`;
  }

  /* PORTÃO DE PRIVACIDADE para superfícies públicas (coleções públicas do
     Firestore, consulta pública, WhatsApp). Devolve o CNPJ já formatado
     SOMENTE se tipo === 'cnpj' e o número for um CNPJ com DV válido (evita
     publicar valor legado mal classificado). CPF, CNO, CAEPF e CEI → '' sempre. */
  function publico(emp) {
    const o = obter(emp);
    if (o.tipo !== 'cnpj' || o.vazio || o.numero === null) return '';
    return validar('cnpj', o.numero).nivel === 'valido' ? _mascarar('cnpj', o.numero) : '';
  }

  /* ─────────────────────────────────────────────────────────
     API — EXIBIÇÃO INTERNA (telas, relatórios, impressão)
  ───────────────────────────────────────────────────────── */

  /* Apresentação da inscrição para superfícies INTERNAS. Só compõe obter() e
     rotulo(): não normaliza, não mascara e não valida por conta própria.
     Devolve { tipo, rotulo, valor, texto, vazio }:
       rotulo : 'CNPJ' | 'CPF' | 'CNO' | 'CAEPF' | 'CEI' (curto)
       valor  : número formatado; '' se vazio
       texto  : 'CPF: 529.982.247-25'; '' se vazio (o chamador decide se mostra '—')
       vazio  : true quando não há inscrição informada
     Legado sem tipoInscricao é lido como CNPJ (via obter). Dado legado inválido ou
     não normalizável NÃO é ocultado: valor traz o texto original (como obter().formatado).
     NÃO serve para superfícies públicas/externas — para elas use publico(). */
  function exibir(emp) {
    const o = obter(emp);
    const r = rotulo(o.tipo, true);
    const valor = o.vazio ? '' : o.formatado;
    return { tipo: o.tipo, rotulo: r, valor, texto: o.vazio ? '' : `${r}: ${valor}`, vazio: o.vazio };
  }

  return Object.freeze({ tipos, normalizar, formatar, validar, rotulo, obter, aplicar, campos, chave, publico, exibir });
})();
