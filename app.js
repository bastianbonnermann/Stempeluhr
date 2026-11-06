const $ = (id) => document.getElementById(id);
const video = $('video'), canvas = $('canvas'), preview = $('preview'), cropPreview = $('crop-preview');
let stream = null, photoTaken = false, ocrWorker = null, croppedCanvas = null;

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

function findDisplay(sourceCanvas) {
  const ctx = sourceCanvas.getContext('2d', {willReadFrequently:true});
  const sw = sourceCanvas.width, sh = sourceCanvas.height;
  // Downsample for quick color segmentation on mobile.
  const scale = Math.min(1, 360 / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
  const small = document.createElement('canvas'); small.width=w; small.height=h;
  const sctx=small.getContext('2d',{willReadFrequently:true});
  sctx.drawImage(sourceCanvas,0,0,w,h);
  const data=sctx.getImageData(0,0,w,h).data;
  const mask=new Uint8Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i=(y*w+x)*4, r=data[i], g=data[i+1], b=data[i+2];
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    // KABA's illuminated LCD is blue/cyan; reject dark neutral surroundings.
    if(b>65 && g>55 && b>r*1.06 && g>r*1.02 && (max-min)>18) mask[y*w+x]=1;
  }
  // Connected components: the LCD area is expected to be the largest compact blue region.
  const seen=new Uint8Array(w*h), queue=new Int32Array(w*h);
  let best=null;
  for(let p=0;p<mask.length;p++){
    if(!mask[p]||seen[p]) continue;
    let head=0,tail=0,minX=w,minY=h,maxX=0,maxY=0,count=0;
    queue[tail++]=p; seen[p]=1;
    while(head<tail){
      const q=queue[head++], x=q%w, y=(q/w)|0; count++;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      const ns=[x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1];
      for(const n of ns) if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}
    }
    const bw=maxX-minX+1,bh=maxY-minY+1, area=bw*bh, aspect=bw/bh, fill=count/area;
    if(area>w*h*0.002 && bw>18 && bh>10 && aspect>1.05 && aspect<3.2 && fill>0.12){
      const score=area*fill;
      if(!best||score>best.score) best={minX,minY,maxX,maxY,score};
    }
  }
  if(!best) return null;
  // Expand around the detected luminous panel to include the full screen edges.
  let x=best.minX/scale,y=best.minY/scale,bw=(best.maxX-best.minX+1)/scale,bh=(best.maxY-best.minY+1)/scale;
  const padX=bw*0.09,padY=bh*0.16;
  x=Math.max(0,Math.floor(x-padX));y=Math.max(0,Math.floor(y-padY));
  bw=Math.min(sw-x,Math.ceil(bw+2*padX));bh=Math.min(sh-y,Math.ceil(bh+2*padY));
  const out=document.createElement('canvas');
  // Upscale the screen for OCR; preserve its original crop.
  const factor=Math.min(3,Math.max(1.5,900/Math.max(bw,bh)));
  out.width=Math.round(bw*factor);out.height=Math.round(bh*factor);
  const octx=out.getContext('2d');
  octx.imageSmoothingEnabled=true;octx.imageSmoothingQuality='high';
  octx.drawImage(sourceCanvas,x,y,bw,bh,0,0,out.width,out.height);
  return out;
}

