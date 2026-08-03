// ============================================================
// 全能版 TurboWarp 云服务器（零依赖）
// 启动: node server.js [端口]  默认 3000
// 终端命令: /stop 暂停  /open 恢复  /log 导出日志  /setting 端口
// 管理: http://localhost:3000/admin
// 新增: /ping/作品ID  返回 {projectId, ip}
// ============================================================

const http = require('http');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

let PORT = parseInt(process.argv[2]) || 3000;
const DATA_FILE = path.join(__dirname, 'cloud-data.json');
const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin-config.json');
const LOG_FILE = path.join(__dirname, 'server.log');

// ---------- 暂停标志 ----------
let isPaused = false;

// ---------- 日志缓存 ----------
const logBuffer = [];
function addLog(msg) {
  const line = `[${ts()}] ${msg}`;
  console.log(line);
  logBuffer.push(line);
}

function ts() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function smart(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === '') return '';
  const n = Number(s);
  return (!isNaN(n) && String(n) === s) ? n : s;
}

// ---------- 数据持久化 ----------
let store = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    addLog('✅ 已加载历史数据');
  }
} catch (e) { addLog('⚠️ 数据文件损坏，已重置'); }

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function getProject(id) {
  if (!store[id]) store[id] = { vars: {}, lists: {} };
  return store[id];
}

// ---------- 管理员配置（黑名单） ----------
let adminPwd = '';
let blackList = [];
try {
  if (fs.existsSync(ADMIN_CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8'));
    adminPwd = cfg.password || '';
    blackList = cfg.blackList || [];
  }
} catch (e) {}

function saveAdminConfig() {
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ password: adminPwd, blackList }), 'utf8');
}

// ---------- 会话管理 ----------
const sessions = new Set();
function newToken() { return crypto.randomBytes(16).toString('hex'); }

function parseCookies(h) {
  const c = {};
  if (h) h.split(';').forEach(p => {
    const [k, ...r] = p.split('=');
    if (k) c[k.trim()] = r.join('=').trim();
  });
  return c;
}

function isAuth(req) {
  if (!adminPwd) return true;
  const token = parseCookies(req.headers.cookie)['admin_token'];
  return token && sessions.has(token);
}

function getIP(req) {
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
const seenIPs = new Set();

function localIPs() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const n of Object.values(nets)) {
    for (const d of n) if (d.family === 'IPv4' && !d.internal) ips.push(d.address);
  }
  return ips;
}

