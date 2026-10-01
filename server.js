// خادم اللعب على الشبكة المحلية — بدون أي مكتبات. التشغيل:  node server.js
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const PORT=process.env.PORT||3000, ROOT=__dirname;
const MIME={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const clients=new Map(); let hostId=null;
const push=(id,o)=>{const r=clients.get(id); if(r) r.write('data: '+JSON.stringify(o)+'\n\n');};
const ips=()=>{const o=[];try{for(const l of Object.values(os.networkInterfaces()))for(const i of l||[])if(i.family==='IPv4'&&!i.internal)o.push('http://'+i.address+':'+PORT);}catch(e){}return o;}; // على Termux ممكن الدالة دى تفشل، فبنتجاهلها
setInterval(()=>clients.forEach(r=>r.write(': ping\n\n')),20000);

http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/status'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({hasHost:!!hostId,urls:ips()}));}
  if(u.pathname==='/events'){
    const id=u.searchParams.get('id'),name=u.searchParams.get('name')||'لاعب',host=u.searchParams.get('host')==='1';
    if(host&&hostId&&hostId!==id&&clients.has(hostId)){res.writeHead(409);return res.end();}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write('\n'); clients.set(id,res);
    if(host) hostId=id; else if(hostId) push(hostId,{t:'joined',from:id,name}); else push(id,{t:'end'});
    req.on('close',()=>{ if(clients.get(id)!==res) return; clients.delete(id);
      if(id===hostId){hostId=null;clients.forEach((_,k)=>push(k,{t:'end'}));}
      else if(hostId) push(hostId,{t:'left',from:id}); });
    return;
  }
  if(u.pathname==='/send'&&req.method==='POST'){
    let b='';req.on('data',c=>b+=c);
    req.on('end',()=>{try{const {id,list}=JSON.parse(b);for(const {to,msg} of list)push(to==='host'?hostId:to,{...msg,from:id});}catch(e){} res.writeHead(204);res.end();});
    return;
  }
  let p=decodeURIComponent(u.pathname); if(p==='/') p='/index.html';
  const f=path.join(ROOT,path.normalize(p));
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end();}
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); res.end(d); });
}).listen(PORT,'0.0.0.0',()=>{
  console.log('✅ حسبة برما شغالة. افتح على الأجهزة اللى على نفس الواى فاى:');
  ips().forEach(x=>console.log('   '+x)); if(!ips().length) console.log('   (مقدرتش أعرف العنوان — شوف IP الموبايل من إعدادات الواى فاى وكمّل بـ :'+PORT+')'); console.log('   أو على الجهاز ده: http://localhost:'+PORT);
});
