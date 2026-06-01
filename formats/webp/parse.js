/**
 * formats/webp/parse.js — WebP 解码（6 个子面板深度展示）
 * 注册为 parseWebP 步骤渲染器
 */
REGISTER_RENDERER('parseWebP', function(container){
  container.innerHTML = `
  <div class="detail-badge">解码 WebP</div>
  <div class="detail-title">解码 WebP 文件结构：RIFF → 压缩数据 → RGB(A) 像素</div>
  <div class="detail-desc">
    WebP 基于 <span class="hl">RIFF</span> 容器。有损模式（VP8）用帧内预测+块 DCT，类似 VP8/WebM 编码的子集；
    无损模式（VP8L）用空间颜色预测+LZ77 后向引用；
    扩展模式（VP8X）可携带 Alpha、动画等额外信息。
    <a class="adv-link" onclick="openAdvanced('WebP 解码全景','<div>WebP 所有块类型总览</div>')">[查看块类型总览]</a>
  </div>

  <!-- ══ 子面板①：RIFF 容器结构 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① RIFF 容器结构</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;line-height:2.6">
        <div style="display:flex;gap:0;margin-bottom:4px">
          <div style="flex:none;width:60px;height:34px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent);font-weight:500">RIFF<br>4B</div>
          <div style="flex:none;width:54px;height:34px;background:#eaf3de;border:0.5px solid #97C459;border-left:none;display:flex;align-items:center;justify-content:center;font-size:9px;color:#97C459">FileSize<br>4B LE</div>
          <div style="flex:none;width:64px;height:34px;background:var(--accent-bg);border:0.5px solid var(--accent);border-left:none;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent);font-weight:500">WEBP<br>4B</div>
          <div style="flex:1;height:34px;background:#f7f5f0;border:0.5px solid #c8c5bf;border-left:none;border-radius:0 4px 4px 0;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text2)">Chunk 数据（VP8/VP8L/VP8X ...）</div>
        </div>
        <div style="margin-top:5px;font-size:11px;color:var(--text2)">
          RIFF 头 <span class="hl">4B</span> + Size <span class="hl">4B</span> + WEBP <span class="hl">4B</span> = 12B 固定；
          Chunk 均为 <span class="hl">FourCC + 4B LE size + payload(+padding)</span>
        </div>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">交互参数</div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="pw-w" min="64" max="2048" step="64" value="640" oninput="pwUpdate()"><span class="param-val" id="pw-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="pw-h" min="64" max="2048" step="64" value="480" oninput="pwUpdate()"><span class="param-val" id="pw-h-v">480</span></div>
      <div class="param-row"><span class="param-label">编码模式</span>
        <select id="pw-mode" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pwUpdate()">
          <option value="vp8" selected>VP8 有损（Simple File）</option>
          <option value="vp8l">VP8L 无损</option>
          <option value="vp8x">VP8X 扩展（含 Alpha/动画）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">Alpha 通道</span>
        <select id="pw-alpha" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="pwUpdate()">
          <option value="0">无 Alpha</option>
          <option value="1">非预乘 Alpha</option>
          <option value="2" selected>预乘 Alpha</option>
        </select>
      </div>
    </div>
  </div>

  <!-- ══ 子面板②：VP8 有损解码 ══ -->
  <div class="viz-card" id="pw-vp8-panel">
    <div class="viz-card-title">② VP8 有损解码 — 帧内预测 + DCT/WHT 逆变换 + 去块滤波 + YUV→RGB</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8">
      <strong>宏块大小：</strong><span class="hl">16×16</span> 像素（亮度）+ 对应色度子采样块<br>
      <strong>帧内预测模式：</strong>
      <span class="tag tag-warn" style="margin-left:4px">B_DC_PRED</span>
      <span class="tag tag-warn" style="margin-left:2px">B_TM_PRED</span>
      <span class="tag tag-warn" style="margin-left:2px">B_VE_PRED</span>
      <span class="tag tag-warn" style="margin-left:2px">B_HE_PRED</span>
      （DC / TrueMotion / Vertical / Horizontal）<br>
      <strong>子块变换：</strong>4×4 子块 → 
      <span class="hl">DC 系数</span> 单独做 <span class="hl">WHT（沃尔什-哈达玛变换）</span>，
      <span class="hl">AC 系数</span> 做<span class="hl">DCT</span> → 合并 → 反量化 → IDCT<br>
      <strong>去块滤波：</strong>跨宏块/子块边界，基于模式、QP、边界强度决定滤波强度<br>
      <strong>色彩空间：</strong>YUV 4:2:0 采样 → 上采样 → <span class="hl">YUV→RGB</span> 矩阵转换
    </div>
    <div style="margin-top:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
      <div style="padding:6px;background:var(--surface2);border-radius:4px;font-size:10px;text-align:center;line-height:1.5">
        <div style="color:var(--accent);font-weight:500">4×4 子块</div>
        <div style="color:var(--text3)">16 像素/子块</div>
        <div style="color:var(--text3)">16 子块/宏块</div>
      </div>
      <div style="padding:6px;background:var(--surface2);border-radius:4px;font-size:10px;text-align:center;line-height:1.5">
        <div style="color:var(--accent);font-weight:500">WHT + DCT</div>
        <div style="color:var(--text3)">DC 集中编码</div>
        <div style="color:var(--text3)">AC 高频压缩</div>
      </div>
      <div style="padding:6px;background:var(--surface2);border-radius:4px;font-size:10px;text-align:center;line-height:1.5">
        <div style="color:var(--accent);font-weight:500">去块滤波</div>
        <div style="color:var(--text3)">8 像素边界</div>
        <div style="color:var(--text3)">水平→垂直两遍</div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板③：VP8L 无损解码 ══ -->
  <div class="viz-card" id="pw-vp8l-panel">
    <div class="viz-card-title">③ VP8L 无损解码 — 空间颜色预测 (13 模式) + 颜色缓存 + LZ77 后向引用</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8">
      <strong>色彩空间：</strong>ARGB 无损；首先做 <span class="hl">颜色空间变换</span>（SubtractGreen / 前后向预测）将像素映射到低熵表示<br>
      <strong>熵编码：</strong>Canonical Huffman 5 组（green/luma, red, blue, alpha, distance）<br>
      <strong>LZ77 后向引用：</strong>距离 1~262140（≈ 256K），长度 2~4096<br>
      <strong>颜色缓存：</strong>最近使用的 2^h 种颜色缓存于哈希表中，可快速用缓存索引编码重复颜色<br>
      <strong>13 种空间预测模式：</strong>
    </div>
    <div style="margin-top:6px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
      ${[
        '0: Predictor0','1: Predictor1','2: Predictor2','3: Predictor3',
        '4: Predictor4','5: Predictor5','6: Predictor6','7: Predictor7',
        '8: Predictor8','9: Predictor9','10: Predictor10','11: Predictor11',
        '12: Predictor12'
      ].map(m=>`<div style="padding:3px 6px;background:var(--surface2);border-radius:3px;font-size:9px;color:var(--text3);text-align:center">${m}</div>`).join('')}
    </div>
    <div style="margin-top:6px;font-size:10px;color:var(--text3)">
      每像素根据左、上、左上、右上 4 邻域像素选择最佳预测器，用残差+预测器编号编码
    </div>
  </div>

  <!-- ══ 子面板④：Alpha 通道处理 ══ -->
  <div class="viz-card" id="pw-alpha-panel">
    <div class="viz-card-title">④ Alpha 通道处理 — VP8X 扩展格式 + ALPH 块</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8">
      <strong>VP8X 标志位：</strong>
      <table class="byte-table" style="margin-top:4px;margin-bottom:4px">
        <thead><tr><th>Bit</th><th>含义</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><code>0</code></td><td>ICC Profile</td><td>含 ICCP 块</td></tr>
          <tr><td><code>1</code></td><td>Alpha</td><td>含 ALPH 块</td></tr>
          <tr><td><code>2</code></td><td>EXIF</td><td>含 EXIF 元数据</td></tr>
          <tr><td><code>3</code></td><td>XMP</td><td>含 XMP 元数据</td></tr>
          <tr><td><code>4</code></td><td>Animation</td><td>含 ANIM/ANMF</td></tr>
        </tbody>
      </table>
      <strong>ALPH 块 2 种模式：</strong><br>
      <span class="tag tag-ok">Mode 0</span> 无损压缩：Alpha 通过 WebP 无损编码器压缩（与 VP8L 类似）<br>
      <span class="tag tag-warn">Mode 1</span> 有损过滤：Alpha 先通过 3×3 中值滤波平滑，再无损压缩<br>
      <strong>预乘 vs 非预乘：</strong><span class="hl">premultiplied Alpha</span> 时 RGB 值已乘以 Alpha（节省解码后预乘）
    </div>
    <div style="margin-top:8px;padding:8px 12px;background:var(--surface2);border-radius:6px;font-size:11px;color:var(--text2)">
      <strong>VP8X 结构：</strong>标志 4B + 画布宽 4B + 画布高 4B = <span class="hl">12B</span> →
      现有 Alpha → 图像数据 → 元数据，按 Chunk FourCC 读取
    </div>
  </div>

  <!-- ══ 子面板⑤：动画 WebP ══ -->
  <div class="two-col">
    <div class="viz-card" id="pw-anim-panel">
      <div class="viz-card-title">⑤ 动画 WebP — ANIM + ANMF 帧合成</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <strong>ANIM 块（全局动画头）：</strong><br>
        · 背景色 <span class="hl">bgColor</span>（BGRA 4B）<br>
        · 循环次数 <span class="hl">loops</span>（0 = 无限）<br>
        <br>
        <strong>ANMF 块（每帧）：</strong><br>
        · 左上角 <span class="hl">frameX / frameY</span>（相对画布）<br>
        · 帧尺寸 <span class="hl">frameW / frameH</span><br>
        · 持续时间 <span class="hl">duration</span>（ms，1 单位 = 1 毫秒）<br>
        · <span class="hl">BlendingMethod：</span>0=覆盖(α>0 覆写)，1=不混合(完全不透明覆写)<br>
        · <span class="hl">DisposalMethod：</span>0=保留，1=清为背景色<br>
        · 帧数据：VP8/VP8L 或 Alpha+VP8 子块
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">帧合成示意</div>
      <div id="pw-anim-viz" style="font-size:11px;color:var(--text2)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:60px;height:40px;background:linear-gradient(135deg,#4A90D9,#357ABD);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff">Frame 0</div>
          <span style="font-size:20px">+</span>
          <div style="width:60px;height:40px;background:linear-gradient(135deg,#E85D75,#C94A5F);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;opacity:0.7">Frame 1</div>
          <span style="font-size:20px">=</span>
          <div style="width:60px;height:40px;background:linear-gradient(135deg,#7B5BA8,#5E4595);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff">Composite</div>
        </div>
        <div style="font-size:10px;color:var(--text3)">按 ANMF 顺序逐帧叠加到画布，Disposal 控制帧间清理</div>
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑥：Python 片段 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑥ 输出确认：RGBA 像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        解码完成后的像素数据：<br>
        · 每个像素：<strong>R、G、B、A</strong> 四通道（无Alpha时A=255）<br>
        · 色彩空间：<strong>sRGB</strong><br>
        · 数据类型：<code>uint8[H][W][4]</code>（RGBA交错）<br>
        · 预乘状态：由 ALPH 块决定<br>
        <br>
        <span id="pw-out-info" style="font-size:11px;color:var(--text2)"></span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python 完整实现片段</div>
      <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image
<span class="hl">import</span> numpy <span class="hl">as</span> np

<span class="hl">def</span> parse_webp(filepath):
    img = Image.open(filepath)  <span style="color:var(--text3)"># Pillow 内置 WebP 解码</span>
    <span class="hl">if</span> img.mode == <span class="hl-g">'RGB'</span>:
        arr = np.array(img)
        alpha = np.full((img.height, img.width, 1), 255,
                         dtype=np.uint8)
        arr = np.concatenate([arr, alpha], axis=2)
    <span class="hl">elif</span> img.mode == <span class="hl-g">'RGBA'</span>:
        arr = np.array(img)
    <span style="color:var(--text3)"># arr shape = (H, W, 4) RGBA uint8</span>
    <span class="hl">return</span> arr

<span style="color:var(--text3)"># 纯解析（无解码）— 读取 WebP 块头</span>
<span class="hl">def</span> read_webp_chunks(filepath):
    <span class="hl">with</span> open(filepath, <span class="hl-g">'rb'</span>) <span class="hl">as</span> f:
        riff = f.read(4)
        <span class="hl">assert</span> riff == <span class="hl-g">b'RIFF'</span>
        size = struct.unpack(<span class="hl-g">'&lt;I'</span>, f.read(4))[0]
        webp = f.read(4)
        <span class="hl">assert</span> webp == <span class="hl-g">b'WEBP'</span>
        chunk_type = f.read(4).decode()
        <span class="hl">if</span> chunk_type == <span class="hl-g">'VP8 '</span>:
            <span class="hl">return</span> <span class="hl-g">'lossy'</span>
        <span class="hl">elif</span> chunk_type == <span class="hl-g">'VP8L'</span>:
            <span class="hl">return</span> <span class="hl-g">'lossless'</span>
        <span class="hl">elif</span> chunk_type == <span class="hl-g">'VP8X'</span>:
            <span class="hl">return</span> <span class="hl-g">'extended'</span></div>
    </div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.pwUpdate = function(){
    const w     = +document.getElementById('pw-w').value;
    const h     = +document.getElementById('pw-h').value;
    const mode  = document.getElementById('pw-mode').value;
    const alpha = +document.getElementById('pw-alpha').value;
    document.getElementById('pw-w-v').textContent = w;
    document.getElementById('pw-h-v').textContent = h;

    // 面板可见性
    const vp8Panel  = document.getElementById('pw-vp8-panel');
    const vp8lPanel = document.getElementById('pw-vp8l-panel');
    const alphaPanel= document.getElementById('pw-alpha-panel');
    const animPanel = document.getElementById('pw-anim-panel');
    if(vp8Panel)  vp8Panel.style.display  = (mode==='vp8')  ? '' : 'none';
    if(vp8lPanel) vp8lPanel.style.display = (mode==='vp8l') ? '' : 'none';
    if(alphaPanel)alphaPanel.style.display= (alpha>0 || mode==='vp8x') ? '' : 'none';
    if(animPanel) animPanel.style.display = (mode==='vp8x') ? '' : 'none';

    // 输出信息
    const channels = alpha>0 ? 4 : 3;
    const outEl = document.getElementById('pw-out-info');
    if(outEl) outEl.innerHTML = `
      矩阵大小 = <span class="hl">${w} × ${h} × ${channels}</span> = ${(w*h*channels/1024).toFixed(1)} KB<br>
      内存占用 ≈ <span class="hl">${(w*h*channels/1024/1024).toFixed(2)} MB</span>`;
  };
  pwUpdate();
});
