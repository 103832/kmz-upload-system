let u=null, allFiles=[], allFolders=[], sel=null, isAdm=false, curFolderId=null, curPath=[];

async function chk(){
  try{
    const r=await fetch('/api/session'), d=await r.json();
    if(!d.in){window.location.href='index.html';return}
    u=d.user; isAdm=u.role==='admin'; ui(); ldFolders(); ldSite();
  }catch(e){window.location.href='index.html'}
}

function ui(){
  document.getElementById('un').textContent=u.name;
  document.getElementById('ud').textContent=u.name;
  document.getElementById('ua').textContent=u.name.charAt(0);
  document.getElementById('ur').textContent=isAdm?'Admin':'مستخدم';
  document.getElementById('welcomeMsg').textContent='أهلاً بك، '+u.name;
  if(isAdm) document.getElementById('alnk').style.display='flex';
}

async function ldFolders(){
  try{
    const r=await fetch('/api/folders'), d=await r.json();
    allFolders=d;
    goToFolder(null);
  }catch(e){}
}

function goToFolder(fid){
  curFolderId=fid;
  const root=allFolders.find(x=>x.id===1);
  if(!fid){
    document.getElementById('subMsg').textContent='اختر مجلداً لفتحه';
    document.getElementById('bc').innerHTML='';
    document.getElementById('backBtn').style.display='none';
    showFolders([root]);
    return;
  }
  const folder=allFolders.find(x=>x.id===fid);
  if(!folder) return;
  document.getElementById('subMsg').textContent='مجلد: '+folder.name;
  const kids=allFolders.filter(x=>x.parentId===fid);
  if(kids.length){
    updateBreadcrumb(fid);
    showFolders(kids);
  }else{
    updateBreadcrumb(fid);
    ldFiles(fid);
  }
}

function showFolders(list){
  document.getElementById('load').style.display='none';
  document.getElementById('lst').style.display='grid';
  document.getElementById('emp').style.display='none';
  document.getElementById('no').style.display='none';
  document.getElementById('srch').value='';
  const el=document.getElementById('lst');
  el.innerHTML=list.map(f=>{
    const emoji=f.id===1?'🗂️':'📁';
    return '<div class="crd crd-folder" onclick="goToFolder('+f.id+')"><div class="crd-ic" style="font-size:32px">'+emoji+'</div><h3>'+f.name+'</h3><p style="font-size:13px;color:var(--ts)">'+(f.id===1?'المجلد الرئيسي':'مكتب')+'</p></div>';
  }).join('');
}

function updateBreadcrumb(fid){
  const path=[];
  let cur=allFolders.find(x=>x.id===fid);
  while(cur){path.unshift(cur); cur=allFolders.find(x=>x.id===cur.parentId);}
  curPath=path;
  document.getElementById('bc').innerHTML=path.map((f,i)=>{
    if(i===path.length-1) return '<span style="color:var(--s)">'+f.name+'</span>';
    return '<a href="#" onclick="goToFolder('+f.id+');return false" style="color:var(--ts);text-decoration:none">'+f.name+'</a><span style="color:var(--ts);margin:0 5px">/</span>';
  }).join('');
  document.getElementById('backBtn').style.display=path.length>1?'inline-flex':'none';
}

document.getElementById('backBtn').onclick=function(){
  if(curPath.length>1) goToFolder(curPath[curPath.length-2].id);
  else goToFolder(null);
};

async function ldFiles(fid){
  document.getElementById('load').style.display='flex';
  document.getElementById('lst').style.display='none';
  document.getElementById('emp').style.display='none';
  document.getElementById('no').style.display='none';
  document.getElementById('srch').value='';
  try{
    const r=await fetch('/api/kmz-files?folderId='+fid);
    allFiles=await r.json();
    showFiles(allFiles);
  }catch(e){
    document.getElementById('load').innerHTML='<p style="color:#ff6b6b">خطأ في التحميل</p>';
  }
}

