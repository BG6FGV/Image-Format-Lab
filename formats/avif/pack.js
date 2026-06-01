/**
 * formats/avif/pack.js — AVIF 封装
 */
REGISTER_RENDERER('packAVIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 AVIF</div>
  <div class="detail-title">封装为 AVIF 文件（ISOBMFF 容器）</div>
  <div class="desc">将 AV1 位流和元数据写入标准 ISOBMFF 盒子结构。AVIF 采用"单帧图片模式"（非视频轨模式），所有数据通过 iloc/iinf item 引用。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">盒子写入顺序</div>
      ${segRow('ftyp','avif/mif1/msf1 兼容品牌','')}${segRow('meta','hdlr=pict + pitm + iloc + iinf + iprp','')}
      ${segRow('mdat','AV1 OBU 位流 + Alpha OBU','')}${segRow('iprp','ispe尺寸 + colr色彩 + pixi像素 + av1C编码配置','')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img.save(<span class="hl-g">'out.avif'</span>, quality=<span class="hl">75</span>)</div>
    </div>
  </div>`});
