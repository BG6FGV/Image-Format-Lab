/**
 * formats/jpeg/encode.js — JPEG 编码核心步骤（深度版）
 * 三个渲染器：DCT 变换、量化、熵编码
 * 每个包含完整的交互参数、公式、可视化、编码表
 */

// ═══════════════════════════════════════════════════════════════
// DCT 步骤渲染器 — 空间域→频域
// ═══════════════════════════════════════════════════════════════
REGISTER_RENDERER('dct', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤三 · DCT 变换</div>
  <div class="detail-title">分块与离散余弦变换（DCT-II）— 从空间域到频域</div>
  <div class="detail-desc">
    YCbCr 每个通道被划分为互不重叠的 <span class="hl">8×8 像素块</span>。每块像素值先<span class="hl">减 128</span>（零中心化），
    再做二维 DCT-II，将空间域信号变换到频域。变换后<span class="hl">左上角为低频（能量集中）</span>，右下角为高频（细节纹理）。
  </div>

  <!-- 交互式像素块 → DCT -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">交互参数 — 调节 8×8 输入块纹理</div>
      <div class="param-row"><span class="param-label">像素均值</span>
        <input type="range" class="param-slider" id="dt-m" min="0" max="255" value="128" oninput="dtUpdate()">
        <span class="param-val" id="dt-m-v">128</span></div>
      <div class="param-row"><span class="param-label">纹理幅度</span>
        <input type="range" class="param-slider" id="dt-a" min="0" max="120" value="40" oninput="dtUpdate()">
        <span class="param-val" id="dt-a-v">40</span></div>
      <div class="param-row"><span class="param-label">纹理频率</span>
        <input type="range" class="param-slider" id="dt-f" min="1" max="6" step="1" value="2" oninput="dtUpdate()">
        <span class="param-val" id="dt-f-v">中低</span></div>
      <div class="param-row"><span class="param-label">纹理方向</span>
        <select id="dt-dir" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="dtUpdate()">
          <option value="diag">对角线</option>
          <option value="horiz" selected>水平</option>
          <option value="vert">垂直</option>
          <option value="grid">棋盘格</option>
        </select>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px">
        输入像素块（每像素已减 128，范围 [-128, 127]）：
      </div>
      <div id="dt-in" style="margin-bottom:6px"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">DCT 系数热图（红 = 正，蓝 = 负）</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:6px;line-height:1.6">
        <span style="color:var(--accent)">● 左上角 = DC 分量</span>（平均亮度）<br>
        <span style="color:var(--warn)">● 右上/左下 = 垂直/水平频率</span><br>
        <span style="color:var(--text3)">● 右下角 = 高频细节（通常接近 0）</span>
      </div>
      <div id="dt-out" style="margin-bottom:8px"></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="background:var(--surface2);padding:4px 8px;border-radius:4px;font-size:10px">
          DC = <span class="hl" id="dt-dc">--</span>
        </div>
        <div style="background:var(--surface2);padding:4px 8px;border-radius:4px;font-size:10px">
          能量比 = <span class="hl" id="dt-energy">--</span>
        </div>
        <div style="background:var(--surface2);padding:4px 8px;border-radius:4px;font-size:10px">
          最大系数 = <span class="hl" id="dt-maxcoef">--</span>
        </div>
      </div>
    </div>
  </div>

  <!-- DCT 公式 -->
  <div class="viz-card">
    <div class="viz-card-title">二维 DCT-II 公式 — JPEG 标准定义</div>
    <div class="formula-box">
F(u,v) = <span class="hl">¼</span> · C(u) · C(v) · Σ_{x=0}^{7} Σ_{y=0}^{7} f(x,y) · cos[(2x+1)uπ/16] · cos[(2y+1)vπ/16]

C(k) = <span class="hl">1/√2</span>  (if k = 0)，否则 C(k) = 1

f(x,y) = 像素(x,y) − 128    （范围 −128 ~ 127，零均值）
F(u,v) = 频域系数，u=行频率索引，v=列频率索引
    </div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-top:6px">
      <strong style="color:var(--text)">为什么 JPEG 使用 DCT？</strong><br>
      · <span class="hl">能量压缩</span>：自然图像的大部分能量集中在少数低频系数上<br>
      · <span class="hl">去相关</span>：相邻像素高度相关，DCT 后各系数近似独立<br>
      · <span class="hl">实数变换</span>：DCT 输出为实数，比傅里叶变换的复数更适合图像<br>
      · <span class="hl">对称性</span>：DCT 隐式假设信号偶对称扩展，减少块边界不连续
    </div>
  </div>

  <!-- DCT 基图像 -->
  <div class="viz-card">
    <div class="viz-card-title">DCT 基图像 — 64 个基函数 × 对应系数 = 完整块</div>
    <div style="font-size:10px;color:var(--text2);margin-bottom:6px;line-height:1.6">
      每个 8×8 块 = 64 个基图像的加权和。权重 = 对应的 DCT 系数。
      <span style="color:var(--accent)">左上角 u=0/v=0 是平坦 DC</span>，右下方是高振荡的高频分量。
    </div>
    <div id="dt-basis" style="display:grid;grid-template-columns:repeat(8,1fr);gap:0;background:var(--surface2);padding:2px"></div>
    <div id="dt-spectrum"></div>
  </div>
  `;

  function renderBasisGrid(){
    const el = document.getElementById('dt-basis');
    if(!el) return;
    let html = '';
    for(let v=0; v<8; v++){
      for(let u=0; u<8; u++){
        let cells = '';
        const amp = u===0&&v===0 ? 128 : 80;
        for(let y=0;y<8;y++){
          for(let x=0;x<8;x++){
            const cu = u===0?1/Math.SQRT2:1, cv = v===0?1/Math.SQRT2:1;
            const val = cu*cv*Math.cos((2*x+1)*u*Math.PI/16)*Math.cos((2*y+1)*v*Math.PI/16)*amp + 128;
            const c = Math.round(Math.min(255,Math.max(0,val)));
            cells += `<div style="background:rgb(${c},${c},${c})"></div>`;
          }
        }
        html += `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:0;padding:0;border:0.5px solid var(--border)">${cells}</div>`;
      }
    }
    el.innerHTML = html;
  }

  window.dtUpdate = function(){
    const m = +document.getElementById('dt-m').value;
    const a = +document.getElementById('dt-a').value;
    const f = +document.getElementById('dt-f').value;
    const dir = document.getElementById('dt-dir').value;
    document.getElementById('dt-m-v').textContent = m;
    document.getElementById('dt-a-v').textContent = a;
    document.getElementById('dt-f-v').textContent = ['','极低','中低','中','中高','高','极高'][f];

    const block = Array.from({length:8},(_,x)=>Array.from({length:8},(_,y)=>{
      let pattern;
      if(dir==='horiz')       pattern = Math.cos(f*(y)*Math.PI/4);
      else if(dir==='vert')   pattern = Math.cos(f*(x)*Math.PI/4);
      else if(dir==='diag')   pattern = Math.cos(f*(x+y)*Math.PI/8);
      else /* grid */         pattern = Math.cos(f*x*Math.PI/4)*Math.cos(f*y*Math.PI/4);
      return Math.min(255, Math.max(0, Math.round(m + a*pattern)));
    }));

    renderPixelGrid('dt-in', block);
    const shifted = block.map(r=>r.map(v=>v-128));
    const F = dct2d(shifted);
    renderDCTGrid('dt-out', F);

    const dc = Math.round(F[0][0]);
    const dcEnergy = F[0][0]*F[0][0];
    const totalEnergy = F.flat().reduce((s,v)=>s+v*v, 0);
    const maxAbs = Math.max(...F.flat().map(Math.abs));
    document.getElementById('dt-dc').textContent = dc;
    document.getElementById('dt-energy').textContent = (dcEnergy/totalEnergy*100).toFixed(1)+'%';
    document.getElementById('dt-maxcoef').textContent = Math.round(maxAbs);
    SIM_PARAMS.dctMean = m; SIM_PARAMS.dctAmp = a; SIM_PARAMS.dctFreq = f;
    renderSpectrum('dt-spectrum', F);
    refreshPreview();
  };

  dtUpdate();
  renderBasisGrid();
});

