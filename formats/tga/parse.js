/**
 * formats/tga/parse.js — TGA 解析（深度版）
 */
REGISTER_RENDERER('parseTGA', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 TGA（Targa）文件</div>
  <div class="detail-desc">
    TGA 是 Truevision 公司 1984 年推出的光栅格式，曾是游戏纹理和视频编辑的主力格式。
    18 字节文件头 + 可选调色板 + 像素数据，天然支持 <span class="hl">Alpha 通道</span>（32 位）。
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① TGA 18 字节文件头</div>
      <table class="byte-table">
        <tr><th>偏移</th><th>大小</th><th>字段</th><th>说明</th></tr>
        <tr><td>0</td><td>1B</td><td>ID Length</td><td>图像 ID 字段长度（0-255）</td></tr>
        <tr><td>1</td><td>1B</td><td>Color Map Type</td><td>0=无调色板, 1=有调色板</td></tr>
        <tr><td>2</td><td>1B</td><td>Image Type</td><td>0=无数据, 2=RGB, 3=灰度, 10=RLE RGB, 11=RLE 灰度</td></tr>
        <tr><td>3-7</td><td>5B</td><td>Color Map Spec</td><td>调色板首索引+长度+每项位数</td></tr>
        <tr><td>8-11</td><td>4B</td><td>Image Spec X/Y</td><td>图像原点坐标（通常 0,0）</td></tr>
        <tr><td>12-13</td><td>2B</td><td>Width</td><td>图像宽度</td></tr>
        <tr><td>14-15</td><td>2B</td><td>Height</td><td>图像高度</td></tr>
        <tr><td>16</td><td>1B</td><td>Pixel Depth</td><td>16/24/32</td></tr>
        <tr><td>17</td><td>1B</td><td>Descriptor</td><td>bit5=原点(0底1顶), bit0-3=Alpha位</td></tr>
      </table>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">交互参数</div>
      <div class="param-row"><span class="param-label">图像类型</span>
        <select id="tga-type" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="tgaUpdate()">
          <option value="2" selected>2 — 无压缩 RGB</option><option value="10">10 — RLE 压缩 RGB</option>
          <option value="3">3 — 无压缩 灰度</option><option value="11">11 — RLE 灰度</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">像素深度</span>
        <select id="tga-bpp" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="tgaUpdate()">
          <option value="24" selected>24 bit — BGR（无 Alpha）</option><option value="32">32 bit — BGRA（含 Alpha）</option>
          <option value="16">16 bit — 555 RGB</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="tga-w" min="8" max="1024" step="8" value="256" oninput="tgaUpdate()"><span class="param-val" id="tga-w-v">256</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="tga-h" min="8" max="1024" step="8" value="256" oninput="tgaUpdate()"><span class="param-val" id="tga-h-v">256</span></div>
      <div id="tga-stats" style="margin-top:10px;font-size:11px;line-height:2;color:var(--text2)"></div>
    </div>
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② RLE 解压算法（PackBits）</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        TGA RLE 采用 PackBits 变体：<br>
        <span class="tag tag-info">报文</span> bit7=0 → 原始像素块 (比特0-6+1)个像素<br>
        <span class="tag tag-warn">游程</span> bit7=1 → 重复 (比特0-6+1)次单个像素<br><br>
        每次解压一个像素包，直到达到 width×height 个像素。
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">③ BGR(A) → RGB(A) 转换</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        TGA 和 BMP 一样以 <span class="hl-o">BGR</span> 顺序存储：<br>
        24位：B₀,G₀,R₀, B₁,G₁,R₁, ...<br>
        32位：B₀,G₀,R₀,A₀, ...<br>
        交换 R↔B 即得标准 RGB。<br>
        Descriptor bit5 决定行序（0=底→顶, 1=顶→底）。
      </div>
    </div>
  </div>
  `;
  window.tgaUpdate = function(){
    const type=+document.getElementById('tga-type').value;
    const bpp=+document.getElementById('tga-bpp').value;
    const w=+document.getElementById('tga-w').value, h=+document.getElementById('tga-h').value;
    document.getElementById('tga-w-v').textContent=w; document.getElementById('tga-h-v').textContent=h;
    const raw=w*h*(bpp/8), rle=type>=10?Math.round(raw*0.4):raw;
    document.getElementById('tga-stats').innerHTML=`像素数:<strong>${w}×${h}</strong> (${bpp}bit)<br>原始:<strong>${(raw/1024).toFixed(1)} KB</strong><br>RLE后≈ <strong>${(rle/1024).toFixed(1)} KB</strong> (${type>=10?'已压缩':'无压缩'})`;
  };
  tgaUpdate();
});
