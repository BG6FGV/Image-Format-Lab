/**
 * formats/jpeg/pack.js — JPEG 封装
 */
REGISTER_RENDERER('packJPEG', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 JPEG</div>
  <div class="detail-title">封装为 JPEG 文件（JFIF 格式）</div>
  <div class="detail-desc">按 JFIF 规范写入各标记段及压缩比特流，SOI 和 EOI 分别标记文件开始和结束。</div>
  <div class="viz-card">
    <div class="viz-card-title">JFIF 文件段结构</div>
    ${segRow('FF D8','SOI — 图像开始','2 B')}
    ${segRow('FF E0','APP0 — JFIF 头：版本、DPI、缩略图','~16 B')}
    ${segRow('FF DB','DQT — 量化表（亮度+色度，各64字节）','~132 B')}
    ${segRow('FF C0','SOF0 — 帧头（基线DCT）：宽高/分量数/采样因子','~17 B')}
    ${segRow('FF C4','DHT — 哈夫曼表（DC/AC × Y/CbCr = 4张）','~420 B')}
    ${segRow('FF DA','SOS — 扫描头 + 压缩比特流','可变')}
    ${segRow('FF D9','EOI — 图像结束','2 B')}
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">输出参数</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pj2-w" min="8" max="4096" step="8" value="640" oninput="pj2Update()"><span class="param-val" id="pj2-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pj2-h" min="8" max="4096" step="8" value="480" oninput="pj2Update()"><span class="param-val" id="pj2-h-v">480</span></div>
      <div class="param-row"><span class="param-label">质量因子 Q</span><input type="range" class="param-slider" id="pj2-q" min="1" max="100" value="85" oninput="pj2Update()"><span class="param-val" id="pj2-q-v">85</span></div>
      <div id="pj2-info" style="margin-top:8px;font-size:11px;line-height:1.9;color:var(--text2)"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python 片段</div>
      <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image

img = Image.fromarray(rgb_array)
img.save(<span class="hl-g">'out.jpg'</span>,
    quality=<span class="hl">85</span>,
    subsampling=<span class="hl">2</span>,   <span style="color:var(--text3)"># 4:2:0</span>
    optimize=<span class="hl">True</span>
)</div>
    </div>
  </div>`;
  window.pj2Update=function(){
    const w=+document.getElementById('pj2-w').value;
    const h=+document.getElementById('pj2-h').value;
    const q=+document.getElementById('pj2-q').value;
    document.getElementById('pj2-w-v').textContent=w;
    document.getElementById('pj2-h-v').textContent=h;
    document.getElementById('pj2-q-v').textContent=q;
    const bpp=q>=80?1.2:q>=60?0.8:q>=40?0.5:q>=20?0.3:0.15;
    const est=Math.round(w*h*bpp/8/1024);
    document.getElementById('pj2-info').innerHTML=
      `像素数：<strong>${(w*h/1000).toFixed(0)}K</strong>（${w}×${h}）<br>
       预估文件大小（Q=${q}）：约 <strong>${est}</strong> KB`;
  };
  pj2Update();
});