function showFiles(files){
  document.getElementById('load').style.display='none';
  const el=document.getElementById('lst'), emp=document.getElementById('emp'), no=document.getElementById('no');
  if(!files.length){
    el.style.display='none';
    no.style.display='none';
    emp.style.display='block';
    return;
  }
  emp.style.display='none'; no.style.display='none';
  el.style.display='grid';
  el.innerHTML=files.map(x=>'<div class="crd" onclick="openF('+JSON.stringify(x).replace(/"/g,'&quot;')+')"><div class="crd-ic">🗺️</div><h3>'+x.name+'</h3><p>'+(x.description||'لا وصف')+'</p><div class="crd-acts" onclick="event.stopPropagation()"><button class="btn btn-suc btn-sm" onclick="trackAndEarth(\''+x.url+'\','+x.id+')">🌍 Google Earth</button><button class="btn btn-pri btn-sm" onclick="trackAndDl(\''+x.url+'\',\''+(x.fileName||'')+'\','+x.id+')">⬇️ تحميل</button></div></div>').join('');
}

function flt(){
  const q=document.getElementById('srch').value.trim().toLowerCase();
  if(!q){showFiles(allFiles); return}
  const f=allFiles.filter(x=>x.name.toLowerCase().includes(q)||(x.description&&x.description.toLowerCase().includes(q)));
  document.getElementById('lst').style.display='none'; showFiles(f);
}

async function trackAccess(fid){try{await fetch('/api/access-file/'+fid,{method:'POST'})}catch(e){}}

function openF(f){
  sel=f;
  document.getElementById('mt').textContent=f.name;
  document.getElementById('md').textContent=f.description||'لا وصف';
  document.getElementById('earthBtn').onclick=()=>{trackAccess(f.id);earth(f.url,f.fileName)};
  document.getElementById('dlBtn').onclick=()=>{trackAccess(f.id);dl(f.url,f.fileName)};
  document.getElementById('fm').classList.add('show');
}

function trackAndEarth(url,id){trackAccess(id);earth(url,'')}
function trackAndDl(url,nm,id){trackAccess(id);dl(url,nm)}
function cls(id){document.getElementById(id).classList.remove('show');if(id==='fm')sel=null}

function infoModal(){document.getElementById('infoModal').classList.add('show')}
function inqModal(){document.getElementById('inqModal').classList.add('show')}

// ---- Dashboard ----
async function showDash(){
  document.getElementById('fileView').style.display='none';
  document.getElementById('dashView').style.display='block';
  document.getElementById('subMsg').textContent='لوحة الإحصائيات';
  document.getElementById('navFiles').classList.remove('act');
  document.getElementById('navDash').classList.add('act');
  try{
    const r=await fetch('/api/stats'), d=await r.json();
    const maxVal=Math.max(d.totalUsers,d.totalLogins,d.totalFiles,d.totalAccesses,1);
    document.getElementById('dUsers').textContent=d.totalUsers;
    document.getElementById('dLogins').textContent=d.totalLogins;
    document.getElementById('dFiles').textContent=d.totalFiles;
    document.getElementById('dAccesses').textContent=d.totalAccesses;
    document.getElementById('dUsersBar').style.width=(d.totalUsers/maxVal*100)+'%';
    document.getElementById('dLoginsBar').style.width=(d.totalLogins/maxVal*100)+'%';
    document.getElementById('dFilesBar').style.width=(d.totalFiles/maxVal*100)+'%';
    document.getElementById('dAccessesBar').style.width=(d.totalAccesses/maxVal*100)+'%';
    document.getElementById('dFolders').textContent=d.totalFolders;
    document.getElementById('dUsers2').textContent=d.totalUsers;
    document.getElementById('dFiles2').textContent=d.totalFiles;
    document.getElementById('dAccesses2').textContent=d.totalAccesses;
  }catch(e){}
}

function hideDash(){
  document.getElementById('fileView').style.display='block';
  document.getElementById('dashView').style.display='none';
  document.getElementById('subMsg').textContent=curFolderId?('مجلد: '+(allFolders.find(x=>x.id===curFolderId)||{}).name):'اختر مجلداً لفتحه';
  document.getElementById('navFiles').classList.add('act');
  document.getElementById('navDash').classList.remove('act');
}

// ---- Upload ----
function upModal(){
  document.getElementById('fi').value=''; document.getElementById('sfi').style.display='none';
  document.getElementById('upp').style.display='none'; document.getElementById('upb').disabled=false;
  document.getElementById('upb').textContent='📤 رفع الكل';
  document.getElementById('upa').style.display='block'; document.getElementById('uic').textContent='📂';
  document.getElementById('upt').textContent='اختر ملفات KMZ';
  const sel=document.getElementById('upFolder');
  sel.innerHTML=allFolders.filter(f=>f.id!==1).map(f=>'<option value="'+f.id+'">'+f.name+'</option>').join('');
  if(curFolderId && curFolderId!==1) sel.value=curFolderId;
  document.getElementById('upm').classList.add('show');
}

function selF(e){
  const files=e.target.files; if(!files.length) return;
  const el=document.getElementById('sfi'); el.style.display='block';
  let html='<strong>'+files.length+' ملفات</strong><br>';
  for(let f of files){
    const kb=Math.round(f.size/1024);
    html+='<div style="padding:2px 0">• '+f.name+' ('+(kb>1024?(kb/1024).toFixed(1)+'MB':kb+'KB')+')</div>';
  }
  el.innerHTML=html;
  document.getElementById('uic').textContent='✅';
  document.getElementById('upt').textContent=files.length+' ملفات محددة';
}

async function upF(){
  const fi=document.getElementById('fi'), files=fi.files;
  if(!files.length){alert('اختر ملفات'); return}
  const folderId=parseInt(document.getElementById('upFolder').value)||1;
  const fd=new FormData(); fd.append('folderId',folderId);
  for(let f of files) fd.append('files',f);
  const el=document.getElementById('upp'), pf=document.getElementById('pf'), pt=document.getElementById('ppt'), btn=document.getElementById('upb');
  el.style.display='block'; btn.disabled=true; btn.textContent='جاري...';
  try{
    const r=await fetch('/api/upload',{method:'POST',body:fd}), d=await r.json();
    if(d.ok){
      pf.style.width='100%'; pt.textContent='تم رفع '+d.count+' ملفات!';
      setTimeout(()=>{cls('upm'); curFolderId?ldFiles(curFolderId):ldFolders()},1000);
    }else{
      alert(d.error||'فشل الرفع'); el.style.display='none'; btn.disabled=false; btn.textContent='📤 رفع الكل';
    }
  }catch(e){
    alert('خطأ في الاتصال'); el.style.display='none'; btn.disabled=false; btn.textContent='📤 رفع الكل';
  }
}

function earth(url,nm){
  if(!url) return;
  const mob=/Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
  if(mob){
    const enc=encodeURIComponent(url);
    if(/Android/i.test(navigator.userAgent)){
      window.location.href='intent://'+url.replace(/^https?:\/\//,'')+'#Intent;scheme=https;package=com.google.earth;end;';
      setTimeout(function(){window.location.href='https://earth.google.com/web/?link='+enc},1000);
    }else if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
      window.location.href='comgoogleearth://'+url;
      setTimeout(function(){window.location.href='https://earth.google.com/web/?link='+enc},1000);
    }else{window.open(url,'_blank');}
  }else{
    window.open('https://earth.google.com/web/','_blank');
    setTimeout(function(){window.open(url,'_blank')},500);
  }
}

function dl(url,nm){
  if(!url) return;
  const a=document.createElement('a'); a.href=url; a.target='_blank';
  a.download=nm||'file.kmz'; document.body.appendChild(a);
  a.click(); document.body.removeChild(a);
}

async function ldSite(){
  try{
    const r=await fetch('/api/site-info'), d=await r.json();
    document.getElementById('infoDeveloper').textContent=d.developer;
    document.getElementById('infoContact').textContent=d.contact;
    document.getElementById('inqText').textContent=d.inquiry;
  }catch(e){}
}

document.addEventListener('DOMContentLoaded',function(){
  chk();
  document.getElementById('lo').onclick=async function(e){
    e.preventDefault(); await fetch('/api/logout',{method:'POST'}); window.location.href='index.html';
  };
  document.getElementById('st').onclick=function(){document.getElementById('sb').classList.toggle('open')};
  document.getElementById('navDash').onclick=function(e){e.preventDefault(); showDash()};
  document.getElementById('navFiles').onclick=function(e){e.preventDefault(); hideDash()};
  document.getElementById('fm').onclick=function(e){if(e.target===e.currentTarget)cls('fm')};
  document.getElementById('infoModal').onclick=function(e){if(e.target===e.currentTarget)cls('infoModal')};
  document.getElementById('inqModal').onclick=function(e){if(e.target===e.currentTarget)cls('inqModal')};
  document.getElementById('upm').onclick=function(e){if(e.target===e.currentTarget)cls('upm')};
  document.getElementById('upa').ondragover=function(e){
    e.preventDefault();
    e.currentTarget.style.borderColor='var(--s)';
    e.currentTarget.style.background='rgba(0,201,167,0.1)';
  };
  document.getElementById('upa').ondragleave=function(e){
    e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';
    e.currentTarget.style.background='transparent';
  };
  document.getElementById('upa').ondrop=function(e){
    e.preventDefault();
    e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';
    e.currentTarget.style.background='transparent';
    const fs=e.dataTransfer.files;
    if(fs.length>0){document.getElementById('fi').files=fs; selF({target:{files:fs}});}
  };
});
