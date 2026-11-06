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

function cvReady(){
 return new Promise(resolve=>{
  if(window.cv&&cv.Mat){resolve(true);return;}
  let tries=0;const timer=setInterval(()=>{
   if(window.cv&&cv.Mat){clearInterval(timer);resolve(true);}
   else if(++tries>100){clearInterval(timer);resolve(false);}
  },100);
 });
}
function orderQuad(points){
 const sums=points.map(p=>p.x+p.y),diffs=points.map(p=>p.y-p.x);
 return [
  points[sums.indexOf(Math.min(...sums))],
  points[diffs.indexOf(Math.min(...diffs))],
  points[sums.indexOf(Math.max(...sums))],
  points[diffs.indexOf(Math.max(...diffs))]
 ];
}
function warpQuad(src,quad){
 const [tl,tr,br,bl]=orderQuad(quad);
 const width=Math.max(Math.hypot(br.x-bl.x,br.y-bl.y),Math.hypot(tr.x-tl.x,tr.y-tl.y));
 const height=Math.max(Math.hypot(tr.x-br.x,tr.y-br.y),Math.hypot(tl.x-bl.x,tl.y-bl.y));
 if(width<50||height<25||width/height<1.15||width/height>3.5)return null;
 const dstW=Math.min(1400,Math.round(width*2)),dstH=Math.min(800,Math.round(height*2));
 const srcPts=cv.matFromArray(4,1,cv.CV_32FC2,[tl.x,tl.y,tr.x,tr.y,br.x,br.y,bl.x,bl.y]);
 const dstPts=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,dstW-1,0,dstW-1,dstH-1,0,dstH-1]);
 const M=cv.getPerspectiveTransform(srcPts,dstPts),dst=new cv.Mat();
 cv.warpPerspective(src,dst,M,new cv.Size(dstW,dstH),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
 srcPts.delete();dstPts.delete();M.delete();
 const out=document.createElement('canvas');out.width=dstW;out.height=dstH;cv.imshow(out,dst);dst.delete();
 return out;
}
async function detectDisplay(sourceCanvas){
 const ready=await cvReady();
 if(!ready)return {canvas:null,method:'OpenCV konnte nicht geladen werden'};
 let src=null,gray=null,blur=null,edges=null,contours=null,hierarchy=null,kernel=null;
 try{
  src=cv.imread(sourceCanvas);gray=new cv.Mat();blur=new cv.Mat();edges=new cv.Mat();
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray,blur,new cv.Size(5,5),0,0,cv.BORDER_DEFAULT);
  cv.Canny(blur,edges,35,110);
  kernel=cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(3,3));
  cv.morphologyEx(edges,edges,cv.MORPH_CLOSE,kernel);
  contours=new cv.MatVector();hierarchy=new cv.Mat();
  cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
  const candidates=[];
  for(let i=0;i<contours.size();i++){
   const cnt=contours.get(i),peri=cv.arcLength(cnt,true),approx=new cv.Mat();
   cv.approxPolyDP(cnt,approx,.025*peri,true);
   if(approx.rows===4&&cv.isContourConvex(approx)){
    const area=Math.abs(cv.contourArea(approx));
    if(area>sourceCanvas.width*sourceCanvas.height*.002&&area<sourceCanvas.width*sourceCanvas.height*.65){
     const pts=[];
     for(let j=0;j<4;j++)pts.push({x:approx.intAt(j,0),y:approx.intAt(j,1)});
     const ordered=orderQuad(pts);
     const top=Math.hypot(ordered[1].x-ordered[0].x,ordered[1].y-ordered[0].y);
     const bottom=Math.hypot(ordered[2].x-ordered[3].x,ordered[2].y-ordered[3].y);
     const left=Math.hypot(ordered[3].x-ordered[0].x,ordered[3].y-ordered[0].y);
     const right=Math.hypot(ordered[2].x-ordered[1].x,ordered[2].y-ordered[1].y);
     const ratio=((top+bottom)/2)/Math.max(1,(left+right)/2);
     if(ratio>1.2&&ratio<3.2)candidates.push({pts,area,ratio});
    }
   }
   approx.delete();cnt.delete();
  }
  // Favor large, wide rectangular screen-like regions without letting the terminal body dominate.
  candidates.sort((a,b)=>b.area-a.area);
  for(const c of candidates.slice(0,12)){
   const warped=warpQuad(src,c.pts);
   if(warped&&warped.width/warped.height>1.2&&warped.width/warped.height<3.2)
    return {canvas:warped,method:'Rechteckige Displayfläche perspektivisch ausgeschnitten'};
  }
  return {canvas:null,method:'Kein passendes Display-Rechteck sicher gefunden'};
 }catch(e){return {canvas:null,method:'Geometrische Suche fehlgeschlagen'};}
 finally{
  [src,gray,blur,edges,contours,hierarchy,kernel].forEach(m=>{if(m&&m.delete)m.delete();});
 }
}
function fallbackCrop(source){
 const w=source.width*.78,h=source.height*.58,x=source.width*.11,y=source.height*.12;
 const out=document.createElement('canvas');out.width=Math.round(w*2.2);out.height=Math.round(h*2.2);
 const c=out.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(source,x,y,w,h,0,0,out.width,out.height);return out;
}
async function startOCR(){
 $('ocr-progress').hidden=false;$('ocr-status').textContent='Display wird geometrisch gesucht …';$('progress-bar').style.width='5%';
 if(!window.Tesseract){$('ocr-status').textContent='OCR-Bibliothek nicht geladen. Bitte Internetverbindung prüfen und Werte manuell eingeben.';return;}
 try{
  const detected=await detectDisplay(canvas);
  croppedCanvas=detected.canvas||fallbackCrop(canvas);
  $('crop-status').textContent=detected.canvas?`${detected.method}. Bitte den Ausschnitt kontrollieren.`:`${detected.method}. Ein zentraler Ersatz-Ausschnitt wird geprüft.`;
  cropPreview.src=croppedCanvas.toDataURL('image/jpeg',.92);cropPreview.hidden=false;
  if(!ocrWorker){
   ocrWorker=await Tesseract.createWorker('eng',1,{logger:m=>{
    if(m.status==='recognizing text'){$('progress-bar').style.width=`${Math.max(8,Math.round((m.progress||0)*100))}%`;$('ocr-status').textContent=`Anzeige wird gelesen … ${Math.round((m.progress||0)*100)} %`;}
   }});
   await ocrWorker.setParameters({tessedit_char_whitelist:'0123456789.:/',preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
  }
  let result=await ocrWorker.recognize(croppedCanvas);
  let text=result.data.text||'';
  let dateMatch=text.match(/\b(\d{2})[.\/-](\d{2})[.\/-](\d{4})\b/);
  // Date is removed before time parsing; only a colon is accepted as a clock separator.
  let noDate=dateMatch?text.replace(dateMatch[0],' '):text;
  let timeMatch=noDate.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(!dateMatch&&!timeMatch){
   $('ocr-status').textContent='Ausschnitt ohne lesbare Zeitdaten – Gesamtfoto wird geprüft …';
   result=await ocrWorker.recognize(canvas);text=result.data.text||'';
   dateMatch=text.match(/\b(\d{2})[.\/-](\d{2})[.\/-](\d{4})\b/);
   noDate=dateMatch?text.replace(dateMatch[0],' '):text;
   timeMatch=noDate.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  }
  let fd=false,ft=false;
  if(dateMatch){const [,dd,mm,yyyy]=dateMatch,candidate=`${yyyy}-${mm}-${dd}`,d=new Date(`${candidate}T12:00:00`);
   if(!Number.isNaN(d.getTime())&&d.getFullYear()==Number(yyyy)&&d.getMonth()+1==Number(mm)&&d.getDate()==Number(dd)){$('date').value=candidate;fd=true;}}
  if(timeMatch){$('time').value=`${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}`;ft=true;}
  updatePreview();validate();$('progress-bar').style.width='100%';
  $('recognition-result').textContent=fd&&ft?'Datum und Uhrzeit erkannt. Bitte unbedingt mit der KABA-Anzeige vergleichen.':'Nicht alle Werte erkannt. Bitte Datum und Uhrzeit manuell ergänzen oder korrigieren.';
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
