/**
 * formats/jpeg/parse.js — JPEG 解码（7个子步骤深度展示）
 * 注册为 parseJPEG 步骤渲染器
 * 详细展示：JFIF段结构 → 标记段读取 → 哈夫曼表 → 反Zig-Zag+反量化 → IDCT → MCU重组 → Python实现
 */

// ─── 2D IDCT（反离散余弦变换）───
function idct2d(F){
  const N=8, f=Array.from({length:N},()=>new Array(N).fill(0));
  for(let x=0;x<N;x++) for(let y=0;y<N;y++){
    let s=0;
    for(let u=0;u<N;u++) for(let v=0;v<N;v++){
      const cu=u===0?1/Math.sqrt(2):1, cv=v===0?1/Math.sqrt(2):1;
      s+=cu*cv*F[u][v]*Math.cos((2*x+1)*u*Math.PI/16)*Math.cos((2*y+1)*v*Math.PI/16);
    }
    f[x][y]=0.25*s;
  }
  return f;
}

REGISTER_RENDERER('parseJPEG', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解码目标格式</div>
  <div class="detail-title">JPEG 解码 — 从比特流恢复像素矩阵</div>
  <div class="detail-desc">
    JPEG 解码从 <span class="hl">SOI (FF D8)</span> 开始，依次读取 APP0/DQT/DHT/SOF0/SOS 各标记段，
    完成<span class="hl">熵解码 → 反 Zig-Zag → 反量化 → IDCT → 色彩转换</span>五个核心操作，最终恢复 RGB 像素。
  </div>

  <!-- ══ 子面板①：JFIF 段结构全景 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">① JFIF 段结构全景 — 完整标记（Marker）序列</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px;line-height:1.8">
      JPEG 文件由一系列<span class="hl">标记段（Marker Segment）</span>组成，每个段以 <code>FFxx</code> 开头。
      解码器顺序读取直到遇到 <span class="hl">EOI (FF D9)</span>。关键段之间有严格顺序要求。
    </div>
    ${[
      ['FF D8','SOI','Start Of Image，文件开始标志，不含数据段',''],
      ['FF E0','APP0','应用数据段 0，通常为 JFIF 标识（"JFIF\\0" + 版本号 + 密度 + 缩略图）','可选'],
      ['FF E1','APP1','应用数据段 1，通常为 Exif 元数据（相机型号、拍摄参数、GPS 等）','可选'],
      ['FF DB','DQT','Define Quantization Table，定义量化表（亮度 ×1 + 色度 ×1，可有多张）','必需，2段+'],
      ['FF C4','DHT','Define Huffman Table，定义哈夫曼表（DC/AC × Y/CbCr = 4张标准）','必需，4段+'],
      ['FF C0','SOF0','Start Of Frame 0（Baseline DCT），帧头：宽高、分量数、采样因子','必需'],
      ['FF DA','SOS','Start Of Scan，扫描头 + 熵编码数据流（实际压缩数据）','必需'],
      ['FF D9','EOI','End Of Image，文件结束标志，无数据','必需'],
    ].map(([m,n,d,t])=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:6px 8px;background:var(--surface2);border-radius:5px;border-left:3px solid ${m==='FF D8'||m==='FF D9'?'var(--accent)':t==='可选'?'var(--border2)':'var(--warn)'}">
        <code style="font-family:'Courier New',monospace;font-size:10px;min-width:42px;color:var(--accent);font-weight:500">${m}</code>
        <span style="font-weight:500;font-size:11px;min-width:38px;color:var(--text)">${n}</span>
        <span style="font-size:10px;color:var(--text2);flex:1">${d}</span>
        <span class="tag ${t==='可选'?'tag-info':'tag-ok'}" style="font-size:9px">${t||('必需')}</span>
      </div>
    `).join('')}
  </div>

  <!-- ══ 子面板②：标记段读取详情 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② 标记段读取 — APP0/DQT/DHT/SOF0 详解</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <div style="margin-bottom:6px;padding:5px 8px;background:var(--accent-bg);border-radius:4px">
          <strong style="color:var(--accent)">SOI</strong> (FF D8) → <strong style="color:var(--accent)">APP0</strong> (FF E0)：
          每段前2字节=段长度（含自身2字节），段体=长度−2字节
        </div>
        <div style="margin-bottom:6px;padding:5px 8px;background:var(--surface2);border-radius:4px">
          <strong style="display:inline-block;min-width:60px">DQT</strong>
          <code>Pq(高4位)=0</code> 8位精度 &nbsp; <code>Tq(低4位)=0~3</code> 表编号<br>
          段体：64字节 zig-zag 顺序的量化步长值（左上低频→右下高频依次递增）
        </div>
        <div style="margin-bottom:6px;padding:5px 8px;background:var(--surface2);border-radius:4px">
          <strong style="display:inline-block;min-width:60px">DHT</strong>
          <code>Tc(高4位)=0/1</code> DC/AC表 &nbsp; <code>Th(低4位)=0~3</code> 表编号<br>
          段体：16字节码长分布 + N字节码值（构建哈夫曼树的关键数据）
        </div>
        <div style="padding:5px 8px;background:var(--surface2);border-radius:4px">
          <strong style="display:inline-block;min-width:60px">SOF0</strong>
          精度=8位、宽高、分量数Nf(=3)→ Y采样因子1/2、Cb采样因子1/2、Cr采样因子1/2（4:2:0 表示 CbCr 各宽高减半）
        </div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">SOS 段 + 熵编码数据流</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <p style="margin-bottom:6px"><strong>SOS 段头</strong>：分量数Ns（=3）、各分量使用的哈夫曼表编号（DC表号 | AC表号）</p>
        <p style="margin-bottom:6px">头后是<span class="hl">压缩比特流</span>：</p>
        <ul style="padding-left:16px;margin-bottom:6px">
          <li>逐MCU（最小编码单元）解码</li>
          <li>逐分量（Y→Cb→Cr）解码</li>
          <li>逐8×8块哈夫曼解码得到量化DCT系数</li>
          <li>字节对齐规则：<code>FF 00</code> 表示字面值 <code>FF</code>（字节填充）</li>
          <li><code>RSTm</code> (FF D0~D7) 可选的同步标记，定期重置DC差分</li>
        </ul>
        <p style="color:var(--warn);font-size:10px">※ 熵编码数据流一直读到 EOI 或文件结束</p>
      </div>
    </div>
  </div>

  <!-- ══ 子面板③：哈夫曼表解码 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">③ 哈夫曼表解码 — 从比特流还原系数</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px;line-height:1.8">
      JPEG 使用<span class="hl">规范哈夫曼编码（Canonical Huffman）</span>：DHT 段只存储 16 个码长的符号数 + 符号列表，解码器根据此数据重建码表。
      DC 系数用差分编码（当前−前一），AC 系数用游程编码（零游程, 非零值）。
    </div>

    <!-- 哈夫曼表示例 -->
    <div class="two-col">
      <div class="viz-card" style="background:var(--surface2)">
        <div style="font-size:11px;font-weight:500;margin-bottom:6px;color:var(--accent)">亮度 DC 哈夫曼表（部分）</div>
        <table class="byte-table">
          <thead><tr><th>SSSS</th><th>码长</th><th>码字</th><th>含义</th></tr></thead>
          <tbody>
            <tr><td>0</td><td>2</td><td><code style="color:var(--accent)">00</code></td><td>差分 = 0（无变化）</td></tr>
            <tr><td>1</td><td>3</td><td><code style="color:var(--accent)">010</code></td><td>差分范围 [-1,1]</td></tr>
            <tr><td>2</td><td>3</td><td><code style="color:var(--accent)">011</code></td><td>差分范围 [-3,-2]∪[2,3]</td></tr>
            <tr><td>3</td><td>3</td><td><code style="color:var(--accent)">100</code></td><td>差分范围 [-7,-4]∪[4,7]</td></tr>
            <tr><td>4</td><td>3</td><td><code style="color:var(--accent)">101</code></td><td>差分范围 [-15,-8]∪[8,15]</td></tr>
            <tr><td>5</td><td>3</td><td><code style="color:var(--accent)">110</code></td><td>差分范围 [-31,-16]∪[16,31]</td></tr>
            <tr><td>6</td><td>4</td><td><code style="color:var(--accent)">1110</code></td><td>差分范围 [-63,-32]∪[32,63]</td></tr>
            <tr><td>7</td><td>5</td><td><code style="color:var(--accent)">11110</code></td><td>差分范围 [-127,-64]∪[64,127]</td></tr>
          </tbody>
        </table>
      </div>
      <div class="viz-card" style="background:var(--surface2)">
        <div style="font-size:11px;font-weight:500;margin-bottom:6px;color:var(--accent)">亮度 AC 哈夫曼表（部分）</div>
        <table class="byte-table">
          <thead><tr><th>游程/尺寸</th><th>码长</th><th>码字</th><th>含义</th></tr></thead>
          <tbody>
            <tr><td>(0,0) EOB</td><td>4</td><td><code style="color:var(--accent)">1010</code></td><td>块结束（剩余全零）</td></tr>
            <tr><td>(0,1)</td><td>2</td><td><code style="color:var(--accent)">00</code></td><td>前0个零，值∈[-1,1]</td></tr>
            <tr><td>(0,2)</td><td>2</td><td><code style="color:var(--accent)">01</code></td><td>前0个零，值∈[-3,-2]∪[2,3]</td></tr>
            <tr><td>(1,1)</td><td>4</td><td><code style="color:var(--accent)">1100</code></td><td>前1个零，值∈[-1,1]</td></tr>
            <tr><td>(1,2)</td><td>5</td><td><code style="color:var(--accent)">11011</code></td><td>前1个零，值∈[-3,-2]∪[2,3]</td></tr>
            <tr><td>(2,1)</td><td>5</td><td><code style="color:var(--accent)">11100</code></td><td>前2个零，值∈[-1,1]</td></tr>
            <tr><td>(3,1)</td><td>6</td><td><code style="color:var(--accent)">111010</code></td><td>前3个零，值∈[-1,1]</td></tr>
            <tr><td>(F,0) ZRL</td><td>11</td><td><code style="color:var(--accent)">11111111001</code></td><td>连续16个零</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 交互式哈夫曼解码 -->
    <div class="viz-card">
      <div class="viz-card-title">交互式 DC 哈夫曼解码示例</div>
      <div class="param-row"><span class="param-label">前一个块 DC 值</span>
        <input type="range" class="param-slider" id="pj-pdc" min="-200" max="400" value="120" oninput="pjUpdate()">
        <span class="param-val" id="pj-pdc-v">120</span>
      </div>
      <div class="param-row"><span class="param-label">解码差分值</span>
        <input type="range" class="param-slider" id="pj-diff" min="-100" max="100" value="12" oninput="pjUpdate()">
        <span class="param-val" id="pj-diff-v">12</span>
      </div>
      <div id="pj-huff-demo" style="margin-top:8px;padding:8px 12px;background:var(--surface2);border-radius:6px;font-size:11px;line-height:1.9"></div>
    </div>
  </div>

  <!-- ══ 子面板④：反 Zig-Zag + 反量化 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">④ 反 Zig-Zag 扫描 — 将一维数组还原为 8×8 矩阵</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;line-height:1.8">
        <p>编码时按 Zig-Zag 顺序将 8×8 矩阵扫描为一维数组，使低频系数在前、高频在后，后面跟大量连续零。</p>
        <p style="margin-top:4px">解码时<span class="hl">逆向映射</span>，将索引 i 放回 (x,y) 位置。</p>
      </div>
      <div class="formula-box" style="font-size:10px">
        Zig-Zag 扫描：沿对角线方向读取，顺序如下：
        0→1→5→6→14→15→27→28
          ↗  ↗  ↗  ↗   ↗   ↗   ↗
        2→4→7→13→16→26→29→42
        ︙</div>
      <div id="pj-zz" style="margin-bottom:6px"></div>
      <div style="font-size:10px;color:var(--text3)">zig-zag 索引 → (row, col) 映射（颜色越深=高频越靠后）</div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">④ 反量化 — 系数×量化步长</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px;line-height:1.8">
        <span class="hl">量化 DCT 系数 × 量化表对应位置步长 = 还原 DCT 系数</span>。
        但量化过程有舍入误差，反量化只能<span class="tag tag-warn" style="margin-left:0">近似还原</span>。
      </div>
      <div class="param-row"><span class="param-label">质量因子 Q</span>
        <input type="range" class="param-slider" id="pj-q" min="1" max="100" value="75" oninput="pjUpdate()">
        <span class="param-val" id="pj-q-v">75</span>
      </div>
      <div class="param-row"><span class="param-label">量化表类型</span>
        <select id="pj-qt" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pjUpdate()">
          <option value="luma">亮度（Y 分量）</option>
          <option value="chroma">色度（Cb/Cr 分量）</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px">量化矩阵（步长）</div>
          <div id="pj-qmat"></div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px">还原后 DCT 系数</div>
          <div id="pj-dequant"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑤：IDCT 还原像素块 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑤ IDCT 反变换 — 从频域回到空间域</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;line-height:1.8">
        <strong>公式（2D IDCT）：</strong>
      </div>
      <div class="formula-box">f(x,y) = <span class="hl">¼</span>·Σ_{u,v=0}^{7} C(u)·C(v)·F(u,v)·cos[(2x+1)uπ/16]·cos[(2y+1)vπ/16]

C(k) = 1/√2  if k=0，否则 C(k) = 1
f(x,y) = IDCT 输出（范围 −128 ~ 127，最后 +128 得 [0,255] 像素）
      </div>
      <div class="param-row"><span class="param-label">质量因子 Q</span>
        <input type="range" class="param-slider" id="pj-idct-q" min="1" max="100" value="75" oninput="pjUpdate()">
        <span class="param-val" id="pj-idct-q-v">75</span>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:6px">
        用下方质量因子重新计算量化→反量化→IDCT，对比原始与还原块的差异。
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">IDCT 对照（原始像素块 vs 量化后还原）</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px">原始像素块</div>
          <div id="pj-idct-orig"></div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px">量化→反量化→IDCT 还原</div>
          <div id="pj-idct-rest"></div>
        </div>
      </div>
      <div id="pj-idct-diff" style="margin-top:6px;font-size:11px;color:var(--warn)"></div>
    </div>
  </div>

  <!-- ══ 子面板⑥：MCU 重组与 YCbCr→RGB ══ -->
  <div class="viz-card">
    <div class="viz-card-title">⑥ MCU 重组与 YCbCr 转 RGB</div>
    <div class="two-col">
      <div class="viz-card" style="background:var(--surface2)">
        <div style="font-size:11px;font-weight:500;margin-bottom:8px;color:var(--accent)">MCU（Minimum Coded Unit）重组</div>
        <div style="font-size:11px;color:var(--text2);line-height:2">
          <p><strong>4:4:4 采样</strong>（水平/垂直因子全1）：</p>
          <p style="margin-left:8px;margin-bottom:4px">1个 MCU = <span class="hl">1个 Y 块 + 1个 Cb 块 + 1个 Cr 块</span>（共3个 8×8）</p>
          <p><strong>4:2:0 采样</strong>（Y=2×2, Cb/Cr=1×1）：</p>
          <p style="margin-left:8px;margin-bottom:4px">1个 MCU = <span class="hl">4个 Y 块 + 1个 Cb 块 + 1个 Cr 块</span>（共6个 8×8，覆盖 16×16 像素）</p>
          <p><strong>4:2:2 采样</strong>（Y=2×1, Cb/Cr=1×1）：</p>
          <p style="margin-left:8px;">1个 MCU = <span class="hl">2个 Y 块 + 1个 Cb 块 + 1个 Cr 块</span>（共4个 8×8，覆盖 16×8 像素）</p>
        </div>
      </div>
      <div class="viz-card" style="background:var(--surface2)">
        <div style="font-size:11px;font-weight:500;margin-bottom:8px;color:var(--accent)">YCbCr → RGB 转换</div>
        <div style="font-size:11px;color:var(--text2);line-height:2">
          <p>IDCT 得到的 Y/Cb/Cr 像素块需上采样（如有下采样），再逐像素转换：</p>
          <div class="formula-box" style="margin:6px 0;font-size:10px">
R = Y                  + 1.402·(Cr−128)
G = Y − 0.344136·(Cb−128) − 0.714136·(Cr−128)
B = Y + 1.772·(Cb−128)
          </div>
          <p>结果钳位到 <code>[0, 255]</code>，得到<span class="tag tag-ok">RGB 像素矩阵</span>。</p>
          <p style="font-size:10px;color:var(--text3);margin-top:4px">※ 这是 BT.601 色度矩阵，JPEG 标准支持多种色彩空间。</p>
        </div>
      </div>
    </div>

    <!-- 交互式模拟 -->
    <div class="viz-card">
      <div class="viz-card-title">MCU重组交互演示 — 子采样与上采样</div>
      <div class="param-row"><span class="param-label">色度子采样模式</span>
        <select id="pj-subsamp" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pjUpdate()">
          <option value="444">4:4:4（无子采样）</option>
          <option value="420" selected>4:2:0（最常用）</option>
          <option value="422">4:2:2</option>
        </select>
      </div>
      <div id="pj-mcu-viz" style="margin-top:8px;display:flex;gap:12px;align-items:flex-start"></div>
    </div>
  </div>

  <!-- ══ 子面板⑦：Python 完整实现片段 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">⑦ Python 完整实现片段</div>
    <div class="formula-box"><span class="hl">import</span> struct, numpy <span class="hl">as</span> np

<span style="color:var(--text3)"># ═══ JPEG 解码器核心 ═══</span>
<span class="hl">class</span> JPEGDecoder:
    <span class="hl">def</span> __init__(self, data):
        self.data = data
        self.pos  = 0
        self.qtables = {}     <span style="color:var(--text3)"># {id: 8×8 量化矩阵}</span>
        self.htables = {}     <span style="color:var(--text3)"># {(dc/ac, id): huffman_tree}</span>

    <span class="hl">def</span> read_marker(self):
        <span style="color:var(--text3)"># ① 验证 SOI</span>
        <span class="hl">assert</span> self.read16() == 0xFFD8, <span class="hl-g">"Not JPEG"</span>
        <span class="hl">while</span> True:
            <span class="hl">assert</span> self.read8() == 0xFF
            marker = self.read8()
            <span class="hl">if</span> marker == 0xD9: <span class="hl">break</span>           <span style="color:var(--text3)"># EOI</span>
            <span class="hl">elif</span> marker == 0xDA:               <span style="color:var(--text3)"># SOS → 解码数据</span>
                self.decode_scan(); <span class="hl">continue</span>
            length = self.read16() - 2   <span style="color:var(--text3)"># 段长度</span>
            seg = self.read_bytes(length)
            <span class="hl">if</span>   marker == 0xDB: self.parse_dqt(seg)
            <span class="hl">elif</span> marker == 0xC4: self.parse_dht(seg)
            <span class="hl">elif</span> marker == 0xC0: self.parse_sof(seg)

    <span class="hl">def</span> parse_dqt(self, seg):
        <span style="color:var(--text3)"># ② 量化表：Pq(精度)+Tq(表ID)+64字节（zig-zag顺序）</span>
        pos=0
        <span class="hl">while</span> pos < len(seg):
            info = seg[pos]; pos+=1
            tq = info & 0x0F
            table = np.array(seg[pos:pos+64], np.uint8)\
                      .reshape(8,8)
            <span style="color:var(--text3)"># 反zig-zag重排</span>
            self.qtables[tq] = zigzag_inverse(table)
            pos += 64

    <span class="hl">def</span> parse_sof(self, seg):
        <span style="color:var(--text3)"># ③ 帧头：精度、宽高、分量数、采样因子</span>
        prec, h, w, ncomp = seg[0], seg[1:3], seg[3:5], seg[5]
        self.width, self.height = \
            struct.unpack(<span class="hl-g">'>H'</span>, h)[0], struct.unpack(<span class="hl-g">'>H'</span>, w)[0]

    <span class="hl">def</span> decode_block(self, dc_table, ac_table, qt_id):
        <span style="color:var(--text3)"># ④ 哈夫曼解码 → 64个系数</span>
        coeffs = [0]*64
        <span style="color:var(--text3)"># DC：哈夫曼解码 SSSS → 读 SSSS 附加位 → +前块DC</span>
        ssss = self.huff_decode(dc_table)
        diff = self.read_bits(ssss)
        coeffs[0] = self.prev_dc + diff
        self.prev_dc = coeffs[0]
        <span style="color:var(--text3)"># AC：循环解码 (run, ssss) 直到 EOB</span>
        idx = 1
        <span class="hl">while</span> idx < 64:
            rs = self.huff_decode(ac_table)
            run, ssss = rs >> 4, rs & 0x0F
            <span class="hl">if</span> rs == 0: <span class="hl">break</span>          <span style="color:var(--text3)"># EOB</span>
            idx += run
            coeffs[idx] = self.read_bits(ssss)
            idx += 1
        block = np.array(coeffs).reshape(8,8)

        <span style="color:var(--text3)"># ⑤ 反量化</span>
        block = block * self.qtables[qt_id]

        <span style="color:var(--text3)"># ⑥ IDCT + 加128</span>
        <span class="hl">return</span> self.idct2d(block) + 128

    <span class="hl">def</span> decode_scan(self):
        <span style="color:var(--text3)"># ⑦ 逐MCU解码全部块 → YCbCr矩阵 → RGB</span>
        <span class="hl">for</span> mcu_y <span class="hl">in</span> range(0, self.height, 8*self.vmax):
            <span class="hl">for</span> mcu_x <span class="hl">in</span> range(0, self.width, 8*self.hmax):
                blocks = []
                <span class="hl">for</span> comp <span class="hl">in</span> self.components:
                    <span class="hl">for</span> vy <span class="hl">in</span> range(comp.v):
                        <span class="hl">for</span> vx <span class="hl">in</span> range(comp.h):
                            blk = self.decode_block(
                                comp.dc_ht, comp.ac_ht, comp.qt_id)
                            blocks.append((comp.id, blk))
        <span style="color:var(--text3)"># YCbCr → RGB（含上采样）</span>
        self.rgb = self.ycbcr_to_rgb(blocks)</div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.pjUpdate = function(){
    const pdcQ    = +document.getElementById('pj-q').value;
    const qt      = document.getElementById('pj-qt').value;
    const pdc     = +document.getElementById('pj-pdc').value;
    const diff    = +document.getElementById('pj-diff').value;
    const idctQ   = +document.getElementById('pj-idct-q').value;
    const subsamp = document.getElementById('pj-subsamp').value;

    // 更新显示值
    document.getElementById('pj-q-v').textContent = pdcQ;
    document.getElementById('pj-pdc-v').textContent = pdc;
    document.getElementById('pj-diff-v').textContent = diff;
    document.getElementById('pj-idct-q-v').textContent = idctQ;

    // ── ③ 哈夫曼解码演示 ──
    const HUFF_DC = {0:'00',1:'010',2:'011',3:'100',4:'101',5:'110',6:'1110',7:'11110',8:'111110',9:'1111110',10:'11111110',11:'111111110'};
    const currentDC = pdc + diff;
    const ssss = diff===0 ? 0 : Math.ceil(Math.log2(Math.abs(diff)+1));
    const bits = diff===0 ? '' : (diff>=0 ? diff.toString(2) : (diff+(1<<ssss)-1).toString(2).slice(-ssss));
    const hcode = HUFF_DC[ssss]||'?';
    document.getElementById('pj-huff-demo').innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px">
          <div style="margin-bottom:3px">DC 差分解码：</div>
          <div>前 DC = <span class="hl">${pdc}</span></div>
          <div>差分 DIFF = <span class="hl">${diff}</span></div>
          <div>当前 DC = <span class="hl">${currentDC}</span></div>
          <div>SSSS（尺寸类）= <span class="hl-o">${ssss}</span></div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="margin-bottom:3px">比特流：</div>
          <div>哈夫曼码字 = <code style="color:var(--accent);font-size:12px">${hcode}</code></div>
          <div>附加位 = <code style="color:var(--success)">${bits||'—'}</code></div>
          <div style="margin-top:2px">输出比特 = <code style="background:var(--accent-bg);padding:1px 4px;border-radius:2px;color:var(--accent);font-weight:500">${hcode}${bits}</code>（${hcode.length+ssss} 位）</div>
        </div>
      </div>`;

    // ── ④ Zig-Zag ──
    renderZigzagGrid('pj-zz');

    // ── 量化矩阵 + 反量化演示 ──
    const sq = getScaledQ(pdcQ, qt==='chroma');
    renderQmatGrid('pj-qmat', sq);
    // 模拟量化前的 DCT 系数（编码端）
    const fakeDCT = [[580,-30,20,-15,10,-8,5,-3],[-35,25,-18,12,-9,6,-4,2],[22,-16,11,-8,5,-3,2,-1],[-14,10,-7,5,-3,2,-1,1],[9,-7,5,-3,2,-1,1,0],[-6,4,-3,2,-1,1,0,0],[4,-3,2,-1,1,0,0,0],[-2,2,-1,1,0,0,0,0]];
    // 量化后（舍入）
    const quantized = fakeDCT.map((r,i)=>r.map((v,j)=>Math.round(v/sq[i][j])));
    // 反量化（近似还原）
    const dequant = quantized.map((r,i)=>r.map((v,j)=>v*sq[i][j]));
    renderDCTGrid('pj-dequant', dequant);

    // ── ⑤ IDCT ──
    const idctSq = getScaledQ(idctQ);
    const quantized2 = fakeDCT.map((r,i)=>r.map((v,j)=>Math.round(v/idctSq[i][j])));
    const dequant2 = quantized2.map((r,i)=>r.map((v,j)=>v*idctSq[i][j]));
    // 原始像素块（从 DCT 系数逆推）
    const origF = dequant2; // 使用反量化后的系数做IDCT
    const idctResult = idct2d(origF);
    const origPixels = idctResult.map(r=>r.map(v=>Math.min(255,Math.max(0,Math.round(v+128)))));
    renderPixelGrid('pj-idct-rest', origPixels);

    // 原始像素（直接用原始 DCT 系数做 IDCT）
    const truePixels = idct2d(fakeDCT).map(r=>r.map(v=>Math.min(255,Math.max(0,Math.round(v+128)))));
    renderPixelGrid('pj-idct-orig', truePixels);

    // 差异统计
    let totalDiff=0, maxDiff=0;
    for(let i=0;i<8;i++) for(let j=0;j<8;j++){
      const d=Math.abs(truePixels[i][j]-origPixels[i][j]);
      totalDiff+=d; if(d>maxDiff) maxDiff=d;
    }
    document.getElementById('pj-idct-diff').innerHTML = `
      平均像素差异 = <span class="hl">${(totalDiff/64).toFixed(2)}</span>，最大差异 = <span class="hl">${maxDiff}</span>
      （Q=${idctQ}，总差异 <span style="color:${maxDiff<5?'var(--success)':maxDiff<15?'var(--warn)':'var(--danger)'}">${totalDiff}</span>）`;

    // ── ⑥ MCU 重组可视化 ──
    const mcuEl = document.getElementById('pj-mcu-viz');
    if(subsamp==='444'){
      mcuEl.innerHTML = `
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Y 平面 (8×8)</div>
          <div style="display:grid;grid-template-columns:repeat(8,18px);gap:0">
            ${Array.from({length:64},(_,i)=>`<div style="height:18px;background:hsl(${(i%8)*12},70%,${60+(i/8|0)*4}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Cb 平面 (8×8)</div>
          <div style="display:grid;grid-template-columns:repeat(8,18px);gap:0">
            ${Array.from({length:64},(_,i)=>`<div style="height:18px;background:hsl(210,${50+(i%8)*5}%,${60+(i/8|0)*3}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Cr 平面 (8×8)</div>
          <div style="display:grid;grid-template-columns:repeat(8,18px);gap:0">
            ${Array.from({length:64},(_,i)=>`<div style="height:18px;background:hsl(0,${50+(i/8|0)*5}%,${60+(i%8)*3}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:4px;flex:none;writing-mode:vertical-rl">
          ← 1 MCU = 3 块（8×8 像素）
        </div>`;
    } else if(subsamp==='420'){
      mcuEl.innerHTML = `
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Y₀₀ &nbsp; Y₀₁</div>
          <div style="display:grid;grid-template-columns:repeat(16,14px);gap:0">
            ${Array.from({length:16*8},(_,i)=>`<div style="height:14px;background:hsl(${(i%16)*6},70%,${55+((i/16|0)%8)*5}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text3);margin:2px 0 4px">Y₁₀ &nbsp; Y₁₁</div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Cb (8×8, 上采样4倍)</div>
          <div style="display:grid;grid-template-columns:repeat(8,14px);gap:0">
            ${Array.from({length:64},(_,i)=>`<div style="height:14px;background:hsl(210,${50+(i%8)*5}%,${50+(i/8|0)*5}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;margin-bottom:4px">Cr (8×8, 上采样4倍)</div>
        </div>
        <div style="font-size:10px;color:var(--text2);align-self:center;flex:none;writing-mode:vertical-rl">
          ← 1 MCU = <span class="hl">6 块</span>（16×16 像素）
        </div>`;
    } else {
      mcuEl.innerHTML = `
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Y₀ (8×8) &nbsp; Y₁ (8×8)</div>
          <div style="display:grid;grid-template-columns:repeat(16,14px);gap:0">
            ${Array.from({length:16*8},(_,i)=>`<div style="height:14px;background:hsl(${(i%16)*6},70%,${55+((i/16|0)%8)*5}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
        </div>
        <div style="flex:1">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Cb (8×8, 水平上采样2倍)</div>
          <div style="display:grid;grid-template-columns:repeat(8,14px);gap:0">
            ${Array.from({length:64},(_,i)=>`<div style="height:14px;background:hsl(210,${50+(i%8)*5}%,${50+(i/8|0)*5}%);border-radius:1px;border:0.3px solid #ccc"></div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">Cr (8×8, 水平上采样2倍)</div>
        </div>
        <div style="font-size:10px;color:var(--text2);align-self:center;flex:none;writing-mode:vertical-rl">
          ← 1 MCU = <span class="hl">4 块</span>（16×8 像素）
        </div>`;
    }
  };

  pjUpdate();
});