async function startOCR() {
  $('ocr-progress').hidden = false;
  $('ocr-status').textContent = 'Texterkennung wird geladen. Beim ersten Mal kann das etwas dauern …';
  $('progress-bar').style.width = '5%';
  if (!window.Tesseract) {
    $('ocr-status').textContent = 'OCR-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen; Datum und Uhrzeit manuell eingeben.';
    return;
  }
  try {
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            $('progress-bar').style.width = `${Math.max(8, Math.round((m.progress || 0) * 100))}%`;
            $('ocr-status').textContent = `Display wird gelesen … ${Math.round((m.progress || 0) * 100)} %`;
          }
        }
      });
      await ocrWorker.setParameters({tessedit_char_whitelist:'0123456789.:/',preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
    }
    $('ocr-status').textContent = 'Display wird automatisch gesucht und für die Erkennung vergrößert …';
    croppedCanvas = findDisplay(canvas);
    const ocrSource = croppedCanvas || canvas;
    if(croppedCanvas){
      cropPreview.src=croppedCanvas.toDataURL('image/jpeg',0.9);
      cropPreview.hidden=false;
      $('crop-status').textContent='Display-Ausschnitt automatisch gefunden. Bitte prüfe, ob der Ausschnitt die Anzeige enthält.';
    } else {
      cropPreview.hidden=true;
      $('crop-status').textContent='Kein eindeutiger Display-Ausschnitt gefunden. Die Erkennung versucht es mit dem Gesamtfoto.';
    }
    $('ocr-status').textContent = 'Datum und Uhrzeit werden gelesen …';
    const result = await ocrWorker.recognize(ocrSource);
    const text = result.data.text || '';
    const dateMatch = text.match(/\b(\d{2})[.\-/](\d{2})[.\-/](\d{4})\b/);
    const textWithoutDate = dateMatch ? text.replace(dateMatch[0], ' ') : text;
    const timeMatches = [...textWithoutDate.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)];
    let foundDate=false,foundTime=false;
    if(dateMatch){
      const [,dd,mm,yyyy]=dateMatch,candidate=`${yyyy}-${mm}-${dd}`,d=new Date(`${candidate}T12:00:00`);
      if(!Number.isNaN(d.getTime())&&d.getFullYear()==yyyy&&d.getMonth()+1==Number(mm)&&d.getDate()==Number(dd)){
        $('date').value=candidate;foundDate=true;
      }
    }
    if(timeMatches.length){const m=timeMatches[0];$('time').value=`${m[1].padStart(2,'0')}:${m[2]}`;foundTime=true;}
    updatePreview();validate();$('progress-bar').style.width='100%';
    if(foundDate&&foundTime){
      $('recognition-result').textContent='Datum und Uhrzeit erkannt. Bitte mit der KABA-Anzeige vergleichen, bevor du fortfährst.';
      $('ocr-status').textContent='Erkennung abgeschlossen.';
    } else {
      $('recognition-result').textContent='Nicht alle Werte sicher erkannt. Bitte Datum und Uhrzeit anhand des Fotos manuell ergänzen oder korrigieren.';
      $('ocr-status').textContent='Teilweise oder nicht erkannt. Bitte die Werte manuell kontrollieren.';
    }
  } catch(e){
    $('ocr-status').textContent='Texterkennung fehlgeschlagen. Bitte Datum und Uhrzeit manuell eingeben.';
    $('recognition-result').textContent='OCR konnte die Anzeige nicht zuverlässig lesen.';
  }
}

$('start-camera').addEventListener('click',async()=>{
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=stream;video.hidden=false;$('camera-placeholder').hidden=true;
    $('start-camera').disabled=true;$('take-photo').disabled=false;
    $('camera-status').textContent='Kamera bereit. Richte sie auf die KABA-Anzeige und nimm ein Foto auf.';
  }catch(err){$('camera-status').textContent='Kamera konnte nicht geöffnet werden. Bitte Kameraberechtigung prüfen und die App über HTTPS öffnen.';}
});
$('take-photo').addEventListener('click',async()=>{
  if(!video.videoWidth)return;
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  preview.src=canvas.toDataURL('image/jpeg',0.86);preview.hidden=false;video.hidden=true;$('camera-placeholder').hidden=true;
  $('take-photo').disabled=true;$('retake').hidden=false;photoTaken=true;stopCamera();
  $('camera-status').textContent='Foto aufgenommen. Es wird nur vorübergehend im Arbeitsspeicher verarbeitet.';
  await startOCR();validate();
});
function stopCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
$('retake').addEventListener('click',()=>{
  preview.removeAttribute('src');preview.hidden=true;cropPreview.removeAttribute('src');cropPreview.hidden=true;
  canvas.width=0;canvas.height=0;croppedCanvas=null;
  $('camera-placeholder').hidden=false;$('retake').hidden=true;$('start-camera').disabled=false;$('take-photo').disabled=true;
  $('camera-status').textContent='Du kannst ein neues Foto aufnehmen.';
  $('ocr-progress').hidden=true;$('recognition-result').textContent='Noch keine Erkennung durchgeführt.';
  $('crop-status').textContent='Der Display-Ausschnitt wird nach der Aufnahme automatisch gesucht.';
  $('progress-bar').style.width='0%';photoTaken=false;validate();
});
$('send').addEventListener('click',()=>{$('send-status').textContent='Der Gmail-Versand ist in dieser Prototyp-Version noch nicht verbunden. Es wurde keine E-Mail versendet.';});
window.addEventListener('pagehide',stopCamera);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
