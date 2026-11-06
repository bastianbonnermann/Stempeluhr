(() => {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbxLEq9Hb_sHf8PMEO3GKmhD3CacKwHSlhE2EzxsifCqTaq4y9r1JtpJQ4UX4jKE-B1u1g/exec';
  const $ = id => document.getElementById(id);
  let base = new Date();
  let offset = 0;
  let busy = false;
  const pad = n => String(n).padStart(2, '0');
  const dateISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateDE = d => new Intl.DateTimeFormat('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const dateLong = d => new Intl.DateTimeFormat('de-DE', {weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const time = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const selected = () => new Date(base.getTime() + offset * 60000);
  function setStatus(message, kind='') { const el=$('status'); el.textContent=message; el.className='small status '+kind; }
  function draw() {
    base = new Date();
    const d = selected();
    $('current-date').textContent = dateLong(base);
    $('live-time').textContent = time(base);
    $('selected-time').textContent = time(d);
    $('subject').textContent = 'Ausstempelzeit – ' + dateDE(d);
    $('body').innerHTML = 'Datum: ' + dateDE(d) + '<br>Uhrzeit: ' + time(d);
    $('send').disabled = busy;
  }
  function sendJsonp(date, clock) {
    return new Promise((resolve, reject) => {
      const callback = 'stempeluhrCallback_' + Date.now() + '_' + Math.floor(Math.random()*100000);
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Zeitüberschreitung. Bitte Verbindung prüfen und Firmenpostfach kontrollieren, bevor du erneut sendest.')), 25000);
      function cleanup() { clearTimeout(timer); delete window[callback]; script.remove(); }
      function finish(error, result) { cleanup(); error ? reject(error) : resolve(result); }
      window[callback] = result => finish(null, result);
      script.onerror = () => finish(new Error('Der Maildienst ist nicht erreichbar. Bitte Internetverbindung und Google-Anmeldung prüfen.'));
      script.src = API_URL + '?action=send&date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(clock) + '&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }
  document.querySelectorAll('[data-delta]').forEach(button => button.addEventListener('click', () => { offset += Number(button.dataset.delta); draw(); setStatus('Uhrzeit angepasst.'); }));
  $('reset').addEventListener('click', () => { offset=0; draw(); setStatus('Aktuelle Uhrzeit übernommen.'); });
  $('send').addEventListener('click', async () => {
    if (busy) return;
    const d=selected(); const date=dateISO(d); const clock=time(d);
    if (!confirm(`Ausstempelzeit ${dateDE(d)} um ${clock} an dein Firmenpostfach senden?`)) return;
    busy=true; $('send').textContent='Wird gesendet …'; $('send').disabled=true; setStatus('E-Mail wird versendet …');
    try {
      const result=await sendJsonp(date,clock);
      if (!result || result.success !== true) throw new Error(result && result.message ? result.message : 'Der Versand konnte nicht bestätigt werden.');
      setStatus(result.message || 'E-Mail erfolgreich versendet.','success');
      $('send').textContent='✓ Erfolgreich gesendet';
    } catch(error) {
      setStatus(error.message || 'Versand fehlgeschlagen.','error');
      $('send').textContent='✉ Erneut versuchen';
    } finally { busy=false; $('send').disabled=false; }
  });
  draw();
  setInterval(draw,1000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
