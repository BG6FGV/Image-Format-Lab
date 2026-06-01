/**
 * formats/tga/assemble.js — TGA 组装
 */
REGISTER_RENDERER('assembleTGA', function(container){
  container.innerHTML = `
  <div class="detail-badge">组装 TGA</div>
  <div class="detail-title">组装为 TGA（Targa）文件</div>
  <div class="detail-desc">TGA 是 OpenGL 纹理的鼻祖格式，游戏开发和视频编辑的经典中间格式。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">TGA 写入流程</div>
      ${segRow('18B Header','Type=2(RGB) / 10(RLE RGB), 宽高, 位深24/32, 原点底','18 B')}
      ${segRow('Image ID','可选标识字段（长度由 Header[0] 决定）','0-255 B')}
      ${segRow('ColorMap','调色板（Type=2/10 时为空）','0 B')}
      ${segRow('Pixel Data','RGB→BGR 顺序, 可选 PackBits RLE','W×H×BPP/8 B')}
      ${segRow('Footer','可选 TGA2.0 扩展区','26 B')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">TGA 特点</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        · 原生 Alpha 通道（32位）<br>
        · 原点可底可顶（与 BMP 不同）<br>
        · RLE 压缩简单高效<br>
        · 仍是游戏引擎标准纹理输入格式
      </div>
    </div>
  </div>`);
});
