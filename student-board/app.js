const $=id=>document.getElementById(id);
const b64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
async function decryptBoard(password){
  const response=await fetch(`board.enc.json?v=${Date.now()}`,{cache:'no-store'}); if(!response.ok) throw new Error('任务数据尚未发布');
  const pack=await response.json(); if(!pack.data) throw new Error('任务数据尚未发布');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(pack.salt),iterations:pack.iterations||210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const cipher=new Uint8Array([...b64(pack.data),...b64(pack.tag)]);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(pack.iv),tagLength:128},key,cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}
function formatTime(value){if(!value)return '发布时间未记录';const date=new Date(value);return Number.isNaN(date.getTime())?'发布时间未记录':date.toLocaleString('zh-CN',{hour12:false});}
function renderHistory(student){const items=student.history||[];if(!items.length)return '<div class="history-empty">暂无更早的历史任务</div>';return `<div class="history-list">${items.map((item,index)=>`<article class="history-item"><div class="history-meta"><strong>历史任务 ${items.length-index}</strong><span>组会：${escapeHtml(item.meetingDate||'未记录')}</span><span>发布：${escapeHtml(formatTime(item.publishedAt))}</span></div><div class="text">${escapeHtml(item.task)}</div></article>`).join('')}</div>`;}
function renderStudent(student){const hasTask=Boolean(student.latestTask);return `<article class="student-task"><div class="task"><strong>${escapeHtml(student.displayName)}</strong><div class="text">${hasTask?escapeHtml(student.latestTask):'<span class="muted">暂无当前任务</span>'}</div><div class="task-time"><time>组会：${escapeHtml(student.meetingDate||'未记录')}</time><small>发布：${escapeHtml(formatTime(student.publishedAt))}</small></div></div><details class="history"><summary>历史任务（${(student.history||[]).length}）</summary>${renderHistory(student)}</details></article>`;}
function render(data){ $('updatedAt').textContent='同步时间：'+new Date(data.publishedAt).toLocaleString('zh-CN'); $('groups').innerHTML=(data.groups||[]).map(group=>`<section class="group"><h3>${escapeHtml(group.name)}</h3>${group.students.map(renderStudent).join('')}</section>`).join('')||'<section class="panel unlock">暂无学生任务数据。</section>'; const rows=data.overview||[]; $('overviewRows').innerHTML=rows.map(item=>`<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.service||'未设置')}</td><td>${escapeHtml(item.projects||'未参与项目')}</td></tr>`).join(''); $('overviewPanel').hidden=!rows.length; $('unlock').hidden=true; $('board').hidden=false; }
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
$('unlockForm').addEventListener('submit',async event=>{event.preventDefault();$('message').textContent='正在解密…';try{render(await decryptBoard($('password').value));$('message').textContent='';$('password').value='';}catch(error){$('message').textContent=error.message==='任务数据尚未发布'?error.message:'密码不正确，无法解密任务。';}});
$('lock').addEventListener('click',()=>{$('board').hidden=true;$('unlock').hidden=false;$('groups').innerHTML='';$('password').focus();});
