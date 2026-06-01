/**
 * formats/webp/encode.js — WebP 编码（深度版）
 */
REGISTER_RENDERER('webpEncode', function(container){
  container.innerHTML = `
  <div class="detail-badge">WebP 编码</div>
  <div class="detail-title">WebP 编码器 —— 有损 VP8 与无损 VP8L</div>
  <div class="detail-desc">
    WebP 同一容器支持两种完全不同的编码路径：有损（VP8，类 JPEG）和无损（VP8L，类 PNG）。
    有损模式下压缩效率比 JPEG 高 25-34%，无损模式比 PNG 小 26%。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">编码模式选择</div>
      <div class="param-row"><span class="param-label">编码模式</span>
        <select id="wp2-mode" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="wp2Update()">
          <option value="lossy" selected>有损（VP8）—照片优选项</option>
          <option value="lossless">无损（VP8L）—UI/文字优选项</option>
          <option value="both">近无损（near_lossless）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">质量/级别</span><input type="range" class="param-slider" id="wp2-q" min="0" max="100" value="80" oninput="wp2Update()"><span class="param-val" id="wp2-q-v">80</span></div>
      <div class="param-row"><span class="param-label">方法（0-6）</span><input type="range" class="param-slider" id="wp2-m" min="0" max="6" step="1" value="4" oninput="wp2Update()"><span class="param-val" id="wp2-m-v">4</span></div>
      <div class="param-row"><span class="param-label">Alpha 质量</span><input type="range" class="param-slider" id="wp2-aq" min="0" max="100" value="100" oninput="wp2Update()"><span class="param-val" id="wp2-aq-v">100</span></div>
      <div id="wp2-info" style="margin-top:10px;font-size:11px;line-height:1.9;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">有损 VP8 编码管线（8 阶段）</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        ${[
          ['① RGB→YUV','将 RGBA 转换到 YUV420 空间（亮度 + 1/4 色度）'],
          ['② 宏块分割','16×16 宏块 → 可细分为 4×4 子块'],
          ['③ 帧内预测','B_PRED/L_PRED/V_PRED 等 10 种预测模式'],
          ['④ DCT/WHT','对残差做 4×4 DCT 或 Walsh-Hadamard 变换'],
          ['⑤ 量化','自适应量化步长，死区量化丢弃小系数'],
          ['⑥ 系数重排','Zig-Zag + 系数阈值化（丢弃末尾连续零）'],
          ['⑦ 算术编码','布尔熵编码器，自适应概率更新'],
          ['⑧ 去块滤波','环路滤波消除块效应'],
        ].map(([h,d])=>`<div style="padding:3px 8px;margin-bottom:2px;background:var(--surface2);border-radius:4px"><strong style="color:var(--accent)">${h}</strong> ${d}</div>`).join('')}
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">无损 VP8L 编码（5 阶段）</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        ${[
          ['① 空间颜色变换','Subtract Green：R'=R-G, B'=B-G, G'=G（减少通道间冗余）'],
          ['② 预测器选择','对每个像素从 13 种空间预测模式中选择最优'],
          ['③ 颜色缓存','将最近使用的 32 种颜色组存入缓存，命中时直接引用索引'],
          ['④ LZ77 后向引用','滑动窗口匹配重复像素序列，输出 (长度, 距离)'],
          ['⑤ Huffman 编码','符号→变长码，5 组独立 Huffman 树'],
        ].map(([h,d])=>`<div style="padding:3px 8px;margin-bottom:2px;background:#eaf3de;border-radius:4px"><strong style="color:var(--success)">${h}</strong> ${d}</div>`).join('')}
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">13 种空间预测模式（VP8L）</div>
      <div style="font-size:10px;font-family:'Courier New',monospace;line-height:1.7;max-height:180px;overflow-y:auto;color:var(--text2)">
        模式 0：左邻像素 L<br>
        模式 1：上方像素 T<br>
        模式 2：左上角 TL<br>
        模式 3：右上方 TR<br>
        模式 4：左下方 BL<br>
        模式 5：clamp(L+T-TL)<br>
        模式 6：avg(L+T)/2<br>
        模式 7：avg(L,TL,TR,T)<br>
        模式 8：L+T−TL<br>
        模式 9：L+(T−TL)/2<br>
        模式10：T+(L−TL)/2<br>
        模式11：(L+T)/2+ |L−T|最近邻<br>
        模式12：clamp(W−(NW−W))<br>
        <span style="color:var(--text3)">W=左, NW=左上, N=上, NE=右上</span>
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">Python 完整编码示例</div>
    <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image

img = Image.open(<span class="hl-g">'input.png'</span>).convert(<span class="hl-g">'RGBA'</span>)

<span style="color:var(--text3)"># 有损 WebP（照片）</span>
img.save(<span class="hl-g">'photo.webp'</span>, quality=<span class="hl">80</span>, method=<span class="hl">6</span>)

<span style="color:var(--text3)"># 无损 WebP（UI 截图、文字）</span>
img.save(<span class="hl-g">'ui.webp'</span>, lossless=<span class="hl">True</span>, quality=<span class="hl">100</span>)

<span style="color:var(--text3)"># 近无损（保留边缘锐度）</span>
img.save(<span class="hl-g">'nearloss.webp'</span>, lossless=<span class="hl">True</span>, quality=<span class="hl">60</span><span style="color:var(--text3)">, near_lossless=True</span>)

<span style="color:var(--text3)"># Alpha 质量分离控制</span>
img.save(<span class="hl-g">'alpha.webp'</span>, quality=<span class="hl">80</span>, alpha_quality=<span class="hl">100</span>)</div>
  </div>
  `;

  window.wp2Update = function(){
    const mode=document.getElementById('wp2-mode').value;
    const q=+document.getElementById('wp2-q').value;
    const m=+document.getElementById('wp2-m').value;
    const aq=+document.getElementById('wp2-aq').value;
    document.getElementById('wp2-q-v').textContent=q;
    document.getElementById('wp2-m-v').textContent=m;
    document.getElementById('wp2-aq-v').textContent=aq;
    const labels={lossy:'VP8 有损编解码',lossless:'VP8L 无损编解码',both:'VP8L 近无损（预处理量化后无损压缩）'};
    const d={lossy:`有损模式：RGB→YUV420→预测→DCT→量化(Q=${q})→算术编码<br>方法=${m}：${m>=4?'最佳压缩（慢）':m>=2?'平衡':'快速'}`,lossless:`无损模式：SubtractGreen→预测→LZ77→Huffman<br>保留完整 RGBA`,
    both:`近无损：质量参数决定像素预处理程度，后续无损压缩<br>质量${q}：${q>=90?'几乎无损':q>=60?'轻微损失':'有损边缘'}`};
    document.getElementById('wp2-info').innerHTML=d[mode];
    SIM_PARAMS.webpQuality = q; SIM_PARAMS.webpMode = mode;
    refreshPreview();
  };
  wp2Update();
});
