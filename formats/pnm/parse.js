/**
 * formats/pnm/parse.js — PNM/PPM 解析
 * 地球上最简单的图片格式：魔数 → 尺寸 → 像素字节流
 */
REGISTER_RENDERER('parsePNM', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 PNM/PPM 文件 —— 地球上最简单的图片格式</div>
  <div class="detail-desc">
    PNM（Portable aNyMap）由 Netpbm 项目定义，是教科书级的极简图片格式。无压缩、无调色板、无元数据。
    文件由三部分组成：<span class="hl">魔数</span>→<span class="hl">头部行</span>→<span class="hl">像素数据</span>。
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">PNM 6 种变体</div>
      <table class="byte-table">
        <tr><th>魔数</th><th>格式</th><th>编码</th><th>每像素</th></tr>
        <tr><td><code>P1</code></td><td>PBM (Bitmap)</td><td>ASCII 0/1</td><td>1 bit</td></tr>
        <tr><td><code>P2</code></td><td>PGM (Gray)</td><td>ASCII</td><td>8-16 bit</td></tr>
        <tr><td><code>P3</code></td><td>PPM (Color)</td><td>ASCII</td><td>24 bit RGB</td></tr>
        <tr><td><code>P4</code></td><td>PBM (Bitmap)</td><td>Binary</td><td>1 bit</td></tr>
        <tr><td><code>P5</code></td><td>PGM (Gray)</td><td>Binary</td><td>8-16 bit</td></tr>
        <tr style="background:var(--accent-bg)"><td><code>P6</code></td><td>PPM (Color)</td><td>Binary</td><td>24 bit RGB ★最常见</td></tr>
      </table>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">交互参数</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pnm-w" min="8" max="1024" step="8" value="640" oninput="pnmUpdate()"><span class="param-val" id="pnm-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pnm-h" min="8" max="1024" step="8" value="480" oninput="pnmUpdate()"><span class="param-val" id="pnm-h-v">480</span></div>
      <div class="param-row"><span class="param-label">变体</span>
        <select id="pnm-fmt" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pnmUpdate()">
          <option value="P6" selected>P6 — PPM Binary (彩色)</option><option value="P5">P5 — PGM Binary (灰度)</option>
          <option value="P3">P3 — PPM ASCII (彩色文本)</option><option value="P2">P2 — PGM ASCII (灰度文本)</option>
        </select>
      </div>
      <div id="pnm-stats" style="margin-top:10px;font-size:11px;line-height:2;color:var(--text2)"></div>
    </div>
  </div>
  <div class="viz-card">
    <div class="viz-card-title">P6 PPM 文件结构（Binary RGB）</div>
    <div id="pnm-bytemap"></div>
    <div class="formula-box" style="margin-top:10px">P6\n# 这是注释行（可选）\n640 480\n255\n[R,G,B,R,G,B,R,G,B,...]  ← 640×480×3 = 921,600 字节原始 RGB</div>
  </div>
  `;
  window.pnmUpdate = function(){
    const w=+document.getElementById('pnm-w').value, h=+document.getElementById('pnm-h').value, fmt=document.getElementById('pnm-fmt').value;
    document.getElementById('pnm-w-v').textContent=w; document.getElementById('pnm-h-v').textContent=h;
    const ascii=fmt==='P2'||fmt==='P3';
    const channels=fmt==='P5'||fmt==='P2'?1:3;
    const rawBytes=w*h*channels;
    const size=ascii ? rawBytes*(fmt==='P3'?4:3) : rawBytes + (fmt==='P3'?0:30);
    document.getElementById('pnm-stats').innerHTML=`魔数:<strong>${fmt}</strong> — ${ascii?'文本ASCII':'二进制Binary'}<br>数据量:<strong>${(rawBytes/1024).toFixed(1)} KB</strong>(${w}×${h}×${channels})<br>${ascii?'ASCII约':'≈'} <strong>${(size/1024).toFixed(0)} KB</strong>`;
    renderByteMap('pnm-bytemap',[
      {name:'P6',bytes:1,color:'#4477c4',desc:'魔数'},
      {name:'NL',bytes:1,color:'#88aadd',desc:'换行'},
      {name:'#注',bytes:4,color:'#c8c5bf',desc:'注释'},
      {name:'W H',bytes:8,color:'#c4a044',desc:'宽高'},
      {name:'255',bytes:3,color:'#c49030',desc:'maxval'},
      {name:'RGB×W×H',bytes:Math.min(w*h*3,200),color:'#4caf50',desc:'像素流'+((w*h*3/1024).toFixed(0))+'KB'},
    ]);
  };
  pnmUpdate();
});
