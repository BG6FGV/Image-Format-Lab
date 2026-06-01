/**
 * formats/bmp/parse.js — BMP 文件解析（7个子步骤深度展示）
 */
REGISTER_RENDERER('parseBMP', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 BMP 文件，提取 RGB 像素矩阵</div>
  <div class="detail-desc">
    BMP（Bitmap）是 Windows 原生无压缩位图格式。解析按顺序进行：文件头 → 信息头 → 可选调色板 → 像素数据。
    关键特性：行从<span class="hl">底部到顶部</span>倒序存储，每行<span class="hl">4字节对齐</span>填充，像素以<span class="hl">BGR（蓝绿红）</span>顺序排列。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① 文件整体结构</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;line-height:2.6">
        <div style="display:flex;gap:0">
          <div style="flex:none;width:80px;height:42px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--accent);font-weight:500;font-size:10px">文件头<br>14 B</div>
          <div style="flex:none;width:120px;height:42px;background:#f0efe9;border:0.5px solid #c8c5bf;border-left:none;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--text2);font-size:10px">信息头（DIB）<br>通常 40 B</div>
          <div style="flex:1;height:42px;background:#f7f5f0;border:0.5px solid #c8c5bf;border-left:none;border-radius:0 4px 4px 0;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--text2);font-size:10px">像素数据<br>rowSize × abs(height)</div>
        </div>
        <div style="margin-top:5px;font-size:11px;color:var(--text2)">由 <span class="hl">bfOffBits</span> 指针确定像素数据的起始位置</div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">交互参数（影响以下所有子面板计算）</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pb-w" min="8" max="1024" step="8" value="640" oninput="pbUpdate()"><span class="param-val" id="pb-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pb-h" min="8" max="1024" step="8" value="480" oninput="pbUpdate()"><span class="param-val" id="pb-h-v">480</span></div>
      <div class="param-row"><span class="param-label">位深度（bpp）</span>
        <select id="pb-bpp" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pbUpdate()">
          <option value="1">1 位（黑白）</option><option value="4">4 位（16 色调色板）</option><option value="8">8 位（256 色调色板）</option><option value="16">16 位（高彩）</option><option value="24" selected>24 位（真彩色）</option><option value="32">32 位（含 Alpha）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">biCompression</span>
        <select id="pb-comp" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pbUpdate()">
          <option value="0" selected>BI_RGB（无压缩）</option><option value="3">BI_BITFIELDS（32 位带掩码）</option><option value="1">BI_RLE8</option><option value="2">BI_RLE4</option>
        </select>
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② BITMAPFILEHEADER 解析（14 字节，小端序）</div>
      ${bmpFileHeaderTable()}
      <div id="pb-fh-calc" style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.9"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">③ BITMAPINFOHEADER 解析（40 字节）</div>
      ${bmpInfoHeaderTable()}
      <div id="pb-ih-calc" style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.9"></div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">④ 调色板处理</div>
      <div id="pb-pal-info" style="margin-bottom:6px;font-size:11px;color:var(--text2);line-height:2"></div>
      <div id="pb-pal-viz"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">⑤ 像素数据读取</div>
      <div id="pb-pix-info" style="margin-bottom:8px;font-size:11px;color:var(--text2);line-height:2"></div>
      <div class="viz-card" style="background:var(--surface2);margin-bottom:6px">
        <div style="font-size:11px;font-weight:500;margin-bottom:4px">
          <span style="color:var(--success)">● 原始 BGR</span> &nbsp;
          <span style="color:var(--accent)">● 目标 RGB</span>
        </div>
        <div id="pb-bgr-rgb-viz" style="display:grid;grid-template-columns:repeat(6,24px);gap:1px"></div>
      </div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">⑥ 特殊情况处理</div>
    ${[
      ['BI_RLE8 / BI_RLE4','biCompression = 1 或 2 时，像素数据是 RLE 压缩的。解码时读取操作字节（2B）→ 判断绝对/游程模式 → 逐行解压还原。','极少见，转 JPEG 前需解压'],
      ['内嵌 JPEG/PNG','biCompression = 4 (JPEG) 或 5 (PNG) 时，BMP 内部直接存放 JPEG/PNG 文件。','需先解码内嵌格式再转码'],
      ['色彩空间信息','文件头后可能附加色彩端点（Color Endpoints）和 Gamma 值。','通常可忽略'],
      ['biHeight < 0','负值表示正向行存储（第一行在前），abs(biHeight) 为实际高度。','符合规范但少见'],
    ].map(([h,desc,note])=>`
      <div style="display:flex;gap:10px;margin-bottom:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--warn)">
        <div style="flex:none;font-weight:500;font-size:11px;color:var(--warn);width:120px">${h}</div>
        <div style="flex:1;font-size:11px;color:var(--text2);line-height:1.6">${desc}</div>
        <div style="flex:none;font-size:10px;color:var(--text3);width:120px;text-align:right;align-self:center">${note}</div>
      </div>`).join('')}
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑦ 输出确认：RGB 像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        经过以上步骤，得到内存中的 <span class="hl">width × height</span> 像素矩阵：<br>
        · 每个像素：<strong>R、G、B</strong> 三通道，各 8 位<br>
        · 通道顺序：<strong>RGB 交错</strong>（已从 BGR 转换）<br>
        · 行序：<strong>从上到下</strong>（已翻转）<br>
        · 对齐填充：<strong>已移除</strong><br>
        · 数据类型：<code>uint8[H][W][3]</code><br>
        <span class="tag tag-ok" style="margin-left:0">✓ 就绪，可进入下一步</span>
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#eaf3de;border-radius:6px;border:0.5px solid #97C459;font-size:11px;color:var(--success);line-height:1.8">
        矩阵大小 = <span id="pb-out-size">--</span><br>
        内存占用 = <span id="pb-out-mem">--</span><br>
        下一步将送入 <strong>色彩空间转换（RGB → YCbCr）</strong>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">BMP 解析信号流</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0;font-size:10px">
        <span style="background:var(--accent-bg);color:var(--accent);padding:3px 8px;border-radius:4px;font-weight:500">磁盘文件</span>
        <span style="color:var(--text3)">→</span><span style="background:#e6f1fb;color:var(--accent);padding:3px 8px;border-radius:4px;font-weight:500">读14B文件头</span>
        <span style="color:var(--text3)">→</span><span style="background:#e6f1fb;color:var(--accent);padding:3px 8px;border-radius:4px;font-weight:500">读40B信息头</span>
        <span style="color:var(--text3)">→</span><span style="background:#faeeda;color:var(--warn);padding:3px 8px;border-radius:4px;font-weight:500">跳转bfOffBits</span>
        <span style="color:var(--text3)">→</span><span style="background:#eaf3de;color:var(--success);padding:3px 8px;border-radius:4px;font-weight:500">读像素行+去填充</span>
        <span style="color:var(--text3)">→</span><span style="background:#eaf3de;color:var(--success);padding:3px 8px;border-radius:4px;font-weight:500">BGR→RGB</span>
        <span style="color:var(--text3)">→</span><span style="background:#eaf3de;color:var(--success);padding:3px 8px;border-radius:4px;font-weight:500">行翻转</span>
        <span style="color:var(--text3)">→</span><span style="background:var(--accent);color:#fff;padding:3px 8px;border-radius:4px;font-weight:500">uint8[H][W][3]</span>
      </div>
      <div class="viz-card-title" style="margin-top:10px">文件头 14 字节分布</div>
      <div id="pb-bytemap"></div>
    </div>
  </div>
  `;

  window.pbUpdate = function(){
    const w=+document.getElementById('pb-w').value, h=+document.getElementById('pb-h').value,
          bpp=+document.getElementById('pb-bpp').value, comp=+document.getElementById('pb-comp').value;
    document.getElementById('pb-w-v').textContent=w; document.getElementById('pb-h-v').textContent=h;
    const rowBytes=Math.ceil(w*bpp/8), rowAligned=Math.ceil(rowBytes/4)*4, padPerRow=rowAligned-rowBytes;
    const pixTotal=rowAligned*Math.abs(h), fileSize=14+40+(bpp<=8?(1<<bpp)*4:0)+(comp===3?16:0)+pixTotal;
    document.getElementById('pb-fh-calc').innerHTML=`bfType = <span class="hl">0x4D42</span> ("BM"，必须值)<br>bfSize = <span class="hl">${fileSize}</span> (=14+40+${pixTotal})<br>bfReserved1/2 = <span class="hl">0</span><br>bfOffBits = <span class="hl">${14+40+(bpp<=8?(1<<bpp)*4:0)+(comp===3?16:0)}</span>`;
    document.getElementById('pb-ih-calc').innerHTML=`biSize = <span class="hl">40</span>（BITMAPINFOHEADER）<br>biWidth = <span class="hl">${w}</span> &nbsp; biHeight = <span class="hl">${h}</span>（${h>0?'倒序':'正序'}存储）<br>biBitCount = <span class="hl">${bpp}</span> &nbsp; biCompression = <span class="hl">${comp===0?'BI_RGB':comp===1?'BI_RLE8':comp===2?'BI_RLE4':'BI_BITFIELDS'}</span><br>每行原始 = <strong>${rowBytes}</strong> B → 对齐后 = <strong>${rowAligned}</strong> B（+${padPerRow}B 填充）<br>像素数据 = <span class="hl">${(pixTotal/1024).toFixed(1)}</span> KB &nbsp;·&nbsp; 文件总大小 = <span class="hl">${(fileSize/1024).toFixed(1)}</span> KB`;
    const palEl=document.getElementById('pb-pal-info'), vizEl=document.getElementById('pb-pal-viz');
    if(bpp<=8){ const palColors=1<<bpp; palEl.innerHTML=`位深度 ≤ 8 → <span class="tag tag-warn">有调色板</span><br>大小 = <span class="hl">${palColors}×4=${palColors*4}</span> B<br>每项：<strong>B、G、R、保留</strong>`; vizEl.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:2px">${Array.from({length:Math.min(palColors,16)},(_,i)=>{const r=(i*17+50)%256,g=(i*37+80)%256,b=(i*53+30)%256;return`<div style="height:18px;background:rgb(${r},${g},${b});border-radius:2px;position:relative"><span style="position:absolute;bottom:1px;right:2px;font-size:7px">#${i}</span></div>`;}).join('')}</div><div style="font-size:10px;color:var(--text3);margin-top:4px">调色板示意（前${Math.min(palColors,16)}色）</div>`; }
    else { palEl.innerHTML=`位深度 ≥ 16 → <span class="tag tag-ok">无调色板</span>`; if(comp===3) palEl.innerHTML+=`<br>BI_BITFIELDS：头后 <span class="hl">16B</span>（RGBA掩码）`; vizEl.innerHTML=''; }
    document.getElementById('pb-pix-info').innerHTML=`每行原始 = <strong>${rowBytes}</strong> B（${w}×${bpp}/8）<br>对齐后 = <strong>${rowAligned}</strong> B（填充 ${padPerRow} B）<br>行序：biHeight>0 → <span class="hl">底部先行</span>（需翻转）<br>BGR 解包：24位(B,G,R) → <span class="hl">交换 0↔2 通道</span>`;
    const grid=document.getElementById('pb-bgr-rgb-viz'), cells=Array.from({length:12},()=>[100+Math.random()*155|0,60+Math.random()*180|0,30+Math.random()*220|0]);
    grid.innerHTML=cells.map((c,i)=>{const isBGR=i<6;const rgb=isBGR?c:[c[2],c[1],c[0]];return`<div style="height:24px;background:rgb(${rgb[0]},${rgb[1]},${rgb[2]});border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:7px;color:${(rgb[0]+rgb[1]+rgb[2])>400?'#222':'#fff'}">${isBGR?'BGR':'RGB'}</div>`;}).join('');
    document.getElementById('pb-out-size').textContent=`${w} × ${h} × 3 = ${(w*h).toLocaleString()} 像素（${(w*h*3/1024).toFixed(1)} KB）`;
    document.getElementById('pb-out-mem').textContent=`${(w*h*3/1024/1024).toFixed(2)} MB（uint8 无压缩）`;
    renderByteMap('pb-bytemap',[{name:'bfType',bytes:2,color:'#4477c4'},{name:'bfSize',bytes:4,color:'#5588db'},{name:'Reserved',bytes:4,color:'#88aadd'},{name:'bfOffBits',bytes:4,color:'#3266ad'},{name:'biSize',bytes:4,color:'#c4a044'},{name:'biWidth+H',bytes:8,color:'#d4b054'},{name:'biPlanes+BC',bytes:4,color:'#c49030'}]);
    SIM_PARAMS.bmpBpp=bpp; SIM_PARAMS.bmpWidth=w; SIM_PARAMS.bmpHeight=h; SIM_PARAMS.bmpCompression=comp; refreshPreview();
  };
  pbUpdate();
});
