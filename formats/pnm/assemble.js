/**
 * formats/pnm/assemble.js — PNM/PPM 组装
 */
REGISTER_RENDERER('assemblePNM', function(container){
  container.innerHTML = `
  <div class="detail-badge">组装 PNM</div>
  <div class="detail-title">组装为 PPM(P6) 文件</div>
  <div class="detail-desc">P6 PPM 是地球上最简洁的彩色图片格式——头只有一行文本，后接 RGB 字节裸流。无压缩、无校验、无EXIF。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">P6 文件布局</div>
      ${segRow('P6\\n','魔数 + 换行','2 B')}
      ${segRow('W H\\n','宽度 空格 高度 换行','~10 B')}
      ${segRow('255\\n','最大像素值 换行（固定）','4 B')}
      ${segRow('RGB...','像素字节流 (R₁G₁B₁, R₂G₂B₂, ...)','W×H×3 B')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">特点</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        优点：解析只用 6 行代码<br>
        缺点：无压缩（PNG 通常小 10 倍）<br>
        用途：计算机视觉教学、中间格式<br>
        兼容：GIMP/Photoshop/ImageMagick 均支持
      </div>
    </div>
  </div>`);
});
