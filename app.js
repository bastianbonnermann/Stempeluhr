const $ = id => document.getElementById(id);
const video=$('video'),canvas=$('canvas'),preview=$('preview'),cropPreview=$('crop-preview');
let stream=null,photoTaken=false,ocrWorker=null,croppedCanvas=null;

function todayLocal(){const d=new Date(),o=d.getTimezoneOffset();return new Date(d.getTime()-o*60000).toISOString().slice(0,10);}
$('date').value=todayLocal();
function updatePreview(){
 const date=$('date').value,time=$('time').value;
 $('subject-preview').textContent=date?`Ausstempelzeit – ${date.split('-').reverse().join('.')}`:'Ausstempelzeit';
 $('body-preview').innerHTML=`Datum: ${date?date.split('-').reverse().join('.'):'–'}<br>Uhrzeit: ${time||'–'}`;
}
function validate(){$('send').disabled=!(photoTaken&&$('date').value&&$('time').value&&$('recipient').checkValidity()&&$('recipient').value.trim());}
['date','time','recipient'].forEach(id=>$(id).addEventListener('input',()=>{updatePreview();validate();}));
updatePreview();

// Find the illuminated blue/cyan LCD with a permissive color mask and 8-neighbour components.
function findDisplay(source){
 const sw=source.width,sh=source.height,scale=Math.min(1,420/Math.max(sw,sh));
 const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
 const small=document.createElement('canvas');small.width=w;small.height=h;
 const sctx=small.getContext('2d',{willReadFrequently:true});sctx.drawImage(source,0,0,w,h);
 const px=sctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h),seen=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++){
   const k=i*4,r=px[k],g=px[k+1],b=px[k+2];
   // blue/cyan LCD: blue and green are brighter than red; allow moderate glare/desaturation
   if(b>62&&g>48&&b>=r*1.04&&g>=r*1.01&&(b-r)>12)mask[i]=1;
 }
 const q=new Int32Array(w*h);let best=null;
 for(let start=0;start<mask.length;start++){
   if(!mask[start]||seen[start])continue;
   let a=0,z=0,minX=w,minY=h,maxX=0,maxY=0,count=0;q[z++]=start;seen[start]=1;
   while(a<z){
     const n=q[a++],x=n%w,y=(n/w)|0;count++;
     minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
       if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;
       if(xx<0||yy<0||xx>=w||yy>=h)continue;
       const ni=yy*w+xx;if(mask[ni]&&!seen[ni]){seen[ni]=1;q[z++]=ni;}
     }
   }
   const bw=maxX-minX+1,bh=maxY-minY+1,area=bw*bh,aspect=bw/bh,fill=count/area;
   if(area>w*h*.0015&&bw>16&&bh>9&&aspect>1.05&&aspect<3.5&&fill>.08){
     const score=area*Math.min(1,fill*2);
     if(!best||score>best.score)best={minX,minY,maxX,maxY,score};
   }
 }
 if(!best)return null;
 let x=best.minX/scale,y=best.minY/scale,bw=(best.maxX-best.minX+1)/scale,bh=(best.maxY-best.minY+1)/scale;
 const pxPad=bw*.12,pyPad=bh*.22;
 x=Math.max(0,Math.floor(x-pxPad));y=Math.max(0,Math.floor(y-pyPad));
 bw=Math.min(sw-x,Math.ceil(bw+2*pxPad));bh=Math.min(sh-y,Math.ceil(bh+2*pyPad));
 return makeCrop(source,x,y,bw,bh);
}
function makeCrop(source,x,y,w,h){
 const out=document.createElement('canvas'),factor=Math.min(4,Math.max(2,1000/Math.max(w,h)));
 out.width=Math.round(w*factor);out.height=Math.round(h*factor);
 const c=out.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(source,x,y,w,h,0,0,out.width,out.height);
 return out;
}
function fallbackCrop(source){
 // Broad central crop as a fallback if the LCD color segmentation cannot isolate a component.
 const w=source.width*.72,h=source.height*.62,x=source.width*.14,y=source.height*.08;
 return makeCrop(source,x,y,w,h);
}
function parseOCR(text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 let date=null,time=null;
 for(const line of lines){
   const m=line.match(/\b(\d{2})[.\/-](\d{2})[.\/-](\d{4})\b/);
   if(m){date=m;break;}
 }
 // Ignore any OCR line containing a four-digit year/date when searching for a clock time.
 for(const line of lines){
   if(/\b\d{4}\b/.test(line)||/\d{2}[.\/-]\d{2}/.test(line))continue;
   const m=line.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
   if(m){time=m;break;}
 }
 return {date,time};
}
async function startOCR(){
 $('ocr-progress').hidden=false;$('ocr-status').textContent='Texterkennung wird vorbereitet …';$('progress-bar').style.width='5%';
 if(!window.Tesseract){$('ocr-status').textContent='OCR-Bibliothek nicht geladen. Bitte Internetverbindung prüfen und Werte manuell eingeben.';return;}
 try{
  $('ocr-status').textContent='Display wird im Foto gesucht …';
  croppedCanvas=findDisplay(canvas);
  if(!croppedCanvas){croppedCanvas=fallbackCrop(canvas);$('crop-status').textContent='Kein eindeutiger LCD-Rahmen gefunden. Es wird ein großzügiger Bildausschnitt geprüft.';}
  else $('crop-status').textContent='Displaybereich automatisch gefunden und vergrößert. Bitte den Ausschnitt kontrollieren.';
  cropPreview.src=croppedCanvas.toDataURL('image/jpeg',.92);cropPreview.hidden=false;
  if(!ocrWorker){
   ocrWorker=await Tesseract.createWorker('eng',1,{logger:m=>{
    if(m.status==='recognizing text'){$('progress-bar').style.width=`${Math.max(8,Math.round((m.progress||0)*100))}%`;$('ocr-status').textContent=`Anzeige wird gelesen … ${Math.round((m.progress||0)*100)} %`;}
   }});
   await ocrWorker.setParameters({tessedit_char_whitelist:'0123456789.:/',preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
  }
  let result=await ocrWorker.recognize(croppedCanvas);
  let parsed=parseOCR(result.data.text||'');
  // If crop produced neither date nor time, try full photo once.
  if(!parsed.date&&!parsed.time){
    $('ocr-status').textContent='Ausschnitt nicht lesbar – Gesamtfoto wird zusätzlich geprüft …';
    result=await ocrWorker.recognize(canvas);parsed=parseOCR(result.data.text||'');
  }
  let fd=false,ft=false;
  if(parsed.date){const [,dd,mm,yyyy]=parsed.date,candidate=`${yyyy}-${mm}-${dd}`,d=new Date(`${candidate}T12:00:00`);
   if(!Number.isNaN(d.getTime())&&d.getFullYear()==Number(yyyy)&&d.getMonth()+1==Number(mm)&&d.getDate()==Number(dd)){$('date').value=candidate;fd=true;}}
  if(parsed.time){$('time').value=`${parsed.time[1].padStart(2,'0')}:${parsed.time[2]}`;ft=true;}
  updatePreview();validate();$('progress-bar').style.width='100%';
  $('recognition-result').textContent=fd&&ft?'Datum und Uhrzeit erkannt. Bitte unbedingt mit der KABA-Anzeige vergleichen.':'Nicht alle Werte erkannt. Bitte Datum und Uhrzeit anhand der Anzeige manuell ergänzen oder korrigieren.';
  $('ocr-status').textContent=fd&&ft?'Erkennung abgeschlossen.':'Erkennung teilweise oder nicht erfolgreich.';
 }catch(e){$('ocr-status').textContent='Texterkennung fehlgeschlagen. Bitte Werte manuell eingeben.';$('recognition-result').textContent='OCR konnte die Anzeige nicht zuverlässig lesen.';}
}
$('start-camera').addEventListener('click',async()=>{
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=stream;video.hidden=false;$('camera-placeholder').hidden=true;$('start-camera').disabled=true;$('take-photo').disabled=false;$('camera-status').textContent='Kamera bereit. Richte sie auf die KABA-Anzeige.';}
 catch(e){$('camera-status').textContent='Kamera konnte nicht geöffnet werden. Bitte Berechtigung und HTTPS prüfen.';}
});
$('take-photo').addEventListener('click',async()=>{
 if(!video.videoWidth)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 preview.src=canvas.toDataURL('image/jpeg',.88);preview.hidden=false;video.hidden=true;$('camera-placeholder').hidden=true;$('take-photo').disabled=true;$('retake').hidden=false;photoTaken=true;stopCamera();
 $('camera-status').textContent='Foto aufgenommen. Verarbeitung erfolgt nur vorübergehend im Browser.';await startOCR();validate();
});
function stopCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
$('retake').addEventListener('click',()=>{
 preview.removeAttribute('src');preview.hidden=true;cropPreview.removeAttribute('src');cropPreview.hidden=true;canvas.width=0;canvas.height=0;croppedCanvas=null;
 $('camera-placeholder').hidden=false;$('retake').hidden=true;$('start-camera').disabled=false;$('take-photo').disabled=true;$('camera-status').textContent='Du kannst ein neues Foto aufnehmen.';
 $('ocr-progress').hidden=true;$('recognition-result').textContent='Noch keine Erkennung durchgeführt.';$('crop-status').textContent='Der Display-Ausschnitt wird nach der Aufnahme automatisch gesucht.';$('progress-bar').style.width='0%';photoTaken=false;validate();
});
$('send').addEventListener('click',()=>$('send-status').textContent='Gmail-Versand ist noch nicht verbunden. Es wurde keine E-Mail versendet.');
window.addEventListener('pagehide',stopCamera);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