// ---------- 管理界面 HTML ----------
function loginPage() {
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><title>登录</title>
<style>body{font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5}
.box{background:#fff;padding:40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
input{display:block;width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:4px}
button{width:100%;padding:10px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer}
.error{color:red;margin-top:10px}</style></head><body>
<div class="box"><h2>🔒 管理登录</h2>
<input type="password" id="pwd" placeholder="密码"><button onclick="login()">登录</button>
<p class="error" id="err"></p></div>
<script>async function login(){const p=document.getElementById('pwd').value;const r=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})});const d=await r.json();if(d.success)location.href='/admin';else document.getElementById('err').textContent=d.error||'密码错误'}</script>
</body></html>`;
}

function adminPage() {
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><title>管理面板</title>
<style>body{font-family:Arial;margin:20px;background:#f5f5f5}.card{background:#fff;border-radius:8px;padding:20px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}h2{margin-top:0}.row{display:flex;flex-wrap:wrap;gap:20px}.col{flex:1;min-width:260px}input,button{padding:8px 12px;margin:5px 0;border-radius:4px;border:1px solid #ccc}button{background:#007bff;color:#fff;border:none;cursor:pointer}button.danger{background:#dc3545}button:hover{opacity:0.9}ul{list-style:none;padding:0}li{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #eee}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#28a745;margin-right:5px}.empty{color:#999}</style></head><body>
<div class="card"><h2>📡 服务器状态</h2><div class="row">
<div class="col"><p><strong>监听：</strong><span id="addr">-</span>:<span id="port">-</span></p>
<p><strong>本机 IP：</strong></p><ul id="localIPs"></ul>
<p>数据文件：${DATA_FILE}</p></div>
<div class="col"><p><strong>黑名单状态：</strong><span id="blStatus">-</span></p>
<div><input type="text" id="newIP" placeholder="IP地址"><button onclick="addIP()">➕ 添加黑名单</button></div>
<ul id="bl"></ul></div></div></div>
<div class="card"><h2>👥 已连接客户端</h2><ul id="clients"></ul><button onclick="refresh()">🔄 刷新</button></div>
<div class="card"><h2>🔑 修改密码</h2>
<input type="password" id="oldP" placeholder="旧密码（无则留空）"><input type="password" id="newP" placeholder="新密码"><input type="password" id="cfmP" placeholder="确认新密码"><button onclick="chPwd()">修改</button><p id="pwdMsg" style="color:red"></p></div>
<script>
async function fetchS(){const r=await fetch('/admin/status');return await r.json()}
function render(d){
  document.getElementById('addr').textContent=d.bindAddr;
  document.getElementById('port').textContent=d.bindPort;
  document.getElementById('blStatus').textContent=d.blackList.length?'已启用 (黑名单IP将被拒绝)':'未启用';
  document.getElementById('localIPs').innerHTML=d.localIPs.map(i=>'<li>🖥️ '+i+'</li>').join('');
  document.getElementById('bl').innerHTML=d.blackList.length?d.blackList.map(i=>'<li>'+i+' <button class="danger" onclick="rmIP(\\''+i+'\\')">移除</button></li>').join(''):'<li class="empty">黑名单为空</li>';
  document.getElementById('clients').innerHTML=d.connectedIPs.length?d.connectedIPs.map(i=>'<li><span class="dot"></span>'+i+'</li>').join(''):'<li class="empty">暂无连接</li>';
}
async function refresh(){render(await fetchS())}
async function addIP(){const ip=document.getElementById('newIP').value.trim();if(!ip)return;await fetch('/admin/blacklist/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip})});document.getElementById('newIP').value='';refresh()}
async function rmIP(ip){await fetch('/admin/blacklist/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip})});refresh()}
async function chPwd(){const o=document.getElementById('oldP').value,n=document.getElementById('newP').value,c=document.getElementById('cfmP').value,m=document.getElementById('pwdMsg');m.textContent='';if(n!==c){m.textContent='两次密码不一致';return}const r=await fetch('/admin/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oldPassword:o,newPassword:n})});const d=await r.json();if(d.success){alert('密码修改成功！');document.getElementById('oldP').value='';document.getElementById('newP').value='';document.getElementById('cfmP').value=''}else m.textContent=d.error||'修改失败'}
refresh()
</script></body></html>`;
}

// ---------- 请求体解析 ----------
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try { resolve(JSON.parse(b)); } catch { resolve(b); }
    });
  });
}

