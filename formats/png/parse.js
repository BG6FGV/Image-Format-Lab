/**
 * formats/png/parse.js — PNG 文件解析（7个子步骤深度展示）
 * 注册为 parsePNG 步骤渲染器
 */

REGISTER_RENDERER('parsePNG', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 PNG 文件，逐层解码像素</div>
  <div class="detail-desc">
    PNG（Portable Network Graphics）是无损压缩位图格式，基于<span class="hl">块（Chunk）</span>结构组织数据。
    解码流程：验证签名 → 解析 IHDR → 串联 IDAT → zlib/Deflate 解压 → 逐行反滤波 → 组装 RGBA 像素。
    关键特性：<span class="hl">行级自适应滤波</span>提高压缩率、<span class="hl">CRC32 校验</span>保证块完整性、<span class="hl">Adam7 隔行扫描</span>支持渐进显示。
  </div>

  <!-- ══ 子面板①②：PNG 整体结构 + 交互参数 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① PNG 文件结构总览</div>
      <div id="png-struct-viz" style="font-family:'Courier New',monospace;font-size:10px;line-height:2.6">
        <div style="display:flex;gap:0">
          <div style="flex:none;width:80px;height:42px;background:var(--success-bg);border:0.5px solid #97C459;border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--success);font-weight:500;font-size:9px">PNG签名<br>8 B</div>
          <div style="flex:none;width:80px;height:42px;background:var(--accent-bg);border:0.5px solid var(--accent);border-left:none;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--accent);font-weight:500;font-size:9px">IHDR块<br>头部信息</div>
          <div style="flex:none;width:70px;height:42px;background:#f0efe9;border:0.5px solid #c8c5bf;border-left:none;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--text2);font-size:9px">可选块<br>gAMA等</div>
          <div style="flex:1;height:42px;background:#f7f5f0;border:0.5px solid #c8c5bf;border-left:none;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--text2);font-size:9px">IDAT块（可多个）<br>压缩像素数据</div>
          <div style="flex:none;width:60px;height:42px;background:var(--success-bg);border:0.5px solid #97C459;border-left:none;border-radius:0 4px 4px 0;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3;color:var(--success);font-weight:500;font-size:9px">IEND<br>结束</div>
        </div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--text2);line-height:1.8">
        <strong>Chunk 通用结构</strong>（每个块都是此格式）:<br>
        <div style="display:flex;gap:0;margin:6px 0">
          <div style="flex:none;width:70px;height:22px;background:var(--warn-bg);border:0.5px solid #EF9F27;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--warn);border-radius:4px 0 0 4px">长度 4B</div>
          <div style="flex:none;width:70px;height:22px;background:var(--accent-bg);border:0.5px solid var(--accent);border-left:none;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--accent)">类型 4B</div>
          <div style="flex:1;height:22px;background:var(--surface2);border:0.5px solid var(--border);border-left:none;display:flex;align-items:center;justify-content:center;font-size:9px">数据块 变长</div>
          <div style="flex:none;width:70px;height:22px;background:var(--danger-bg);border:0.5px solid var(--danger);border-left:none;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--danger);border-radius:0 4px 4px 0">CRC32 4B</div>
        </div>
        块类型 ASCII 码区分大小写：大写=关键块（IHDR/IDAT/IEND），小写首位=辅助块（gAMA/cHRM）
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">交互参数（影响以下所有面板计算）</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pp-w" min="8" max="1024" step="8" value="256" oninput="ppUpdate()"><span class="param-val" id="pp-w-v">256</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pp-h" min="8" max="1024" step="8" value="256" oninput="ppUpdate()"><span class="param-val" id="pp-h-v">256</span></div>
      <div class="param-row"><span class="param-label">颜色类型</span>
        <select id="pp-ctype" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="ppUpdate()">
          <option value="0">0 — 灰度（1通道）</option>
          <option value="2" selected>2 — RGB（3通道）</option>
          <option value="3">3 — 索引色（调色板）</option>
          <option value="4">4 — 灰度+Alpha（2通道）</option>
          <option value="6">6 — RGBA（4通道）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">位深度</span>
        <select id="pp-bitd" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="ppUpdate()">
          <option value="8" selected>8 位/通道</option>
          <option value="16">16 位/通道</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">隔行扫描</span>
        <select id="pp-interlace" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="ppUpdate()">
          <option value="0" selected>0 — 无隔行（逐行）</option>
          <option value="1">1 — Adam7 隔行</option>
        </select>
      </div>
    </div>
  </div>

  <!-- ══ 子面板②③：IHDR 详解 + IDAT/Deflate ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② IHDR 头部块详解（13 字节，必须为第一个块）</div>
      ${pngIhdrTable()}
      <div id="pp-ihdr-calc" style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.9"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">③ IDAT 与 Deflate 解压</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        <strong>数据流</strong>：多个 IDAT 块串联 → 去除块头尾 → <span class="hl">zlib 容器</span> → Deflate 解压 → 原始滤波扫描线<br><br>
        <strong>zlib 包装</strong>（在 Deflate 前后各加字段）:<br>
        <div style="display:flex;gap:0;margin:6px 0">
          <div style="flex:none;width:55px;height:20px;background:var(--warn-bg);border:0.5px solid #EF9F27;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--warn);border-radius:4px 0 0 4px">CMF 1B</div>
          <div style="flex:none;width:55px;height:20px;background:var(--warn-bg);border:0.5px solid #EF9F27;border-left:none;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--warn)">FLG 1B</div>
          <div style="flex:1;height:20px;background:var(--accent-bg);border:0.5px solid var(--accent);border-left:none;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--accent)">Deflate 压缩数据</div>
          <div style="flex:none;width:80px;height:20px;background:var(--danger-bg);border:0.5px solid var(--danger);border-left:none;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--danger);border-radius:0 4px 4px 0">Adler32 4B</div>
        </div>
        压缩后单行结构：<span class="tag tag-info">滤波器字节 1B</span> + <span class="tag tag-warn">滤波后像素数据</span><br>
        总行数 = height × 每行字节数（含滤波器标记）
      </div>
      <div id="pp-compress-info" style="margin-top:8px;font-size:11px;color:var(--text2);line-height:1.9;padding:8px 10px;background:var(--surface2);border-radius:6px"></div>
    </div>
  </div>

  <!-- ══ 子面板④⑤：行滤波 + 调色板 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">④ 行滤波逆运算（5 种滤波器）</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:8px">
        PNG 每行第一个字节存储<span class="hl">滤波器类型</span>（0-4），解码时逐行执行逆运算。
        设 <code>Raw[x]</code> 为滤波后字节，<code>Cur[x]</code> 为解码后字节，<code>Above[x]</code> 为上一行解码后字节：
      </div>
      ${[
        ['0','None','Cur[x] = Raw[x]','直接存储，无需逆运算。适用于随机数据或边界行'],
        ['1','Sub','Cur[x] = Raw[x] + Cur[x−1]','与左侧像素差分。对水平渐变（如天空）效果好'],
        ['2','Up','Cur[x] = Raw[x] + Above[x]','与上方像素差分。对垂直渐变效果好'],
        ['3','Average','Cur[x] = Raw[x] + (Cur[x−1]+Above[x])/2','取左右和上方的平均值差分。对平滑区域效果好'],
        ['4','Paeth','Cur[x] = Raw[x] + PaethPredictor(a,b,c)','Paeth 预测器：取左(a)、上(b)、左上(c)三邻域中选出最近似者'],
      ].map(([n,name,formula,desc])=>`
        <div style="display:flex;gap:8px;margin-bottom:6px;padding:7px 8px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
          <div style="flex:none;width:22px;height:22px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent);font-weight:500">${n}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:500;font-size:11px">${name}</div>
            <div class="formula-box" style="margin:3px 0;padding:4px 7px;font-size:10px">${formula}</div>
            <div style="font-size:10px;color:var(--text3)">${desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="viz-card">
      <div class="viz-card-title">⑤ 调色板映射（索引色 colorType=3）</div>
      <div id="pp-pal">
        <div style="font-size:11px;color:var(--text2);line-height:2">
          colorType=3 时，文件必须包含 <span class="hl">PLTE 块</span>，提供 256 色调色板（每项 RGB 3 字节）。
          像素数据存储的是<span class="hl">调色板索引</span>（0-255），解码时查表转为 RGB。
        </div>
        <div id="pp-pal-viz" style="margin-top:8px"></div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">
          PLTE 块长度 768 字节（256×3），若有 tRNS 块，还可增加透明度索引
        </div>
      </div>
      <div id="pp-no-pal" style="display:none">
        <div style="font-size:11px;color:var(--text2);padding:8px 10px;background:var(--surface2);border-radius:6px">
          colorType ≠ 3 → <span class="tag tag-ok">无需调色板</span>，像素直接存储 RGB/RGBA 值
        </div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑥：逐行组装像素 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">⑥ 逐行组装像素 / Adam7 隔行扫描</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:8px">
      反滤波后的数据按行排列，每行格式：<code>[滤波器号, 像素数据...]</code>
      根据 colorType 和 bitDepth 从字节流中提取像素值：
    </div>
    <div id="pp-assemble" style="font-size:11px;color:var(--text2);line-height:2"></div>
    <div id="pp-adam7" style="margin-top:10px;padding:10px 12px;background:var(--surface2);border-radius:6px;display:none">
      <div style="font-size:11px;font-weight:500;margin-bottom:6px;color:var(--text)">Adam7 隔行扫描（7 个 Pass）</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px">
        ${[$td('Pass','#'),$td('起始行','#'),$td('行间隔','#'),$td('起始列/列间隔','#'),
           ...['1','2','3','4','5','6','7'].flatMap(p=>{
            const pIdx=+p-1;
            const sR=[0,0,4,0,2,0,1][pIdx], rS=[8,8,8,4,4,2,2][pIdx];
            const sC=[0,4,0,2,0,1,0][pIdx], cS=[8,8,4,4,2,2,2][pIdx];
            return $td(p,''),$td(sR,''),$td(rS,''),$td(`${sC}/${cS}`,'');
          })
        ].join('')}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.6">
        原理：将图像分为 7 个子图像（Pass），每个 Pass 覆盖全图的 1/64~1/1。
        Pass 1 传输 1/64 像素 → Pass 7 传输 1/2 像素。浏览器渐进式加载时先显示低分辨率版本。
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑦：最终输出 + Python ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑦ 输出确认：RGBA（或 RGB）像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        经过以上步骤，得到内存中的 <span class="hl">width × height</span> 像素矩阵：<br>
        · 通道数：<strong id="pp-out-chan">3</strong>（RGB）<br>
        · 每通道位深：<strong>8</strong> 位（如需 16 位则高位优先）<br>
        · 行序：<strong>从上到下</strong>（PNG 始终正向）<br>
        · 数据类型：<code>uint8[H][W][C]</code><br>
        · 颜色空间：<span class="hl">sRGB</span>（PNG 默认，可附加 iCCP/gAMA/cHRM 块）
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#eaf3de;border-radius:6px;border:0.5px solid #97C459;font-size:11px;color:var(--success);line-height:1.8">
        矩阵大小 = <span id="pp-out-size">--</span><br>
        内存占用 = <span id="pp-out-mem">--</span><br>
        <span class="tag tag-ok" style="margin-left:0">✓ 就绪，可进入下一步</span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python 完整实现片段</div>
      <div class="formula-box"><span class="hl">import</span> zlib, struct
<span class="hl">def</span> parse_png(filepath):
    <span class="hl">with</span> open(filepath, <span class="hl-g">'rb'</span>) <span class="hl">as</span> f:
        <span style="color:var(--text3)"># ① 验证 8 字节 PNG 签名</span>
        sig = f.read(8)
        <span class="hl">assert</span> sig == b<span class="hl-g">'\\x89PNG\\r\\n\\x1a\\n'</span>
        w = h = bitd = ctype = <span class="hl">None</span>
        idat_data = b<span class="hl-g">''</span>;  done = <span class="hl">False</span>

        <span class="hl">while</span> <span class="hl">not</span> done:
            <span style="color:var(--text3)"># ② 读取 Chunk 头</span>
            length = struct.unpack(<span class="hl-g">'>I'</span>, f.read(4))[0]
            ctype4 = f.read(4)
            data   = f.read(length)
            crc    = f.read(4)  <span style="color:var(--text3)"># 可校验 CRC32</span>

            <span class="hl">if</span> ctype4 == b<span class="hl-g">'IHDR'</span>:
                w, h, bitd, ctype, comp, \
                filt, interlace = struct.unpack(<span class="hl-g">'>IIBBBBB'</span>, data)
                <span class="hl">assert</span> comp == 0  <span style="color:var(--text3)"># PNG 压缩方式=0</span>
            <span class="hl">elif</span> ctype4 == b<span class="hl-g">'IDAT'</span>:
                idat_data += data
            <span class="hl">elif</span> ctype4 == b<span class="hl-g">'IEND'</span>:
                done = <span class="hl">True</span>

        <span style="color:var(--text3)"># ③ zlib 解压</span>
        raw = zlib.decompress(idat_data)

        <span style="color:var(--text3)"># ④ 逐行反滤波（简化版）</span>
        chans = {0:1,2:3,3:1,4:2,6:4}[ctype]
        bpp = max(1, chans * bitd // 8)
        stride = w * bpp + 1  <span style="color:var(--text3)"># +1 为滤波器字节</span>
        scanlines = [raw[i:i+stride] <span class="hl">for</span> i <span class="hl">in</span> range(0, len(raw), stride)]

        <span class="hl">import</span> numpy <span class="hl">as</span> np
        pixels = np.zeros((h, w, chans), np.uint8)
        prev = np.zeros((w, chans), np.uint8)

        <span class="hl">for</span> y, sl <span class="hl">in</span> enumerate(scanlines):
            filt = sl[0];  line = sl[1:]
            <span class="hl">for</span> x <span class="hl">in</span> range(w):
                <span class="hl">for</span> c <span class="hl">in</span> range(chans):
                    idx = (x*chans+c)*bitd//8
                    raw_b = line[idx] <span class="hl">if</span> bitd==8 <span class="hl">else</span> struct.unpack(<span class="hl-g">'>H'</span>,line[idx*2:idx*2+2])[0]//256
                    <span class="hl">if</span> filt == 0: pas = 0
                    <span class="hl">elif</span> filt == 1: pas = pixels[y,x-1,c] <span class="hl">if</span> x&gt;0 <span class="hl">else</span> 0
                    <span class="hl">elif</span> filt == 2: pas = prev[x,c]
                    <span class="hl">elif</span> filt == 3: \
    pas = ( (pixels[y,x-1,c] <span class="hl">if</span> x&gt;0 <span class="hl">else</span> 0) + prev[x,c] ) // 2
                    <span class="hl">else</span>:  <span style="color:var(--text3)"># Paeth</span>
                        a=pixels[y,x-1,c] <span class="hl">if</span> x&gt;0 <span class="hl">else</span> 0
                        b=prev[x,c]; c_ul=prev[x-1,c] <span class="hl">if</span> x&gt;0 <span class="hl">else</span> 0
                        p=a+b-c_ul; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c_ul)
                        pas = a <span class="hl">if</span> pa&lt;=pb <span class="hl">and</span> pa&lt;=pc <span class="hl">else</span> (b <span class="hl">if</span> pb&lt;=pc <span class="hl">else</span> c_ul)
                    pixels[y,x,c] = (raw_b + pas) &amp; 0xFF
            prev = pixels[y].copy()

        <span style="color:var(--text3)"># ⑤ 索引色 → RGB 映射（仅 colorType=3）</span>
        <span class="hl">if</span> ctype == 3:
            palette = ...  <span style="color:var(--text3)"># 从 PLTE 块读取</span>
            rgb = palette[pixels[:,:,0]]
            pixels = rgb.reshape(h, w, 3)

        <span class="hl">return</span> pixels  <span style="color:var(--text3)"># uint8[H][W][C]</span></div>
    </div>
  </div>
  `;

  function $td(c,color){return `<div style="font-size:10px;color:${color||'var(--text2)'};text-align:center;padding:3px 4px;background:var(--surface2);border-radius:3px;font-weight:${color?'500':'400'}">${c}</div>`}

  // ─── 交互绑定 ───
  window.ppUpdate = function(){
    const w    = +document.getElementById('pp-w').value;
    const h    = +document.getElementById('pp-h').value;
    const ctype= +document.getElementById('pp-ctype').value;
    const bitd = +document.getElementById('pp-bitd').value;
    const interlace = +document.getElementById('pp-interlace').value;
    document.getElementById('pp-w-v').textContent = w;
    document.getElementById('pp-h-v').textContent = h;

    // 通道数
    const chans = {0:1, 2:3, 3:1, 4:2, 6:4}[ctype];
    const chanNames = {0:'灰度', 2:'RGB', 3:'索引(调色板)', 4:'灰度+Alpha', 6:'RGBA'};
    const bpp = chans * bitd / 8;

    // ② IHDR 计算
    const ctypeNames = {0:'灰度',2:'真彩色',3:'索引色',4:'灰度+Alpha',6:'真彩色+Alpha'};
    document.getElementById('pp-ihdr-calc').innerHTML = `
      Width  = <span class="hl">${w}</span> px （4字节，大端序）<br>
      Height = <span class="hl">${h}</span> px （4字节，大端序）<br>
      Bit Depth = <span class="hl">${bitd}</span> 位/通道<br>
      Color Type = <span class="hl">${ctype}</span>（${ctypeNames[ctype]}）→ ${chans} 通道<br>
      Compression = <span class="hl">0</span>（仅 Deflate 支持）<br>
      Filter = <span class="hl">0</span>（仅自适应滤波支持）<br>
      Interlace = <span class="hl">${interlace}</span>（${interlace===0?'逐行':'Adam7'}）`;

    // ③ 压缩信息
    if(interlace===0){
      const rawRowBytes = 1 + w * chans * (bitd/8);
      const totalRaw = rawRowBytes * h;
      document.getElementById('pp-compress-info').innerHTML = `
        未压缩扫描线总大小 = <strong>${(totalRaw/1024).toFixed(1)}</strong> KB<br>
        每行 = <span class="hl">1B</span>（滤波器） + <span class="hl">${w}×${chans}×(${bitd}/8)=${w*chans*bitd/8}</span> B<br>
        经 Deflate 压缩后大小取决于内容熵值，通常为原始的 30%-70%`;
    } else {
      document.getElementById('pp-compress-info').innerHTML = `
        Adam7 隔行扫描：7 个子图像分别独立滤波和压缩<br>
        每个子图像尺寸递减，Pass 1 仅覆盖 <strong>${Math.ceil(w/8)}×${Math.ceil(h/8)}</strong> 像素区域<br>
        总数据量略大于逐行模式，但支持渐进显示`;
    }

    // ④ 保持静态

    // ⑤ 调色板
    const palEl = document.getElementById('pp-pal');
    const noPalEl = document.getElementById('pp-no-pal');
    const palViz = document.getElementById('pp-pal-viz');
    if(ctype===3){
      palEl.style.display='block'; noPalEl.style.display='none';
      const cols = Array.from({length:16},(_,i)=>{
        const r=(i*37+50)%256, g=(i*73+80)%256, b=(i*113+30)%256;
        return `<div style="height:20px;background:rgb(${r},${g},${b});border-radius:2px;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 3px;font-size:7px;color:rgba(255,255,255,.8)">#${i}</div>`;
      });
      palViz.innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin-bottom:6px">${cols.join('')}</div>
        <div style="font-size:10px;color:var(--text3)">调色板示意（前 16/256 色），像素值为索引号</div>`;
    } else {
      palEl.style.display='none'; noPalEl.style.display='block';
    }

    // ⑥ 组装
    const bytesPerPixel = chans * (bitd/8);
    document.getElementById('pp-assemble').innerHTML = `
      通道数 = <strong>${chans}</strong>（${chanNames[ctype]}）<br>
      每像素 = <strong>${bytesPerPixel}</strong> 字节 = ${chans}通道 × ${bitd/8} 字节<br>
      每行数据 = <strong>1 + ${w*bytesPerPixel}</strong> 字节（含滤波器标记字节）<br>
      输出形状 = <strong>(H=${h}, W=${w}, C=${chans})</strong>`;

    // Adam7 显示
    document.getElementById('pp-adam7').style.display = interlace===1 ? 'block' : 'none';

    // ⑦ 输出
    document.getElementById('pp-out-chan').textContent = chans;
    document.getElementById('pp-out-size').textContent = `${w} × ${h} × ${chans} = ${(w*h*chans).toLocaleString()} 像素值`;
    document.getElementById('pp-out-mem').textContent = `${(w*h*chans*bitd/8/1024/1024).toFixed(2)} MB（uint8/16 无压缩）`;
  };

  ppUpdate();
});

// ─── 辅助：生成 IHDR 表格 ───
function pngIhdrTable(){
  const fields = [
    ['0x00','4','Width','图像宽度（像素）','UINT32 BE'],
    ['0x04','4','Height','图像高度（像素）','UINT32 BE'],
    ['0x08','1','Bit Depth','每通道位数（1/2/4/8/16）','byte'],
    ['0x09','1','Color Type','0=灰度 2=RGB 3=索引 4=灰度A 6=RGBA','byte'],
    ['0x0A','1','Compression','压缩方式，固定为 0（Deflate）','byte'],
    ['0x0B','1','Filter','滤波方式，固定为 0（自适应）','byte'],
    ['0x0C','1','Interlace','0=无隔行 1=Adam7','byte'],
  ];
  return `
    <table class="byte-table">
      <thead><tr><th>偏移</th><th>大小</th><th>字段名</th><th>含义</th><th>类型</th></tr></thead>
      <tbody>${fields.map(f=>`
        <tr>
          <td><code>${f[0]}</code></td>
          <td style="text-align:center">${f[1]} B</td>
          <td><code style="color:var(--accent);font-weight:500">${f[2]}</code></td>
          <td>${f[3]}</td>
          <td style="font-size:10px;color:var(--text3)">${f[4]}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
