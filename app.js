const $ = (id) => document.getElementById(id);
const video = $('video'), canvas = $('canvas'), preview = $('preview');
let stream = null, photoTaken = false, ocrWorker = null;

function todayLocal() {
  const d = new Date(), offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0,10);
}
$('date').value = todayLocal();

function updatePreview() {
  const date = $('date').value, time = $('time').value;
  $('subject-preview').textContent = date ? `Ausstempelzeit – ${date.split('-').reverse().join('.')}` : 'Ausstempelzeit';
  $('body-preview').innerHTML = `Datum: ${date ? date.split('-').reverse().join('.') : '–'}<br>Uhrzeit: ${time || '–'}`;
}
function validate() {
  $('send').disabled = !(photoTaken && $('date').value && $('time').value && $('recipient').checkValidity() && $('recipient').value.trim());
}
['date','time','recipient'].forEach(id => $(id).addEventListener('input', () => { updatePreview(); validate(); }));
updatePreview();

async function startOCR() {
  $('ocr-progress').hidden = false;
  $('ocr-status').textContent = 'Texterkennung wird geladen. Beim ersten Mal kann das etwas dauern …';
  $('progress-bar').style.width = '5%';
  if (!window.Tesseract) {
    $('ocr-status').textContent = 'OCR-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen; Datum und Uhrzeit können manuell eingegeben werden.';
    return;
  }
  try {
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            $('progress-bar').style.width = `${Math.max(8, Math.round((m.progress || 0) * 100))}%`;
            $('ocr-status').textContent = `Anzeige wird gelesen … ${Math.round((m.progress || 0) * 100)} %`;
          }
        }
      });
      await ocrWorker.setParameters({
        tessedit_char_whitelist: '0123456789.:/',
        preserve_interword_spaces: '1'
      });
    }
    $('ocr-status').textContent = 'Datum und Uhrzeit werden aus dem Foto gelesen …';
    const result = await ocrWorker.recognize(canvas);
    const text = result.data.text || '';
    const dateMatch = text.match(/\b(\d{2})[.\-/](\d{2})[.\-/](\d{4})\b/);
    // Remove the recognized date before looking for a time. Otherwise e.g.
    // "06.11.2026" can be misread as the time "06:11".
    const textWithoutDate = dateMatch ? text.replace(dateMatch[0], ' ') : text;
    const timeMatches = [...textWithoutDate.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)];
    let found = false;
    if (dateMatch) {
      const [, dd, mm, yyyy] = dateMatch;
      const candidate = `${yyyy}-${mm}-${dd}`;
      const d = new Date(`${candidate}T12:00:00`);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() == yyyy && d.getMonth()+1 == Number(mm) && d.getDate() == Number(dd)) {
        $('date').value = candidate; found = true;
      }
    }
    if (timeMatches.length) {
      const m = timeMatches[0];
      $('time').value = `${m[1].padStart(2,'0')}:${m[2]}`;
      found = true;
    }
    updatePreview(); validate();
    $('progress-bar').style.width = '100%';
    if (dateMatch && timeMatches.length) {
      $('recognition-result').textContent = 'Datum und Uhrzeit erkannt. Bitte mit der Anzeige vergleichen, bevor du fortfährst.';
      $('ocr-status').textContent = 'Erkennung abgeschlossen.';
    } else {
      $('recognition-result').textContent = 'Nicht alle Werte sicher erkannt. Bitte Datum und Uhrzeit anhand des Fotos manuell ergänzen oder korrigieren.';
      $('ocr-status').textContent = found ? 'Teilweise erkannt. Bitte fehlenden Wert ergänzen.' : 'Keine passende Datums-/Zeitangabe gefunden. Bitte manuell eingeben.';
    }
  } catch (e) {
    $('ocr-status').textContent = 'Texterkennung fehlgeschlagen. Bitte Datum und Uhrzeit manuell eingeben.';
    $('recognition-result').textContent = 'OCR konnte die Anzeige nicht zuverlässig lesen.';
  }
}

$('start-camera').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject = stream;
    video.hidden = false;
    $('camera-placeholder').hidden = true;
    $('start-camera').disabled = true;
    $('take-photo').disabled = false;
    $('camera-status').textContent = 'Kamera bereit. Richte sie auf die Anzeige und nimm ein Foto auf.';
  } catch (err) {
    $('camera-status').textContent = 'Kamera konnte nicht geöffnet werden. Bitte Kameraberechtigung prüfen und die App über HTTPS öffnen.';
  }
});

$('take-photo').addEventListener('click', async () => {
  if (!video.videoWidth) return;
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  preview.src = canvas.toDataURL('image/jpeg', 0.86);
  preview.hidden = false; video.hidden = true; $('camera-placeholder').hidden = true;
  $('take-photo').disabled = true; $('retake').hidden = false; photoTaken = true;
  stopCamera();
  $('camera-status').textContent = 'Foto aufgenommen. Es wird nur vorübergehend im Arbeitsspeicher verarbeitet.';
  await startOCR();
  validate();
});

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
}
$('retake').addEventListener('click', () => {
  preview.removeAttribute('src'); preview.hidden = true; canvas.width = 0; canvas.height = 0;
  $('camera-placeholder').hidden = false; $('retake').hidden = true;
  $('start-camera').disabled = false; $('take-photo').disabled = true;
  $('camera-status').textContent = 'Du kannst ein neues Foto aufnehmen.';
  $('ocr-progress').hidden = true; $('recognition-result').textContent = 'Noch keine Erkennung durchgeführt.';
  $('progress-bar').style.width = '0%'; photoTaken = false; validate();
});
$('send').addEventListener('click', () => {
  $('send-status').textContent = 'Der Gmail-Versand ist in dieser Prototyp-Version noch nicht verbunden. Es wurde keine E-Mail versendet.';
});
window.addEventListener('pagehide', stopCamera);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
