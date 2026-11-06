const EMPFAENGER = 'bastian.bonnermann@unilux.de';
const MAX_SENDUNGEN_PRO_TAG = 3;
const MINDESTABSTAND_SEKUNDEN = 60;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'send') return sendeAlsJsonp_(p);
  return HtmlService.createHtmlOutput('Stempeluhr-Maildienst ist aktiv.');
}

function sendeAlsJsonp_(p) {
  const callback = String(p.callback || '');
  if (!/^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) {
    return ContentService.createTextOutput('/* Ungueltiger Callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  let result;
  try {
    result = sendeAusstempelzeit(String(p.date || ''), String(p.time || ''));
  } catch (err) {
    result = {success:false, message: err && err.message ? err.message : 'Versand fehlgeschlagen.'};
  }
  const json = JSON.stringify(result).replace(/</g, '\u003c');
  return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Einmalig im Apps-Script-Editor ausführen, falls die Mailberechtigung erneut angefordert wird.
function autorisierungTest() {
  const rest = MailApp.getRemainingDailyQuota();
  Logger.log('Stempeluhr-Maildienst bereit. Verbleibendes Tageskontingent: ' + rest);
  return rest;
}

function sendeAusstempelzeit(datum, uhrzeit) {
  if (typeof datum !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error('Das Datum ist ungültig.');
  if (typeof uhrzeit !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(uhrzeit)) throw new Error('Die Uhrzeit ist ungültig.');
  const d = new Date(datum + 'T12:00:00');
  if (isNaN(d.getTime()) || Utilities.formatDate(d, 'Europe/Berlin', 'yyyy-MM-dd') !== datum) throw new Error('Das Datum ist ungültig.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const heute = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
    const anzahl = Number(props.getProperty('anzahl_' + heute) || 0);
    const jetzt = Date.now();
    const letzteZeit = Number(props.getProperty('letzte_sendung') || 0);
    const kennung = datum + '|' + uhrzeit;
    if (anzahl >= MAX_SENDUNGEN_PRO_TAG) throw new Error('Das Tageslimit von drei E-Mails ist erreicht.');
    if (jetzt - letzteZeit < MINDESTABSTAND_SEKUNDEN * 1000) throw new Error('Bitte mindestens eine Minute bis zum nächsten Versand warten.');
    if (props.getProperty('letzter_eintrag') === kennung) throw new Error('Diese Ausstempelzeit wurde bereits versendet.');
    const datumAnzeige = datum.split('-').reverse().join('.');
    const betreff = 'Ausstempelzeit – ' + datumAnzeige;
    const text = 'Ausstempelzeit\n\nDatum: ' + datumAnzeige + '\nUhrzeit: ' + uhrzeit;
    MailApp.sendEmail(EMPFAENGER, betreff, text);
    props.setProperty('anzahl_' + heute, String(anzahl + 1));
    props.setProperty('letzte_sendung', String(jetzt));
    props.setProperty('letzter_eintrag', kennung);
    return {success:true, message:'E-Mail erfolgreich versendet an ' + EMPFAENGER};
  } finally { lock.releaseLock(); }
}
