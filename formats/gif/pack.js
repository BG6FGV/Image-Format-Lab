/**
 * formats/gif/pack.js — GIF 封装
 */
REGISTER_RENDERER('packGIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 GIF</div>
  <div class="detail-title">封装为 GIF 文件</div>
  <div class="detail-desc">GIF89a 格式支持动画和透明，文件由多个块组成。</div>
  <div class="viz-card">
    <div class="viz-card-title">GIF 结构</div>
    ${segRow('Header','GIF89a','6 B')}
    ${segRow('LSD','逻辑屏幕描述符','7 B')}
    ${segRow('GCT','全局颜色表','可选')}
    ${segRow('GCE','透明/延迟控制','6 B')}
    ${segRow('IMG','图像+LZW子块','可变')}
    ${segRow(';','结束 0x3B','1 B')}
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">透明处理</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        GIF 只支持<span class="tag tag-warn">1位透明</span><br>
        · GCE 设置透明色索引<br>
        · 无半透明支持
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img_p = img.quantize(colors=<span class="hl">256</span>)
img_p.save(<span class="hl-g">'out.gif'</span>)</div>
    </div>
  </div>`;
});
