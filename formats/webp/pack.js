/**
 * formats/webp/pack.js — WebP 封装
 */
REGISTER_RENDERER('packWebP', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 WebP</div>
  <div class="detail-title">封装为 WebP 文件（RIFF 容器）</div>
  <div class="detail-desc">WebP 基于 RIFF（Resource Interchange File Format）容器，与 AVI/WAV 同族。每个 RIFF 块有 4B ID + 4B size + data。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">RIFF 块结构</div>
      ${segRow('RIFF','文件大小（含后续）','4+4')}${segRow('WEBP','格式标识','4')}
      ${segRow('VP8 ','有损位流','')}${segRow('VP8L','无损位流','')}
      ${segRow('VP8X','扩展文件头（含EXIF/XMP/ICCP Flags、宽高）','10')}${segRow('ALPH','Alpha通道（独立压缩）','')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img.save(<span class="hl-g">'out.webp'</span>, quality=<span class="hl">80</span>, method=<span class="hl">6</span>)</div>
    </div>
  </div>`});
