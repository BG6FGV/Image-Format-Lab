/**
 * shared/visuals.js — 高逼格可视化图表组件库
 * 替代各处 Python 代码块，用纯 CSS/SVG 实现专业图示
 */

// ══════════════════════════════════════════════════════════
// 1. DCT 基图像镶嵌（64 个 8×8 DCT 基函数可视化）
// ══════════════════════════════════════════════════════════
function renderBasisMosaic(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  let html = '<div class="basis-grid">';
  for(let u=0;u<8;u++){
    for(let v=0;v<8;v++){
      html += `<div class="basis-cell" style="background:${basisPattern(u,v)}"></div>`;
    }
  }
  html += '</div><div class="basis-legend">DCT基函数 F(u,v): 横=v列频率, 纵=u行频率 → 左上=DC, 右下=最高频</div>';
  el.innerHTML = html;
}

function basisPattern(u,v){
  const cu=u===0?1/Math.sqrt(2):1, cv=v===0?1/Math.sqrt(2):1;
  const stops=[];
  for(let k=0;k<=12;k++){
    const x=k/12, y=k/12;
    let val=0;
    for(let px=0;px<8;px++) for(let py=0;py<8;py++)
      val+=Math.cos((2*px+1)*u*Math.PI/16)*Math.cos((2*py+1)*v*Math.PI/16);
    val*=0.25*cu*cv/32;
    const r=Math.round(128+val*200);
    const g=Math.round(128-val*150);
    const b=Math.round(128+Math.abs(val)*80);
    stops.push(`rgb(${Math.min(255,Math.max(0,r))},${Math.min(255,Math.max(0,g))},${Math.min(255,Math.max(0,b))})`);
  }
  const mid=stops[6];
  return `linear-gradient(135deg,${stops[0]},${stops[3]},${mid},${stops[9]},${stops[12]})`;
}

