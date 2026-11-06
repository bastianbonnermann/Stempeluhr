(() => {
  const $ = id => document.getElementById(id);
  const recipient = $('recipient');
  let baseTime = new Date();
  let offsetMinutes = 0;
  let clockTimer = null;

  const pad = n => String(n).padStart(2, '0');
  const dateText = d => new Intl.DateTimeFormat('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d);
  const dateForMail = d => new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d);
  const timeText = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  function adjustedDate() {
    return new Date(baseTime.getTime() + offsetMinutes * 60000);
  }

  function refresh() {
    const now = new Date();
    // Keep the displayed live clock synchronized with the phone's local time.
    baseTime = now;
    $('current-date').textContent = dateText(now);
    $('time-heading').textContent = timeText(now);
    const selected = adjustedDate();
    $('adjusted-time').textContent = timeText(selected);
    const mailDate = dateForMail(selected);
    $('subject-preview').textContent = `Ausstempelzeit – ${mailDate}`;
    $('body-preview').innerHTML = `Datum: ${mailDate}<br>Uhrzeit: ${timeText(selected)}`;
    validate();
  }

  function validate() {
    const ok = recipient.value.trim() !== '' && recipient.checkValidity();
    $('send-mail').disabled = !ok;
    $('status').textContent = ok
      ? 'Bereit. Gmail öffnet einen vorbereiteten Nachrichtenentwurf.'
      : 'Bitte trage eine gültige Arbeits-E-Mail-Adresse ein.';
  }

  document.querySelectorAll('[data-delta]').forEach(button => {
    button.addEventListener('click', () => {
      offsetMinutes += Number(button.dataset.delta);
      const selected = adjustedDate();
      $('adjusted-time').textContent = timeText(selected);
      const mailDate = dateForMail(selected);
      $('subject-preview').textContent = `Ausstempelzeit – ${mailDate}`;
      $('body-preview').innerHTML = `Datum: ${mailDate}<br>Uhrzeit: ${timeText(selected)}`;
      validate();
    });
  });

  $('reset-time').addEventListener('click', () => {
    offsetMinutes = 0;
    refresh();
  });

  recipient.value = localStorage.getItem('stempeluhr_recipient') || '';
  recipient.addEventListener('input', () => {
    localStorage.setItem('stempeluhr_recipient', recipient.value.trim());
    validate();
  });

  $('send-mail').addEventListener('click', () => {
    if (!recipient.checkValidity() || !recipient.value.trim()) {
      recipient.reportValidity();
      return;
    }
    const selected = adjustedDate();
    const mailDate = dateForMail(selected);
    const subject = `Ausstempelzeit – ${mailDate}`;
    const body = `Datum: ${mailDate}\nUhrzeit: ${timeText(selected)}`;
    const url = `mailto:${encodeURIComponent(recipient.value.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('status').textContent = 'E-Mail-Entwurf wird geöffnet. Bitte in Gmail auf Senden tippen.';
    window.location.href = url;
  });

  refresh();
  // Update the real clock every second; the selected correction remains relative to it.
  clockTimer = window.setInterval(refresh, 1000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
  window.addEventListener('pagehide', () => {
    if (clockTimer) window.clearInterval(clockTimer);
  });
})();
