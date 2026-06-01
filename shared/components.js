/**
 * components.js
 * 可复用渲染组件库 —— 供各步骤渲染函数调用
 */

// ─── 参数面板 ───
function makeParamRow(id, label, min, max, step, val, unit, onChange){
  return `<div class="param-row">
    <span class="param-label">${label}</span>
    <input type="range" class="param-slider" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" oninput="(${onChange.toString()})(this.value)">
    <span class="param-val" id="${id}-v">${val}${unit||''}</span>
  </div>`;
}

// ─── 8×8 像素网格 ───
function renderPixelGrid(containerId, block8x8){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.className = 'pixel-grid';
  el.style.gridTemplateColumns = 'repeat(8,26px)';
  el.innerHTML = block8x8.flat().map(v=>{
    const c = Math.round(v);
    const txt = v>128?'#222':'#eee';
    return `<div class="pixel-cell" style="background:rgb(${c},${c},${c});color:${txt}">${c}</div>`;
  }).join('');
}

// ─── DCT 热图 ───
function renderDCTGrid(containerId, F){
  const el = document.getElementById(containerId);
  if(!el) return;
  const maxAbs = Math.max(...F.flat().map(Math.abs), 1);
  el.className = 'dct-grid';
  el.style.gridTemplateColumns = 'repeat(8,26px)';
  el.innerHTML = F.flat().map(v=>{
    const n = v/maxAbs;
    const r = n>0 ? Math.round(n*160+60) : 60;
    const b = n<0 ? Math.round(-n*160+60) : 60;
    return `<div class="dct-cell" style="background:rgb(${r},80,${b})">${Math.round(v)}</div>`;
  }).join('');
}

// ─── 量化矩阵热图 ───
function renderQmatGrid(containerId, mat){
  const el = document.getElementById(containerId);
  if(!el) return;
  const maxV = Math.max(...mat.flat(), 1);
  el.className = 'qmat';
  el.style.gridTemplateColumns = 'repeat(8,1fr)';
  el.innerHTML = mat.flat().map(v=>{
    const n = v/maxV;
    const r = Math.round(50+n*180);
    const g = Math.round(200-n*150);
    return `<div class="qmat-cell" style="background:rgb(${r},${g},50);color:${n>0.5?'#fff':'#333'};font-size:${v>99?7:9}px">${v}</div>`;
  }).join('');
}

// ─── 量化结果网格（零值灰显）───
function renderQuantGrid(containerId, Q){
  const el = document.getElementById(containerId);
  if(!el) return;
  const maxAbs = Math.max(...Q.flat().map(Math.abs), 1);
  el.className = 'dct-grid';
  el.style.gridTemplateColumns = 'repeat(8,26px)';
  el.innerHTML = Q.flat().map(v=>{
    if(v===0) return `<div class="dct-cell" style="background:#d3d1c7;color:#888780">0</div>`;
    const n = v/maxAbs;
    const r = n>0 ? Math.round(n*160+60) : 60;
    const b = n<0 ? Math.round(-n*160+60) : 60;
    return `<div class="dct-cell" style="background:rgb(${r},80,${b})">${v}</div>`;
  }).join('');
}

// ─── Zig-Zag 顺序表 ───
const ZZ_ORDER = [
  [0,1,5,6,14,15,27,28],
  [2,4,7,13,16,26,29,42],
  [3,8,12,17,25,30,41,43],
  [9,11,18,24,31,40,44,53],
  [10,19,23,32,39,45,52,54],
  [20,22,33,38,46,51,55,60],
  [21,34,37,47,50,56,59,61],
  [35,36,48,49,57,58,62,63]
];

function renderZigzagGrid(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.style.display = 'grid';
  el.style.gridTemplateColumns = 'repeat(8,1fr)';
  el.style.gap = '1px';
  el.innerHTML = ZZ_ORDER.flat().map(v=>{
    const n = v/63;
    const r = Math.round(50+n*180);
    const g = Math.round(100-n*60);
    const b = Math.round(200-n*150);
    return `<div class="zz-cell" style="background:rgb(${r},${g},${b});color:rgba(255,255,255,.9)">${v}</div>`;
  }).join('');
}

