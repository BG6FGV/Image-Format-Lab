/**
 * formats/ico/assemble.js — ICO 封装
 */
REGISTER_RENDERER('assembleICO', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 ICO</div>
  <div class="detail-title">封装为 ICO（Windows 图标）文件</div>
  <div class="detail-desc">将 RGB(A) 像素封装为标准 .ico 文件，生成多种分辨率，写入 DIB + AND 掩码。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">ICO 生成流程</div>
      ${segRow('ICO Header','Reserved(00 00) + Type(01 00) + Count','6 B')}
      ${segRow('Directory','每个条目 16B：宽/高/颜色数/BPP/大小/偏移','N×16 B')}
      ${segRow('256×256','DIB(40B) + BGR像素(768KB) + AND掩码(8KB)','~800 KB')}
      ${segRow('48×48','DIB(40B) + BGR像素(6.9KB) + AND掩码(288B)','~7.5 KB')}
      ${segRow('32×32','DIB(40B) + BGR像素(3KB) + AND掩码(128B)','~3.2 KB')}
      ${segRow('16×16','DIB(40B) + BGR像素(768B) + AND掩码(32B)','~840 B')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">AND 掩码生成</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        每像素 1 位：Alpha≥128→掩码位=1（不透明），否则=0（透明）<br>
        行对齐至 32 位边界（4 字节）<br>
        掩码总尺寸 = ceil(W/32)*4 * H 字节
      </div>
    </div>
  </div>`);
});
