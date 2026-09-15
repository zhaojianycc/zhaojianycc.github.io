const $=id=>document.getElementById(id);
const b64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
async function decryptDashboard(password){
  const response=await fetch(`dashboard.enc.json?v=${Date.now()}`,{cache:'no-store'});
  if(!response.ok) throw new Error('看板数据尚未发布');
  const pack=await response.json();
  if(!pack.data) throw new Error('看板数据尚未发布');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(pack.salt),iterations:pack.iterations||210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const cipher=new Uint8Array([...b64(pack.data),...b64(pack.tag)]);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(pack.iv),tagLength:128},key,cipher);
  return {html:new TextDecoder().decode(plain),publishedAt:pack.publishedAt};
}
function showDashboard(result){
  $('viewer').srcdoc=result.html;
  $('updatedAt').textContent=result.publishedAt?'更新时间：'+new Date(result.publishedAt).toLocaleString('zh-CN'):'';
  $('unlock').hidden=true;
  $('board').hidden=false;
}
$('unlockForm').addEventListener('submit',async event=>{
  event.preventDefault();
  $('message').textContent='正在解密…';
  try{showDashboard(await decryptDashboard($('password').value));$('message').textContent='';$('password').value='';}
  catch(error){$('message').textContent=error.message==='看板数据尚未发布'?error.message:'密码不正确，无法解密看板。';}
});
$('lock').addEventListener('click',()=>{
  $('viewer').srcdoc='';
  $('board').hidden=true;
  $('unlock').hidden=false;
  $('password').focus();
});
