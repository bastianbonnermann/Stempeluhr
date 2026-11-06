// Stempeluhr Version 1.2
(() => {
  const $ = id => document.getElementById(id);
  const recipient = $('recipient');
  const clientInput = $('client-id');
  const sendButton = $('send');
  const scope = 'https://www.googleapis.com/auth/gmail.send';
  const sentStorageKey = 'stempeluhr_sent_entries_v1';

  let base = new Date();
  let offset = 0;
  let token = null;
  let expires = 0;
  let tokenClient = null;
  let pendingAction = '';
  let authPending = false;
  let busy = false;
  let displayedEntryKey = null;
  let sentEntries = loadSentEntries();

  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'}).format(d);
  const fmtLong = d => new Intl.DateTimeFormat('de-DE', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'}).format(d);
  const fmtTime = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const selected = () => new Date(base.getTime() + offset * 60000);

  function loadSentEntries() {
    try {
      const value = JSON.parse(localStorage.getItem(sentStorageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function currentEntryKey() {
    const d = selected();
    return [recipient.value.trim().toLowerCase(), d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate()), fmtTime(d)].join('|');
  }

  function wasAlreadySent() {
    return sentEntries.includes(currentEntryKey());
  }

  function status(message, error = false) {
    const element = $('status');
    element.textContent = message;
    element.style.color = error ? '#b42318' : '';
    element.setAttribute('aria-live', error ? 'assertive' : 'polite');
  }

  function connected(value) {
    $('dot').classList.toggle('on', value);
    $('connection').textContent = value ? 'Gmail in dieser Sitzung verbunden' : 'Gmail noch nicht verbunden';
    if (value) {
      displayedEntryKey = currentEntryKey();
      status(wasAlreadySent()
        ? 'Diese Ausstempelzeit wurde bereits erfolgreich versendet. Ändere die Uhrzeit, wenn du eine Korrektur senden möchtest.'
        : 'Gmail verbunden. Deine Ausstempelzeit ist versandbereit.');
    } else if (!busy && !authPending) {
      status('Bitte zuerst die Google-Verbindung einrichten.');
    }
  }

  function validate() {
    const alreadySent = wasAlreadySent();
    sendButton.disabled = busy || authPending || !recipient.value.trim() || !recipient.checkValidity() || !clientInput.value.trim() || alreadySent;
    sendButton.textContent = alreadySent ? '✓ Bereits gesendet' : (busy ? 'Wird gesendet …' : '✉ Jetzt senden');
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
    const entryKey = currentEntryKey();
    if (entryKey !== displayedEntryKey) {
      displayedEntryKey = entryKey;
      if (wasAlreadySent()) {
        status('Diese Ausstempelzeit wurde bereits erfolgreich versendet. Ändere die Uhrzeit, wenn du eine Korrektur senden möchtest.');
      } else if (token && Date.now() < expires) {
        status('Gmail verbunden. Deine Ausstempelzeit ist versandbereit.');
      } else {
        status('Bitte Gmail verbinden.');
      }
    }
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
          authPending = false;
          if (response.error || !response.access_token) {
            token = null;
            expires = 0;
            connected(false);
            status('Google-Autorisierung nicht abgeschlossen. Bitte Gmail erneut verbinden.', true);
            validate();
            return;
          }
          token = response.access_token;
          expires = Date.now() + (Number(response.expires_in || 3600) * 1000) - 60000;
          connected(true);
          validate();
          if (action === 'send') await send();
        },
        error_callback: error => {
          pendingAction = '';
          authPending = false;
          connected(false);
          status(error?.type === 'popup_closed'
            ? 'Google-Anmeldung geschlossen. Gmail ist nicht verbunden.'
            : 'Google-Anmeldung konnte nicht gestartet werden. Bitte Pop-up-Freigabe prüfen.', true);
          validate();
        }
      });
    }
    return tokenClient;
  }

  function authorize(action) {
    if (authPending || busy) return;
    try {
      pendingAction = action;
      authPending = true;
      validate();
      getTokenClient().requestAccessToken({prompt: ''});
    } catch (error) {
      pendingAction = '';
      authPending = false;
      status(error.message, true);
      validate();
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
    if (busy || authPending) return;
    if (!recipient.checkValidity() || !recipient.value.trim()) {
      recipient.reportValidity();
      return;
    }
    if (wasAlreadySent()) {
      validate();
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
    const entryKey = currentEntryKey();

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

      // Erfolgreich versendete Kombination aus Empfänger, Datum und Uhrzeit lokal merken.
      // So kann derselbe Zeitstempel nicht versehentlich erneut gesendet werden.
      sentEntries = [entryKey, ...sentEntries.filter(key => key !== entryKey)].slice(0, 100);
      localStorage.setItem(sentStorageKey, JSON.stringify(sentEntries));
      status('E-Mail erfolgreich versendet an ' + recipient.value.trim() + '.');
    } catch (error) {
      status('Gmail ist nicht erreichbar. Bitte Internetverbindung prüfen.', true);
    } finally {
      busy = false;
      validate();
    }
  }

  // Empfängeradresse und öffentliche OAuth-Client-ID werden lokal gespeichert.
  // Das Zugriffstoken bleibt ausschließlich im Arbeitsspeicher.
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
  sendButton.addEventListener('click', () => {
    if (busy || authPending || wasAlreadySent()) return;
    if (!token || Date.now() >= expires) authorize('send');
    else send();
  });

  connected(false);
  draw();
  setInterval(draw, 1000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
