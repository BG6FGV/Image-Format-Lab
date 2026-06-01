/**
 * formats/tiff/parse.js — TIFF 解析（7 个子面板深度展示）
 * 注册为 parseTIFF 步骤渲染器
 */
REGISTER_RENDERER('parseTIFF', function(container){
  container.innerHTML = `
  <div class="detail-badge">解析 TIFF</div>
  <div class="detail-title">解析 TIFF 文件：字节序 → IFD → 条带/瓦片 → 解压 → 像素</div>
  <div class="detail-desc">
    TIFF（Tagged Image File Format）以 <span class="hl">IFD（Image File Directory）</span> 为核心，
    每个 IFD 条目由 12 字节 tag-type-count-value 构成。像素组织方式分
    <span class="hl">条带（Strip）</span> 和 <span class="hl">瓦片（Tile）</span> 两种。
    支持多种压缩和无损/有损编码。
    <a class="adv-link" onclick="openAdvanced('TIFF 核心标签表','<div class=formula-box>Baseline 标签：<br>256 ImageWidth · 257 ImageLength · 258 BitsPerSample<br>259 Compression · 262 PhotometricInterpretation<br>273 StripOffsets · 274 SamplesPerPixel<br>278 RowsPerStrip · 279 StripByteCounts<br>282 XResolution · 283 YResolution · 296 ResolutionUnit<br><br>扩展标签：<br>284 PlanarConfiguration · 277 SamplesPerPixel<br>317 Predictor · 338 ExtraSamples · 339 SampleFormat<br>346 Indexed (调色板) 等</div>')">[查看所有 TIFF 标签]</a>
  </div>

  <!-- ══ 子面板①：文件头与字节序 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① TIFF 文件头与字节序</div>
      <table class="byte-table">
        <thead><tr><th>偏移</th><th>大小</th><th>字段名</th><th>含义</th><th>值</th></tr></thead>
        <tbody>
          <tr><td><code>0x00</code></td><td style="text-align:center">2 B</td><td><code style="color:var(--accent)">ByteOrder</code></td><td>字节序标识</td><td><span class="hl">0x4949</span> (LE) 或 <span class="hl">0x4D4D</span> (BE)</td></tr>
          <tr><td><code>0x02</code></td><td style="text-align:center">2 B</td><td><code style="color:var(--accent)">Magic</code></td><td>魔数</td><td>固定 <span class="hl">42</span> (0x002A)</td></tr>
          <tr><td><code>0x04</code></td><td style="text-align:center">4 B</td><td><code style="color:var(--accent)">IFDOffset</code></td><td>首个 IFD 偏移</td><td>指向首个 IFD 表</td></tr>
        </tbody>
      </table>
      <div style="margin-top:8px;font-size:11px;color:var(--text2)">
        <strong>II (0x4949) = Intel 小端：</strong>数值低位在前 → <code>&lt;I</code><br>
        <strong>MM (0x4D4D) = Motorola 大端：</strong>数值高位在前 → <code>&gt;I</code><br>
        通过前 2 字节即可确定所有后续多字节数据的解析方式
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">交互参数</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pt-w" min="64" max="4096" step="64" value="1024" oninput="ptUpdate()"><span class="param-val" id="pt-w-v">1024</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pt-h" min="64" max="4096" step="64" value="768" oninput="ptUpdate()"><span class="param-val" id="pt-h-v">768</span></div>
      <div class="param-row"><span class="param-label">字节序</span>
        <select id="pt-byteorder" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="ptUpdate()">
          <option value="le" selected>II — 小端 (Intel)</option>
          <option value="be">MM — 大端 (Motorola)</option>
        </select>
      </div>
    </div>
  </div>

  <!-- ══ 子面板②：IFD 目录结构 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">② IFD 目录结构 — Each Entry = 12 B</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:8px">
      <strong>IFD 结构：</strong>
      2B 条目数 → N × 12B 条目 → 4B 下一 IFD 偏移（0=结束）<br>
      每个 <strong>12B 条目</strong> 包括：<span class="hl">Tag 2B</span> + <span class="hl">Type 2B</span> + <span class="hl">Count 4B</span> + <span class="hl">Value/Offset 4B</span>
    </div>
    <table class="byte-table">
      <thead><tr><th>Tag ID</th><th>Name</th><th>Type</th><th>说明</th></tr></thead>
      <tbody>
        ${[
          ['254 (0x00FE)','NewSubfileType','LONG','子文件类型：0=全分辨率，1=缩略图，2=多页'],
          ['256 (0x0100)','ImageWidth','SHORT/LONG','图像宽度（像素列数）'],
          ['257 (0x0101)','ImageLength','SHORT/LONG','图像高度（像素行数）'],
          ['258 (0x0102)','BitsPerSample','SHORT[N]','每通道位数，N = SamplesPerPixel'],
          ['259 (0x0103)','Compression','SHORT','1=无压缩，2=CCITT，3/4=FAX，5=LZW，7=JPEG，32773=PackBits，32946=Deflate'],
          ['262 (0x0106)','Photometric','SHORT','0=WhiteIsZero，1=BlackIsZero，2=RGB，3=Palette，5=CMYK，6=YCbCr'],
          ['273 (0x0111)','StripOffsets','SHORT/LONG[N]','各条带数据偏移数组'],
          ['278 (0x0116)','RowsPerStrip','SHORT/LONG','每条带行数'],
          ['279 (0x0117)','StripByteCounts','SHORT/LONG[N]','各条带字节数数组'],
          ['282 (0x011A)','XResolution','RATIONAL','水平 DPI'],
          ['283 (0x011B)','YResolution','RATIONAL','垂直 DPI'],
          ['284 (0x011C)','PlanarConfig','SHORT','1=Chunky(交错)，2=Planar(平面分离)'],
          ['296 (0x0128)','ResolutionUnit','SHORT','1=无，2=英寸，3=厘米'],
          ['322 (0x0142)','TileWidth','SHORT/LONG','瓦片宽度'],
          ['323 (0x0143)','TileLength','SHORT/LONG','瓦片高度'],
          ['324 (0x0144)','TileOffsets','LONG[N]','各瓦片偏移数组'],
          ['325 (0x0145)','TileByteCounts','SHORT/LONG[N]','各瓦片字节数数组'],
        ].map(([tag,name,type,desc])=>`
          <tr>
            <td><code style="font-size:10px">${tag}</code></td>
            <td><code style="color:var(--accent);font-weight:500">${name}</code></td>
            <td style="font-size:10px;color:var(--text3)">${type}</td>
            <td style="font-size:10px;color:var(--text2)">${desc}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ══ 子面板③：条带 vs 瓦片 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">③ 条带 (Strip) 组织</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <strong>定义：</strong>图像被切分为 <span class="hl">N 个水平条带</span><br>
        <strong>关键字段：</strong><br>
        · <code>RowsPerStrip</code> — 每条带行数<br>
        · <code>StripOffsets[N]</code> — 每条带文件内偏移<br>
        · <code>StripByteCounts[N]</code> — 每条带字节数<br>
        <br>
        <strong>条带数 N = </strong>
        <span class="hl">ceil(ImageLength / RowsPerStrip)</span><br>
        <br>
        <strong>优势：</strong>可逐条解压，节省内存<br>
        <strong>劣势：</strong>需完整读条带才能访问内行
      </div>
      <div id="pt-strip-viz" style="margin-top:8px"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">③ 瓦片 (Tile) 组织</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <strong>定义：</strong>图像被切分为 <span class="hl">M×N 个矩形瓦片</span><br>
        <strong>关键字段：</strong><br>
        · <code>TileWidth × TileLength</code> — 瓦片尺寸<br>
        · <code>TileOffsets[M*N]</code> — 每瓦片偏移<br>
        · <code>TileByteCounts[M*N]</code> — 每瓦片字节数<br>
        <br>
        <strong>瓦片列数 = </strong>
        <span class="hl">ceil(ImageWidth / TileWidth)</span><br>
        <strong>瓦片行数 = </strong>
        <span class="hl">ceil(ImageLength / TileLength)</span><br>
        <strong>优势：</strong>任意区域随机访问，边角瓦片可含填充
      </div>
      <div id="pt-tile-viz" style="margin-top:8px"></div>
    </div>
  </div>

  <!-- ══ 子面板④：压缩类型解压 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">④ 压缩类型解压</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px">
      ${[
        ['<strong>1 — None/Raw</strong>','直接按字节序取像素，无任何解压。Chunky: RGBA交错；Planar: 每个通道独立连续','<span class="tag tag-ok">最快</span>'],
        ['<strong>32773 — PackBits (RLE)</strong>','Apple 行程编码。控制字节 N：≥0 重复 N+1 次下个字节；&lt;0 原样拷贝 -N+1 字节；-128=填充','<span class="tag tag-warn">简单</span>'],
        ['<strong>5 — LZW</strong>','Lempel-Ziv-Welch。变长码至 12 bits。逐条带独立压缩，Clear/End 码重置词典','<span class="tag tag-warn">中等</span>'],
        ['<strong>32946 — Deflate/ZIP</strong>','标准 zlib 压缩（deflate 算法）。逐条带独立，需 zlib 头/尾','<span class="tag tag-warn">中等</span>'],
        ['<strong>7 — JPEG-in-TIFF</strong>','单条带存放完整 JPEG 比特流。TIFF 标签只提供元信息，像素解码完全由 JPEG 解码器完成','<span class="tag tag-err">复杂</span>'],
        ['<strong>34712 — JPEG2000</strong>','JPEG 2000 压缩。需 J2K 解码器','<span class="tag tag-err">罕见</span>'],
      ].map(([h,desc,tag])=>`
        <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
          <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">${h} ${tag}</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.6">${desc}</div>
        </div>`).join('')}
    </div>
  </div>

  <!-- ══ 子面板⑤：像素格式映射 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">⑤ 像素格式映射 — PhotometricInterpretation</div>
    <table class="byte-table">
      <thead><tr><th>值</th><th>名称</th><th>通道数</th><th>RGB 映射方式</th></tr></thead>
      <tbody>
        ${[
          ['0','WhiteIsZero','1','RGB = (255 - 样值) × 3 → 灰度'],
          ['1','BlackIsZero','1','RGB = 样值 × 3 → 灰度'],
          ['2','RGB','3','直接 Red Green Blue'],
          ['3','Palette Color','1','样值为调色板索引 → 查 ColorMap (tag 320)'],
          ['4','Transparency Mask','1','样值 = Alpha/透明度掩码'],
          ['5','Separated (CMYK)','4','CMYK → CMY = 1-K → RGB 转换；含 InkSet 标签'],
          ['6','YCbCr','3','Y, Cb, Cr → RGB 矩阵变换 (BT.601 / BT.709)'],
          ['8','CIELab','3','CIE L*a*b* → XYZ → sRGB 转换'],
        ].map(([v,name,ch,desc])=>`
          <tr>
            <td style="text-align:center"><code>${v}</code></td>
            <td><code style="color:var(--accent);font-weight:500">${name}</code></td>
            <td style="text-align:center"><span class="hl">${ch}</span></td>
            <td style="font-size:10px;color:var(--text2)">${desc}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:8px;font-size:10px;color:var(--text3)">
      ExtraSamples (tag 338): 0=未指定，1=关联Alpha，2=非关联Alpha — 用于 RGBA 5/6通道
    </div>
  </div>

  <!-- ══ 子面板⑥：大文件支持 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑥ 大文件支持 — BigTIFF</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <strong>标准 TIFF 局限：</strong>32 位偏移 → 文件 ≤ <span class="hl">4 GB</span><br>
        <br>
        <strong>BigTIFF 差异：</strong><br>
        · 字节序后魔法值 = <span class="hl">43</span>（不是 42）<br>
        · 偏移字节数 = <span class="hl">8</span>（从 4B 扩展为 8B 偏移）<br>
        · 保留字节 = <span class="hl">0</span>（后续字段为 0）<br>
        · 文件头 = 2 + 2 + 2 + 2 + 8 + 0 = <span class="hl">16 B</span><br>
        · 文件上限：<span class="hl">2^64 ≈ 16 Exabyte</span><br>
        <br>
        <strong>SubIFDs（tag 330）：</strong>主 IFD 内可嵌套子 IFD 目录，
        用于缩略图、多分辨率、多页等
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">TIFF 头部对比</div>
      <table class="byte-table">
        <thead><tr><th>字段</th><th>标准 TIFF</th><th>BigTIFF</th></tr></thead>
        <tbody>
          <tr><td>ByteOrder</td><td>2B (II/MM)</td><td>2B (II/MM)</td></tr>
          <tr><td>Magic</td><td><span class="hl">42</span> (2B)</td><td><span class="hl">43</span> (2B)</td></tr>
          <tr><td>OffsetSize</td><td>—</td><td><span class="hl">8</span> (2B)</td></tr>
          <tr><td>Reserved</td><td>—</td><td><span class="hl">0</span> (2B)</td></tr>
          <tr><td>IFDOffset</td><td>4B</td><td><span class="hl">8B</span></td></tr>
          <tr><td>最大文件</td><td>~4 GB</td><td>~16 EB</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ 子面板⑦：Python 片段 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑦ 输出确认：RGB(A) 像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        经 IFD 解析、条带定位、解压、像素映射后：<br>
        · 图像尺寸：<span id="pt-out-size">--</span><br>
        · 通道数：<span id="pt-out-ch">--</span><br>
        · 子文件数：<span class="hl">由 SubIFD/多页决定</span><br>
        <span class="tag tag-ok" style="margin-left:0">✓ TIFF 解析完成</span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python 完整实现片段</div>
      <div class="formula-box"><span class="hl">import</span> struct, numpy <span class="hl">as</span> np

<span class="hl">def</span> parse_tiff(filepath):
    <span class="hl">with</span> open(filepath, <span class="hl-g">'rb'</span>) <span class="hl">as</span> f:
        <span style="color:var(--text3)"># ① 字节序</span>
        bo = f.read(2)
        fmt = <span class="hl-g">'&lt;'</span> <span class="hl">if</span> bo == <span class="hl-g">b'II'</span> <span class="hl">else</span> <span class="hl-g">'&gt;'</span>
        magic = struct.unpack(fmt+<span class="hl-g">'H'</span>, f.read(2))[0]
        <span class="hl">assert</span> magic == 42

        <span style="color:var(--text3)"># ② 首个 IFD 偏移</span>
        ifd_off = struct.unpack(fmt+<span class="hl-g">'I'</span>, f.read(4))[0]
        tags = read_ifd(f, fmt, ifd_off)

        <span style="color:var(--text3)"># ③ 解析关键标签</span>
        w = tags[256]; h = tags[257]
        comp = tags.get(259, 1)
        photo = tags.get(262, 1)
        bps = tags[258]; spp = len(bps)

        <span style="color:var(--text3)"># ④ 读取条带</span>
        rows_per = tags[278]
        offsets = tags[273]; bcnts = tags[279]
        buf = <span class="hl-g">b''</span>
        <span class="hl">for</span> off, sz <span class="hl">in</span> zip(offsets, bcnts):
            f.seek(off)
            buf += decompress(f.read(sz), comp)

        <span style="color:var(--text3)"># ⑤ 构建像素矩阵</span>
        arr = np.frombuffer(buf, np.uint8)
        <span class="hl">return</span> arr.reshape(h, w, spp)</div>
    </div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.ptUpdate = function(){
    const w = +document.getElementById('pt-w').value;
    const h = +document.getElementById('pt-h').value;
    document.getElementById('pt-w-v').textContent = w;
    document.getElementById('pt-h-v').textContent = h;

    // 条带可视化
    const rowsPer = Math.max(1, Math.ceil(h / Math.ceil(h / 128)));
    const nStrips = Math.ceil(h / rowsPer);
    const stripViz = document.getElementById('pt-strip-viz');
    if(stripViz) stripViz.innerHTML = Array.from({length: Math.min(nStrips, 8)}, (_,i)=>{
      const sh = (i===Math.min(nStrips,8)-1 && nStrips>8) ? '...' : rowsPer;
      return `<div style="height:${Math.min(14, 100/nStrips)}px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--accent);margin-bottom:1px">${typeof sh==='string'?sh:`Strip ${i} (${sh}行)`}</div>`;
    }).join('') + `<div style="font-size:10px;color:var(--text3);margin-top:4px">${nStrips} 条带 × ~${rowsPer} 行/条带（ceil(${h}/${rowsPer})）</div>`;

    // 瓦片可视化
    const tileW = Math.min(w, 256);
    const tileH = Math.min(h, 256);
    const cols = Math.ceil(w/tileW);
    const rows = Math.ceil(h/tileH);
    const tileViz = document.getElementById('pt-tile-viz');
    if(tileViz) tileViz.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${Math.min(cols,6)},1fr);gap:2px">`+
      Array.from({length: Math.min(cols*rows, 18)},(_,idx)=>{
        const r = Math.floor(idx/cols), c = idx % cols;
        return `<div style="height:18px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:7px;color:var(--accent)">${r},${c}</div>`;
      }).join('') + `</div><div style="font-size:10px;color:var(--text3);margin-top:4px">${cols}×${rows} 瓦片，每瓦片 ${tileW}×${tileH} px</div>`;

    // 输出
    const outSize = document.getElementById('pt-out-size');
    const outCh = document.getElementById('pt-out-ch');
    if(outSize) outSize.textContent = `${w} × ${h} = ${(w*h).toLocaleString()} 像素`;
    if(outCh) outCh.textContent = '3 (RGB) 或 4 (RGBA)，由 SamplesPerPixel 决定';
  };
  ptUpdate();
});