// ══════════════════════════════════════════════════════════
// 2. 频域幅度谱（DCT 系数柱状图）
// ══════════════════════════════════════════════════════════
function renderSpectrum(containerId, F){
  const el = document.getElementById(containerId);
  if(!el) return;
  const flat = F.flat().map((v,i)=>({val:Math.abs(v), idx:i}));
  flat.sort((a,b)=>b.val-a.val);
  const maxVal = flat[0].val || 1;
  const colors = ['#3266ad','#4477c4','#5588db','#6699f0','#77aaff','#88bbff','#99ccff','#aaddff'];
  let html = '<div class="spectrum-chart">';
  for(let i=0;i<64;i++){
    const h = Math.round(flat[i].val / maxVal * 100);
    html += `<div class="spec-bar" style="height:${h}px;background:${colors[Math.floor(i/8)]}" title="系数#${flat[i].idx}: ${Math.round(flat[i].val)}"><span class="spec-label">${flat[i].idx}</span></div>`;
  }
  html += '</div><div class="basis-legend">DCT系数幅度谱 (按幅值降序) — 颜色区分频率组 (蓝=低频 → 浅=高频)</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════════════
// 3. 量化系数瀑布图（量化前 vs 量化后对比）
// ══════════════════════════════════════════════════════════
function renderWaterfall(containerId, before, after){
  const el = document.getElementById(containerId);
  if(!el) return;
  const maxB = Math.max(...before.flat().map(Math.abs), 1);
  let html = '<div class="waterfall-container">';
  html += '<div class="wf-label">量化前</div><div class="wf-row">';
  for(let i=0;i<64;i++){
    const {x,y} = zigzagPos(i);
    const v = before[y]?.[x] ?? 0;
    const h = Math.round(Math.abs(v)/maxB*50);
    html += `<div class="wf-bar" style="height:${Math.max(1,h)}px;background:${v>0?'#4477c4':'#c44444'}" title="(${y},${x}): ${Math.round(v)}"></div>`;
  }
  html += '</div><div class="wf-label">量化后</div><div class="wf-row">';
  for(let i=0;i<64;i++){
    const {x,y} = zigzagPos(i);
    const v = after[y]?.[x] ?? 0;
    const h = Math.round(Math.abs(v)/Math.max(...after.flat().map(Math.abs),1)*50);
    html += `<div class="wf-bar" style="height:${Math.max(1,h)}px;background:${v===0?'#d3d1c7':v>0?'#4477c4':'#c44444'}" title="(${y},${x}): ${v}"></div>`;
  }
  html += '</div><div class="basis-legend">水平=Zig-Zag序号(0-63), 垂直=系数幅值 — 灰柱=归零</div></div>';
  el.innerHTML = html;
}

function zigzagPos(k){
  let sum=0, i=0;
  while(sum+i+1<=k){ sum+=i+1; i++; }
  const r=k-sum, c=i-r;
  return i%2===0?{x:c,y:r}:{x:r,y:c};
}

// ══════════════════════════════════════════════════════════
// 4. 哈夫曼树图（CSS 绘制二叉树 + 码字）
// ══════════════════════════════════════════════════════════
function renderHuffmanTree(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const nodes = [
    {id:'root', left:'0_n', right:'1_n'},
    {id:'0_n', left:'00', right:'01'},
    {id:'1_n', left:'10_n', right:'11_n'},
    {id:'00', val:'0'},
    {id:'01', val:'1'},
    {id:'10_n', left:'100', right:'101'},
    {id:'11_n', left:'110', right:'111'},
    {id:'100', val:'2'},
    {id:'101', val:'3'},
    {id:'110', val:'4'},
    {id:'111', val:'5'},
  ];
  el.innerHTML = `
  <div class="huff-tree">
    <div class="ht-title">JPEG DC 亮度哈夫曼树（简化）</div>
    <div class="ht-root"><span>ROOT</span></div>
    <div class="ht-line-l"></div><div class="ht-line-r"></div>
    <div class="ht-level">
      <div class="ht-node ht-edge">SSSS=0 → 码 <b>00</b></div>
      <div class="ht-node ht-edge">SSSS=1 → 码 <b>010</b></div>
      <div class="ht-node ht-edge">SSSS=2 → 码 <b>011</b></div>
      <div class="ht-node ht-edge">SSSS=3 → 码 <b>100</b></div>
    </div>
    <div class="ht-level">
      <div class="ht-node ht-inner">SSSS=4 → 码 <b>1010</b></div>
      <div class="ht-node ht-inner">SSSS=5 → 码 <b>1011</b></div>
      <div class="ht-node ht-inner">SSSS=6 → 码 <b>1100</b></div>
      <div class="ht-node ht-inner">SSSS=7 → 码 <b>1110</b></div>
    </div>
    <div class="basis-legend" style="margin-top:8px">左分支=0, 右分支=1 — SSSS=SIZE类别(幅值范围: 0→0, 1→±1, 2→±3, ..., k→±(2^k-1))</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// 5. 字节分布场图（文件头的彩色条形图）
// ══════════════════════════════════════════════════════════
function renderByteMap(containerId, fields){
  const el = document.getElementById(containerId);
  if(!el) return;
  // fields = [{name, bytes, color, desc}]
  let html = '<div class="bytemap">';
  let offset = 0;
  for(const f of fields){
    const w = f.bytes * 14;
    html += `<div class="bytemap-block" style="width:${w}px;background:${f.color}">
      <span class="bytemap-name">${f.name}</span>
      <span class="bytemap-size">${f.bytes}B</span>
      <span class="bytemap-off">+${offset.toString(16).toUpperCase()}</span>
    </div>`;
    offset += f.bytes;
  }
  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════════════
// 6. 色彩空间投影图（RGB 立方体 → YCbCr 平面）
// ══════════════════════════════════════════════════════════
function renderColorProjection(containerId, R,G,B){
  const el = document.getElementById(containerId);
  if(!el) return;
  const Y=Math.round(0.299*R+0.587*G+0.114*B);
  // 模拟 Cb/Cr 平面上的颜色点
  const Cb=Math.round(-0.1687*R-0.3313*G+0.5*B+128);
  const Cr=Math.round(0.5*R-0.4187*G-0.0813*B+128);
  const cbn=((Cb/255)*2-1)*0.7, crn=((Cr/255)*2-1)*0.7;
  const px=50+Math.round(crn*35), py=50+Math.round(-cbn*35);
  
  el.innerHTML = `
  <div class="color-proj">
    <div class="color-proj-title">Cb-Cr 色度平面（亮度 Y=${Y}）</div>
    <svg viewBox="0 0 100 80" class="color-proj-svg">
      <rect x="5" y="5" width="90" height="70" fill="#f8f7f4" stroke="#c8c5bf" rx="4"/>
      <line x1="5" y1="40" x2="95" y2="40" stroke="#c8c5bf" stroke-width="0.5"/>
      <line x1="50" y1="5" x2="50" y2="75" stroke="#c8c5bf" stroke-width="0.5"/>
      <text x="92" y="43" font-size="6" fill="#8a8885" text-anchor="end">Cb→</text>
      <text x="48" y="10" font-size="6" fill="#8a8885" text-anchor="end">Cr↑</text>
      ${[...Array(20)].map(()=>{
        const rx=8+Math.random()*84, ry=8+Math.random()*64;
        return `<circle cx="${rx}" cy="${ry}" r="1.5" fill="#d3d1c7" opacity="0.5"/>`;
      }).join('')}
      <circle cx="${px}" cy="${py}" r="4" fill="rgb(${R},${G},${B})" stroke="#1a1917" stroke-width="1"/>
      <text x="${px}" y="${py-6}" font-size="7" fill="#1a1917" text-anchor="middle">●</text>
    </svg>
    <div class="basis-legend">Cb(Cr)平面图中 ● = 当前颜色投影 — BT.601色彩空间</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// 7. YCbCr 三通道分离图
// ══════════════════════════════════════════════════════════
function renderChannelSplit(containerId, Y, Cb, Cr){
  const el = document.getElementById(containerId);
  if(!el) return;
  const cbGray=Math.round(Cb), crGray=Math.round(Cr);
  el.innerHTML = `
  <div class="channel-split">
    <div class="ch-box">
      <div class="ch-preview" style="background:rgb(${Y},${Y},${Y})"></div>
      <div class="ch-label">Y 亮度 <span>${Y}</span></div>
    </div>
    <div class="ch-box">
      <div class="ch-preview" style="background:rgb(${cbGray},${cbGray},${cbGray})"></div>
      <div class="ch-label">Cb 蓝色差 <span>${Cb}</span></div>
    </div>
    <div class="ch-box">
      <div class="ch-preview" style="background:rgb(${crGray},${crGray},${crGray})"></div>
      <div class="ch-label">Cr 红色差 <span>${Cr}</span></div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// 8. 量化锯齿图（Zig-Zag 扫描路径 + 系数分布）
// ══════════════════════════════════════════════════════════
function renderZigPath(containerId, coeffs){
  const el = document.getElementById(containerId);
  if(!el) return;
  const maxAbs = Math.max(...coeffs.flat().map(Math.abs), 1);
  let html = '<div class="zigpath-grid">';
  for(let y=0;y<8;y++){
    for(let x=0;x<8;x++){
      const v = coeffs[y][x];
      const n = v/maxAbs;
      const r = n>0?Math.round(60+n*180):60;
      const b = n<0?Math.round(60-n*180):60;
      const zz = ZZ_ORDER[y][x];
      html += `<div class="zigpath-cell" style="background:rgb(${r},80,${b});color:${Math.abs(n)>0.4?'#fff':'#333'}">
        <span class="zp-num">${zz}</span><span class="zp-val">${Math.round(v)}</span>
      </div>`;
    }
  }
  html += '</div><div class="basis-legend">编号=Zig-Zag序 → 扫描路径: (0,0)→(0,1)→(1,0)→(2,0)→(1,1)→...</div>';
  el.innerHTML = html;
}
