/**
 * formats/heif/encode.js — HEVC 编码（深度版）
 */
REGISTER_RENDERER('hevcEncode', function(container){
  container.innerHTML = `
  <div class="detail-badge">HEVC 编码</div>
  <div class="detail-title">HEVC 编码管线 —— H.265 帧内预测</div>
  <div class="detail-desc">
    HEVC(H.265) 是 H.264/AVC 的继任者，同等质量下码率减半。HEIF 中仅使用帧内编码模式（无帧间预测）。
    编码树单元（CTU）最大 64×64，35 种帧内预测方向，CABAC 熵编码。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">编码参数</div>
      <div class="param-row"><span class="param-label">CRF（0=无损）</span><input type="range" class="param-slider" id="hv2-crf" min="0" max="51" value="28" oninput="hv2Update()"><span class="param-val" id="hv2-crf-v">28</span></div>
      <div class="param-row"><span class="param-label">预设</span>
        <select id="hv2-preset" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="hv2Update()">
          <option value="ultrafast">ultrafast</option><option value="medium" selected>medium</option><option value="slow">slow</option><option value="veryslow">veryslow</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">位深度</span>
        <select id="hv2-bd" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="hv2Update()">
          <option value="8" selected>8-bit</option><option value="10">10-bit</option>
        </select>
      </div>
      <div id="hv2-info" style="margin-top:8px;font-size:11px;line-height:2;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">HEVC 帧内编码管线</div>
      <div style="font-size:11px;color:var(--text2);line-height:2.2">
        ${[
          ['① CTU 划分','图像切分 CTU (16/32/64)×(16/32/64) → CU 递归四叉树分割 → PU → TU'],
          ['② 帧内预测','35 种方向：Planar(0) + DC(1) + 33 个角度(-135°~+45°)，RDO 选择最优'],
          ['③ DCT/DST 变换','4×4/8×8/16×16/32×32 四种尺寸 DCT-II + 4×4 DST-VII（帧内 4×4）'],
          ['④ 量化与缩放','QP(0~51) 指数式量化步长，率失真优化量化（RDOQ）'],
          ['⑤ CABAC 熵编码','上下文自适应二进制算术编码：二值化→上下文建模→算术编码'],
          ['⑥ 去方块滤波','块边界平滑化 + SAO（Sample Adaptive Offset）：带边/角偏移'],
        ].map(([h,d])=>`<div style="padding:3px 8px;margin-bottom:2px;background:var(--surface2);border-radius:4px"><strong style="color:var(--accent)">${h}</strong> ${d}</div>`).join('')}
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">CTU 四叉树分割示意</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;line-height:1.6;max-height:180px;overflow-y:auto;color:var(--text2)">
<pre style="margin:0;padding:8px;background:var(--surface2);border-radius:6px">
CTU: 64×64（亮度采样点）
├─ CU: 32×32（左上）
│  ├─ CU: 16×16
│  ├─ CU: 16×16
│  ├─ CU: 16×16 → PU: 16×16 (Planar)
│  └─ CU: 16×16 → PU: 4×4 (角度26)
├─ CU: 32×32（右上）
│  └─ CU: 32×32 → PU: 8×8 (DC)
├─ CU: 32×32（左下）
│  └─ CU: 32×32 → TU: 16×16
└─ CU: 32×32（右下）
depth=0 → depth=1 → depth=2
最大深度=3 (4×4 最小组件)
</pre>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">CABAC 编码流程</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        <strong>语法元素二值化：</strong><br>
        · 定长码（FL）— 固定长度<br>
        · 截断一元码（TU）— 值 N→N个1+1个0<br>
        · 指数哥伦布码（EGk）<br>
        · 截断莱斯码（TR）<br>
        <br><strong>上下文建模：</strong><br>
        根据相邻块信息选择上下文模型<br>
        （左/上 CU 的分割深度、预测模式等）<br>
        <br><strong>算术编码：</strong><br>
        概率区间划分 → 输出二进制流
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">Python (Pillow + pillow-heif)编码</div>
    <div class="formula-box"><span class="hl">import</span> pillow_heif
<span class="hl">from</span> PIL <span class="hl">import</span> Image

pillow_heif.register_heif_opener()
img = Image.open(<span class="hl-g">'input.png'</span>).convert(<span class="hl-g">'RGBA'</span>)

<span style="color:var(--text3)"># 基本 HEIF 编码</span>
img.save(<span class="hl-g">'photo.heic'</span>, format=<span class="hl-g">'HEIF'</span>, quality=<span class="hl">85</span>)

<span style="color:var(--text3)"># 高级控制</span>
heif_file = pillow_heif.from_pillow(img)
heif_file.save(<span class="hl-g">'advanced.heic'</span>,
    quality=<span class="hl">90</span>,            <span style="color:var(--text3)"># 0-100</span>
    compression=<span class="hl-g">'HEVC'</span>,      <span style="color:var(--text3)"># 编码器</span>
    bit_depth=<span class="hl">10</span>,           <span style="color:var(--text3)"># 使用 10-bit</span>
    save_alpha=<span class="hl">True</span>)        <span style="color:var(--text3)"># 保留透明度</span></div>
  </div>
  `;

  window.hv2Update = function(){
    const crf=+document.getElementById('hv2-crf').value;
    const preset=document.getElementById('hv2-preset').value;
    const bd=+document.getElementById('hv2-bd').value;
    document.getElementById('hv2-crf-v').textContent=crf;
    const crfLabels={0:'无损',18:'视觉无损',28:'默认质量',35:'中等',51:'最低'};
    const crfLabel=crf===0?crfLabels[0]:crf<=18?crfLabels[18]:crf<=28?crfLabels[28]:crf<=40?crfLabels[35]:crfLabels[51];
    document.getElementById('hv2-info').innerHTML=
      `CRF=<strong>${crf}</strong> — ${crfLabel}<br>
       预设：<strong>${preset}</strong> — ${preset==='ultrafast'?'最快（低压缩率）':preset==='medium'?'平衡':preset==='slow'?'高质量（慢）':'最高质量（最慢）'}<br>
       位深：<strong>${bd}</strong>-bit`;
  };
  hv2Update();
});
