const $ = (id) => document.getElementById(id);
const video = $('video'), canvas = $('canvas'), preview = $('preview');
let stream = null, photoTaken = false;

function todayLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0,10);
}
$('date').value = todayLocal();

function updatePreview() {
  const date = $('date').value;
  const time = $('time').value;
  $('subject-preview').textContent = date ? `Ausstempelzeit – ${date.split('-').reverse().join('.')}` : 'Ausstempelzeit';
  $('body-preview').innerHTML = `Datum: ${date ? date.split('-').reverse().join('.') : '–'}<br>Uhrzeit: ${time || '–'}`;
}
$('date').addEventListener('input', updatePreview);
$('time').addEventListener('input', updatePreview);
updatePreview();

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

$('take-photo').addEventListener('click', () => {
  if (!video.videoWidth) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // The image exists only in this page's in-memory canvas/preview; it is not downloaded or persisted.
  preview.src = canvas.toDataURL('image/jpeg', 0.82);
  preview.hidden = false;
  video.hidden = true;
  $('take-photo').disabled = true;
  $('retake').hidden = false;
  photoTaken = true;
  stopCamera();
  $('camera-status').textContent = 'Foto aufgenommen. Es wird nicht in der Galerie oder dauerhaft gespeichert.';
});

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
}
$('retake').addEventListener('click', () => {
  preview.removeAttribute('src');
  preview.hidden = true;
  $('camera-placeholder').hidden = false;
  $('retake').hidden = true;
  $('start-camera').disabled = false;
  $('camera-status').textContent = 'Du kannst ein neues Foto aufnehmen.';
  photoTaken = false;
});

$('send').addEventListener('click', () => {
  $('send-status').textContent = 'Der Gmail-Versand ist in dieser Prototyp-Version noch nicht verbunden. Es wurde keine E-Mail versendet.';
});
function validate() {
  $('send').disabled = !(photoTaken && $('date').value && $('time').value && $('recipient').checkValidity() && $('recipient').value.trim());
}
['date','time','recipient'].forEach(id => $(id).addEventListener('input', () => { updatePreview(); validate(); }));
$('take-photo').addEventListener('click', () => setTimeout(validate, 0));
$('retake').addEventListener('click', () => setTimeout(validate, 0));
window.addEventListener('pagehide', stopCamera);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
