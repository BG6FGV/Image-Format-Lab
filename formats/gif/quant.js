/**
 * formats/gif/quant.js — 颜色量化（减色至 256 色以内）
 * 注册为 colorQuant 步骤渲染器
 */

REGISTER_RENDERER('colorQuant', function(container){
  container.innerHTML = `
  <div class="detail-badge">颜色量化</div>
  <div class="detail-title">真彩色 → 调色板：颜色量化算法深度解析</div>
  <div class="detail-desc">
    真彩色图像含数百万颜色，GIF 最多支持 <span class="hl">256 色</span>。
    颜色量化的目标是从原始颜色空间中<span class="hl">选出代表性调色板</span>，并将每个像素映射到最接近的调色板色。
    三大核心算法：<strong>中位切分</strong>（Median Cut）、<strong>八叉树</strong>（Octree）、<strong>K-Means 聚类</strong>。
    配合 <span class="hl">Floyd-Steinberg 误差扩散</span> 可消除条带感，获得平滑视觉效果。
  </div>

  <!-- ══ 子面板①：Median Cut 中位切分 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">① 中位切分算法（Median Cut）—— 递归分割颜色立方体</div>
    <div style="font-size:10px;color:var(--text2);line-height:1.8;margin-bottom:10px">
      <strong>核心思想</strong>：将 RGB 颜色空间视为 256×256×256 的立方体，包含图像所有颜色。
      每次沿 <span class="hl">范围最宽的通道</span> 的中位数切一刀，将立方体一分为二。递归进行直到得到所需颜色数。
    </div>

    <div class="two-col">
      <div style="font-size:10px;color:var(--text2);line-height:1.9">
        <div style="font-weight:500;margin-bottom:4px;color:var(--accent)">算法步骤</div>
        <div>1. 把图像所有像素放入初始立方体</div>
        <div>2. 找到当前 <span class="hl">最不紧凑</span> 的立方体（像素数最多，或体积最大）</div>
        <div>3. 在该立方体的 <span class="hl">R/G/B 中最宽通道</span> 上找中位值</div>
        <div>4. 沿中位值切分为两个子立方体</div>
        <div>5. 重复 2-4，直到立方体数 = 目标颜色数</div>
        <div>6. 每个立方体的 <span class="hl">质心</span>（平均色）作为调色板一色</div>
        <div style="margin-top:6px;color:var(--accent)">复杂度：O(N·log K)，N=像素数，K=目标色数</div>
      </div>
      <div>
        <div class="param-row">
          <span class="param-label">分割步数</span>
          <input type="range" class="param-slider" id="cq-mc-step" min="0" max="6" step="1" value="3" oninput="cqUpdate()">
          <span class="param-val" id="cq-mc-step-v">3</span>
        </div>
        <div id="cq-mc-viz" style="margin-top:6px"></div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板②：Octree 八叉树量化 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② 八叉树量化（Octree）—— 合并叶节点</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.8;margin-bottom:8px">
        <strong>核心思想</strong>：将 RGB 颜色沿 3 个颜色通道逐位分支，构建 8 叉树。
        每层深度对应一个 bit 位（共 8 层）。当叶节点数超过目标色数时，合并深层兄弟节点。
        <div style="margin-top:6px;padding:6px 8px;background:var(--surface2);border-radius:6px;font-size:10px;line-height:1.7">
          <span style="color:var(--accent)">RGB 颜色 (200, 100, 50)</span><br>
          R=<span class="hl">11001000</span> G=<span class="hl">01100100</span> B=<span class="hl">00110010</span><br>
          <span style="color:var(--text3)">第 1 层看 bit7: R=1, G=0, B=0 → 子节点 100₂ = 4</span><br>
          <span style="color:var(--text3)">第 2 层看 bit6: R=1, G=1, B=0 → 子节点 110₂ = 6</span><br>
          <span style="color:var(--text3)">...逐层向下直到 bit0</span>
        </div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">合并策略：可缩减叶节点</div>
      <div id="cq-octree-viz" style="font-size:10px;color:var(--text2);line-height:1.9">
        <div>1. 插入所有颜色，记录每个节点的 R/G/B 累计和像素计数</div>
        <div>2. 叶节点数 > 目标色数时，找 <span class="hl">最深层的可合并节点</span></div>
        <div>3. 将 8 个子节点的 <span class="hl">累计值求和</span> → 合并为 1 个叶节点</div>
        <div>4. 重复直到叶节点数 ≤ 目标色数</div>
        <div>5. 每个叶节点颜色 = <span class="hl">累计和 / 像素计数</span></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--accent)">优点：内存可控 O(K)，不需预扫描<br>缺点：频繁合并可能丢失稀有颜色</div>
    </div>
  </div>

  <!-- ══ 子面板③：Floyd-Steinberg 误差扩散 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">③ Floyd-Steinberg 误差扩散 —— 消除条带感的关键</div>
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:1;font-size:10px;color:var(--text2);line-height:1.9">
        <strong>原理</strong>：当前像素量化产生的误差（原色 - 最近调板色）<span class="hl">分布到尚未处理的邻近像素</span>。
        宏观上误差相互抵消，人眼感受到的颜色更接近原始。

        <div style="margin-top:8px;font-weight:500;color:var(--accent)">误差扩散权重矩阵</div>
        <div style="display:flex;gap:0;margin:6px 0;font-family:'Courier New',monospace;font-size:11px">
          <div style="width:40px;height:40px;background:#ddd;display:flex;align-items:center;justify-content:center;border-radius:4px;color:var(--text3);font-size:9px">当前</div>
          <div style="width:40px;height:40px;background:#e8f0fb;display:flex;align-items:center;justify-content:center;border:1px solid var(--accent);margin-left:2px;border-radius:4px;font-weight:500;color:var(--accent)">7/16</div>
          <div style="width:40px;height:40px;background:#cce0f7;display:flex;align-items:center;justify-content:center;border:1px solid var(--accent);margin-left:2px;border-radius:4px;font-weight:500;color:var(--accent)">1/16</div>
          <div style="width:40px;height:40px;background:#b3d4f3;display:flex;align-items:center;justify-content:center;border:1px solid var(--accent);margin-left:2px;border-radius:4px;font-weight:500;color:var(--accent)">5/16</div>
          <div style="width:40px;height:40px;background:#d9e9f9;display:flex;align-items:center;justify-content:center;border:1px solid var(--accent);margin-left:2px;border-radius:4px;font-weight:500;color:var(--accent)">3/16</div>
        </div>
        <div style="font-size:9px;color:var(--text3);line-height:1.5">
          右邻 7/16 · 左下 3/16 · 下邻 5/16 · 右下 1/16<br>
          <span class="tag tag-warn">注</span> 误差对 R、G、B 三个通道独立计算
        </div>
      </div>
      <div style="flex:1.2;min-width:280px">
        <div style="font-weight:500;font-size:10px;color:var(--text2);margin-bottom:6px">误差扩散演示：4×3 像素块</div>
        <div id="cq-fs-viz"></div>
        <div style="margin-top:4px;font-size:9px;color:var(--text3)">
          <span style="color:var(--accent)">□</span> 原始色 &nbsp;
          <span style="color:var(--success)">□</span> 量化后 &nbsp;
          数字 = 误差向量
        </div>
      </div>
    </div>
    <div style="margin-top:10px;padding:8px 12px;background:var(--surface2);border-radius:6px;font-size:10px;color:var(--text2);line-height:1.7">
      <strong>传递公式</strong>：<span class="hl">像素'[y][x+1] += err × 7/16</span> · <span class="hl">像素'[y+1][x-1] += err × 3/16</span> ·
      <span class="hl">像素'[y+1][x] += err × 5/16</span> · <span class="hl">像素'[y+1][x+1] += err × 1/16</span>
    </div>
  </div>

  <!-- ══ 子面板④：交互式最近色查找 + 参数 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">④ 交互：RGB → 最近调色板色查找</div>
      <div class="param-row"><span class="param-label">R 通道</span><input type="range" class="param-slider" id="cq-r" min="0" max="255" step="1" value="120" oninput="cqUpdate()"><span class="param-val" id="cq-r-v">120</span></div>
      <div class="param-row"><span class="param-label">G 通道</span><input type="range" class="param-slider" id="cq-g" min="0" max="255" step="1" value="80" oninput="cqUpdate()"><span class="param-val" id="cq-g-v">80</span></div>
      <div class="param-row"><span class="param-label">B 通道</span><input type="range" class="param-slider" id="cq-b" min="0" max="255" step="1" value="200" oninput="cqUpdate()"><span class="param-val" id="cq-b-v">200</span></div>
      <div class="param-row"><span class="param-label">调色板大小</span>
        <select id="cq-find-size" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="cqUpdate()">
          <option value="4">4 色</option><option value="8">8 色</option><option value="16" selected>16 色</option>
          <option value="32">32 色</option><option value="64">64 色</option><option value="128">128 色</option><option value="256">256 色</option>
        </select>
      </div>
      <div id="cq-find-result" style="margin-top:10px;font-size:10px;color:var(--text2);line-height:1.9"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">量化参数与 Python 片段</div>
      <div class="param-row">
        <span class="param-label">量化算法</span>
        <select id="cq-algo" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="cqUpdate()">
          <option value="medcut">Median Cut（中位切分）</option>
          <option value="octree">Octree（八叉树）</option>
          <option value="kmeans">K-Means（聚类）</option>
        </select>
      </div>
      <div class="param-row">
        <span class="param-label">最大颜色数</span>
        <input type="range" class="param-slider" id="cq-maxc" min="2" max="256" step="2" value="256" oninput="cqUpdate()">
        <span class="param-val" id="cq-maxc-v">256</span>
      </div>
      <div class="param-row">
        <span class="param-label">抖动方式</span>
        <select id="cq-dither" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="cqUpdate()">
          <option value="none">无抖动（最近色替换）</option>
          <option value="fs" selected>Floyd-Steinberg</option>
          <option value="ordered">有序抖动（Bayer）</option>
        </select>
      </div>
      <div class="formula-box" style="margin-top:10px;font-size:10px;line-height:1.8">
<span class="hl">from</span> PIL <span class="hl">import</span> Image

img = Image.open(<span class="hl-g">'photo.jpg'</span>).convert(<span class="hl-g">'RGB'</span>)

<span style="color:var(--text3)"># 方法 1：PIL 内置量化</span>
gif = img.quantize(
    colors=<span class="hl">256</span>,
    method=Image.Quantize.<span class="hl">MEDIANCUT</span>,
    dither=Image.Dither.<span class="hl">FLOYDSTEINBERG</span>
)
gif.save(<span class="hl-g">'output.gif'</span>)

<span style="color:var(--text3)"># 方法 2：手动获取调色板</span>
palette = img.getpalette()  <span style="color:var(--text3)"># 768 字节 RGB</span></div>
    </div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.cqUpdate = function(){
    const r = +document.getElementById('cq-r').value;
    const g = +document.getElementById('cq-g').value;
    const b = +document.getElementById('cq-b').value;
    const findSize = +document.getElementById('cq-find-size').value;
    const algo = document.getElementById('cq-algo').value;
    const maxc = +document.getElementById('cq-maxc').value;
    const dither = document.getElementById('cq-dither').value;
    const mcStep = +document.getElementById('cq-mc-step').value;

    document.getElementById('cq-r-v').textContent = r;
    document.getElementById('cq-g-v').textContent = g;
    document.getElementById('cq-b-v').textContent = b;
    document.getElementById('cq-maxc-v').textContent = maxc;
    document.getElementById('cq-mc-step-v').textContent = mcStep;

    // ── ① Median Cut 可视化 ──
    const mcViz = document.getElementById('cq-mc-viz');
    // 模拟分割过程：显示颜色块逐渐细化
    const cubes = simulateMedianCut(r, g, b, mcStep);
    mcViz.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">
        ${cubes.map(c => `<div style="flex:none;width:${Math.max(30, 80/cubes.length)}px;height:28px;background:rgb(${c.r},${c.g},${c.b});border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:8px;color:${(c.r+c.g+c.b)>380?'#222':'#fff'}">${c.count}</div>`).join('')}
      </div>
      <div style="font-size:9px;color:var(--text3)">
        第 ${mcStep} 步分割：${cubes.length} 个子立方体（颜色=质心，数字=像素数）
      </div>`;

    // ── ③ Floyd-Steinberg 可视化 ──
    const fsViz = document.getElementById('cq-fs-viz');
    // 生成 4×3 像素块展示原始色→量化色+误差
    const fsCells = [];
    for(let y=0; y<3; y++){
      for(let x=0; x<4; x++){
        const origR = 40 + (x*30) + (y*50) + ((x+y)*17)%80;
        const origG = 60 + (y*45) + (x*25) + ((x*y)*13)%70;
        const origB = 100 + (x*55) - (y*15) + ((x+y)*23)%60;
        // 量化后的颜色（粗略映射到有限调色板）
        const qR = Math.round(origR/51)*51;
        const qG = Math.round(origG/51)*51;
        const qB = Math.round(origB/51)*51;
        const errR = origR - qR;
        const errG = origG - qG;
        const errB = origB - qB;
        const errMag = Math.round(Math.sqrt(errR*errR+errG*errG+errB*errB));
        fsCells.push({x, y, origR, origG, origB, qR, qG, qB, errR, errG, errB, errMag});
      }
    }
    fsViz.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3px;align-items:start">
        ${fsCells.map(c => `
          <div style="font-size:9px;text-align:center">
            <div style="height:28px;background:rgb(${c.origR},${c.origG},${c.origB});border-radius:3px 3px 0 0;border:0.5px solid var(--accent)"></div>
            <div style="height:28px;background:rgb(${c.qR},${c.qG},${c.qB});border-radius:0 0 3px 3px;border:0.5px solid var(--success)"></div>
            ${c.errMag > 0 ? `<div style="margin-top:3px;font-family:'Courier New',monospace;font-size:7px;color:var(--text3)">
              e=${c.errMag}
            </div>` : `<div style="margin-top:3px;font-size:7px;color:var(--success)">✓</div>`}
          </div>`).join('')}
      </div>`;

    // ── ④ 最近色查找 ──
    // 生成 findSize 色调色板（色相均匀分布）
    const palette = [];
    for(let i=0; i<findSize; i++){
      const h = (i * 360 / findSize) | 0;
      const s = 0.6 + (i % 4) * 0.1;
      const l = 0.3 + (i % 5) * 0.13;
      const cr = hslToRgb2(h, s, l);
      palette.push({r: cr[0], g: cr[1], b: cr[2]});
    }

    // 找到最近色（欧几里得距离）
    let bestIdx = 0, bestDist = Infinity;
    const distances = palette.map((p, i) => {
      const dr = r - p.r, dg = g - p.g, db = b - p.b;
      const d2 = dr*dr + dg*dg + db*db;
      const d = Math.sqrt(d2);
      if(d < bestDist) { bestDist = d; bestIdx = i; }
      return d.toFixed(1);
    });

    const best = palette[bestIdx];
    const findEl = document.getElementById('cq-find-result');
    findEl.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
        <div style="text-align:center">
          <div style="width:44px;height:44px;background:rgb(${r},${g},${b});border-radius:6px;border:0.5px solid var(--accent)"></div>
          <div style="font-size:8px;color:var(--accent);margin-top:2px">输入色</div>
        </div>
        <div style="font-size:16px;color:var(--text3)">→</div>
        <div style="text-align:center">
          <div style="width:44px;height:44px;background:rgb(${best.r},${best.g},${best.b});border-radius:6px;border:2px solid var(--success)"></div>
          <div style="font-size:8px;color:var(--success);margin-top:2px">最近色 #${bestIdx}</div>
        </div>
      </div>
      <span style="font-weight:500">匹配公式</span>：
      <span class="formula-box" style="display:block;margin-top:4px;font-size:10px;padding:6px 8px">
        <span style="color:var(--accent)">ΔE</span> = √((<span class="hl">R-R<sub>i</sub></span>)² + (<span class="hl">G-G<sub>i</sub></span>)² + (<span class="hl">B-B<sub>i</sub></span>)²)
      </span>
      <div style="margin-top:4px;line-height:1.7">
        R=<span class="hl">${r}</span> G=<span class="hl">${g}</span> B=<span class="hl">${b}</span><br>
        最近色 = 调色板[<span class="hl">${bestIdx}</span>] = RGB(<span class="hl">${best.r}</span>, <span class="hl">${best.g}</span>, <span class="hl">${best.b}</span>)<br>
        欧几里得距离 = <span class="hl">${bestDist.toFixed(1)}</span><br>
        <span style="color:var(--text3)">(距离越小越接近，0 = 完全匹配)</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:8px">
        ${palette.map((p,i) => `
          <div style="flex:none;width:${Math.max(18, 52/findSize)}px;height:20px;background:rgb(${p.r},${p.g},${p.b});border-radius:2px;position:relative;border:${i===bestIdx?'2px solid var(--success)':'0.5px solid var(--border)'}" title="#${i}: d=${distances[i]}">
            <span style="position:absolute;bottom:0;right:1px;font-size:6px;color:${(p.r+p.g+p.b)>380?'#222':'#fff'}">${i}</span>
          </div>`).join('')}
      </div>`;
    SIM_PARAMS.gifColors = n; SIM_PARAMS.gifDither = dither;
    refreshPreview();
  };

  cqUpdate();
});

