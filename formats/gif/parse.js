/**
 * formats/gif/parse.js — GIF 文件解析（7个子步骤深度展示）
 * 注册为 parseGIF 步骤渲染器
 */

REGISTER_RENDERER('parseGIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 GIF 文件，展开 LZW 压缩与调色板映射</div>
  <div class="detail-desc">
    GIF（Graphics Interchange Format）使用 <span class="hl">LZW 无损压缩</span>，颜色限制为最多 <span class="hl">256 色</span>。
    解析流程：Header → 逻辑屏幕描述符 → 可选全局颜色表 → 图形控制扩展（动画帧）→ 图像描述符 → LZW 子块解压 → 调色板索引映射 RGB。
    支持 <span class="hl">多帧动画</span>、<span class="hl">交错扫描</span> 和 <span class="hl">透明色</span>。
  </div>

  <!-- ══ 子面板①：文件整体结构 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">① GIF 文件结构总览</div>
    <div style="display:flex;align-items:center;gap:0;font-size:10px;font-family:'Courier New',monospace;line-height:2.4;overflow-x:auto;padding:4px 0">
      <div style="flex:none;padding:5px 10px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:6px 0 0 6px;text-align:center;color:var(--accent);font-weight:500">
        Header<br>"GIF89a"<br>6 B
      </div>
      <div style="flex:none;padding:5px 10px;background:#f0efe9;border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--text2)">
        LSD<br>逻辑屏幕<br>7 B
      </div>
      <div style="flex:none;padding:5px 10px;background:#f5f2eb;border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--warn)">
        GCT<br>全局调色板<br>可选
      </div>
      <div style="flex:none;padding:5px 8px;background:var(--surface2);border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--text2);font-size:9px">
        <i>ext blocks...</i>
      </div>
      <div style="flex:none;padding:5px 10px;background:var(--surface);border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--accent)">
        GCE<br>帧控制<br>8 B
      </div>
      <div style="flex:none;padding:5px 10px;background:var(--surface);border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--text2)">
        Image<br>图像描述<br>10 B
      </div>
      <div style="flex:none;padding:5px 10px;background:var(--surface);border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--accent)">
        LCT<br>局部调色板<br>可选
      </div>
      <div style="flex:none;padding:5px 12px;background:#fcf9f0;border:0.5px solid #c8c5bf;border-left:none;text-align:center;color:var(--warn)">
        LZW<br>子块流<br>可变
      </div>
      <div style="flex:none;padding:5px 10px;background:var(--danger-bg);border:0.5px solid var(--danger);border-left:none;border-radius:0 6px 6px 0;text-align:center;color:var(--danger);font-weight:500">
        0x3B<br>结束<br>1 B
      </div>
    </div>
    <div style="margin-top:6px;font-size:10px;color:var(--text3);line-height:1.8">
      <span class="tag tag-info">多帧</span> 每帧 = GCE + Image + LCT(可选) + LZW数据 · 结束符 <code>0x3B</code> 标识文件结束
    </div>
  </div>

  <!-- ══ 子面板①②③连贯展示：LSD + 调色板 ══ -->
  <div class="two-col">
    <!-- ② LSD -->
    <div class="viz-card">
      <div class="viz-card-title">② 逻辑屏幕描述符（LSD — 7 字节）</div>
      <div style="margin-bottom:8px;font-size:10px;color:var(--text2)">
        定义动画画布尺寸、是否包含 GCT 及颜色深度
      </div>
      ${gifLsdTable()}
      <div id="pg-lsd-info" style="margin-top:8px;font-size:10px;color:var(--text2);line-height:1.8"></div>
    </div>

    <!-- ③ 调色板 -->
    <div class="viz-card">
      <div class="viz-card-title">③ 调色板系统（全局 vs 局部）</div>
      <div id="pg-pal-info" style="font-size:10px;color:var(--text2);line-height:1.7;margin-bottom:8px"></div>
      <div class="param-row">
        <span class="param-label">选择 GCT 颜色数</span>
        <select id="pg-gct-size" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pgUpdate()">
          <option value="2">2 色</option><option value="4">4 色</option><option value="8">8 色</option>
          <option value="16">16 色</option><option value="32">32 色</option><option value="64">64 色</option>
          <option value="128">128 色</option><option value="256" selected>256 色</option>
        </select>
      </div>
      <div id="pg-pal-viz" style="margin-top:6px"></div>
    </div>
  </div>

  <!-- ══ 子面板④：LZW 解压流程 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">④ LZW 解压流程（GIF 变体）</div>
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="flex:1;font-size:10px;color:var(--text2);line-height:1.9">
        <strong>子块结构</strong>：<span class="hl">1 字节 size</span> + size 字节数据，重复直到 size=0
        <div id="pg-lzw-blocks" style="margin:6px 0;display:flex;gap:3px;flex-wrap:wrap"></div>
        <strong>LZW 码流</strong>：子块数据拼接 → 变长编码流
        <div style="margin-top:6px;font-size:10px;line-height:2">
          <div>· LZW 最小码长 = <span class="hl">LZW Minimum Code Size</span>（1 字节，位于图像数据首字节）</div>
          <div>· 初始码长 = 最小码长 + 1</div>
          <div>· <span class="hl-o">Clear Code</span> = 2<sup>初始码长-1</sup>：重置字典</div>
          <div>· <span class="hl-o">EOI Code</span> = Clear + 1：数据结束</div>
          <div>· 解码过程中，当字典达到当前码长最大值时，<span class="hl">码长+1</span>（最大 12 位）</div>
        </div>
      </div>
      <div style="flex:1;min-width:260px">
        <div class="formula-box" style="font-size:10px;line-height:1.8;margin-bottom:0">
<span style="color:var(--accent)">字典构建过程</span>
<span style="color:var(--text3)">初始字典: 0..(Clear-1)=原始色</span>
<span style="color:var(--text3)">         Clear=字典重置</span>
<span style="color:var(--text3)">         EOI=流结束</span>

<span class="hl">读码</span> → 查字典 → 输出字符串
         → 上一输出+当前首字符
         → 加入字典 <span style="color:var(--text3)">(新条目)</span>

<span style="color:var(--text3)">示例: 输入码 [1,1,1,Clear,2,2,2,EOI]</span>
 字典: <span class="hl">4:'1 1'</span>, <span class="hl">5:'1 1 1'</span>, Clear重置
       <span class="hl">4:'2 2'</span>, <span class="hl">5:'2 2 2'</span>
 输出: 1, 1, 1, 1, 2, 2, 2, 2
        </div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑤⑥：图像描述符 + 帧像素映射 ══ -->
  <div class="two-col">
    <!-- ⑤ 图像描述符 -->
    <div class="viz-card">
      <div class="viz-card-title">⑤ 图像描述符解析</div>
      <div style="margin-bottom:6px;font-size:10px;color:var(--text2)">
        定位当前帧在画布上的位置与大小
      </div>
      ${gifImageDescTable()}
      <div id="pg-img-info" style="margin-top:8px;font-size:10px;color:var(--text2);line-height:1.8"></div>
      <div style="margin-top:8px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:10px;color:var(--text2);line-height:1.7">
        <strong>交错扫描（Interlace）</strong><br>
        <span class="hl">Pass 1</span>：第 0 行起，每隔 8 行（0,8,16,...）<br>
        <span class="hl">Pass 2</span>：第 4 行起，每隔 8 行（4,12,20,...）<br>
        <span class="hl">Pass 3</span>：第 2 行起，每隔 4 行（2,6,10,...）<br>
        <span class="hl">Pass 4</span>：第 1 行起，每隔 2 行（1,3,5,...）<br>
        <span style="color:var(--text3)">渐进式显示，让用户先看到模糊轮廓再逐步清晰</span>
      </div>
    </div>

    <!-- ⑥ GCE + 像素映射 -->
    <div class="viz-card">
      <div class="viz-card-title">⑥ 帧控制与像素映射</div>
      <div style="margin-bottom:6px;font-size:10px;color:var(--text2);line-height:1.7">
        <strong>图形控制扩展（GCE — 8 字节）</strong>
      </div>
      ${gceTable()}
      <div id="pg-gce-info" style="font-size:10px;color:var(--text2);line-height:1.8;margin-top:6px"></div>
      <div style="margin-top:8px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:10px;color:var(--text2);line-height:1.7">
        <strong>像素重建</strong>：索引 → 调色板 → RGB<br>
        <span class="tag tag-warn">透明</span> 当像素索引等于透明色索引时，保留上一帧像素<br>
        <span class="tag tag-info">Disposal</span> 控制绘制下一帧前如何处理当前帧
      </div>
      <div id="pg-pixel-map-viz" style="margin-top:8px"></div>
    </div>
  </div>

  <!-- ══ 子面板⑦：输出确认 + Python 片段 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑦ 输出确认：多帧 RGBA 像素</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        经过以上步骤，得到 <span class="hl">N 帧</span> 像素数据：<br>
        · 每帧：画布尺寸 <strong id="pg-out-w">640</strong> × <strong id="pg-out-h">480</strong><br>
        · 每像素：<strong>R、G、B、A</strong> 四通道，各 8 位<br>
        · Alpha 通道：透明色 = 0，不透明 = 255<br>
        · 动画参数：帧延迟、Disposal Method<br>
        · 数据类型：<code>uint8[N][H][W][4]</code><br>
        <span class="tag tag-ok" style="margin-left:0">✓ 就绪，可进入下一步</span>
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#eaf3de;border-radius:6px;border:0.5px solid #97C459;font-size:11px;color:var(--success);line-height:1.8">
        每帧内存 = <span id="pg-out-mem">--</span><br>
        下一步将送入 <strong>颜色量化（如需 >256 色源图 → GIF）</strong>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python 完整实现片段</div>
      <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image, ImageSequence
<span class="hl">import</span> numpy <span class="hl">as</span> np

<span class="hl">def</span> parse_gif(filepath):
    img = Image.open(filepath)
    frames = []
    durations = []
    <span class="hl">for</span> frame <span class="hl">in</span> ImageSequence.Iterator(img):
        <span style="color:var(--text3)"># 转为 RGBA numpy 数组</span>
        arr = np.array(frame.convert(<span class="hl-g">'RGBA'</span>))
        frames.append(arr)
        <span style="color:var(--text3)"># 获取帧延迟（毫秒）</span>
        dur = frame.info.get(<span class="hl-g">'duration'</span>, 100)
        durations.append(dur)

    <span style="color:var(--text3)"># frames: list of (H,W,4) uint8</span>
    <span style="color:var(--text3)"># durations: list of int (ms)</span>
    w, h = img.size
    <span class="hl">return</span> {
        <span class="hl-g">'frames'</span>: np.stack(frames),  <span style="color:var(--text3)"># (N,H,W,4)</span>
        <span class="hl-g">'durations'</span>: durations,
        <span class="hl-g">'width'</span>: w, <span class="hl-g">'height'</span>: h,
        <span class="hl-g">'loop_count'</span>: img.info.get(<span class="hl-g">'loop'</span>, 0)
    }</div>
    </div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.pgUpdate = function(){
    const gctSize = +document.getElementById('pg-gct-size').value;
    const canvasW = 640, canvasH = 480;

    // ② LSD 信息
    const gctFlag = 1;
    const colorRes = 7; // 8 bits per channel
    const gctBytes = gctSize * 3;
    const computedSize = 1 << Math.ceil(Math.log2(gctSize));
    const packedByte = (gctFlag << 7) | ((colorRes-1) << 4) | (0 << 3) | (Math.log2(gctSize)-1);

    document.getElementById('pg-lsd-info').innerHTML = `
      Canvas = <span class="hl">${canvasW} × ${canvasH}</span>（逻辑屏幕）<br>
      Packed = <span class="hl">0x${packedByte.toString(16).toUpperCase().padStart(2,'0')}</span>
        → GCT 有 <span class="tag tag-ok">✓</span> · 色深 = ${colorRes}bit · 排序 = 否<br>
      GCT 大小 = <span class="hl">${gctSize}</span> 色 · 占用 <span class="hl">${gctBytes}</span> B（${gctSize} × 3 RGB）<br>
      bgColorIndex = <span class="hl">0</span>（背景色为调色板第 0 项）<br>
      PixelAspectRatio = <span class="hl">0</span>（不指定，使用 1:1）`;

    // ③ 调色板可视化
    const palEl = document.getElementById('pg-pal-info');
    const vizEl = document.getElementById('pg-pal-viz');
    palEl.innerHTML = `GCT 共 <span class="hl">${gctSize}</span> 色，每色 <span class="hl">3 字节 RGB</span><br>
      全局调色板 = 图像描述符未指定 LCT 时使用<br>
      <span class="tag tag-warn">局部调色板</span> = Image Descriptor packed bit 7 决定`;
    const colsPerRow = 16;
    const showRows = Math.min(gctSize, 256);
    const paletteCols = Array.from({length:Math.min(gctSize,256)}, (_,i)=>{
      const h = (i * 360 / gctSize) | 0;
      const s = 0.7 + (i % 3) * 0.1;
      const l = 0.25 + (i % 5) * 0.14;
      const c = hslToRgb(h, s, l);
      return `<div style="height:16px;background:rgb(${c[0]},${c[1]},${c[2]});border-radius:2px;position:relative" title="#${i}: rgb(${c[0]},${c[1]},${c[2]})"><span style="position:absolute;bottom:0;right:1px;font-size:6px;color:${(c[0]+c[1]+c[2])>380?'#222':'#fff'}">${i}</span></div>`;
    });
    vizEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${Math.min(colsPerRow,gctSize)},1fr);gap:2px">${paletteCols.join('')}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:4px">全局调色板预览（${gctSize} 色 — 色相渐变示意）</div>`;

    // ④ LZW 子块结构
    const blockEl = document.getElementById('pg-lzw-blocks');
    const subBlocks = [
      {size: 255, color: '#e8f0fb'}, {size: 255, color: '#e0eaf5'},
      {size: 200, color: '#d9e3ef'}, {size: 255, color: '#d2dde9'},
      {size: 128, color: '#cbd7e3'}, {size: 0, color: '#fcebeb', isEnd: true}
    ];
    blockEl.innerHTML = subBlocks.map(b =>
      `<div style="flex:none;width:${Math.max(16,Math.min(50,b.size/8))}px;height:22px;background:${b.color};border:0.5px solid ${b.isEnd?'var(--danger)':'var(--accent)'};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:7px;${b.isEnd?'font-weight:600;color:var(--danger)':'color:var(--accent)'}">${b.size===0?'0=END':b.size}</div>`
    ).join('');

    // ⑤ 图像描述符
    document.getElementById('pg-img-info').innerHTML = `
      Image Left/Top = <span class="hl">(0, 0)</span>（画布左上角）<br>
      Image Width/Height = <span class="hl">${canvasW} × ${canvasH}</span>（与画布同大）<br>
      Packed byte = LCT <span class="tag tag-info">无</span> · Interlace <span class="tag tag-info">否</span><br>
      此例使用 <span class="hl">全局调色板</span> 解码`;

    // ⑥ GCE + 像素映射
    document.getElementById('pg-gce-info').innerHTML = `
      Transparent Color Flag = <span class="hl">1</span>（有透明色）<br>
      Transparent Index = <span class="hl">0</span>（调色板第 0 项透明）<br>
      Delay Time = <span class="hl">10</span>（×10ms = 100ms）→ 约 10 FPS<br>
      Disposal Method = <span class="hl">2</span>（恢复到背景色）`;

    // 像素映射可视化：展示 6×4 网格，调色板索引 → RGB
    const gridW = 6, gridH = 4;
    const pixelViz = document.getElementById('pg-pixel-map-viz');
    const pixCells = [];
    for(let y=0; y<gridH; y++){
      for(let x=0; x<gridW; x++){
        const idx = (x + y * gridW) % gctSize;
        const hue = (idx * 360 / gctSize) | 0;
        const rgb = hslToRgb(hue, 0.65 + (idx%3)*0.1, 0.3 + (idx%5)*0.12);
        pixCells.push(`<div style="height:20px;background:rgb(${rgb[0]},${rgb[1]},${rgb[2]});border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:7px;color:${(rgb[0]+rgb[1]+rgb[2])>380?'#222':'#fff'}">${idx}</div>`);
      }
    }
    pixelViz.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${gridW},1fr);gap:2px;margin-bottom:4px">${pixCells.join('')}</div>
      <div style="font-size:9px;color:var(--text3)">像素网格：每个格显示调色板索引（→查找 RGB）</div>`;

    // ⑦ 输出
    document.getElementById('pg-out-w').textContent = canvasW;
    document.getElementById('pg-out-h').textContent = canvasH;
    const memPerFrame = (canvasW * canvasH * 4 / 1024).toFixed(1);
    document.getElementById('pg-out-mem').textContent = `${memPerFrame} KB（RGBA uint8，单帧）`;
  };

  pgUpdate();
});

