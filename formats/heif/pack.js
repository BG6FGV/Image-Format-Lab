/**
 * formats/heif/pack.js — HEIF 封装
 */
REGISTER_RENDERER('packHEIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 HEIF</div>
  <div class="detail-title">封装为 HEIF/HEIC 文件</div>
  <div class="detail-desc">HEIF 使用 item-based 图片存储模式：图片不放在视频轨中，而是作为独立的"项"由 iloc 记录偏移。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">关键盒子</div>
      ${segRow('ftyp','heic / mif1','')}${segRow('meta','hdlr(=pict) + pitm(主图item)','')}
      ${segRow('iloc','{itemID, constructionMethod, dataOffset, length}','')}
      ${segRow('iinf','{itemID, itemType=grid/hvc1/Exif, itemName}','')}
      ${segRow('iprp','{ispe(cols/rows), colr(nclx/sRGB), pixi, hvcC(HEVC config)}','')}
      ${segRow('mdat','HEVC 位流（NAL units）','')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img.save(<span class="hl-g">'photo.heic'</span>, format=<span class="hl-g">'HEIF'</span>, quality=<span class="hl">85</span>)</div>
    </div>
  </div>`});