// ========== 核心请求处理函数 ==========
async function requestHandler(req, res) {
  const ip = getIP(req);
  seenIPs.add(ip);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ===== /ping 接口（精简 JSON，只含 projectId 和 ip） =====
  if (req.method === 'GET' && req.url.startsWith('/ping/')) {
    const projectId = req.url.split('/ping/')[1] || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projectId, ip }));
    addLog(`📡 Ping | IP:${ip} | 项目:${projectId}`);
    return;
  }

  // ===== 管理接口（不受暂停影响） =====
  if (req.url.startsWith('/admin')) {
    if (req.method === 'POST' && req.url === '/admin/login') {
      const b = await readBody(req);
      const p = (b && b.password) ? b.password : '';
      if (adminPwd && p === adminPwd) {
        const t = newToken();
        sessions.add(t);
        res.setHeader('Set-Cookie', `admin_token=${t}; HttpOnly; Path=/; SameSite=Strict`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: adminPwd ? '密码错误' : '未设置密码，直接进入管理面板' }));
      }
      return;
    }
    if (!isAuth(req)) {
      if (req.method === 'GET' && (req.url === '/admin' || req.url === '/admin/') && adminPwd) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginPage());
        return;
      }
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未登录或会话过期' }));
      return;
    }
    if (req.method === 'GET' && req.url === '/admin') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(adminPage());
      return;
    }
    if (req.method === 'GET' && req.url === '/admin/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        bindAddr: server.address().address,
        bindPort: server.address().port,
        localIPs: localIPs(),
        blackList,
        connectedIPs: Array.from(seenIPs),
        hasPassword: !!adminPwd,
        isPaused: isPaused
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/admin/blacklist/add') {
      const b = await readBody(req);
      const ip = (b && b.ip) ? b.ip.trim() : '';
      if (ip && !blackList.includes(ip)) { blackList.push(ip); saveAdminConfig(); addLog(`黑名单添加: ${ip}`); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (req.method === 'POST' && req.url === '/admin/blacklist/remove') {
      const b = await readBody(req);
      const ip = (b && b.ip) ? b.ip.trim() : '';
      blackList = blackList.filter(x => x !== ip); saveAdminConfig(); addLog(`黑名单移除: ${ip}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (req.method === 'POST' && req.url === '/admin/change-password') {
      const b = await readBody(req);
      const oldP = (b && b.oldPassword) ? b.oldPassword : '';
      const newP = (b && b.newPassword) ? b.newPassword : '';
      if (adminPwd && oldP !== adminPwd) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: '旧密码错误' }));
        return;
      }
      if (!newP) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: '新密码不能为空' }));
        return;
      }
      adminPwd = newP; saveAdminConfig(); sessions.clear();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      addLog('管理密码已更新');
      return;
    }
    res.writeHead(404); res.end('管理接口未找到'); return;
  }

  // ===== 数据接口暂停检查 =====
  if (isPaused) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '服务已暂停，请稍后再试' }));
    return;
  }

  // ===== 黑名单检查 =====
  if (blackList.length > 0 && blackList.includes(ip)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '你的IP已被加入黑名单，访问被拒绝' }));
    return;
  }

  const parts = req.url.split('/').filter(Boolean);
  if (parts.length < 3 || !['var', 'list', 'git'].includes(parts[0])) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '路径格式错误' }));
    return;
  }

  const prefix = parts[0];
  const projId = parts[1];
  const name = parts[2];
  const extra = parts[3];
  const extra2 = parts[4];
  const method = req.method;
  let body = '';
  if (method === 'POST' || method === 'PUT') body = await readBody(req);
  // ---------- 变量操作 ----------
  if (prefix === 'var' || prefix === 'git') {
    if (method === 'POST' && extra !== undefined && extra !== 'increment') {
      const val = smart(extra);
      const proj = getProject(projId);
      const oldVal = proj.vars[name] ?? null;
      proj.vars[name] = val;
      saveData();
      addLog(`✏️ SET (path) | IP:${ip} | 项目:${projId} | 变量:${name}: ${JSON.stringify(oldVal)} → ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, name, value: val }));
      return;
    }

    if (method === 'POST' && extra === 'increment') {
      const delta = Number(body);
      if (isNaN(delta)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '增量必须是数字' }));
        return;
      }
      const proj = getProject(projId);
      const oldVal = proj.vars[name];
      const oldNum = (typeof oldVal === 'number') ? oldVal : 0;
      const newVal = oldNum + delta;
      proj.vars[name] = newVal;
      saveData();
      addLog(`🔺 INCREMENT | IP:${ip} | 项目:${projId} | 变量:${name}: ${oldNum} + ${delta} = ${newVal}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, name, value: newVal }));
      return;
    }

    if (method === 'POST') {
      const newValRaw = (body && typeof body === 'object' && 'value' in body) ? body.value : body;
      const val = smart(newValRaw);
      const proj = getProject(projId);
      const oldVal = proj.vars[name] ?? null;
      proj.vars[name] = val;
      saveData();
      addLog(`✏️ SET | IP:${ip} | 项目:${projId} | 变量:${name}: ${JSON.stringify(oldVal)} → ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, name, value: val }));
      return;
    }

    if (method === 'GET') {
      const val = store[projId]?.vars?.[name] ?? null;
      addLog(`📥 GET | IP:${ip} | 项目:${projId} | 变量:${name} → ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, name, value: val }));
      return;
    }

    res.writeHead(405);
    res.end(JSON.stringify({ error: '变量仅支持 GET、POST' }));
    return;
  }

  // ---------- 列表操作 ----------
  if (prefix === 'list') {
    const proj = getProject(projId);
    if (!proj.lists[name]) proj.lists[name] = [];
    const list = proj.lists[name];

    if (method === 'POST' && extra === 'create') {
      if (!proj.lists[name]) proj.lists[name] = [];
      saveData();
      addLog(`📋 LIST CREATE | IP:${ip} | 项目:${projId} | 列表:${name}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
      return;
    }

    if (method === 'POST' && extra !== undefined && extra !== 'create') {
      const val = smart(extra);
      list.push(val);
      saveData();
      addLog(`➕ LIST ADD (path) | IP:${ip} | 项目:${projId} | 列表:${name} 追加: ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
      return;
    }

    if (method === 'POST' && extra === undefined) {
      const item = (body && typeof body === 'object' && 'value' in body) ? body.value : body;
      const val = smart(item);
      list.push(val);
      saveData();
      addLog(`➕ LIST ADD | IP:${ip} | 项目:${projId} | 列表:${name} 追加: ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
      return;
    }

    if (method === 'GET') {
      addLog(`📋 LIST GET | IP:${ip} | 项目:${projId} | 列表:${name} → ${list.length}项`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
      return;
    }

    if (method === 'PUT' && extra !== undefined) {
      const idx = parseInt(extra);
      if (isNaN(idx) || idx < 1 || idx > list.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '索引无效' }));
        return;
      }
      let newItem;
      if (extra2 !== undefined) newItem = extra2;
      else newItem = (body && typeof body === 'object' && 'value' in body) ? body.value : body;
      const oldVal = list[idx - 1];
      const val = smart(newItem);
      list[idx - 1] = val;
      saveData();
      addLog(`✏️ LIST PUT | IP:${ip} | 项目:${projId} | 列表:${name}[${idx}] ${JSON.stringify(oldVal)} → ${JSON.stringify(val)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
      return;
    }

    if (method === 'DELETE') {
      if (extra !== undefined) {
        const idx = parseInt(extra);
        if (isNaN(idx) || idx < 1 || idx > list.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '索引无效' }));
          return;
        }
        const removed = list.splice(idx - 1, 1)[0];
        saveData();
        addLog(`❌ LIST REMOVE | IP:${ip} | 项目:${projId} | 列表:${name}[${idx}] 删除: ${JSON.stringify(removed)}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ projectId: projId, listName: name, value: list }));
        return;
      } else {
        proj.lists[name] = [];
        saveData();
        addLog(`❌ LIST CLEAR | IP:${ip} | 项目:${projId} | 列表:${name} 已清空`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ projectId: projId, listName: name, value: [] }));
        return;
      }
    }

    res.writeHead(405);
    res.end(JSON.stringify({ error: '列表操作不支持该方法' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: '未匹配路由' }));
}