// ─── 辅助：HSL → RGB ───
function hslToRgb(h, s, l){
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if(h < 60) { r = c; g = x; b = 0; }
  else if(h < 120) { r = x; g = c; b = 0; }
  else if(h < 180) { r = 0; g = c; b = x; }
  else if(h < 240) { r = 0; g = x; b = c; }
  else if(h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [(r+m)*255|0, (g+m)*255|0, (b+m)*255|0];
}

// ─── 辅助：生成 LSD 表格 ───
function gifLsdTable(){
  const fields = [
    ['0x00','2','canvasWidth','逻辑屏幕宽度','UINT16 LE'],
    ['0x02','2','canvasHeight','逻辑屏幕高度','UINT16 LE'],
    ['0x04','1','packed','bit7:GCTflag bit6-4:colorRes bit3:sort bit2-0:GCTsize','UINT8'],
    ['0x05','1','bgColorIndex','背景色索引（GCT 中的索引）','UINT8'],
    ['0x06','1','pixelAspectRatio','像素宽高比（0=未指定）','UINT8'],
  ];
  return fieldTable(fields);
}

// ─── 辅助：生成图像描述符表格 ───
function gifImageDescTable(){
  const fields = [
    ['0x00','1','separator','图像分隔符 = 0x2C', 'UINT8'],
    ['0x01','2','left','图像距离画布左边缘','UINT16 LE'],
    ['0x03','2','top','图像距离画布顶边缘','UINT16 LE'],
    ['0x05','2','width','图像宽度','UINT16 LE'],
    ['0x07','2','height','图像高度','UINT16 LE'],
    ['0x09','1','packed','bit7:LCTflag bit6:interlace bit5:sort bit4-3:reserved bit2-0:LCTsize','UINT8'],
  ];
  return fieldTable(fields);
}

// ─── 辅助：生成 GCE 表格 ───
function gceTable(){
  const fields = [
    ['0x00','1','extIntroducer','扩展引入符 = 0x21','UINT8'],
    ['0x01','1','gceLabel','GCE 标签 = 0xF9','UINT8'],
    ['0x02','1','blockSize','块大小 = 4','UINT8'],
    ['0x03','1','packed','bit3-5:disposal bit2:userInput bit1:transparent bit0:reserved','UINT8'],
    ['0x04','2','delayTime','帧延迟（×10ms）','UINT16 LE'],
    ['0x06','1','transpIdx','透明色索引','UINT8'],
    ['0x07','1','blockTerm','块终止符 = 0x00','UINT8'],
  ];
  return fieldTable(fields);
}

// ─── 通用字段表格 ───
function fieldTable(fields){
  return `
    <table class="byte-table">
      <thead><tr><th>偏移</th><th>大小</th><th>字段名</th><th>含义</th><th>类型</th></tr></thead>
      <tbody>${fields.map(f=>`
        <tr>
          <td><code>${f[0]}</code></td>
          <td style="text-align:center">${f[1]} B</td>
          <td><code style="color:var(--accent);font-weight:500">${f[2]}</code></td>
          <td style="font-size:10px">${f[3]}</td>
          <td style="font-size:10px;color:var(--text3)">${f[4]}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
