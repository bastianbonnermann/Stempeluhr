(() => {
  const $ = id => document.getElementById(id);
  const recipient = $('recipient');
  const clientInput = $('client-id');
  const scope = 'https://www.googleapis.com/auth/gmail.send';

  let base = new Date();
  let offset = 0;
  let token = null;
  let expires = 0;
  let tokenClient = null;
  let pendingAction = '';
  let busy = false;

  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => new Intl.DateTimeFormat('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const fmtLong = d => new Intl.DateTimeFormat('de-DE', {weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  const fmtTime = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const selected = () => new Date(base.getTime() + offset * 60000);

  function status(message, error = false) {
    $('status').textContent = message;
    $('status').style.color = error ? '#b42318' : '';
  }

  function connected(value) {
    $('dot').classList.toggle('on', value);
    $('connection').textContent = value ? 'Gmail in dieser Sitzung verbunden' : 'Gmail noch nicht verbunden';
  }

  function validate() {
    $('send').disabled = busy || !recipient.value.trim() || !recipient.checkValidity() || !clientInput.value.trim();
  }

  function draw() {
    base = new Date();
    $('current-date').textContent = fmtLong(base);
    $('live-time').textContent = fmtTime(base);
    const d = selected();
    const date = fmtDate(d);
    $('selected-time').textContent = fmtTime(d);
    $('subject').textContent = 'Ausstempelzeit – ' + date;
    $('body').innerHTML = 'Datum: ' + date + '<br>Uhrzeit: ' + fmtTime(d);
    validate();
  }

  function getTokenClient() {
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Der Google-Anmeldedienst lädt noch. Bitte kurz warten und erneut versuchen.');
    }
    if (!clientInput.value.trim()) {
      throw new Error('Bitte zuerst die Google OAuth-Client-ID eintragen und speichern.');
    }
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientInput.value.trim(),
        scope,
        callback: async response => {
          const action = pendingAction;
          pendingAction = '';
          if (response.error || !response.access_token) {
            token = null;
            expires = 0;
            connected(false);
            status('Google-Autorisierung nicht abgeschlossen. Bitte Gmail erneut verbinden.', true);
            return;
          }
          token = response.access_token;
          expires = Date.now() + (Number(response.expires_in || 3600) * 1000) - 60000;
          connected(true);
          if (action === 'send') await send();
          else status('Gmail erfolgreich verbunden. Du kannst jetzt deine Ausstempelzeit senden.');
        },
        error_callback: error => {
          pendingAction = '';
          connected(false);
          status(error?.type === 'popup_closed'
            ? 'Google-Anmeldung geschlossen. Gmail ist nicht verbunden.'
            : 'Google-Anmeldung konnte nicht gestartet werden. Bitte Pop-up-Freigabe prüfen.', true);
        }
      });
    }
    return tokenClient;
  }

  function authorize(action) {
    try {
      pendingAction = action;
      // Bereits erteilte Freigabe nutzen, ohne jedes Mal Consent zu erzwingen.
      getTokenClient().requestAccessToken({prompt: ''});
    } catch (error) {
      pendingAction = '';
      status(error.message, true);
    }
  }

  function rawEmail(to, subject, body) {
    const encode = value => btoa(unescape(encodeURIComponent(value)));
    const message = 'To: ' + to + '\r\n' +
      'Subject: =?UTF-8?B?' + encode(subject) + '?=\r\n' +
      'MIME-Version: 1.0\r\n' +
      'Content-Type: text/plain; charset=UTF-8\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' + encode(body);
    return encode(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function send() {
    if (busy) return;
    if (!recipient.checkValidity() || !recipient.value.trim()) {
      recipient.reportValidity();
      return;
    }
    if (!token || Date.now() >= expires) {
      token = null;
      expires = 0;
      connected(false);
      authorize('send');
      return;
    }

    busy = true;
    validate();
    status('E-Mail wird über Gmail versendet …');
    const d = selected();
    const date = fmtDate(d);
    const subject = 'Ausstempelzeit – ' + date;
    const body = 'Datum: ' + date + '\nUhrzeit: ' + fmtTime(d);

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
        body: JSON.stringify({raw: rawEmail(recipient.value.trim(), subject, body)})
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          token = null;
          expires = 0;
          connected(false);
          status('Google-Zugriff abgelaufen. Bitte erneut auf „Gmail verbinden“ klicken.', true);
        } else if (response.status === 403) {
          status('Gmail-Zugriff verweigert. Bitte Gmail API und die Berechtigung gmail.send prüfen.', true);
        } else {
          status('Gmail-Fehler ' + response.status + ': ' + (result.error?.message || 'Versand fehlgeschlagen.'), true);
        }
        return;
      }
      status('E-Mail erfolgreich versendet an ' + recipient.value.trim() + '.');
    } catch (error) {
      status('Gmail ist nicht erreichbar. Bitte Internetverbindung prüfen.', true);
    } finally {
      busy = false;
      validate();
    }
  }

  // Nur Empfängeradresse und öffentliche OAuth-Client-ID werden lokal gespeichert.
  // Das Zugriffstoken bleibt bewusst ausschließlich im Arbeitsspeicher.
  recipient.value = localStorage.getItem('stempeluhr_recipient') || '';
  clientInput.value = localStorage.getItem('stempeluhr_google_client_id') || '';
  recipient.addEventListener('input', () => {
    localStorage.setItem('stempeluhr_recipient', recipient.value.trim());
    validate();
  });
  clientInput.addEventListener('input', validate);

  document.querySelectorAll('[data-delta]').forEach(button => {
    button.addEventListener('click', () => {
      offset += Number(button.dataset.delta);
      draw();
    });
  });
  $('reset').addEventListener('click', () => { offset = 0; draw(); });

  $('save-client').addEventListener('click', () => {
    const value = clientInput.value.trim();
    if (!value) {
      status('Bitte zuerst die Google OAuth-Client-ID eintragen.', true);
      return;
    }
    localStorage.setItem('stempeluhr_google_client_id', value);
    tokenClient = null;
    token = null;
    expires = 0;
    connected(false);
    $('client-status').textContent = 'Client-ID auf diesem Gerät gespeichert.';
    status('Client-ID gespeichert. Bitte Gmail verbinden.');
    validate();
  });

  $('connect').addEventListener('click', () => authorize('connect'));
  $('send').addEventListener('click', () => {
    if (!token || Date.now() >= expires) authorize('send');
    else send();
  });

  // Nach einem Neuladen ist kein Zugriffstoken mehr im Arbeitsspeicher.
  // Der Nutzer verbindet Gmail aus Sicherheitsgründen erneut per Klick.
  connected(false);
  status('Bitte Gmail verbinden. Die Verbindung gilt für diese Sitzung.');
  draw();
  setInterval(draw, 1000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