// ─── 标准亮度量化基表 ───
const BASE_LUMA_Q = [
  [16,11,10,16,24,40,51,61],
  [12,12,14,19,26,58,60,55],
  [14,13,16,24,40,57,69,56],
  [14,17,22,29,51,87,80,62],
  [18,22,37,56,68,109,103,77],
  [24,35,55,64,81,104,113,92],
  [49,64,78,87,103,121,120,101],
  [72,92,95,98,112,100,103,99]
];

const BASE_CHROMA_Q = [
  [17,18,24,47,99,99,99,99],
  [18,21,26,66,99,99,99,99],
  [24,26,56,99,99,99,99,99],
  [47,66,99,99,99,99,99,99],
  [99,99,99,99,99,99,99,99],
  [99,99,99,99,99,99,99,99],
  [99,99,99,99,99,99,99,99],
  [99,99,99,99,99,99,99,99]
];

function getScaledQ(q, isChroma=false){
  const base = isChroma ? BASE_CHROMA_Q : BASE_LUMA_Q;
  const scale = q<50 ? Math.floor(5000/q) : (200-2*q);
  return base.map(row=>row.map(v=>Math.min(255,Math.max(1,Math.floor((v*scale+50)/100)))));
}

// ─── 2D DCT ───
function dct2d(block){
  const N=8, F=Array.from({length:N},()=>new Array(N).fill(0));
  for(let u=0;u<N;u++) for(let v=0;v<N;v++){
    const cu=u===0?1/Math.sqrt(2):1, cv=v===0?1/Math.sqrt(2):1;
    let s=0;
    for(let x=0;x<N;x++) for(let y=0;y<N;y++)
      s+=block[x][y]*Math.cos((2*x+1)*u*Math.PI/16)*Math.cos((2*y+1)*v*Math.PI/16);
    F[u][v]=0.25*cu*cv*s;
  }
  return F;
}

// ─── 颜色预览条 ───
function colorBar(r,g,b, label){
  return `<div class="color-bar" style="background:rgb(${r},${g},${b})">${label}</div>`;
}

// ─── 文件头字段可视化（BMP） ───
function bmpHeaderViz(){
  const fields = [
    {name:'bfType',bytes:2,color:'#e6f1fb',desc:'文件类型 "BM"'},
    {name:'bfSize',bytes:4,color:'#eaf3de',desc:'文件总大小'},
    {name:'bfReserved',bytes:4,color:'#f2f1ee',desc:'保留，为 0'},
    {name:'bfOffBits',bytes:4,color:'#faeeda',desc:'像素数据偏移'},
  ];
  return fields.map(f=>`
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
      <div style="width:${f.bytes*18}px;height:20px;background:${f.color};border:0.5px solid var(--border);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex:none">${f.bytes}B</div>
      <code style="font-size:10px;color:var(--accent)">${f.name}</code>
      <span style="font-size:10px;color:var(--text3)">${f.desc}</span>
    </div>`).join('');
}

// ─── 段结构行 ───
function segRow(marker, desc, size){
  return `<div class="segment-row">
    <div class="seg-marker">${marker}</div>
    <div class="seg-desc">${desc}</div>
    <div class="seg-size">${size}</div>
  </div>`;
}

// ─── 无效转换方案提示（仅当 src===dst 或无注册时触发）───
function renderComingSoon(src, dst){
  const reason = (src===dst) ? '源格式与目标格式相同' : '该转换方案未注册';
  document.getElementById('step-detail').innerHTML=`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80%;gap:10px;color:var(--text3)">
      <div style="font-size:36px">↔</div>
      <div style="font-size:13px;font-weight:500;color:var(--text2)">${src} → ${dst}：${reason}</div>
      <div style="font-size:11px">请选择有效的转换组合</div>
    </div>`;
}
