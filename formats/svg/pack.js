/**
 * formats/svg/pack.js — SVG 封装
 */
REGISTER_RENDERER('packSVG', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 SVG</div>
  <div class="detail-title">封装为 SVG 文件</div>
  <div class="detail-desc">SVG 是纯文本 XML 格式，路径用 <code>&lt;path d="..."&gt;</code> 元素描述，无限缩放不失真。文件体积取决于路径复杂度。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">SVG 文件模板</div>
      <div class="formula-box"><span class="hl-g">&lt;?xml version="1.0" encoding="UTF-8"?&gt;</span>
<span class="hl">&lt;svg</span> xmlns=<span class="hl-g">"http://www.w3.org/2000/svg"</span>
     viewBox=<span class="hl-g">"0 0 800 600"</span> width=<span class="hl-g">"100%"</span> height=<span class="hl-g">"100%"</span><span class="hl">&gt;</span>
  <span class="hl-o">&lt;path</span> d=<span class="hl-g">"M10,20 C50,10 90,30 120,20 Z"</span>
        fill=<span class="hl-g">"#3266ad"</span> stroke=<span class="hl-g">"#1a1917"</span><span class="hl-o">/&gt;</span>
<span class="hl">&lt;/svg&gt;</span></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python 生成 SVG</div>
      <div class="formula-box"><span class="hl">import</span> svgwrite
dwg = svgwrite.Drawing(<span class="hl-g">'out.svg'</span>, size=(<span class="hl">800</span>,<span class="hl">600</span>))
dwg.add(dwg.path(d=<span class="hl-g">'M10,20 L100,40 Z'</span>, fill=<span class="hl-g">'#333'</span>))
dwg.save()</div>
    </div>
  </div>`});
