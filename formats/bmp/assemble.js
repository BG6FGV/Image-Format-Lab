/**
 * formats/bmp/assemble.js — BMP 文件组装
 */
REGISTER_RENDERER('assembleBMP', function(container){
  container.innerHTML = `
  <div class="detail-badge">组装 BMP</div>
  <div class="detail-title">组装 BMP 文件</div>
  <div class="detail-desc">将 RGB 像素写入 BMP 时需做 3 步处理：① RGB→BGR 通道顺序对换；② 行从底到顶倒序写入；③ 每行补全4字节对齐填充。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">文件参数</div>
      <div class="param-row"><span class="param-label">颜色通道</span>
        <select id="ab-mode" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="abUpdate()">
          <option value="24" selected>24位 RGB（无Alpha）</option>
          <option value="32">32位 RGBA（含Alpha，非标准）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="ab-w" min="8" max="512" step="8" value="640" oninput="abUpdate()"><span class="param-val" id="ab-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="ab-h" min="8" max="512" step="8" value="480" oninput="abUpdate()"><span class="param-val" id="ab-h-v">480</span></div>
      <div id="ab-info" style="margin-top:8px;font-size:11px;line-height:1.9;color:var(--text2)"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python 片段</div>
      <div class="formula-box"><span class="hl">import</span> numpy <span class="hl">as</span> np

<span style="color:var(--text3)"># rgb_array: numpy UINT8 array (H, W, 3)</span>
bgr = rgb_array[:, :, ::-1]     <span style="color:var(--text3)"># RGB→BGR</span>
flipped = bgr[::-1, :, :]       <span style="color:var(--text3)"># 行倒置</span>

<span style="color:var(--text3)"># PIL 直接保存（自动处理上述细节）</span>
<span class="hl">from</span> PIL <span class="hl">import</span> Image
Image.fromarray(rgb_array).save(<span class="hl-g">'out.bmp'</span>)</div>
    </div>
  </div>`;
  window.abUpdate=function(){
    const mode=document.getElementById('ab-mode').value;
    const w=+document.getElementById('ab-w').value;
    const h=+document.getElementById('ab-h').value;
    document.getElementById('ab-w-v').textContent=w;
    document.getElementById('ab-h-v').textContent=h;
    const bpp=+mode;
    const rowB=Math.ceil(w*bpp/8), rowP=Math.ceil(rowB/4)*4;
    const fileSize=14+40+rowP*h;
    document.getElementById('ab-info').innerHTML=
      `位深：<strong>${bpp}</strong> bpp，每行 ${rowB}B → 对齐 ${rowP}B<br>
       文件大小：<strong>${(fileSize/1024).toFixed(0)}</strong> KB（${w}×${h}）`;
  };
  abUpdate();
});
