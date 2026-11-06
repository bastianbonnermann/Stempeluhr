(() => {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbxLEq9Hb_sHf8PMEO3GKmhD3CacKwHSlhE2EzxsifCqTaq4y9r1JtpJQ4UX4jKE-B1u1g/exec';
  const TOKEN_KEY = 'stempeluhr_device_token_v1';
  const $ = id => document.getElementById(id);
  let base = new Date(), offset = 0, busy = false;
  const pad = n => String(n).padStart(2, '0');
  const dateISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateDE = d => new Intl.DateTimeFormat('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const dateLong = d => new Intl.DateTimeFormat('de-DE', {weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const time = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const selected = () => new Date(base.getTime() + offset * 60000);
  const token = () => localStorage.getItem(TOKEN_KEY) || '';

  function setStatus(message, kind='') {
    const el = $('status');
    el.textContent = message;
    el.className = 'small status ' + kind;
  }
  function updatePairingUI() {
    const paired = !!token();
    $('pair-panel').hidden = paired;
    $('paired-status').hidden = !paired;
    $('send').disabled = !paired || busy;
    if (!paired) setStatus('Bitte dieses Smartphone einmalig koppeln.');
  }
  function draw() {
    base = new Date();
    const d = selected();
    $('current-date').textContent = dateLong(base);
    $('live-time').textContent = time(base);
    $('selected-time').textContent = time(d);
    $('subject').textContent = 'Ausstempelzeit – ' + dateDE(d);
    $('body').innerHTML = 'Datum: ' + dateDE(d) + '<br>Uhrzeit: ' + time(d);
    $('send').disabled = busy || !token();
  }
  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callback = 'stempeluhrCallback_' + Date.now() + '_' + Math.floor(Math.random()*100000);
      const script = document.createElement('script');
      const query = new URLSearchParams({...params, callback, _:String(Date.now())});
      const timer = setTimeout(() => finish(new Error('Zeitüberschreitung. Bitte Firmenpostfach prüfen, bevor du erneut sendest.')), 25000);
      function cleanup() { clearTimeout(timer); delete window[callback]; script.remove(); }
      function finish(error, result) { cleanup(); error ? reject(error) : resolve(result); }
      window[callback] = result => finish(null, result);
      script.onerror = () => finish(new Error('Maildienst nicht erreichbar. Internetverbindung prüfen.'));
      script.src = API_URL + '?' + query.toString();
      document.head.appendChild(script);
    });
  }
  async function pairDevice() {
    const code = $('pair-code').value.trim().replace(/\s+/g, '').toUpperCase();
    if (!code) { $('pair-message').textContent = 'Bitte den einmaligen Kopplungscode eingeben.'; return; }
    $('pair-button').disabled = true;
    $('pair-message').textContent = 'Smartphone wird gekoppelt …';
    try {
      const result = await jsonp({action:'pair', code});
      if (!result || !result.success || !result.token) throw new Error(result?.message || 'Kopplung fehlgeschlagen.');
      localStorage.setItem(TOKEN_KEY, result.token);
      $('pair-code').value = '';
      $('pair-message').textContent = result.message;
      updatePairingUI();
      setStatus('Gerät gekoppelt. Stempeluhr ist bereit.', 'success');
    } catch (e) {
      $('pair-message').textContent = e.message || 'Kopplung fehlgeschlagen.';
    } finally {
      $('pair-button').disabled = false;
    }
  }
  document.querySelectorAll('[data-delta]').forEach(button => button.addEventListener('click', () => {
    offset += Number(button.dataset.delta); draw(); setStatus('Uhrzeit angepasst.');
  }));
  $('reset').addEventListener('click', () => { offset=0; draw(); setStatus('Aktuelle Uhrzeit übernommen.'); });
  $('pair-button').addEventListener('click', pairDevice);
  $('send').addEventListener('click', async () => {
    if (busy || !token()) return;
    const d=selected(), date=dateISO(d), clock=time(d);
    if (!confirm(`Ausstempelzeit ${dateDE(d)} um ${clock} an dein Firmenpostfach senden?`)) return;
    busy=true; $('send').textContent='Wird gesendet …'; $('send').disabled=true; setStatus('E-Mail wird versendet …');
    try {
      const result=await jsonp({action:'send', token:token(), date, time:clock});
      if (!result || result.success !== true) throw new Error(result?.message || 'Versand konnte nicht bestätigt werden.');
      setStatus(result.message || 'E-Mail erfolgreich versendet.', 'success');
      $('send').textContent='✓ Erfolgreich gesendet';
    } catch(error) {
      setStatus(error.message || 'Versand fehlgeschlagen.', 'error');
      $('send').textContent='✉ Erneut versuchen';
    } finally { busy=false; $('send').disabled=!token(); }
  });
  updatePairingUI();
  draw();
  setInterval(draw,1000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
