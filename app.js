'use strict';
const STORAGE_KEY='stempeluhr_events_v3';
const TYPES={Kommen:'Kommen',Gehen:'Gehen',U:'Urlaub',B:'Betriebsurlaub',D:'Dienstreise',F:'Feiertag',K:'Krankheit','Ü':'Überstundenabbau',HO:'Homeoffice'};
let entries=loadEntries(), baseTime=new Date(), offset=0, pendingExportIds=[];
const $=id=>document.getElementById(id);
function loadEntries(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(e){return []}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries))}
function pad(n){return String(n).padStart(2,'0')}
function dateStr(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function displayDate(s){if(!s)return '';let [y,m,d]=s.split('-');return `${d}.${m}.${y}`}
function displayTime(s){return s||''}
function typeName(t){return t==='HO'?'Homeoffice':t==='Kommen'?'Kommen':t==='Gehen'?'Gehen':`${TYPES[t]||t} (${t})`}
function localTime(d){return `${pad(d.getHours())}:${pad(d.getMinutes())}`}
function currentAdjusted(){return new Date(baseTime.getTime()+offset*60000)}
function refreshClock(){let d=currentAdjusted();$('clock').textContent=localTime(d);$('date').textContent=d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});$('todayLabel').textContent=new Date().toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'})}
function msg(id,text,kind='success'){let el=$(id);el.textContent=text;el.className='message '+kind}
function sorted(){return [...entries].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))}
function addEvent(type){
 const d=currentAdjusted(), date=dateStr(d), time=localTime(d);
 const sameDay=entries.filter(x=>x.date===date&&['Kommen','Gehen'].includes(x.type)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const last=sameDay[sameDay.length-1];
 if(last&&last.type===type&&!confirm(`Die letzte Arbeitszeitbuchung an diesem Tag ist ebenfalls „${type}“. Möchtest du trotzdem speichern?`))return;
 entries.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),date,time,type,note:'',createdAt:Date.now()});
 save();offset=0;baseTime=new Date();refreshClock();render();msg('timeMessage',`${type} um ${time} Uhr am ${displayDate(date)} gespeichert.`); 
}
function addAbsence(date,type,note){
 const exists=entries.find(x=>x.date===date&&x.type===type);
 if(exists){return false}
 entries.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),date,time:'',type,note:note||'',createdAt:Date.now()});return true;
}
function render(){
 const years=[...new Set(entries.map(x=>x.date.slice(0,4)))].sort().reverse();const sel=$('yearFilter');const old=sel.value;
 sel.innerHTML='<option value="all">Alle</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
 if(years.includes(old)||old==='all')sel.value=old;else sel.value=years[0]||'all';
 const chosen=sel.value;const rows=sorted().filter(x=>chosen==='all'||x.date.startsWith(chosen));
 $('entriesBody').innerHTML=rows.map(x=>`<tr><td>${displayDate(x.date)}</td><td>${x.time||'—'}</td><td>${escapeHtml(typeName(x.type))}</td><td>${escapeHtml(x.note||'')}</td><td><button class="small-btn" data-edit="${x.id}">Bearbeiten</button><button class="small-btn del" data-delete="${x.id}">Löschen</button></td></tr>`).join('')||'<tr><td colspan="5">Noch keine Buchungen vorhanden.</td></tr>';
 $('entryCount').textContent=`${rows.length} Buchung(en) angezeigt · ${entries.length} insgesamt`;
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editEntry(b.dataset.edit));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteEntry(b.dataset.delete));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function deleteEntry(id){if(!confirm('Diese Buchung wirklich löschen?'))return;entries=entries.filter(x=>x.id!==id);save();render();msg('listMessage','Buchung gelöscht.')}
function editEntry(id){
 const x=entries.find(e=>e.id===id);if(!x)return;
 $('editId').value=id;$('editDate').value=x.date;$('editTime').value=x.time||'';$('editNote').value=x.note||'';
 $('editType').innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');$('editType').value=x.type;
 $('editTimeWrap').style.display=['Kommen','Gehen'].includes(x.type)?'block':'none';
 $('editType').onchange=()=>$('editTimeWrap').style.display=['Kommen','Gehen'].includes($('editType').value)?'block':'none';
 $('editDialog').showModal();
}
$('editForm').onsubmit=e=>{e.preventDefault();let x=entries.find(z=>z.id===$('editId').value);if(!x)return;x.date=$('editDate').value;x.type=$('editType').value;x.time=['Kommen','Gehen'].includes(x.type)?$('editTime').value:'';x.note=$('editNote').value;save();$('editDialog').close();render();msg('listMessage','Änderung gespeichert.')};
$('cancelEdit').onclick=()=>$('editDialog').close();
function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function exportCsv(){
 const year=$('yearFilter').value;
 const data=sorted().filter(x=>year==='all'||x.date.startsWith(year)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 if(!data.length){msg('listMessage','Für die Auswahl gibt es keine Buchungen zum Exportieren.','error');return}
 // Daily rows match the user's Excel structure; extra event columns preserve rare additional punch pairs.
 const grouped=new Map();
 for(const x of data){if(!grouped.has(x.date))grouped.set(x.date,{date:x.date,punches:[],codes:[],notes:[]});let g=grouped.get(x.date);
   if(['Kommen','Gehen'].includes(x.type))g.punches.push(`${x.type} ${x.time}`);
   else if(x.type==='HO'){g.codes.push('A');g.notes.push('Home Office'+(x.note?': '+x.note:''));}
   else {g.codes.push(x.type);g.notes.push(typeName(x.type)+(x.note?': '+x.note:''));}
 }
 const lines=[['Datum','Kommen','Gehen','Kennzeichen','Bemerkung','Weitere Buchungen']];
 for(const g of grouped.values()){
   const punches=g.punches, comes=punches.filter(p=>p.startsWith('Kommen ')).map(p=>p.slice(7)), goes=punches.filter(p=>p.startsWith('Gehen ')).map(p=>p.slice(6));
   let code=g.codes.length?g.codes[0]:'A';if(g.codes.includes('K'))code='K';if(g.codes.includes('U'))code='U';if(g.codes.includes('B'))code='B';if(g.codes.includes('D'))code='D';if(g.codes.includes('F'))code='F';if(g.codes.includes('Ü'))code='Ü';
   lines.push([displayDate(g.date),comes[0]||'',goes[goes.length-1]||'',code,g.notes.join(' | '),punches.slice(1,-1).join(' | ')]);
 }
 const csv='\ufeff'+lines.map(row=>row.map(csvCell).join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`Stempeluhr_Export_${year==='all'?'alle':year}_${dateStr(new Date())}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 pendingExportIds=data.map(x=>x.id);$('exportText').textContent=`${data.length} Buchung(en) aus ${grouped.size} Tag(en) wurden in die CSV-Datei übernommen.`;
 $('exportConfirm').classList.remove('hidden');msg('listMessage','CSV-Datei wurde zum Download bereitgestellt. Bitte prüfe deinen Download-Ordner.');
}
$('deleteExported').onclick=()=>{if(!pendingExportIds.length)return;if(!confirm(`Wirklich ${pendingExportIds.length} exportierte Buchung(en) löschen?`))return;const ids=new Set(pendingExportIds);entries=entries.filter(x=>!ids.has(x.id));pendingExportIds=[];save();$('exportConfirm').classList.add('hidden');render();msg('listMessage','Die exportierten Buchungen wurden gelöscht.')};
$('keepExported').onclick=()=>{pendingExportIds=[];$('exportConfirm').classList.add('hidden');msg('listMessage','Die Buchungen bleiben in der App gespeichert.')};
$('absenceForm').onsubmit=e=>{
 e.preventDefault();const from=$('absenceFrom').value,to=$('absenceTo').value,type=$('absenceType').value,note=$('absenceNote').value.trim();
 if(!from||!to||to<from){msg('absenceMessage','Bitte einen gültigen Zeitraum eingeben.','error');return}
 const days=[];for(let d=new Date(from+'T12:00:00');dateStr(d)<=to;d.setDate(d.getDate()+1)){if(type==='F'||d.getDay()!==0&&d.getDay()!==6)days.push(dateStr(d))}
 if(!days.length){msg('absenceMessage','Im gewählten Zeitraum liegen keine Werktage.','error');return}
 let added=0;for(const day of days)if(addAbsence(day,type,note))added++;
 if(!added){msg('absenceMessage','Diese Einträge sind bereits vorhanden.','error');return}
 save();render();msg('absenceMessage',`${added} Eintrag/Einträge gespeichert. Wochenenden wurden bei Zeiträumen ausgelassen.`);$('absenceNote').value='';
};
$('exportBtn').onclick=exportCsv;$('yearFilter').onchange=render;
$('deleteAll').onclick=()=>{if(!entries.length)return;if(confirm(`Achtung: Wirklich ALLE ${entries.length} Buchungen endgültig aus diesem Browser löschen?`)){entries=[];save();render();$('exportConfirm').classList.add('hidden');msg('listMessage','Alle Buchungen wurden gelöscht.')}};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');});
document.querySelectorAll('[data-adjust]').forEach(b=>b.onclick=()=>{offset+=Number(b.dataset.adjust);refreshClock()});
$('resetTime').onclick=()=>{offset=0;baseTime=new Date();refreshClock()};
$('comeBtn').onclick=()=>addEvent('Kommen');$('goBtn').onclick=()=>addEvent('Gehen');
const today=dateStr(new Date());$('absenceFrom').value=today;$('absenceTo').value=today;
refreshClock();render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
