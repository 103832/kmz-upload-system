let u=null;

async function chk(){
  try{const r=await fetch('/api/session'),d=await r.json();
  if(!d.in||d.user.role!=='admin'){window.location.href=d.in?'dash.html':'index.html';return}
  u=d.user;ui();ldUsr();ldFl();ldCfg();ldFoldersAdmin()}catch(e){window.location.href='index.html'}}

function ui(){
  document.getElementById('un').textContent=u.name;
  document.getElementById('ud').textContent=u.name;
  document.getElementById('ua').textContent=u.name.charAt(0);
  document.getElementById('ur').textContent='Admin'}

async function ldUsr(){
  try{const r=await fetch('/api/users'),u=await r.json(),tb=document.getElementById('utb');
  if(!u.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--ts)">فارغ</td></tr>';return}
  tb.innerHTML=u.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+x.name+'</td><td>'+x.username+'</td><td><span class="bdg '+(x.role==='admin'?'bdg-adm':'bdg-usr')+'">'+(x.role==='admin'?'Admin':'مستخدم')+'</span></td><td class="acts"><button class="btn btn-pri btn-sm" onclick="edUsr('+x.id+',\''+x.name+'\',\''+x.username+'\',\''+x.role+'\')">تعديل</button>'+(x.username!=='admin'?'<button class="btn btn-dng btn-sm" onclick="delUsr('+x.id+')">حذف</button>':'')+'</td></tr>').join('')}
  catch(e){document.getElementById('utb').innerHTML='<tr><td colspan="5" style="text-align:center;color:#ff6b6b">خطأ</td></tr>'}}

async function ldFl(){
  try{
    const r=await fetch('/api/kmz-files'),f=await r.json(),el=document.getElementById('fl');
    const foldersR=await fetch('/api/folders'),folders=await foldersR.json();
    if(!f.length){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--ts)">لا توجد ملفات مرفوعة</div>';return}
    el.innerHTML=f.map(x=>{
      const folder=folders.find(f=>f.id===x.folderId);
      return '<div class="fli"><div style="font-size:28px">🗺️</div><div class="info"><h4>'+x.name+'</h4><p>'+(x.description||'لا وصف')+'</p><small style="color:var(--ts)">📁 '+(folder?folder.name:'الرئيسي')+'</small></div><div class="acts"><button class="btn btn-dng btn-sm" onclick="delFl('+x.id+')">🗑️ حذف</button></div></div>'
    }).join('')}
  catch(e){document.getElementById('fl').innerHTML='<div style="text-align:center;padding:20px;color:#ff6b6b">خطأ</div>'}}

async function ldCfg(){
  try{const r=await fetch('/api/config'),c=await r.json();document.getElementById('appn').value=c.appName||''}catch(e){}}

async function ldFoldersAdmin(){
  try{
    const r=await fetch('/api/folders'),d=await r.json();
    const el=document.getElementById('folderList');
    const subs=d.filter(x=>x.parentId===1);
    if(!subs.length){el.innerHTML='<div style="color:var(--ts);font-size:13px">لا توجد مكاتب مضافة</div>';return}
    el.innerHTML=subs.map(f=>'<div class="fli"><div style="font-size:24px">📁</div><div class="info"><h4>'+f.name+'</h4><p style="font-size:13px;color:var(--ts)">مكتب</p></div><div class="acts"><button class="btn btn-dng btn-sm" onclick="delFolder('+f.id+')">🗑️ حذف</button></div></div>').join('')}
  catch(e){}}

async function addFolder(){
  const inp=document.getElementById('folderName'),nm=inp.value.trim();
  if(!nm){alert('أدخل اسم المكتب');return}
  try{
    const r=await fetch('/api/folders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm})});
    const d=await r.json();
    if(d.ok){inp.value='';ldFoldersAdmin()}else{alert(d.error||'فشل')}}
  catch(e){alert('خطأ اتصال')}}

async function delFolder(id){
  if(!confirm('سيتم حذف المجلد وكل الملفات داخله. متأكد؟'))return;
  try{
    const r=await fetch('/api/folders/'+id,{method:'DELETE'}),d=await r.json();
    if(d.error){alert(d.error)}else{ldFoldersAdmin();ldFl()}}
  catch(e){alert('خطأ')}}

function errH(){document.getElementById('umerr').classList.remove('show');document.getElementById('umerr').textContent=''}

function addUser(){
  errH();document.getElementById('umt').textContent='إضافة مستخدم';document.getElementById('eid').value='';
  document.getElementById('unm').value='';document.getElementById('uus').value='';document.getElementById('upw').value='';
  document.getElementById('url').value='user';document.getElementById('um').classList.add('show');setTimeout(()=>document.getElementById('unm').focus(),100)}

function edUsr(id,nm,un,role){
  errH();document.getElementById('umt').textContent='تعديل';document.getElementById('eid').value=id;
  document.getElementById('unm').value=nm;document.getElementById('uus').value=un;document.getElementById('upw').value='';document.getElementById('url').value=role;document.getElementById('um').classList.add('show')}

async function svUsr(){
  errH();const eid=document.getElementById('eid').value,nm=document.getElementById('unm').value.trim(),un=document.getElementById('uus').value.trim(),pw=document.getElementById('upw').value.trim(),rl=document.getElementById('url').value;
  if(!nm){document.getElementById('umerr').textContent='أدخل الاسم';document.getElementById('umerr').classList.add('show');return}
  if(!eid&&!un){document.getElementById('umerr').textContent='أدخل اسم المستخدم';document.getElementById('umerr').classList.add('show');return}
  if(!eid&&!pw){document.getElementById('umerr').textContent='أدخل كلمة السر';document.getElementById('umerr').classList.add('show');return}
  try{
    let r,d;
    if(eid){
      const b={name:nm,role:rl};if(pw)b.password=pw;
      r=await fetch('/api/users/'+eid,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});d=await r.json()
    }else{
      r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,password:pw,name:nm,role:rl})});d=await r.json()
    }
    if(d.ok){cls('um');ldUsr()}else{document.getElementById('umerr').textContent=d.error||'فشل';document.getElementById('umerr').classList.add('show')}
  }catch(e){document.getElementById('umerr').textContent='خطأ اتصال';document.getElementById('umerr').classList.add('show')}}

async function delUsr(id){if(!confirm('متأكد؟'))return;try{const r=await fetch('/api/users/'+id,{method:'DELETE'}),d=await r.json();if(d.error){alert(d.error)}else{ldUsr()}}catch(e){}}

async function delFl(id){if(!confirm('متأكد من حذف الملف؟'))return;try{const r=await fetch('/api/delete-file/'+id,{method:'DELETE'}),d=await r.json();if(d.ok){ldFl()}else{alert(d.error||'فشل')}}catch(e){}}

async function saveApp(){const n=document.getElementById('appn').value.trim();if(!n)return;try{const r=await fetch('/api/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({appName:n})}),d=await r.json();if(d.ok)alert('تم')}catch(e){}}

function cls(id){document.getElementById(id).classList.remove('show')}

document.addEventListener('DOMContentLoaded',()=>{
  chk();
  document.getElementById('lo').onclick=async(e)=>{e.preventDefault();await fetch('/api/logout',{method:'POST'});window.location.href='index.html'};
  document.getElementById('st').onclick=()=>document.getElementById('sb').classList.toggle('open');
  document.getElementById('um').onclick=e=>{if(e.target===e.currentTarget)cls('um')}})
