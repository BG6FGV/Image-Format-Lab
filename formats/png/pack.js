/**
 * formats/png/pack.js — PNG 封装
 */
REGISTER_RENDERER('packPNG', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 PNG</div>
  <div class="detail-title">封装为 PNG 文件</div>
  <div class="detail-desc">写入8字节签名，然后依次写各块（Chunk），每块含 4B长度、4B类型、数据、4B CRC32。</div>
  <div class="viz-card">
    <div class="viz-card-title">PNG 块结构</div>
    ${segRow('签名','\\x89PNG\\r\\n\\x1a\\n','8 B')}
    ${segRow('IHDR','宽/高/位深/颜色类型/压缩/滤波/交织','13 B')}
    ${segRow('IDAT','Deflate 压缩数据','可变')}
    ${segRow('IEND','文件结束','0 B')}
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">颜色类型</div>
      ${[['0','灰度','1通道'],['2','RGB','3通道'],['3','索引色','调色板'],['4','灰度+Alpha','2通道'],['6','RGBA','4通道']].map(([c,n,d])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <div style="width:22px;height:22px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent)">${c}</div>
          <span style="font-size:11px;font-weight:500">${n}</span><span style="font-size:11px;color:var(--text3)">${d}</span>
        </div>`).join('')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img.save(<span class="hl-g">'out.png'</span>, optimize=<span class="hl">True</span>, compress_level=<span class="hl">6</span>)</div>
    </div>
  </div>`;
});
