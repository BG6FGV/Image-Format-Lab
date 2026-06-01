/**
 * formats/ico/parse.js — ICO 解析
 */
REGISTER_RENDERER('parseICO', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 ICO（Windows 图标）文件</div>
  <div class="detail-desc">
    ICO 是 Windows 图标格式，一个文件内含<span class="hl">多个尺寸</span>的位图（16/24/32/48/256 px），
    每个位图由 <span class="hl">DIB 位图 + AND 掩码</span> 组成，AND 掩码提供 1 位透明。
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① ICO 文件头（6 字节）</div>
      <table class="byte-table">
        <tr><th>偏移</th><th>大小</th><th>字段</th><th>值</th></tr>
        <tr><td>0</td><td>2B</td><td>Reserved</td><td>00 00</td></tr>
        <tr><td>2</td><td>2B</td><td>Type</td><td>1=图标 / 2=光标</td></tr>
        <tr><td>4</td><td>2B</td><td>Count</td><td>图像数量（通常 1-9）</td></tr>
      </table>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">② ICO 目录项（每条 16 字节）</div>
      <table class="byte-table">
        <tr><th>偏移</th><th>大小</th><th>字段</th></tr>
        <tr><td>0</td><td>1B</td><td>Width（0=256px）</td></tr>
        <tr><td>1</td><td>1B</td><td>Height（0=256px）</td></tr>
        <tr><td>2</td><td>1B</td><td>Colors（0=≥256色）</td></tr>
        <tr><td>3</td><td>1B</td><td>Reserved (00)</td></tr>
        <tr><td>4</td><td>2B</td><td>Planes / Hotspot X</td></tr>
        <tr><td>6</td><td>2B</td><td>BPP / Hotspot Y</td></tr>
        <tr><td>8</td><td>4B</td><td>Image Size（字节）</td></tr>
        <tr><td>12</td><td>4B</td><td>Image Offset（文件偏移）</td></tr>
      </table>
    </div>
  </div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">③ 内嵌 DIB 位图 + AND 掩码</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        每个条目指向一个内嵌的 DIB：<br>
        1. <span class="hl">BITMAPINFOHEADER</span> (40B)<br>
        2. 像素数据（BGR 顺序，底部行先）<br>
        3. <span class="hl">AND 掩码</span>（1 bpp，行对齐）<br><br>
        AND 掩码位=0 → 该像素透明<br>
        AND 掩码位=1 → 该像素不透明
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">交互：icon 尺寸层级</div>
      <div class="param-row"><span class="param-label">选择尺寸</span>
        <select id="ico-size" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="icoUpdate()">
          <option value="256">256×256（PNG 内嵌）</option><option value="48" selected>48×48</option>
          <option value="32">32×32</option><option value="24">24×24</option><option value="16">16×16</option>
        </select>
      </div>
      <div id="ico-info" style="margin-top:8px;font-size:11px;line-height:2;color:var(--text2)">
        ICO 文件最多含 9 个尺寸层级。<br>
        大尺寸（≥256）内部可能是嵌入的 PNG 而非 DIB<br>
        解析时选择最佳尺寸（通常最大者）提取像素。
      </div>
    </div>
  </div>
  `;
  window.icoUpdate = function(){
    const sz=+document.getElementById('ico-size').value;
    document.getElementById('ico-info').innerHTML=`选择 <strong>${sz}×${sz}</strong> — DIB位图 ${sz>128?'可能内嵌PNG':'标准DIB'}，AND掩码 ${Math.ceil(sz/8)*sz}B`;
  };
});
