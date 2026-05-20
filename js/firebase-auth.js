/* ============================================================
   ErgoGRO — Módulo de Autenticação Firebase v1.0
   ─────────────────────────────────────────────────────────
   Autenticação via Google Sign-In.
   Cada usuário vê e gerencia apenas seus próprios dados.

   Dependência: firebase-pesquisa.js carregado antes
   (fornece inicializarFirebase() e FIREBASE_CONFIG)
   ============================================================ */

const Auth = (() => {

  let _usuario = null;          /* firebase.User atual ou null */
  let _callbacks = [];          /* ouvintes de mudança de estado */
  let _inicializado = false;

  /* ── Inicialização ─────────────────────────────────────── */
  function _init() {
    if (typeof inicializarFirebase === 'function') inicializarFirebase();
    if (typeof firebase === 'undefined') return;

    firebase.auth().onAuthStateChanged(user => {
      _usuario = user;
      _inicializado = true;
      /* Notifica todos os ouvintes registrados */
      _callbacks.forEach(cb => { try { cb(user); } catch(e) {} });
    });
  }

  /* ── Login com Google ──────────────────────────────────── */
  async function loginGoogle() {
    if (typeof inicializarFirebase === 'function') inicializarFirebase();
    const provider = new firebase.auth.GoogleAuthProvider();
    /* Força seleção de conta sempre (útil em uso compartilhado) */
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
    try {
      await firebase.auth().signOut();
      console.log('[Auth] Logout realizado');
    } catch (err) {
      console.error('[Auth] Erro no logout:', err.message);
    }
  }

  /* ── Registrar ouvinte de mudança de estado ────────────── */
  function onAuthChange(callback) {
    _callbacks.push(callback);
    /* Se já inicializou, dispara imediatamente com estado atual */
    if (_inicializado) {
      try { callback(_usuario); } catch(e) {}
    }
  }

  /* ── Getters ───────────────────────────────────────────── */
  function getUsuarioAtual() { return _usuario; }
  function getUid()          { return _usuario ? _usuario.uid : null; }
  function getNome()         { return _usuario ? (_usuario.displayName || _usuario.email || 'Usuário') : null; }
  function getFoto()         { return _usuario ? _usuario.photoURL : null; }
  function getEmail()        { return _usuario ? _usuario.email : null; }
  function isLogado()        { return !!_usuario; }

  /* Inicializa ao carregar o módulo */
  _init();

  /* ── API pública ─────────────────────────────────────────*/
  return {
    loginGoogle,
    logout,
    onAuthChange,
    getUsuarioAtual,
    getUid,
    getNome,
    getFoto,
    getEmail,
    isLogado,
  };
})();

/* Expõe globalmente */
window.Auth = Auth;
