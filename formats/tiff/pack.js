/**
 * formats/tiff/pack.js — TIFF 封装
 */
REGISTER_RENDERER('packTIFF', function(container){
  container.innerHTML = `
  <div class="detail-badge">封装 TIFF</div>
  <div class="detail-title">封装为 TIFF 文件</div>
  <div class="detail-desc">TIFF 以 IFD（Image File Directory）为核心：每个 IFD 条目 12 字节（tag+type+count+value），可包含多个 IFD 支持多页。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">核心 IFD 标签</div>
      ${segRow('256','ImageWidth — 图像宽度','')}${segRow('257','ImageLength — 图像高度','')}
      ${segRow('258','BitsPerSample — 每样本位数 [8,8,8]','')}${segRow('259','Compression — 1=无/5=LZW/7=JPEG/32946=Deflate','')}
      ${segRow('262','PhotometricInterpretation — 2=RGB/6=YCbCr','')}${segRow('273','StripOffsets — 各条带数据偏移数组','')}
      ${segRow('278','RowsPerStrip — 每带行数','')}${segRow('279','StripByteCounts — 每条带字节数','')}
      ${segRow('282','XResolution + 283 YResolution — DPI','')}${segRow('296','ResolutionUnit — 2=inch/3=cm','')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python</div>
      <div class="formula-box">img.save(<span class="hl-g">'out.tif'</span>,
    compression=<span class="hl-g">'tiff_lzw'</span>,
    dpi=(<span class="hl">300</span>,<span class="hl">300</span>))</div>
    </div>
  </div>`});