// ─── HSL → RGB 辅助 ───
function hslToRgb2(h, s, l){
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if(h < 60) { r = c; g = x; b = 0; }
  else if(h < 120) { r = x; g = c; b = 0; }
  else if(h < 180) { r = 0; g = c; b = x; }
  else if(h < 240) { r = 0; g = x; b = c; }
  else if(h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [(r+m)*255|0, (g+m)*255|0, (b+m)*255|0];
}

// ─── 模拟 Median Cut 分割过程 ───
function simulateMedianCut(seedR, seedG, seedB, steps){
  // 初始立方体
  let cubes = [{
    rMin: Math.max(0, seedR-80), rMax: Math.min(255, seedR+80),
    gMin: Math.max(0, seedG-80), gMax: Math.min(255, seedG+80),
    bMin: Math.max(0, seedB-80), bMax: Math.min(255, seedB+80),
    count: 100 + Math.floor(Math.random()*200)
  }];

  for(let s=0; s<steps; s++){
    // 找像素数最多的立方体
    let maxIdx = 0;
    for(let i=1; i<cubes.length; i++){
      if(cubes[i].count > cubes[maxIdx].count) maxIdx = i;
    }
    const c = cubes[maxIdx];

    // 找最宽通道
    const rRange = c.rMax - c.rMin;
    const gRange = c.gMax - c.gMin;
    const bRange = c.bMax - c.bMin;

    if(rRange >= gRange && rRange >= bRange){
      const mid = Math.round((c.rMin + c.rMax)/2);
      const cnt1 = Math.floor(c.count * (0.4 + Math.random()*0.2));
      const cnt2 = c.count - cnt1;
      cubes.splice(maxIdx, 1,
        {rMin:c.rMin, rMax:mid, gMin:c.gMin, gMax:c.gMax, bMin:c.bMin, bMax:c.bMax, count:cnt1},
        {rMin:mid, rMax:c.rMax, gMin:c.gMin, gMax:c.gMax, bMin:c.bMin, bMax:c.bMax, count:cnt2}
      );
    } else if(gRange >= bRange){
      const mid = Math.round((c.gMin + c.gMax)/2);
      const cnt1 = Math.floor(c.count * (0.4 + Math.random()*0.2));
      const cnt2 = c.count - cnt1;
      cubes.splice(maxIdx, 1,
        {rMin:c.rMin, rMax:c.rMax, gMin:c.gMin, gMax:mid, bMin:c.bMin, bMax:c.bMax, count:cnt1},
        {rMin:c.rMin, rMax:c.rMax, gMin:mid, gMax:c.gMax, bMin:c.bMin, bMax:c.bMax, count:cnt2}
      );
    } else {
      const mid = Math.round((c.bMin + c.bMax)/2);
      const cnt1 = Math.floor(c.count * (0.4 + Math.random()*0.2));
      const cnt2 = c.count - cnt1;
      cubes.splice(maxIdx, 1,
        {rMin:c.rMin, rMax:c.rMax, gMin:c.gMin, gMax:c.gMax, bMin:c.bMin, bMax:mid, count:cnt1},
        {rMin:c.rMin, rMax:c.rMax, gMin:c.gMin, gMax:c.gMax, bMin:mid, bMax:c.bMax, count:cnt2}
      );
    }
  }

  // 计算每个立方体的质心颜色
  return cubes.map(c => ({
    r: Math.round((c.rMin + c.rMax)/2),
    g: Math.round((c.gMin + c.gMax)/2),
    b: Math.round((c.bMin + c.bMax)/2),
    count: c.count
  }));
}
