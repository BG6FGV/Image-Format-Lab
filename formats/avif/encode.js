/**
 * formats/avif/encode.js — AVIF/AV1 编码（深度版）
 */
REGISTER_RENDERER('avifEncode', function(container){
  container.innerHTML = `
  <div class="detail-badge">AV1 编码</div>
  <div class="detail-title">AVIF 编码 —— AV1 帧内预测管线</div>
  <div class="detail-desc">
    AVIF 使用 AV1 视频编码标准的帧内编码部分。相比 JPEG，同等质量下文件约小 50%，支持 HDR（10/12-bit）、宽色域、Alpha 通道。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">编码参数</div>
      <div class="param-row"><span class="param-label">量化（CQ=0无损）</span><input type="range" class="param-slider" id="av2-cq" min="0" max="63" value="28" oninput="av2Update()"><span class="param-val" id="av2-cq-v">28</span></div>
      <div class="param-row"><span class="param-label">编码速度</span><input type="range" class="param-slider" id="av2-sp" min="0" max="10" value="6" oninput="av2Update()"><span class="param-val" id="av2-sp-v">6</span></div>
      <div class="param-row"><span class="param-label">位深度</span>
        <select id="av2-bd" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="av2Update()">
          <option value="8" selected>8-bit（标准）</option><option value="10">10-bit（HDR）</option><option value="12">12-bit（专业HDR）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">色度采样</span>
        <select id="av2-cs" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="av2Update()">
          <option value="420" selected>4:2:0</option><option value="422">4:2:2</option><option value="444">4:4:4</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="av2-w" min="64" max="4096" step="64" value="800" oninput="av2Update()"><span class="param-val" id="av2-w-v">800</span></div>
      <div id="av2-stats" style="margin-top:10px;font-size:11px;line-height:2;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">AV1 帧内编码管线</div>
      <div style="font-size:11px;color:var(--text2);line-height:2.2">
        ${[
          ['① 超级块分割','图像切分为 128×128 超级块 → 递归分割至 4×4，RDO 选择最优划分'],
          ['② 帧内预测','56 种方向预测（比 HEVC 的 35 种更密集）+ 色度从亮度预测（CfL 模式）'],
          ['③ 变换','DCT / ADST / FlipADST / IDTX（恒等变换），混合变换类型，16 种组合'],
          ['④ 量化','16 个量化级参数（QP），各频带独立调整，支持系数级 RDO 优化'],
          ['⑤ 环路滤波','去块滤波 → 约束方向增强滤波（CDEF）→ 环路恢复（LR）'],
          ['⑥ ANS 熵编码','多符号自适应算术编码，比 CABAC 快 2-3 倍'],
        ].map(([h,d])=>`<div style="padding:3px 8px;margin-bottom:2px;background:var(--surface2);border-radius:4px"><strong style="color:var(--accent)">${h}</strong> ${d}</div>`).join('')}
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">AV1 帧内预测（56 种角度 + 8 种非角度）</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8">
      <div style="display:flex;gap:12px">
        <div style="flex:1;padding:8px 10px;background:var(--accent-bg);border-radius:6px">
          <strong style="color:var(--accent)">非角度模式：</strong><br>
          DC 预测（平均值）<br>
          Paeth 预测<br>
          Smooth 预测<br>
          SmoothVertical / SmoothHorizontal<br>
          Recursive 预测（滤波器帧内）
        </div>
        <div style="flex:1;padding:8px 10px;background:#faeeda;border-radius:6px">
          <strong style="color:var(--warn)">CfL（Chroma from Luma）：</strong><br>
          从亮度分量的重建值预测色度<br>
          Cb_pred = α × Luma_AC + DC_Cb<br>
          α 值从 8 个候选中率失真选择
        </div>
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">Python 完整编码</div>
    <div class="formula-box"><span class="hl">import</span> pillow_avif
<span class="hl">from</span> PIL <span class="hl">import</span> Image

img = Image.open(<span class="hl-g">'input.png'</span>).convert(<span class="hl-g">'RGBA'</span>)

<span style="color:var(--text3)"># 标准 8-bit AVIF</span>
img.save(<span class="hl-g">'photo.avif'</span>, quality=<span class="hl">75</span>, speed=<span class="hl">6</span>)

<span style="color:var(--text3)"># 无损 AVIF</span>
img.save(<span class="hl-g">'lossless.avif'</span>, quality=<span class="hl">0</span>, lossless=<span class="hl">True</span>)

<span style="color:var(--text3)"># 高级参数控制</span>
img.save(<span class="hl-g">'high_quality.avif'</span>,
    quality=<span class="hl">=90</span>,        <span style="color:var(--text3)"># 高质量</span>
    speed=<span class="hl">=4</span>,          <span style="color:var(--text3)"># 偏慢压缩</span>
    codec=<span class="hl-g">'aom'</span>,       <span style="color:var(--text3)"># libaom 编码器</span>
    subsampling=<span class="hl">0</span>,     <span style="color:var(--text3)"># 4:4:4 色度</span>
    advanced={})     <span style="color:var(--text3)"># 可传入 AV1 编码器参数</span></div>
  </div>
  `;

  window.av2Update = function(){
    const cq=+document.getElementById('av2-cq').value;
    const sp=+document.getElementById('av2-sp').value;
    const bd=+document.getElementById('av2-bd').value;
    const cs=document.getElementById('av2-cs').value;
    const w=+document.getElementById('av2-w').value;
    document.getElementById('av2-cq-v').textContent=cq;
    document.getElementById('av2-sp-v').textContent=sp;
    document.getElementById('av2-w-v').textContent=w;
    const qLabels={0:'无损（lossless）',20:'极高（视觉无损）',28:'高质量（默认）',40:'中等',50:'低质量',63:'最低质量'};
    const qLabel=cq<=0?qLabels[0]:cq<=20?qLabels[20]:cq<=35?qLabels[28]:cq<=45?qLabels[40]:qLabels[50];
    document.getElementById('av2-stats').innerHTML=
      `CQ=<strong>${cq}</strong> — ${qLabel || qLabels[63]}<br>
       速度：<strong>${sp}</strong>/10（${sp<=2?'极慢（最佳压缩）':sp<=5?'平衡':'快速（压缩比略低）'}）<br>
       位深：<strong>${bd}</strong>-bit &nbsp; 采样：<strong>${cs}</strong>`;
  };
  av2Update();
});
