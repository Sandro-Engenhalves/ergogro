/* ============================================================
   ErgoGRO — Módulo de Autenticação Firebase v2.0
   ─────────────────────────────────────────────────────────
   Modelo: equipe compartilhada com acesso por convite.

   Fluxo:
   1. Usuário faz login com Google
   2. App verifica se e-mail está em ergogro_config/acesso
   3. Autorizado → acessa o app (dados compartilhados com a equipe)
   4. Não autorizado → mensagem de acesso negado + logout automático
   5. Primeiro login → cria config com o usuário como admin

   Admin pode adicionar/remover e-mails autorizados pelo painel.
   ============================================================ */

const Auth = (() => {

  let _usuario      = null;
  let _autorizado   = false;
  let _isAdmin      = false;
  let _callbacks    = [];
  let _inicializado = false;

  const CONFIG_DOC = 'acesso';
  const CONFIG_COL = 'ergogro_config';

  /* ── Inicialização ─────────────────────────────────────── */
  function _init() {
    if (typeof inicializarFirebase === 'function') inicializarFirebase();
    if (typeof firebase === 'undefined') return;

    firebase.auth().onAuthStateChanged(async user => {
      _usuario = user;
      if (user) {
        await _verificarAutorizacao(user);
      } else {
        _autorizado = false;
        _isAdmin    = false;
      }
      _inicializado = true;
      _callbacks.forEach(cb => { try { cb(user, _autorizado); } catch(e) {} });
    });
  }

  /* ── Verifica se o e-mail está autorizado ──────────────── */
  async function _verificarAutorizacao(user) {
    try {
      const db  = firebase.firestore();
      const ref = db.collection(CONFIG_COL).doc(CONFIG_DOC);
      const doc = await ref.get();

      if (!doc.exists) {
        /* Primeiro acesso: cria config com este usuário como admin */
        await ref.set({
          emailsAutorizados: [user.email],
          adminEmail:        user.email,
          criadoEm:          new Date().toISOString(),
        });
        _autorizado = true;
        _isAdmin    = true;
        console.log('[Auth] Primeiro acesso — config criada. Admin:', user.email);
        return;
      }

      const data = doc.data();
      const emails = (data.emailsAutorizados || []).map(e => e.toLowerCase().trim());
      _autorizado = emails.includes(user.email.toLowerCase().trim());
      _isAdmin    = data.adminEmail?.toLowerCase().trim() === user.email.toLowerCase().trim();

      if (!_autorizado) {
        console.warn('[Auth] Acesso negado:', user.email);
        await firebase.auth().signOut();
      }
    } catch (err) {
      console.error('[Auth] Erro ao verificar autorização:', err.message);
      _autorizado = false;
    }
  }

  /* ── Login com Google ──────────────────────────────────── */
  async function loginGoogle() {
    if (typeof inicializarFirebase === 'function') inicializarFirebase();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const resultado = await firebase.auth().signInWithPopup(provider);
      return resultado.user;
    } catch (err) {
      console.error('[Auth] Erro no login:', err.message);
      throw err;
    }
  }

  /* ── Logout ────────────────────────────────────────────── */
  async function logout() {
    try { await firebase.auth().signOut(); }
    catch (err) { console.error('[Auth] Erro no logout:', err.message); }
  }

  /* ── Registrar ouvinte de mudança de estado ────────────── */
  function onAuthChange(callback) {
    _callbacks.push(callback);
    if (_inicializado) {
      try { callback(_usuario, _autorizado); } catch(e) {}
    }
  }

  /* ══════════════════════════════════════════════════════════
     GERENCIAMENTO DE USUÁRIOS (admin only)
  ══════════════════════════════════════════════════════════ */

  /* Lista todos os e-mails autorizados */
  async function listarEmails() {
    const db  = firebase.firestore();
    const doc = await db.collection(CONFIG_COL).doc(CONFIG_DOC).get();
    if (!doc.exists) return [];
    return doc.data().emailsAutorizados || [];
  }

  /* Adiciona um e-mail à lista de autorizados */
  async function adicionarEmail(email) {
    if (!_isAdmin) throw new Error('Apenas o admin pode gerenciar usuários');
    const emailNorm = email.toLowerCase().trim();
    if (!emailNorm.includes('@')) throw new Error('E-mail inválido');
    const db   = firebase.firestore();
    const ref  = db.collection(CONFIG_COL).doc(CONFIG_DOC);
    const doc  = await ref.get();
    const lista = doc.data()?.emailsAutorizados || [];
    if (lista.map(e => e.toLowerCase()).includes(emailNorm)) {
      throw new Error('E-mail já cadastrado');
    }
    await ref.update({
      emailsAutorizados: firebase.firestore.FieldValue.arrayUnion(emailNorm)
    });
    console.log('[Auth] E-mail adicionado:', emailNorm);
  }

  /* Remove um e-mail da lista de autorizados */
  async function removerEmail(email) {
    if (!_isAdmin) throw new Error('Apenas o admin pode gerenciar usuários');
    const emailNorm = email.toLowerCase().trim();
    if (emailNorm === _usuario?.email?.toLowerCase()) {
      throw new Error('Não é possível remover o próprio admin');
    }
    const db  = firebase.firestore();
    const ref = db.collection(CONFIG_COL).doc(CONFIG_DOC);
    await ref.update({
      emailsAutorizados: firebase.firestore.FieldValue.arrayRemove(emailNorm)
    });
    console.log('[Auth] E-mail removido:', emailNorm);
  }

  /* ── Getters ───────────────────────────────────────────── */
  function getUsuarioAtual()  { return _usuario; }
  function getUid()           { return _usuario ? _usuario.uid : null; }
  function getNome()          { return _usuario ? (_usuario.displayName || _usuario.email || 'Usuário') : null; }
  function getFoto()          { return _usuario ? _usuario.photoURL : null; }
  function getEmail()         { return _usuario ? _usuario.email : null; }
  function isLogado()         { return !!_usuario; }
  function isAutorizado()     { return _autorizado; }
  function isAdminAtual()     { return _isAdmin; }

  _init();

  return {
    loginGoogle, logout, onAuthChange,
    getUsuarioAtual, getUid, getNome, getFoto, getEmail,
    isLogado, isAutorizado, isAdminAtual,
    listarEmails, adicionarEmail, removerEmail,
  };
})();

window.Auth = Auth;
