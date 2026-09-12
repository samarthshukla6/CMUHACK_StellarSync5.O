// Auth0 Universal Login via the official SPA SDK (Authorization Code + PKCE) - home page nav widget.
// The booking flow itself lives in the separate dashboard app; this only shows sign-in state and account/bookings.
(() => {
  let client, ready, authenticated = false, profile, backend = { configured: false }, initializing = true;
  const notice = document.createElement('div');
  notice.className = 'auth-notice'; notice.hidden = true;
  notice.setAttribute('role', 'status'); document.body.append(notice);
  function message(text) { notice.textContent = text; notice.hidden = false; }
  function buttons() {
    document.querySelectorAll('[data-account]').forEach(button => {
      button.hidden = !authenticated;
      button.textContent = 'My account · ' + (profile?.given_name || profile?.name || 'Traveler');
      button.onclick = showAccount;
    });
    document.querySelectorAll('.home-nav [data-start]').forEach(button => button.textContent = authenticated ? 'Book storage ↗' : 'Get Started ↗');
    document.querySelectorAll('[data-auth]').forEach(button => {
      button.textContent = initializing ? 'Signing in…' : authenticated ? 'Sign out' : 'Log in / Sign up';
      button.disabled = initializing;
      button.onclick = async () => {
        try {
          if (authenticated) await client.logout({ logoutParams: { returnTo: window.location.origin } });
          else await login();
        } catch { message('Sign-in could not complete. Please try again.'); }
      };
    });
  }
  const navParent = document.querySelector('.home-nav');
  const account = document.createElement('button'); account.dataset.account = ''; account.hidden = true; account.className = 'account-chip'; navParent.append(account);
  const authButton = document.createElement('button'); authButton.dataset.auth = ''; navParent.append(authButton);
  async function login() {
    await ready;
    if (!client) { message('Login is not connected yet. The Auth0 application needs to be configured.'); return; }
    await client.loginWithRedirect({ authorizationParams: { redirect_uri: window.location.origin } });
  }
  async function api(path, options = {}) {
    if (!backend.configured) throw new Error('Signed in. Account storage will be available when connected.');
    const token = await client.getTokenSilently();
    const response = await fetch('/api' + path, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load your account.'); return data;
  }
  async function syncProfile() { try { await api('/me', { method: 'POST' }); notice.hidden = true; } catch (error) { message(error.message || 'Signed in, but account sync is unavailable.'); } }
  const accountDialog = document.createElement('dialog'); accountDialog.className = 'account-dialog';
  accountDialog.innerHTML = '<div class="aside-head"><h2>Your account</h2><button data-close aria-label="Close account">×</button></div><p data-profile></p><h3>Your bookings</h3><div data-bookings role="status"></div>';
  document.body.append(accountDialog); accountDialog.querySelector('[data-close]').onclick = () => accountDialog.close();
  async function showAccount() {
    accountDialog.querySelector('[data-profile]').textContent = [profile?.name, profile?.email].filter(Boolean).join(' · ');
    const list = accountDialog.querySelector('[data-bookings]'); list.textContent = 'Loading your saved bookings…'; accountDialog.showModal();
    try {
      const { bookings } = await api('/bookings'); list.replaceChildren();
      if (!bookings.length) list.textContent = 'No saved bookings yet. Choose a spot to start your first trip.';
      for (const booking of bookings) { const card = document.createElement('article'), heading = document.createElement('strong'), detail = document.createElement('p'); heading.textContent = booking.businessName; detail.textContent = booking.bags + ' bag(s) · ' + new Date(booking.trip.drop).toLocaleString() + ' · $' + (booking.pricing.totalCents / 100).toFixed(2) + ' · Simulated booking'; card.append(heading, detail); list.append(card); }
    } catch (error) { list.textContent = error.message || 'Your bookings could not load.'; }
  }
  ready = (async () => {
    const config = window.BOXMATE_CONFIG || {};
    try { const response = await fetch('/api/config', { signal: AbortSignal.timeout(10000) }); if (response.ok) backend = await response.json(); } catch {}
    if (!config.auth0Domain || !config.auth0ClientId) { initializing = false; buttons(); return; }
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.auth0.com/js/auth0-spa-js/2.18/auth0-spa-js.production.js';
        const timer = setTimeout(() => reject(new Error('Login service timed out')), 15000); script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); reject(new Error('Login service unavailable')); }; document.head.append(script);
      });
      client = new window.auth0.Auth0Client({ domain: config.auth0Domain, clientId: config.auth0ClientId, authorizationParams: { redirect_uri: window.location.origin, ...(backend.audience ? { audience: backend.audience } : {}), scope: 'openid profile email' }, cache: { get: key => { try { return JSON.parse(sessionStorage.getItem('lm-auth:' + key) || 'null') || undefined; } catch { return undefined; } }, set: (key, value) => sessionStorage.setItem('lm-auth:' + key, JSON.stringify(value)), remove: key => sessionStorage.removeItem('lm-auth:' + key), allKeys: () => Object.keys(sessionStorage).filter(key => key.startsWith('lm-auth:')).map(key => key.slice(8)) } });
      const params = new URLSearchParams(location.search);
      let returnTo;
      // A window with an opener and a pending code/state is a loginWithPopup() popup
      // (see dashboard/auth.js): its opener reads this same-origin popup's URL directly
      // and completes the token exchange itself, then closes this popup. Handling the
      // callback here too would race to consume the same one-time authorization code.
      if (!window.opener && params.has('state') && (params.has('code') || params.has('error'))) {
        try { const result = await client.handleRedirectCallback(); returnTo = result?.appState?.returnTo; }
        finally { history.replaceState({}, document.title, location.pathname); }
      }
      authenticated = await client.isAuthenticated();
      // Sign-in started elsewhere (e.g. the dashboard) always calls back here, since that's the
      // only registered Auth0 callback URL - bounce back once the session is confirmed.
      if (authenticated && returnTo) { window.location.replace(returnTo); return; }
      if (authenticated) { profile = await client.getUser(); buttons(); syncProfile(); } else buttons();
    } catch { client = null; message('Sign-in could not finish. Please use Log in / Sign up to try again.'); }
    finally { initializing = false; buttons(); }
  })();
  buttons();
})();