// ========== 创建服务器实例 ==========
let server = http.createServer(requestHandler);

// ========== 终端命令处理 ==========
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => {
  const cmd = input.trim();

  if (cmd === '/log') {
    try {
      fs.writeFileSync(LOG_FILE, logBuffer.join('\n'), 'utf8');
      console.log(`📁 日志已保存到: ${LOG_FILE}`);
    } catch (e) {
      console.log('❌ 保存日志失败:', e.message);
    }
  } else if (cmd === '/stop') {
    if (!isPaused) {
      isPaused = true;
      console.log('⏸️  数据服务已暂停（变量/列表接口暂时不可用）');
    } else {
      console.log('⚠️ 数据服务已经处于暂停状态');
    }
  } else if (cmd === '/open') {
    if (isPaused) {
      isPaused = false;
      console.log('▶️  数据服务已恢复');
    } else {
      console.log('⚠️ 数据服务当前未暂停');
    }
  } else if (cmd.startsWith('/setting')) {
    const parts = cmd.split(' ');
    const newPort = parseInt(parts[1]);
    if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
      console.log('❌ 无效端口号，请输入 1-65535 之间的数字');
    } else if (newPort === PORT) {
      console.log(`⚠️ 服务器已在端口 ${PORT} 上运行`);
    } else {
      // 关闭旧端口，启动新端口
      server.close(() => {
        console.log(`🔌 已关闭端口 ${PORT}`);
        PORT = newPort;
        server = http.createServer(requestHandler);
        server.listen(PORT, '0.0.0.0', () => {
          addLog(`🚀 服务器已切换到端口: ${PORT}`);
          console.log(`管理面板: http://localhost:${PORT}/admin`);
        });
      });
    }
  } else if (cmd !== '') {
    console.log('可用命令: /log (导出日志)  /stop (暂停服务)  /open (恢复服务)  /setting 端口号');
  }
});

// 首次启动
server.listen(PORT, '0.0.0.0', () => {
  addLog(`🚀 服务器已启动，端口: ${PORT}`);
  console.log(`管理面板: http://localhost:${PORT}/admin`);
  console.log(`终端命令: /log  /stop  /open  /setting`);
});