// Auth0 Universal Login via the official SPA SDK (Authorization Code + PKCE).
(() => {
  let client, ready, authenticated = false, profile, backend={configured:false};
  let bookingRequest, initializing=true;
  window.boxmateAccount={authenticated:false};
  const key = 'boxmate-login-draft';
  const notice = document.createElement('div');
  notice.className = 'auth-notice'; notice.hidden = true;
  notice.setAttribute('role', 'status'); document.body.append(notice);
  function message(text) { notice.textContent = text; notice.hidden = false; const status=document.querySelector('#checkoutAuthStatus');if(status)status.textContent=text; }
  function buttons() {
    window.boxmateAccount={authenticated};
    document.querySelectorAll('[data-account]').forEach(button=>{
      button.hidden=!authenticated;
      button.textContent='My account · '+(profile?.given_name||profile?.name||'Traveler');
      button.onclick=showAccount;
    });
    document.querySelectorAll('[data-auth]').forEach(button => {
      button.textContent = initializing ? 'Signing in…' : authenticated ? 'Sign out' : 'Log in / Sign up';
      button.disabled=initializing;
      button.onclick = async () => {
        try {
          if (authenticated) { sessionStorage.removeItem(key); await client.logout({logoutParams:{returnTo:window.location.origin}}); }
          else await login(false);
        } catch { message('Sign-in could not complete. Please try again.'); }
      };
    });
    paintCheckout();
  }
  function paintCheckout(){
    const button=document.querySelector('#pay');if(!button)return;
    button.disabled=initializing;button.textContent=initializing?'Checking sign-in…':'Book storage';
    let status=document.querySelector('#checkoutAuthStatus');
    if(!status){status=document.createElement('p');status.id='checkoutAuthStatus';status.className='checkout-auth-status';status.setAttribute('role','status');button.before(status);}
    status.textContent=initializing?'Finishing sign-in. Please wait…':authenticated?'Signed in as '+(profile?.name||profile?.email||'Traveler'):'Log in or create an account to save your booking.';
    if(!authenticated&&!initializing){const loginButton=document.createElement('button');loginButton.type='button';loginButton.textContent='Log in / Sign up';loginButton.onclick=()=>login(true).catch(()=>message('Unable to start sign-in. Please try again.'));status.append(document.createElement('br'),loginButton);}
  }
  const renderBeforeAccount=render;render=function(){renderBeforeAccount();paintCheckout();};
  const headerParent=document.querySelector('header');
  const account=document.createElement('button');account.dataset.account='';account.hidden=true;account.className='account-chip';headerParent.append(account);
  const authButton = document.createElement('button'); authButton.dataset.auth = ''; headerParent.append(authButton);
  function save(returnToCheckout) {
    sessionStorage.setItem(key, JSON.stringify({trip,selected,inventory,value,bags,protection,returnToCheckout,photoState:window.photoDraftForLogin?.()}));
  }
  async function login(returnToCheckout) {
    await ready;
    if (!client) { message('Login is not connected yet. The Auth0 application needs to be configured.'); return; }
    save(returnToCheckout);
    if (window.self !== window.top) {
      // Auth0's hosted login page refuses to render inside any iframe (clickjacking
      // protection), so when this dashboard is itself embedded (e.g. inside HealthX
      // Dashboard's iframe), open Universal Login in a popup instead of redirecting
      // the iframe. The popup navigates back to this same origin; home/auth.js
      // recognizes it has an opener and leaves the code for this popup flow to consume.
      await client.loginWithPopup();
      authenticated = true; profile = await client.getUser();
      if (sessionStorage.getItem(key)) restore();
      buttons(); syncProfile();
      return;
    }
    // Auth0's registered callback URL is the bare origin, so sign-in round-trips through the home
    // page (see home/auth.js) and bounces back here via appState.returnTo.
    await client.loginWithRedirect({appState:{returnToCheckout,returnTo:'/dashboard/'},authorizationParams:{redirect_uri:window.location.origin}});
  }
  document.addEventListener('click', async event => {
    if (!event.target.closest('#pay') || authenticated) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try { await login(true); } catch { message('Unable to start login. Your booking details are still here.'); }
  }, true);
  function restore() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.removeItem(key);
      if (!draft) return;
      if (draft.trip && typeof draft.trip === 'object') for (const k of Object.keys(trip)) if (typeof draft.trip[k] === 'string') trip[k] = draft.trip[k];
      if (Number.isInteger(draft.selected) && places[draft.selected]) selected = draft.selected;
      if (typeof draft.inventory === 'string') inventory = draft.inventory;
      if (Number.isFinite(draft.value) && draft.value >= 0) value = draft.value;
      if (Number.isInteger(draft.bags) && draft.bags >= 1 && draft.bags <= 20) bags = draft.bags;
      if ([0,1,2].includes(draft.protection)) protection = draft.protection;
      if(draft.photoState)window.restorePhotoDraft?.(draft.photoState);
      if (draft.returnToCheckout) { mode = 'guided'; step = 2; render(); }
    } catch { sessionStorage.removeItem(key); }
  }
  async function api(path, options={}) {
    if(!backend.configured)throw new Error('Signed in. Saving your account and bookings will be available when Atlas is connected.');
    const token=await client.getTokenSilently();
    const response=await fetch('/api'+path,{...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(150000)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save your changes.');return data;
  }
  async function syncProfile(){
    try{await api('/me',{method:'POST'});notice.hidden=true;}
    catch(error){message(error.message||'Signed in, but account sync is unavailable.');}
  }
  const accountDialog=document.createElement('dialog');accountDialog.className='account-dialog';
  accountDialog.innerHTML='<div class="aside-head"><h2>Your account</h2><button data-close aria-label="Close account">×</button></div><p data-profile></p><h3>Your bookings</h3><div data-bookings role="status"></div>';
  document.body.append(accountDialog);accountDialog.querySelector('[data-close]').onclick=()=>accountDialog.close();
  async function showAccount(){
    accountDialog.querySelector('[data-profile]').textContent=[profile?.name,profile?.email].filter(Boolean).join(' · ');
    const list=accountDialog.querySelector('[data-bookings]');list.textContent='Loading your saved bookings…';accountDialog.showModal();
    try{
      const {bookings}=await api('/bookings');list.replaceChildren();
      if(!bookings.length)list.textContent='No saved bookings yet. Choose a spot to start your first trip.';
      for(const booking of bookings){const card=document.createElement('article'),heading=document.createElement('strong'),detail=document.createElement('p');heading.textContent=booking.businessName;detail.textContent=booking.bags+' bag(s) · '+new Date(booking.trip.drop).toLocaleString()+' · '+money(booking.pricing.totalCents/100)+' · Simulated booking';card.append(heading,detail);list.append(card)}
    }catch(error){list.textContent=error.message||'Your bookings could not load.';}
  }
  window.analyzeTravelPhotos=async files=>{
    await ready;
    if(!authenticated)throw new Error('Please sign in first, then choose your photos. Analysis has not started.');
    const body=new FormData();for(const file of files)body.append('images',file);
    return (await api('/photo-analysis',{method:'POST',body})).analysis;
  };
  window.saveTravelBooking=async()=>{
    await ready;
    if(!authenticated){await login(true);return null;}
    const button=document.querySelector('#pay');button.disabled=true;button.textContent='Saving your booking…';
    try{
      if(!trip.drop||!trip.pickup||!Number.isFinite(new Date(trip.drop).getTime())||!Number.isFinite(new Date(trip.pickup).getTime()))throw new Error('Choose valid storage dates.');
      const photoAnalysis=window.photoBookingEvidence?.();
      const body={...(photoAnalysis?{photoAnalysis}:{}),locationId:['cohon-university-center','tepper-quad','gates-hillman-center'][selected],inventory,bags,value,protection,trip:{...trip,drop:new Date(trip.drop).toISOString(),pickup:new Date(trip.pickup).toISOString()}};
      const serialized=JSON.stringify(body);if(bookingRequest?.body!==serialized)bookingRequest={body:serialized,id:crypto.randomUUID()};
      const {booking}=await api('/bookings',{method:'POST',headers:{'Idempotency-Key':bookingRequest.id},body:serialized});
      bookingRequest=undefined;notice.hidden=true;return booking;
    }catch(error){message(error.message||'Your booking could not be saved. Please try again.');return null;}
    finally{if(button.isConnected){button.disabled=false;button.textContent='Book storage';}}
  };
  ready = (async () => {
    const config = window.BOXMATE_CONFIG || {};
    try{const response=await fetch('/api/config',{signal:AbortSignal.timeout(10000)});if(response.ok)backend=await response.json()}catch{}
    if(backend.configured){
      void (async()=>{try{const response=await fetch('/api/locations',{signal:AbortSignal.timeout(10000)});if(response.ok){const data=await response.json();for(const row of data.locations){const index=['cohon-university-center','tepper-quad','gates-hillman-center'].indexOf(row._id);if(index>=0){Object.assign(locations[index],{lat:row.lat,lng:row.lng,address:row.address,photo:row.photo});Object.assign(places[index],{name:row.name,type:row.type,rate:row.rate,cap:row.cap});}}if(step===1)render();}}catch{}})();
    }
    if (!config.auth0Domain || !config.auth0ClientId){initializing=false;buttons();return;}
    try {
      await new Promise((resolve,reject) => {
        const script=document.createElement('script');
        script.src='https://cdn.auth0.com/js/auth0-spa-js/2.18/auth0-spa-js.production.js';
        const timer=setTimeout(()=>reject(new Error('Login service timed out')),15000);script.onload=()=>{clearTimeout(timer);resolve()}; script.onerror=()=>{clearTimeout(timer);reject(new Error('Login service unavailable'))}; document.head.append(script);
      });
      client = new window.auth0.Auth0Client({domain:config.auth0Domain,clientId:config.auth0ClientId,authorizationParams:{redirect_uri:window.location.origin,...(backend.audience?{audience:backend.audience}:{}),scope:'openid profile email'},cache:{get:key=>{try{return JSON.parse(sessionStorage.getItem('lm-auth:'+key)||'null')||undefined}catch{return undefined}},set:(key,value)=>sessionStorage.setItem('lm-auth:'+key,JSON.stringify(value)),remove:key=>sessionStorage.removeItem('lm-auth:'+key),allKeys:()=>Object.keys(sessionStorage).filter(key=>key.startsWith('lm-auth:')).map(key=>key.slice(8))}});
      // Auth0's registered callback URL is the bare origin, so the redirect always lands on the
      // home page (home/auth.js), which bounces back here already signed in - never a ?state=/&code=
      // pair to handle on this page. A pending draft (saved by login() before redirecting away) is
      // restored here once the session comes back authenticated.
      authenticated = await client.isAuthenticated();
      if (authenticated && sessionStorage.getItem(key)) restore();
      if(authenticated){profile=await client.getUser();buttons();syncProfile();}else buttons();
    } catch { client = null; message('Sign-in could not finish. Please use Log in / Sign up to try again.'); }
    finally{initializing=false;buttons();}
  })();
  buttons();
})();