// ═══════════════════════════════════════════════════════════════
// 量化步骤渲染器 — 唯一有损步骤
// ═══════════════════════════════════════════════════════════════
REGISTER_RENDERER('quant', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤四 · 量化</div>
  <div class="detail-title">量化 — JPEG 有损压缩的核心（<span style="color:var(--danger)">唯一有损步骤</span>）</div>
  <div class="detail-desc">
    DCT 系数除以<span class="hl">量化表对应位置的步长</span>并<span class="hl">四舍五入取整</span>。
    量化步长在低频区小（保留细节）、高频区大（丢弃精细纹理），正是这一步决定了 JPEG 的<span class="tag tag-warn">有损性质</span>。
    反量化时乘回步长，但舍入误差<span class="hl">不可逆</span>。
  </div>

  <!-- 核心说明 -->
  <div class="viz-card" style="background:var(--danger-bg);border:0.5px solid var(--danger);margin-bottom:10px">
    <div style="font-size:12px;font-weight:500;color:var(--danger);margin-bottom:4px">为什么说量化是"唯一有损步骤"？</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.9">
      · <strong>色彩转换 (RGB→YCbCr)</strong> — <span class="tag tag-ok">理论上无损</span><br>
      · <strong>色度子采样</strong> — <span class="tag tag-warn">近似有损</span>（非 JPEG 必需）<br>
      · <strong>DCT 变换</strong> — <span class="tag tag-ok">数学无损</span>（IDCT 可完美还原）<br>
      · <strong>量化 Q = F ÷ QM 取整</strong> — <span class="tag tag-danger">不可逆有损</span><br>
      · <strong>熵编码</strong> — <span class="tag tag-ok">无损</span>（变长编码精确可解）<br><br>
      因此 <span class="hl">JPEG 质量因子 Q 本质上是量化矩阵的缩放因子</span>，Q 越小→步长越大→归零越多。
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">质量因子与量化矩阵</div>
      <div class="param-row"><span class="param-label">质量因子 Q</span>
        <input type="range" class="param-slider" id="qu-q" min="1" max="100" value="75" oninput="quUpdate()">
        <span class="param-val" id="qu-q-v">75</span></div>
      <div class="param-row"><span class="param-label">量化表类型</span>
        <select id="qu-t" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="quUpdate()">
          <option value="luma">亮度量化表（Y 分量）</option>
          <option value="chroma">色度量化表（Cb/Cr）</option>
        </select>
      </div>
      <div id="qu-info" style="margin-top:6px;margin-bottom:6px;font-size:11px;color:var(--text2);line-height:1.8"></div>
      <div id="qu-qmat" style="margin-top:8px"></div>
      <div style="font-size:10px;color:var(--text3);margin-top:4px">
        量化矩阵每个值 = <code>floor((Base[u][v] × scale + 50) / 100)</code>，钳位 [1, 255]
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">量化前后对比 — 同一个 DCT 系数块</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">量化前 DCT 系数</div>
          <div id="qu-before" style="margin-bottom:4px"></div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">量化后（灰=零）</div>
          <div id="qu-after" style="margin-bottom:4px"></div>
        </div>
      </div>
      <div id="qu-zero" style="font-size:11px;margin-top:6px"></div>
      <div id="qu-compress" style="font-size:11px;color:var(--text2);margin-top:4px;padding:6px 8px;background:var(--surface2);border-radius:4px;line-height:1.8"></div>
      <div id="qu-waterfall"></div>

      <div class="formula-box" style="margin-top:6px;font-size:10px">
量化公式：  Q[u][v] = round( F[u][v] / QM[u][v] )
反量化：    F'[u][v] = Q[u][v] × QM[u][v]   （≠ F[u][v] ！）
误差范围：  ΔF ∈ (−QM/2, QM/2]
      </div>
    </div>
  </div>

  <!-- 量化基表 -->
  <div class="viz-card">
    <div class="viz-card-title">标准量化基表 — 基于人类视觉心理物理学实验</div>
    <div class="two-col">
      <div>
        <div style="font-size:11px;font-weight:500;margin-bottom:4px;color:var(--accent)">亮度量化基表（视觉敏感）</div>
        <div id="qu-base-luma"></div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:500;margin-bottom:4px;color:var(--accent)">色度量化基表（视觉不敏感）</div>
        <div id="qu-base-chroma"></div>
      </div>
    </div>
  </div>
  `;

  const SAMPLE_DCT = [
    [580, -30,  20, -15,  10,  -8,   5,  -3],
    [-35,  25, -18,  12,  -9,   6,  -4,   2],
    [ 22, -16,  11,  -8,   5,  -3,   2,  -1],
    [-14,  10,  -7,   5,  -3,   2,  -1,   1],
    [  9,  -7,   5,  -3,   2,  -1,   1,   0],
    [ -6,   4,  -3,   2,  -1,   1,   0,   0],
    [  4,  -3,   2,  -1,   1,   0,   0,   0],
    [ -2,   2,  -1,   1,   0,   0,   0,   0]
  ];

  window.quUpdate = function(){
    const q = +document.getElementById('qu-q').value;
    const isC = document.getElementById('qu-t').value === 'chroma';
    document.getElementById('qu-q-v').textContent = q;

    const scale = q < 50 ? Math.floor(5000/q) : (200 - 2*q);
    const qualityLabel = q>=90?'极高':q>=75?'高':q>=50?'中':q>=30?'低':'极低';
    document.getElementById('qu-info').innerHTML = `
      scale = (Q&lt;50 ? 5000/Q : 200-2Q) = <span class="hl">${scale}</span><br>
      质量档位：<span class="tag ${q>=50?'tag-ok':q>=30?'tag-warn':'tag-danger'}">${qualityLabel}</span>
      ${isC ? '<br><span style="color:var(--text3)">使用色度基表（步长更大，压缩更激进）</span>' : ''}`;

    const sq = getScaledQ(q, isC);
    renderQmatGrid('qu-qmat', sq);

    renderDCTGrid('qu-before', SAMPLE_DCT);

    const Q = SAMPLE_DCT.map((r,i)=>r.map((v,j)=>Math.round(v/sq[i][j])));
    renderQuantGrid('qu-after', Q);

    const zeros = Q.flat().filter(v=>v===0).length;
    const maxQval = Math.max(...Q.flat().map(Math.abs));
    document.getElementById('qu-zero').innerHTML = `
      归零系数 = <span class="hl">${zeros}/64</span>（<strong>${Math.round(zeros/64*100)}%</strong>）
      &nbsp;|&nbsp; 最大绝对值 = <span class="hl">${maxQval}</span>`;

    const nonZeroCount = 64 - zeros;
    const estBitsRaw = 64 * 8;
    const estBitsEncoded = 12 + 4 + (nonZeroCount > 0 ? nonZeroCount * 10 : 4);
    const ratio = (estBitsRaw / estBitsEncoded).toFixed(1);
    document.getElementById('qu-compress').innerHTML = `
      估算压缩效果：<br>
      · 原始系数：<span class="hl">${estBitsRaw} 位</span>（64×8位）<br>
      · 量化后编码：<span class="hl">~${estBitsEncoded} 位</span><br>
      · 粗略压缩比：<span class="hl">~${ratio}:1</span>`;
    SIM_PARAMS.quantQuality = q;
    renderWaterfall('qu-waterfall', SAMP_DCT, Q);
    refreshPreview();
  };

  quUpdate();
  renderQmatGrid('qu-base-luma', BASE_LUMA_Q);
  renderQmatGrid('qu-base-chroma', BASE_CHROMA_Q);
});

// ═══════════════════════════════════════════════════════════════
// 熵编码步骤渲染器 — 系数→比特流
// ═══════════════════════════════════════════════════════════════
REGISTER_RENDERER('entropy', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤五 · 熵编码</div>
  <div class="detail-title">之字形扫描与熵编码 — 系数 → 比特流</div>
  <div class="detail-desc">
    量化后的系数先做 <span class="hl">Zig-Zag 扫描</span> 排成一维序列。分别对 <span class="hl">DC 差分编码</span> 和
    <span class="hl">AC 游程编码</span>，最后用哈夫曼变长码输出为紧凑比特流。
    此步骤<span class="tag tag-ok">完全无损</span>。
  </div>

  <!-- Zig-Zag -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① Zig-Zag 扫描顺序</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px;line-height:1.8">
        <p>按对角线方向扫描，使<span class="hl">低频在前、高频在后</span>，末尾聚集大量连续零（便于游程编码）。</p>
      </div>
      <div id="en-zz" style="margin-bottom:6px"></div>
      <div style="font-size:10px;color:var(--text3)">颜色越深 = 扫描序号越大 = 频率越高</div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">② 扫描示例：量化后的块 → 一维序列</div>
      <div id="en-zz-example" style="margin-bottom:6px"></div>
      <div id="en-zz-seq" style="font-size:10px;color:var(--text);line-height:1.6;padding:6px 8px;background:var(--surface2);border-radius:4px"></div>
    </div>
  </div>

  <!-- DC 差分编码 -->
  <div class="viz-card">
    <div class="viz-card-title">③ DC 差分编码 — 相邻块 DC 系数高度相关，差值编码节省比特</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px;line-height:1.8">
      <code>DIFF = DC_当前 − DC_前一个</code>（首个块假设前 DC=0）。
      DIFF 按 <span class="hl">SSSS（Size Category）</span> 分类：SSSS = ceil(log<sub>2</sub>(|DIFF|+1))。
      输出 = <span class="hl-o">哈夫曼码(SSSS)</span> + <span class="hl">附加位(DIFF 二进制)</span>
    </div>

    <div class="two-col">
      <div>
        <div class="param-row"><span class="param-label">前一块 DC 值</span>
          <input type="range" class="param-slider" id="en-pdc" min="-300" max="600" value="150" oninput="enUpdate()">
          <span class="param-val" id="en-pdc-v">150</span></div>
        <div class="param-row"><span class="param-label">当前块 DC 值</span>
          <input type="range" class="param-slider" id="en-cdc" min="-300" max="600" value="162" oninput="enUpdate()">
          <span class="param-val" id="en-cdc-v">162</span></div>
        <div id="en-dc-res" style="margin-top:8px"></div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:500;margin-bottom:4px;color:var(--accent)">亮度 DC 完整哈夫曼表</div>
        <div style="max-height:220px;overflow-y:auto;font-size:10px;line-height:1.6">
          ${[
            ['0','00','—','DC 无变化'],
            ['1','010','1位','范围 [-1,1]'],
            ['2','011','2位','范围 [-3,-2]∪[2,3]'],
            ['3','100','3位','范围 [-7,-4]∪[4,7]'],
            ['4','101','4位','范围 [-15,-8]∪[8,15]'],
            ['5','110','5位','范围 [-31,-16]∪[16,31]'],
            ['6','1110','6位','范围 [-63,-32]∪[32,63]'],
            ['7','11110','7位','范围 [-127,-64]∪[64,127]'],
            ['8','111110','8位','范围 [-255,-128]∪[128,255]'],
            ['9','1111110','9位','范围 [-511,-256]∪[256,511]'],
            ['10','11111110','10位','范围 [-1023,-512]∪[512,1023]'],
            ['11','111111110','11位','范围 [-2047,-1024]∪[1024,2047]'],
          ].map(([ssss,code,bits,d])=>`
            <div style="display:flex;gap:6px;padding:2px 4px;margin-bottom:1px;background:var(--surface2);border-radius:3px">
              <code style="color:var(--accent);font-weight:500;min-width:14px">${ssss}</code>
              <code style="color:var(--warn);min-width:70px;font-size:9px">${code}</code>
              <span style="color:var(--text3);min-width:28px">${bits}</span>
              <span style="color:var(--text2)">${d}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- AC 游程编码 -->
  <div class="viz-card">
    <div class="viz-card-title">④ AC 游程编码 — (零游程, 非零尺寸) 高效编码高频系数</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px;line-height:1.8">
      <p>Zig-Zag 后第 1~63 个系数为 AC 分量。格式：<strong>RS = (RUNLENGTH << 4) | SSSS</strong></p>
      <p>输出 = <span class="hl-o">哈夫曼码(RS)</span> + <span class="hl">附加位</span>，块结束用 <span class="hl">EOB (0,0)</span> 标记，连续 16 个零用 <span class="hl">ZRL (F,0)</span>。</p>
    </div>

    <div class="two-col">
      <div>
        <div style="font-size:11px;font-weight:500;margin-bottom:4px;color:var(--accent)">亮度 AC 哈夫曼表（关键条目）</div>
        <table class="byte-table">
          <thead><tr><th>RS (R/S)</th><th>码字</th><th>含义</th></tr></thead>
          <tbody>
            <tr><td><code>(0,0)</code></td><td><code style="color:var(--warn)">1010</code></td><td>EOB — 块结束</td></tr>
            <tr><td><code>(0,1)</code></td><td><code style="color:var(--warn)">00</code></td><td>0零, 值∈[-1,1]</td></tr>
            <tr><td><code>(0,2)</code></td><td><code style="color:var(--warn)">01</code></td><td>0零, 值∈[-3,-2]∪[2,3]</td></tr>
            <tr><td><code>(0,3)</code></td><td><code style="color:var(--warn)">100</code></td><td>0零, 值∈[-7,-4]∪[4,7]</td></tr>
            <tr><td><code>(1,1)</code></td><td><code style="color:var(--warn)">1100</code></td><td>1零, 值∈[-1,1]</td></tr>
            <tr><td><code>(1,2)</code></td><td><code style="color:var(--warn)">11011</code></td><td>1零, 值∈[-3,-2]∪[2,3]</td></tr>
            <tr><td><code>(2,1)</code></td><td><code style="color:var(--warn)">11100</code></td><td>2零, 值∈[-1,1]</td></tr>
            <tr><td><code>(3,1)</code></td><td><code style="color:var(--warn)">111010</code></td><td>3零, 值∈[-1,1]</td></tr>
            <tr><td><code>(F,0)</code></td><td><code style="color:var(--warn)">11111111001</code></td><td>ZRL — 16连零</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div style="font-size:11px;font-weight:500;margin-bottom:4px;color:var(--accent)">交互式 AC 编码示例</div>
        <div class="param-row"><span class="param-label">非零 AC 值</span>
          <input type="range" class="param-slider" id="en-ac-val" min="-100" max="100" value="7" oninput="enUpdate()">
          <span class="param-val" id="en-ac-val-v">7</span></div>
        <div class="param-row"><span class="param-label">前导零数量</span>
          <input type="range" class="param-slider" id="en-ac-zeros" min="0" max="15" value="2" oninput="enUpdate()">
          <span class="param-val" id="en-ac-zeros-v">2</span></div>
        <div id="en-ac-res" style="margin-top:8px;padding:8px 12px;background:var(--surface2);border-radius:6px;font-size:11px;line-height:1.9"></div>
      </div>
    </div>

    <!-- 完整编码示例 -->
    <div class="viz-card" style="background:var(--surface2);margin-top:10px">
      <div class="viz-card-title">⑤ 完整熵编码示例 — 一个 8×8 块的完整比特流</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <div class="formula-box" style="margin:6px 0;font-size:10px">
Zig-Zag 序列：DC=12（前一=8），AC=[5, -2, 0, 0, 1, 0, 0, 0, -1, ...全零→EOB]

<strong style="color:var(--accent)">DC</strong>: SSSS(12-8=4)=3 → 哈夫曼 <code style="color:var(--warn)">100</code> + 附加 <code style="color:var(--success)">100</code> = <code style="color:var(--accent)">100100</code>（6位）
<strong style="color:var(--accent)">AC₀</strong>: (0,5)→哈夫曼 <code style="color:var(--warn)">11010</code> + 附加 <code style="color:var(--success)">101</code> = <code>11010101</code>（8位）
<strong style="color:var(--accent)">AC₁</strong>: (0,-2)→哈夫曼 <code style="color:var(--warn)">01</code> + 附加 <code style="color:var(--success)">01</code> = <code>0101</code>（4位）
<strong style="color:var(--accent)">AC₂</strong>: (2,1)→哈夫曼 <code style="color:var(--warn)">11100</code> + 附加 <code style="color:var(--success)">1</code> = <code>111001</code>（6位）
<strong style="color:var(--accent)">AC₃</strong>: (3,-1)→哈夫曼 <code style="color:var(--warn)">111010</code> + 附加 <code style="color:var(--success)">0</code> = <code>1110100</code>（7位）
<strong style="color:var(--accent)">EOB</strong>: (0,0)→哈夫曼 <code style="color:var(--warn)">1010</code>（4位）

总计：<span class="hl">35 位</span> 编码 64 个系数（原始 64×8=512 位 → 压缩比 <span class="hl">14.6:1</span>）
        </div>
      </div>
    </div>
  </div>
  <div id="en-hufftree"></div>
  `;

  const ZZ_EXAMPLE = [
    [12,  5, -2,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  1,  0,  0,  0,  0],
    [ 0, -1,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ];

  function zigzagSequence(block){
    const result = [];
    for(let i=0; i<64; i++){
      for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
          if(ZZ_ORDER[r][c] === i) result.push(block[r][c]);
        }
      }
    }
    return result;
  }

  const HUFF_DC = {0:'00',1:'010',2:'011',3:'100',4:'101',5:'110',6:'1110',7:'11110',8:'111110',9:'1111110',10:'11111110',11:'111111110'};

  function getACHuff(run, ssss){
    const key = run*16+ssss;
    const table = {
      0x01:'00', 0x02:'01', 0x03:'100', 0x04:'1011', 0x05:'11010', 0x06:'1111000', 0x07:'11111000',
      0x11:'1100', 0x12:'11011', 0x13:'1111001', 0x14:'111110110', 0x15:'11111110110',
      0x21:'11100', 0x22:'11111001', 0x23:'1111110111', 0x24:'111111110100',
      0x31:'111010', 0x32:'111110111', 0x33:'111111110101',
      0x41:'111011', 0x42:'1111111000',
      0x51:'1111010', 0x52:'11111110111',
      0x00:'1010', // EOB
      0xF0:'11111111001', // ZRL
    };
    return table[key] || '?';
  }

  window.enUpdate = function(){
    const pdc = +document.getElementById('en-pdc').value;
    const cdc = +document.getElementById('en-cdc').value;
    const acVal = +document.getElementById('en-ac-val').value;
    const acZeros = +document.getElementById('en-ac-zeros').value;

    document.getElementById('en-pdc-v').textContent = pdc;
    document.getElementById('en-cdc-v').textContent = cdc;
    document.getElementById('en-ac-val-v').textContent = acVal;
    document.getElementById('en-ac-zeros-v').textContent = acZeros;

    renderZigzagGrid('en-zz');
    renderQuantGrid('en-zz-example', ZZ_EXAMPLE);

    const seq = zigzagSequence(ZZ_EXAMPLE);
    document.getElementById('en-zz-seq').innerHTML = seq.map((v,i)=>{
      const cls = i===0?'color:var(--accent);font-weight:500':v===0?'color:var(--text3)':'color:var(--text)';
      return `[${i}]<span style="${cls}">${v}</span>`;
    }).join(' ') + ' → EOB';

    const diff = cdc - pdc;
    const ssss = diff===0 ? 0 : Math.ceil(Math.log2(Math.abs(diff)+1));
    const bits = diff===0 ? '' : (diff>=0 ? diff.toString(2) : (diff+(1<<ssss)-1).toString(2).slice(-ssss));
    const hcode = HUFF_DC[ssss]||'?';
    document.getElementById('en-dc-res').innerHTML = `
      <div class="formula-box" style="font-size:10px">
DC_当前 = ${cdc}，DC_前 = ${pdc}
DIFF = ${cdc} − ${pdc} = <span class="hl">${diff}</span>
SSSS = ceil(log₂(|${diff}|+1)) = <span class="hl-o">${ssss}</span>
哈夫曼(<span class="hl-o">${hcode}</span>) + 附加(<span class="hl">${bits||'—'}</span>) = <strong style="color:var(--accent)">${hcode}${bits}</strong>
总比特数 = <span class="hl">${hcode.length+ssss}</span>
      </div>`;

    const acAbs = Math.abs(acVal);
    const acSsss = acVal===0 ? 0 : Math.ceil(Math.log2(acAbs+1));
    const acHuff = getACHuff(acZeros, acSsss);
    const acBits = acVal===0 ? '' : (acVal>=0 ? acVal.toString(2) : (acVal+(1<<acSsss)-1).toString(2).slice(-acSsss));
    const rs = (acZeros<<4) | acSsss;
    document.getElementById('en-ac-res').innerHTML = `
      <div>非零值 = <span class="hl">${acVal}</span>，前导零 = <span class="hl">${acZeros}</span></div>
      <div>SSSS = ceil(log₂(|${acVal}|+1)) = <span class="hl">${acSsss}</span></div>
      <div>RS = (${acZeros.toString(16).toUpperCase()}<<4)|${acSsss} = <span class="hl">0x${rs.toString(16).toUpperCase().padStart(2,'0')}</span></div>
      <div style="margin-top:2px">
        哈夫曼码 = <code style="color:var(--warn);font-size:12px">${acHuff}</code>
        &nbsp;附加位 = <code style="color:var(--success)">${acBits||'—'}</code>
      </div>
      <div style="margin-top:4px;padding:4px 8px;background:var(--accent-bg);border-radius:4px">
        输出比特 = <code style="color:var(--accent);font-weight:500">${acHuff}${acBits}</code>（${acHuff.length+acSsss} 位）
      </div>`;
    renderHuffmanTree('en-hufftree');
  };

  enUpdate();
});
