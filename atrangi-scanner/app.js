(() => {
  'use strict';
  const C = window.ScannerCore;
  const $ = (id) => document.getElementById(id);

  const TYPE_ICONS = {
    document:'📄', multi:'📚', aadhaar:'🪪', pan:'💳', passport:'🛂', drivingLicence:'🚘', voterId:'🗳️', idCard:'🪪',
    receipt:'🧾', certificate:'📜', bank:'🏦', insurance:'🛡️', medical:'🩺', vehicle:'🚗', book:'📖', photo:'🖼️', custom:'✨'
  };

  const state = { type:'document', pages:[], editingId:null, editDraft:null, deferredInstall:null };
  let toastTimer;

  function showToast(message, error=false) {
    const el = $('toast'); el.textContent = message; el.className = `toast show${error?' error':''}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className='toast', 2700);
  }

  function initTypes() {
    const grid = $('typeGrid');
    Object.entries(C.DOCUMENT_TYPES).forEach(([key, value]) => {
      const btn = document.createElement('button'); btn.type='button'; btn.className=`type-card${key===state.type?' active':''}`;
      btn.dataset.type=key; btn.setAttribute('role','radio'); btn.setAttribute('aria-checked',key===state.type?'true':'false');
      btn.innerHTML=`<span class="type-icon">${TYPE_ICONS[key]||'📄'}</span><b>${value.label}</b>`;
      btn.addEventListener('click',()=>{state.type=key; [...grid.children].forEach(x=>{x.classList.toggle('active',x.dataset.type===key);x.setAttribute('aria-checked',x.dataset.type===key?'true':'false')}); render();});
      grid.appendChild(btn);
    });
  }

  function render() {
    const type = C.DOCUMENT_TYPES[state.type];
    $('typeLabel').textContent=type.label; $('pageCount').textContent=state.pages.length;
    $('pagesSection').hidden=!state.pages.length; $('exportDock').hidden=!state.pages.length;
    $('dockCount').textContent=`${state.pages.length} page${state.pages.length===1?'':'s'} ready`;
    $('pairedPreview').hidden=!type.paired || !state.pages.length;
    $('pairHint').textContent=type.paired?'Front + back export together':'';
    renderPages(); updateExportSummary();
  }

  async function fileToPage(file) {
    if (!file.type.startsWith('image/')) throw new Error(`${file.name || 'File'} is not an image`);
    const dataUrl = await readFileDataUrl(file);
    const img = await loadImage(dataUrl);
    return { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()), name:file.name||'Camera photo', src:dataUrl,
      width:img.naturalWidth, height:img.naturalHeight, rotation:0, filter:'enhance', crop:{left:0,right:0,top:0,bottom:0} };
  }

  function readFileDataUrl(file) { return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file)}); }
  function loadImage(src) { return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('Could not read image'));img.src=src}); }

  async function addFiles(files) {
    const valid=[...files].filter(f=>f.type.startsWith('image/'));
    if(!valid.length){showToast('Choose one or more image files.',true);return;}
    showToast(`Adding ${valid.length} image${valid.length===1?'':'s'}…`);
    for(const file of valid){try{state.pages.push(await fileToPage(file));}catch(e){showToast(e.message,true)}}
    render(); if(state.pages.length) $('pagesSection').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function pageDescription(p,index){const crop=p.crop; const cropped=crop.left||crop.right||crop.top||crop.bottom;return `${p.filter==='original'?'Original':p.filter==='enhance'?'Enhanced':p.filter==='grayscale'?'Grayscale':'Black & white'}${p.rotation?` • Rotated ${p.rotation}°`:''}${cropped?' • Cropped':''} • ${p.width}×${p.height}`}

  function renderPages(){
    const list=$('pagesList'); list.innerHTML='';
    state.pages.forEach((p,i)=>{
      const item=document.createElement('div');item.className='page-item';
      const thumb=document.createElement('div');thumb.className='thumb';thumb.style.backgroundImage=`url("${p.src}")`;
      const meta=document.createElement('div');meta.className='page-meta';meta.innerHTML=`<b>Page ${i+1}${C.DOCUMENT_TYPES[state.type].paired?` • ${i%2===0?'Front':'Back'}`:''}</b><small>${pageDescription(p,i)}</small>`;
      const actions=document.createElement('div');actions.className='page-actions';
      const controls=[['Edit',()=>openEditor(p.id)],['↑',()=>movePage(i,-1)],['↓',()=>movePage(i,1)],['Remove',()=>removePage(p.id),'remove']];
      controls.forEach(([label,fn,cls])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls||'';b.disabled=(label==='↑'&&i===0)||(label==='↓'&&i===state.pages.length-1);b.addEventListener('click',fn);actions.appendChild(b)});
      item.append(thumb,meta,actions);list.appendChild(item);
    });
  }
  function movePage(i,dir){const j=i+dir;if(j<0||j>=state.pages.length)return;[state.pages[i],state.pages[j]]=[state.pages[j],state.pages[i]];render();}
  function removePage(id){state.pages=state.pages.filter(p=>p.id!==id);render();}

  async function renderSourceCanvas(page, options={}) {
    const img=await loadImage(page.src); const rot=((page.rotation%360)+360)%360;
    const c=page.crop; const sx=img.naturalWidth*(c.left/100), sy=img.naturalHeight*(c.top/100);
    const sw=img.naturalWidth*(1-(c.left+c.right)/100), sh=img.naturalHeight*(1-(c.top+c.bottom)/100);
    const rotated=rot===90||rot===270; const targetMax=options.preview?1200:Math.max(sw,sh);
    const scale=Math.min(1,targetMax/Math.max(sw,sh));
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round((rotated?sh:sw)*scale)); canvas.height=Math.max(1,Math.round((rotated?sw:sh)*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:page.filter==='bw'}); ctx.save(); ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rot*Math.PI/180);
    const dw=sw*scale,dh=sh*scale;ctx.drawImage(img,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);ctx.restore(); applyFilter(canvas,page.filter); return canvas;
  }

  function applyFilter(canvas,filter){
    if(filter==='original')return; const ctx=canvas.getContext('2d',{willReadFrequently:true}); const img=ctx.getImageData(0,0,canvas.width,canvas.height); const d=img.data;
    for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2];
      if(filter==='grayscale'||filter==='bw'){const y=.299*r+.587*g+.114*b;if(filter==='bw'){const v=y>155?255:0;r=g=b=v}else r=g=b=y;}
      else if(filter==='enhance'){r=(r-128)*1.14+136;g=(g-128)*1.14+136;b=(b-128)*1.12+134;}
      d[i]=C.clamp(r,0,255);d[i+1]=C.clamp(g,0,255);d[i+2]=C.clamp(b,0,255);
    } ctx.putImageData(img,0,0);
  }

  async function openEditor(id){
    const p=state.pages.find(x=>x.id===id);if(!p)return;state.editingId=id;state.editDraft=JSON.parse(JSON.stringify(p));
    $('editTitle').textContent=`Edit page ${state.pages.indexOf(p)+1}`;syncEditControls();await drawEditPreview();$('editDialog').showModal();
  }
  function syncEditControls(){const p=state.editDraft;['Left','Right','Top','Bottom'].forEach(k=>{const key=k.toLowerCase();$(`crop${k}`).value=p.crop[key];$(`crop${k}Val`).textContent=`${p.crop[key]}%`});document.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active',t.dataset.filter===p.filter));}
  async function drawEditPreview(){if(!state.editDraft)return;const rendered=await renderSourceCanvas(state.editDraft,{preview:true});const c=$('editCanvas');c.width=rendered.width;c.height=rendered.height;c.getContext('2d').drawImage(rendered,0,0);}
  function bindEditor(){
    ['Left','Right','Top','Bottom'].forEach(k=>{$(`crop${k}`).addEventListener('input',async e=>{const key=k.toLowerCase();state.editDraft.crop[key]=Number(e.target.value);if(state.editDraft.crop.left+state.editDraft.crop.right>70)state.editDraft.crop[key]=30;if(state.editDraft.crop.top+state.editDraft.crop.bottom>70)state.editDraft.crop[key]=30;syncEditControls();await drawEditPreview()})});
    document.querySelectorAll('.tool').forEach(t=>t.addEventListener('click',async()=>{state.editDraft.filter=t.dataset.filter;syncEditControls();await drawEditPreview()}));
    $('rotateLeftBtn').addEventListener('click',async()=>{state.editDraft.rotation=(state.editDraft.rotation+270)%360;await drawEditPreview()});
    $('rotateRightBtn').addEventListener('click',async()=>{state.editDraft.rotation=(state.editDraft.rotation+90)%360;await drawEditPreview()});
    $('saveEditBtn').addEventListener('click',()=>{const idx=state.pages.findIndex(p=>p.id===state.editingId);if(idx>=0)state.pages[idx]=state.editDraft;$('editDialog').close();state.editDraft=null;render();showToast('Page changes saved.');});
  }

  function resolveMargin(v){return Number(v)||0}
  function fitRect(srcW,srcH,dstW,dstH,margin){const maxW=Math.max(1,dstW-margin*2),maxH=Math.max(1,dstH-margin*2);const s=Math.min(maxW/srcW,maxH/srcH);const w=srcW*s,h=srcH*s;return{x:(dstW-w)/2,y:(dstH-h)/2,w,h};}

  async function composeGroup(group, settings){
    const sources=[];for(const p of group)sources.push(await renderSourceCanvas(p));
    const firstRatio=sources[0].width/sources[0].height;const ps=C.getPageSize(settings.pageSize,settings.orientation,group.length===2?0.707:firstRatio);
    const q=C.getQuality(settings.quality);const px=C.pagePixelSize(ps.widthPt,ps.heightPt,q.dpi,q.maxPixels);const canvas=document.createElement('canvas');canvas.width=px.width;canvas.height=px.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    const marginPt=resolveMargin(settings.margin);const marginPx=marginPt*(canvas.width/ps.widthPt);
    if(group.length===2 && C.DOCUMENT_TYPES[state.type].paired){
      const gap=Math.max(8,Math.round(marginPx*.6));const eachH=(canvas.height-marginPx*2-gap)/2;
      sources.forEach((src,i)=>{const rect=fitRect(src.width,src.height,canvas.width-marginPx*2,eachH,0);ctx.drawImage(src,marginPx+rect.x,marginPx+i*(eachH+gap)+rect.y,rect.w,rect.h)});
    } else {
      const src=sources[0];const rect=fitRect(src.width,src.height,canvas.width,canvas.height,marginPx);ctx.drawImage(src,rect.x,rect.y,rect.w,rect.h);
    }
    return {canvas,pageWidthPt:ps.widthPt,pageHeightPt:ps.heightPt};
  }

  async function exportPdf(settings,groups){
    const pdfPages=[];for(let i=0;i<groups.length;i++){setProgress(i,groups.length,'Rendering PDF pages');const {canvas,pageWidthPt,pageHeightPt}=await composeGroup(groups[i],settings);const q=C.getQuality(settings.quality);const url=canvas.toDataURL('image/jpeg',q.jpegQuality);pdfPages.push({jpegBytes:C.dataUrlToBytes(url),imageWidth:canvas.width,imageHeight:canvas.height,pageWidthPt,pageHeightPt});await yieldUi();}
    setProgress(groups.length,groups.length,'Building PDF');const bytes=C.buildPdf(pdfPages);downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${settings.fileName}.pdf`);
  }

  async function exportWord(settings,groups){
    const imgs=[];for(let i=0;i<groups.length;i++){setProgress(i,groups.length,'Rendering Word pages');const {canvas}=await composeGroup(groups[i],{...settings,quality:settings.quality});imgs.push(canvas.toDataURL('image/jpeg',C.getQuality(settings.quality).jpegQuality));await yieldUi();}
    const orientation=settings.orientation==='landscape'?'landscape':'portrait';const body=imgs.map((src,i)=>`<div class="page"><img src="${src}" alt="Scanned page ${i+1}"></div>`).join('');
    const html=`<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:18mm;mso-page-orientation:${orientation}}body{font-family:Arial,sans-serif;margin:0}.page{page-break-after:always;text-align:center}.page:last-child{page-break-after:auto}img{max-width:100%;max-height:94vh}</style></head><body>${body}</body></html>`;
    downloadBlob(new Blob([html],{type:'application/msword'}),`${settings.fileName}.doc`);
  }

  async function exportImages(settings,groups){
    const fmt=$('imageFormat').value;for(let i=0;i<groups.length;i++){setProgress(i,groups.length,'Rendering images');const {canvas}=await composeGroup(groups[i],settings);const mime=fmt==='png'?'image/png':'image/jpeg';const ext=fmt==='png'?'png':'jpg';const data=canvas.toDataURL(mime,fmt==='png'?undefined:C.getQuality(settings.quality).jpegQuality);downloadDataUrl(data,`${settings.fileName}_page_${String(i+1).padStart(2,'0')}.${ext}`);await new Promise(r=>setTimeout(r,120));}showToast(groups.length>1?'Images created. Your browser may ask permission for multiple downloads.':'Image created.');
  }

  function downloadDataUrl(dataUrl,filename){const a=document.createElement('a');a.href=dataUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();}
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function yieldUi(){return new Promise(r=>setTimeout(r,0));}
  function setProgress(done,total,text){const pct=total?Math.round(done/total*100):0;$('progressWrap').hidden=false;$('progressText').textContent=text;$('progressPercent').textContent=`${pct}%`;$('progressBar').style.width=`${pct}%`;}

  function getExportSettings(){return{fileName:C.sanitizeFilename($('fileName').value),format:$('format').value,quality:$('quality').value,pageSize:$('pageSize').value,orientation:$('orientation').value,margin:$('margin').value};}
  function updateExportSummary(){
    if(!state.pages.length)return;const s=getExportSettings();const groups=C.buildExportGroups(state.pages,state.type);const q=C.getQuality(s.quality);const ps=C.PAGE_SIZES[s.pageSize];
    $('imageFormatField').hidden=s.format!=='images';$('exportSummary').innerHTML=`<b>${groups.length} output page${groups.length===1?'':'s'}</b> • ${s.format==='pdf'?'PDF':s.format==='word'?'Word-compatible .doc':'Images'} • ${q.label} • ${ps.label} • ${s.orientation==='auto'?'Automatic orientation':s.orientation[0].toUpperCase()+s.orientation.slice(1)}${C.DOCUMENT_TYPES[state.type].paired?' • Front/back paired':''}`;
  }

  async function createExport(){
    if(!state.pages.length)return;const btn=$('createExportBtn');btn.disabled=true;btn.textContent='Creating…';$('progressWrap').hidden=false;
    try{const s=getExportSettings();const groups=C.buildExportGroups(state.pages,state.type);setProgress(0,groups.length,'Preparing');if(s.format==='pdf')await exportPdf(s,groups);else if(s.format==='word')await exportWord(s,groups);else await exportImages(s,groups);setProgress(groups.length,groups.length,'Done');showToast('Export created successfully.');setTimeout(()=>$('exportDialog').close(),450);}catch(e){console.error(e);showToast(`Export failed: ${e.message}`,true)}finally{btn.disabled=false;btn.textContent='Create Export';}
  }

  function bindEvents(){
    $('cameraBtn').addEventListener('click',()=>$('cameraInput').click());$('galleryBtn').addEventListener('click',()=>$('galleryInput').click());
    $('cameraInput').addEventListener('change',e=>{addFiles(e.target.files);e.target.value=''});$('galleryInput').addEventListener('change',e=>{addFiles(e.target.files);e.target.value=''});
    const dz=$('dropZone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
    $('clearBtn').addEventListener('click',()=>{if(confirm('Remove all scanned pages?')){state.pages=[];render();}});$('enhanceAllBtn').addEventListener('click',()=>{state.pages.forEach(p=>p.filter='enhance');render();showToast('Enhance filter applied to all pages.');});
    $('exportBtn').addEventListener('click',()=>{$('progressWrap').hidden=true;updateExportSummary();$('exportDialog').showModal();});['format','quality','pageSize','orientation','margin','imageFormat','fileName'].forEach(id=>$(id).addEventListener('input',updateExportSummary));$('createExportBtn').addEventListener('click',createExport);
    $('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('installBtn').hidden=false;});$('installBtn').addEventListener('click',async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('installBtn').hidden=true;});
  }

  async function runSelfTest(){
    try{
      const c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,800);x.fillStyle='#123';x.font='bold 54px sans-serif';x.fillText('ATRANGI SCANNER',55,150);x.font='28px sans-serif';x.fillText('Self-test document',55,220);x.strokeStyle='#333';x.lineWidth=5;x.strokeRect(50,280,500,360);
      const src=c.toDataURL('image/jpeg',.85);state.pages=[{id:'t1',name:'test1.jpg',src,width:600,height:800,rotation:0,filter:'enhance',crop:{left:0,right:0,top:0,bottom:0}},{id:'t2',name:'test2.jpg',src,width:600,height:800,rotation:90,filter:'grayscale',crop:{left:3,right:3,top:2,bottom:2}}];state.type='aadhaar';render();
      const groups=C.buildExportGroups(state.pages,state.type);if(groups.length!==1||groups[0].length!==2)throw new Error('Pair grouping failed');const {canvas}=await composeGroup(groups[0],{quality:'medium',pageSize:'a4',orientation:'portrait',margin:'24'});if(canvas.width<500||canvas.height<700)throw new Error('Composite page size invalid');
      document.body.dataset.selfTest='PASS';showToast('Self-test passed.');
    }catch(e){document.body.dataset.selfTest=`FAIL:${e.message}`;showToast(`Self-test failed: ${e.message}`,true)}
  }

  initTypes();bindEvents();bindEditor();render();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(new URLSearchParams(location.search).get('selftest')==='1') runSelfTest();
})();
