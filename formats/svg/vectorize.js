/**
 * formats/svg/vectorize.js — 位图矢量化（深度版）
 */
REGISTER_RENDERER('vectorize', function(container){
  container.innerHTML = `
  <div class="detail-badge">矢量化</div>
  <div class="detail-title">位图矢量化 —— Potrace 描摹管线</div>
  <div class="detail-desc">
    矢量化将栅格图像转换为 SVG 路径。核心算法（Potrace）：二值化 → 边缘检测 → 路径追踪 → 贝塞尔拟合。注意：照片级自然图像转 SVG 效果不佳，适合 Logo、图标、线条图。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① 预处理：灰度 → 二值化</div>
      <div class="param-row"><span class="param-label">亮度阈值</span><input type="range" class="param-slider" id="vt2-thr" min="0" max="255" value="128" oninput="vt2Update()"><span class="param-val" id="vt2-thr-v">128</span></div>
      <div class="param-row"><span class="param-label">反转</span>
        <select id="vt2-inv" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="vt2Update()">
          <option value="0">不反转（暗→黑）</option><option value="1" selected>反转（暗→白）</option>
        </select>
      </div>
      <div id="vt2-bw-demo" style="margin-top:10px;display:grid;grid-template-columns:repeat(4,38px);gap:1px"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">② 边缘路径追踪</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        在二值化图像中检测黑白边界，沿着边界逆时针追踪到闭合路径：<br>
        <span class="tag tag-info">4-连通</span> 或 <span class="tag tag-info">8-连通</span> 邻居查找<br>
        每个路径是一系列像素坐标的序列
      </div>
      <div style="margin-top:8px;font-family:'Courier New',monospace;font-size:10px;line-height:1.8;background:var(--surface2);padding:8px;border-radius:6px">
        跟踪算法（简化）：<br>
        1. 扫描图像，找到第一个黑→白过渡点<br>
        2. 沿边界逆时针走，记录坐标<br>
        3. 回到起点 → 闭合路径<br>
        4. 将路径内像素标记为已处理<br>
        5. 扫描下一个未处理区域
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">③ 多边形近似</div>
      <div class="param-row"><span class="param-label">精度容差</span><input type="range" class="param-slider" id="vt2-tol" min="0.1" max="3" step="0.1" value="1.0" oninput="vt2Update()"><span class="param-val" id="vt2-tol-v">1.0</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        将像素级路径压缩为直线段序列（Douglas-Peucker 简化）：<br>
        · 连接起点和终点成一条直线<br>
        · 找到距离最远的点<br>
        · 若距离 &gt; 容差 → 在该点分割，递归<br>
        · 否则用当前直线段替代<br>
      </div>
      <div style="margin-top:6px;font-size:10px;color:var(--text3)">
        容差越小 → 多边形顶点越多 → 路径更精确但更复杂
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">④ 贝塞尔曲线拟合</div>
      <div class="param-row"><span class="param-label">转角阈值</span><input type="range" class="param-slider" id="vt2-cor" min="0" max="180" value="90" oninput="vt2Update()"><span class="param-val" id="vt2-cor-v">90°</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        将多边形顶点序列拟合为贝塞尔曲线：<br>
        · 转角 &gt; 阈值 → 保留为角点<br>
        · 平滑段 → 拟合为三次贝塞尔曲线<br>
        · 保证曲线经过首尾点<br>
        · 最小二乘法优化控制点
      </div>
      <div style="margin-top:8px;padding:6px 10px;background:var(--accent-bg);border-radius:6px;font-size:10px;font-family:'Courier New',monospace;color:var(--text)">
        贝塞尔公式：B(t)=(1-t)³P₀+3(1-t)²tP₁+3(1-t)t²P₂+t³P₃
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑤ 优化与过滤</div>
      <div class="param-row"><span class="param-label">最小路径面积</span><input type="range" class="param-slider" id="vt2-min" min="0" max="100" step="5" value="20" oninput="vt2Update()"><span class="param-val" id="vt2-min-v">20 px²</span></div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        · 移除面积过小的路径（噪声）<br>
        · 合并相邻的相同颜色路径<br>
        · 排序路径（从大到小，外轮廓先）<br>
        · SVG 中可按 CSS 类赋予填充色
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">⑥ SVG 路径语法</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        <code><span class="hl">M</span> x y</code> — 移动到（起点）<br>
        <code><span class="hl">L</span> x y</code> — 直线到<br>
        <code><span class="hl">C</span> cx1 cy1 cx2 cy2 x y</code> — 三次贝塞尔<br>
        <code><span class="hl">Q</span> cx cy x y</code> — 二次贝塞尔<br>
        <code><span class="hl">Z</span></code> — 闭合路径<br>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text3)">
        完整路径示例：M10,20 C30,10 50,30 70,20 L100,40 Z
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">Python Potrace 实现</div>
    <div class="formula-box"><span class="hl">import</span> subprocess, os

<span style="color:var(--text3)"># 第一步：转 PBM（Portable Bitmap）</span>
<span class="hl">from</span> PIL <span class="hl">import</span> Image
img = Image.open(<span class="hl-g">'logo.png'</span>).convert(<span class="hl-g">'1'</span>)  <span style="color:var(--text3)"># 二值化</span>
img.save(<span class="hl-g">'temp.pbm'</span>)

<span style="color:var(--text3)"># 第二步：Potrace 描摹</span>
subprocess.run([
    <span class="hl-g">'potrace'</span>,
    <span class="hl-g">'temp.pbm'</span>,          <span style="color:var(--text3)"># 输入 .pbm</span>
    <span class="hl-g">'-s'</span>,                  <span style="color:var(--text3)"># 输出 SVG</span>
    <span class="hl">'-t'</span>, <span class="hl">128</span>,            <span style="color:var(--text3)"># 亮度阈值</span>
    <span class="hl">'-a'</span>, <span class="hl">1.0</span>,            <span style="color:var(--text3)"># 精度容差</span>
    <span class="hl">'-O'</span>, <span class="hl">0.2</span>,            <span style="color:var(--text3)"># 优化程度</span>
    <span class="hl">'-o'</span>, <span class="hl-g">'output.svg'</span>       <span style="color:var(--text3)"># 输出文件</span>
])

os.remove(<span class="hl-g">'temp.pbm'</span>)</div>
  </div>
  `;

  window.vt2Update = function(){
    const thr=+document.getElementById('vt2-thr').value;
    const inv=+document.getElementById('vt2-inv').value;
    const tol=+document.getElementById('vt2-tol').value;
    const cor=+document.getElementById('vt2-cor').value;
    const min=+document.getElementById('vt2-min').value;
    document.getElementById('vt2-thr-v').textContent=thr;
    document.getElementById('vt2-tol-v').textContent=tol.toFixed(1);
    document.getElementById('vt2-cor-v').textContent=cor+'°';
    document.getElementById('vt2-min-v').textContent=min+' px²';

    // 生成二值化演示
    const grid=document.getElementById('vt2-bw-demo');
    const cells=Array.from({length:16},(_,i)=>{
      const v=Math.sin(i*0.8)*40+128+Math.random()*30;
      const bit=inv?(v>thr?0:1):(v>thr?1:0);
      return {v,bit};
    });
    grid.innerHTML=cells.map(c=>`<div style="height:38px;background:${c.bit?'#1a1917':'#fff'};border:0.5px solid #ccc;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:8px;color:${c.bit?'#fff':'#888'}">${Math.round(c.v)}</div>`).join('');
  };
  vt2Update();
});
