/**
 * formats/svg/parse.js — SVG 光栅化（6 个子面板深度展示）
 * 注册为 parseSVG 步骤渲染器
 */
REGISTER_RENDERER('parseSVG', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解析 SVG 并光栅化为 RGBA 像素缓冲</div>
  <div class="detail-desc">
    SVG（Scalable Vector Graphics）是 <span class="hl">XML 矢量格式</span>，不能直接得到像素矩阵。
    必须通过 <span class="hl">XML 解析 → 图形树构建 → 坐标变换 → 矢量渲染</span> 的光栅化管线才能转为位图。
    常见渲染后端包括 Cairo、Skia、Qt 和浏览器 DOM 渲染引擎。
    <a class="adv-link" onclick="openAdvanced('SVG 规范细节','<div>SVG 1.1/2.0 全规范参考</div>')">[SVG 规范详情]</a>
  </div>

  <!-- ══ 子面板①：SVG 作为 XML 文档 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">① SVG 作为 XML 文档 — Namespace + 根元素 + DOCTYPE</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8">
      <strong>命名空间：</strong><code>xmlns="http://www.w3.org/2000/svg"</code>（必须）<br>
      <strong>根元素：</strong><code>&lt;svg&gt;</code>，包含 width/height/viewBox 属性<br>
      <strong>DOCTYPE（可选）：</strong>
      <div style="padding:4px 8px;background:#2a2a2a;border-radius:4px;font-family:'Courier New',monospace;font-size:10px;color:#c6e48b;margin:4px 0;overflow-x:auto">
        &lt;?xml version="1.0" encoding="UTF-8"?&gt;<br>
        &lt;svg xmlns="http://www.w3.org/2000/svg"<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;width="800" height="600"<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;viewBox="0 0 800 600"&gt;<br>
        &nbsp;&nbsp;&lt;!-- 图形元素 --&gt;<br>
        &lt;/svg&gt;
      </div>
      <strong>命名实体：</strong>SVG 还支持 <code>xmlns:xlink</code>（链接引用）、<code>xmlns:xhtml</code> 等附加命名空间
    </div>
  </div>

  <!-- ══ 子面板②：viewBox 与坐标变换 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② viewBox 与坐标系</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <strong>viewBox 格式：</strong><code>"min-x min-y width height"</code><br>
        · 定义用户坐标系的可见区域<br>
        · 默认：<span class="hl">从 (0,0) 开始</span><br>
        <br>
        <strong>preserveAspectRatio 值：</strong>
        <div style="font-size:10px;color:var(--text3);margin:4px 0">
          <code>xMinYMin meet</code> — 等比缩放，左上对齐<br>
          <code>xMidYMid meet</code> — 等比缩放，居中<br>
          <code>xMidYMid slice</code> — 等比裁剪，居中<br>
          <code>none</code> — 拉伸填充，不保持比例
        </div>
        <strong>视口映射流程：</strong>
        <span class="hl">viewBox → width/height → 像素坐标系</span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">② 变换矩阵系统</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <strong>transform 属性：</strong><br>
        <div class="formula-box" style="font-size:12px;text-align:center">
          transform="matrix(a, b, c, d, e, f)"
        </div>
        或便捷形式：<br>
        · <code>translate(tx, ty)</code> — 平移<br>
        · <code>scale(sx [, sy])</code> — 缩放<br>
        · <code>rotate(angle [, cx, cy])</code> — 旋转<br>
        · <code>skewX(a)</code> / <code>skewY(a)</code> — 倾斜<br>
        <br>
        <strong>嵌套变换规则：</strong><br>
        子变换 × 父变换 = 合成矩阵<br>
        <strong>坐标转换链：</strong><br>
        用户坐标 → 变换矩阵 → viewBox映射 → 视口坐标 → 像素坐标
      </div>
    </div>
  </div>

  <!-- ══ 子面板③：图元解析 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">③ 图元解析 — 基本形状 + path 路径</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px">
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">rect / circle / ellipse</div>
        <div style="font-size:9px;color:var(--text3);margin-top:4px;line-height:1.6">
          <code>&lt;rect x="" y="" w="" h="" rx="" ry=""/&gt;</code><br>
          <code>&lt;circle cx="" cy="" r=""/&gt;</code><br>
          <code>&lt;ellipse cx="" cy="" rx="" ry=""/&gt;</code>
        </div>
      </div>
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">line / polyline / polygon</div>
        <div style="font-size:9px;color:var(--text3);margin-top:4px;line-height:1.6">
          <code>&lt;line x1="" y1="" x2="" y2=""/&gt;</code><br>
          <code>&lt;polyline points="x,y..."/&gt;</code><br>
          <code>&lt;polygon points="x,y..."/&gt;</code>
        </div>
      </div>
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">path（核心）</div>
        <div style="font-size:9px;color:var(--text3);margin-top:4px;line-height:1.6">
          <code>d="M... C... Q... A... Z"</code><br>
          包含贝塞尔曲线与椭圆弧，最强大的图元
        </div>
      </div>
    </div>

    <!-- Path 命令详解 -->
    <div style="margin-top:10px;padding:10px;background:var(--surface2);border-radius:6px">
      <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:8px">
        <code style="font-size:10px;color:var(--accent)">d= 属性命令集（大写=绝对，小写=相对）</code>
      </div>
      <table class="byte-table">
        <thead><tr><th>命令</th><th>全称</th><th>参数</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><code style="color:var(--accent)">M / m</code></td><td>MoveTo</td><td>x, y</td><td>起点移到绝对/相对位置</td></tr>
          <tr><td><code style="color:var(--accent)">L / l</code></td><td>LineTo</td><td>x, y</td><td>画直线到指定点</td></tr>
          <tr><td><code>H / h</code></td><td>HorizontalTo</td><td>x</td><td>水平线</td></tr>
          <tr><td><code>V / v</code></td><td>VerticalTo</td><td>y</td><td>垂直线</td></tr>
          <tr><td><code style="color:var(--accent)">C / c</code></td><td>CubicBezier</td><td>x1,y1 x2,y2 x,y</td><td>三次贝塞尔（2个控制点）</td></tr>
          <tr><td><code>S / s</code></td><td>SmoothCubic</td><td>x2,y2 x,y</td><td>平滑三次贝塞尔（反射CP1）</td></tr>
          <tr><td><code style="color:var(--accent)">Q / q</code></td><td>QuadraticBezier</td><td>x1,y1 x,y</td><td>二次贝塞尔（1个控制点）</td></tr>
          <tr><td><code>T / t</code></td><td>SmoothQuadratic</td><td>x,y</td><td>平滑二次贝塞尔</td></tr>
          <tr><td><code style="color:var(--accent)">A / a</code></td><td>Arc</td><td>rx ry x-rot large sweep x,y</td><td>椭圆弧线</td></tr>
          <tr><td><code>Z / z</code></td><td>ClosePath</td><td>—</td><td>闭合路径回到起点</td></tr>
        </tbody>
      </table>
      <div style="margin-top:4px;font-size:10px;color:var(--text3)">连续同类命令可省略命令字母，只写参数</div>
    </div>
  </div>

  <!-- ══ 子面板④：样式系统 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">④ 样式系统 — CSS + 填充/描边/渐变/滤镜</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px">
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px">
        <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">CSS 来源（优先级从低到高）</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.7">
          1. <code>&lt;?xml-stylesheet href=""?&gt;</code> 外部样式表<br>
          2. <code>&lt;style&gt;</code> 内部块<br>
          3. presentation attributes（属性直接设）<br>
          4. 内联 <code>style=""</code> 属性<br>
          5. <code>!important</code> 规则
        </div>
      </div>
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px">
        <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">核心渲染属性</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.7">
          <code style="color:var(--accent)">fill</code> — 填充色/渐变/图案<br>
          <code style="color:var(--accent)">stroke</code> — 描边色<br>
          <code>stroke-width</code> / <code>opacity</code><br>
          <code>stroke-linecap</code> / <code>stroke-linejoin</code><br>
          <code>stroke-dasharray</code> — 虚线模式
        </div>
      </div>
    </div>
    <div style="margin-top:8px;padding:8px 10px;background:var(--surface2);border-radius:6px">
      <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">渐变与滤镜（渲染开销大）</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.7">
        <strong>渐变：</strong><code>&lt;linearGradient&gt;</code> / <code>&lt;radialGradient&gt;</code> + <code>&lt;stop offset="" stop-color=""/&gt;</code><br>
        <strong>图案：</strong><code>&lt;pattern&gt;</code> 可重复纹理<br>
        <strong>滤镜：</strong><code>&lt;filter&gt;</code> + 滤镜原语（feGaussianBlur / feColorMatrix / feBlend / feMerge）<br>
        <strong>遮罩裁剪：</strong><code>&lt;clipPath&gt;</code>、<code>&lt;mask&gt;</code>
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑤：光栅化管线 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑤ 光栅化管线 — XML → Render Tree → Pixel Buffer</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;flex-wrap:wrap;font-size:10px">
          <div style="padding:6px 8px;background:var(--accent-bg);border-radius:4px;color:var(--accent);text-align:center;white-space:nowrap">
            <strong>① XML DOM</strong><br>解析 XML
          </div>
          <span style="font-size:14px;color:var(--text3)">→</span>
          <div style="padding:6px 8px;background:#eaf3de;border-radius:4px;color:#97C459;text-align:center;white-space:nowrap">
            <strong>② Render Tree</strong><br>样式+盒模型
          </div>
          <span style="font-size:14px;color:var(--text3)">→</span>
          <div style="padding:6px 8px;background:#faeeda;border-radius:4px;color:#E8952F;text-align:center;white-space:nowrap">
            <strong>③ 路径分解</strong><br>贝塞尔→线段
          </div>
          <span style="font-size:14px;color:var(--text3)">→</span>
          <div style="padding:6px 8px;background:#fce4ec;border-radius:4px;color:#E85D75;text-align:center;white-space:nowrap">
            <strong>④ Cairo/Skia</strong><br>矢量渲染引擎
          </div>
          <span style="font-size:14px;color:var(--text3)">→</span>
          <div style="padding:6px 8px;background:var(--text);border-radius:4px;color:#fff;text-align:center;white-space:nowrap">
            <strong>⑤ RGBA Buffer</strong><br>像素矩阵输出
          </div>
        </div>
        <strong>④ 中引擎执行的步骤：</strong><br>
        路径栅格化 → 覆盖确定 → 抗锯齿（超采样/MSAA）<br>
        → 颜色/渐变填充 → Alpha混合 → RGBA pixel buffer<br>
        <br>
        <strong>常见后端选择：</strong><br>
        · <span class="hl">Cairo</span>：librsvg 所用，跨平台<br>
        · <span class="hl">Skia</span>：Chrome/Android，GPU加速<br>
        · <span class="hl">Qt/AGG</span>：其他应用引擎
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">交互：输出分辨率控制</div>
      <div class="param-row"><span class="param-label">输出宽度 px</span><input type="range" class="param-slider" id="svg-w" min="64" max="4096" step="64" value="800" oninput="svgUpdate()"><span class="param-val" id="svg-w-v">800</span></div>
      <div class="param-row"><span class="param-label">输出高度 px</span><input type="range" class="param-slider" id="svg-h" min="64" max="4096" step="64" value="600" oninput="svgUpdate()"><span class="param-val" id="svg-h-v">600</span></div>
      <div class="param-row"><span class="param-label">超采样抗锯齿</span><input type="range" class="param-slider" id="svg-aa" min="1" max="4" step="1" value="2" oninput="svgUpdate()"><span class="param-val" id="svg-aa-v">2×</span></div>
      <div class="param-row"><span class="param-label">背景色处理</span>
        <select id="svg-bg" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="svgUpdate()">
          <option value="white">白色背景（适合转JPEG）</option>
          <option value="transparent">保持透明（RGBA输出）</option>
        </select>
      </div>
      <div id="svg-calc" style="margin-top:10px;font-size:11px;color:var(--text2);line-height:2"></div>
    </div>
  </div>

  <!-- ══ 子面板⑥：Python/Cairo 片段 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑥ 输出确认：RGBA 像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        光栅化完成的像素缓冲：<br>
        · 尺寸：<span id="svg-out-size">--</span><br>
        · 通道：<strong>RGBA 4 通道</strong>（含Alpha）或 RGB 3 通道（白色背景）<br>
        · 数据类型：<code>uint8[H][W][4]</code><br>
        · 色彩空间：<strong>sRGB</strong><br>
        · 抗锯齿：<span id="svg-out-aa">--</span><br>
        · 背景：由 <code>background_color</code> 参数决定<br>
        <span class="tag tag-ok" style="margin-left:0">✓ SVG 光栅化完成，可进入下一步</span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python / Cairo 片段</div>
      <div class="formula-box"><span style="color:var(--text3)"># 方案 A：cairosvg（最简洁）</span>
<span class="hl">import</span> cairosvg, numpy <span class="hl">as</span> np
<span class="hl">from</span> io <span class="hl">import</span> BytesIO
<span class="hl">from</span> PIL <span class="hl">import</span> Image

png_bytes = cairosvg.svg2png(
    url=<span class="hl-g">'input.svg'</span>,
    output_width=<span class="hl">800</span>,
    output_height=<span class="hl">600</span>,
    background_color=<span class="hl-g">'white'</span>
)
img = Image.open(BytesIO(png_bytes))
arr = np.array(img)  <span style="color:var(--text3)"># RGBA or RGB uint8</span>

<span style="color:var(--text3)"># 方案 B：Cairo 直接渲染（精细控制）</span>
<span class="hl">import</span> cairo, numpy <span class="hl">as</span> np

surface = cairo.ImageSurface(
    cairo.FORMAT_ARGB32, <span class="hl">800</span>, <span class="hl">600</span>
)
ctx = cairo.Context(surface)
<span style="color:var(--text3)"># ctx.scale(), ctx.set_source_rgba(), 绘制路径...</span>
buf = surface.get_data()
arr = np.frombuffer(buf, np.uint8)
arr = arr.reshape(<span class="hl">600</span>, <span class="hl">800</span>, 4)
<span style="color:var(--text3)"># Cairo 为 BGRA 格式，需转换为 RGBA</span>
arr = arr[:, :, [2, 1, 0, 3]]

<span style="color:var(--text3)"># 方案 C：svglib + reportlab</span>
<span class="hl">from</span> svglib.svglib <span class="hl">import</span> svg2rlg
<span class="hl">from</span> reportlab.graphics <span class="hl">import</span> renderPM
drw = svg2rlg(<span class="hl-g">'input.svg'</span>)
renderPM.drawToFile(drw, <span class="hl-g">'output.png'</span>,
                    fmt=<span class="hl-g">'PNG'</span>)</div>
    </div>
  </div>
  `;

  // ─── 交互绑定 ───
  window.svgUpdate = function(){
    const w  = +document.getElementById('svg-w').value;
    const h  = +document.getElementById('svg-h').value;
    const aa = +document.getElementById('svg-aa').value;
    const bg = document.getElementById('svg-bg').value;
    document.getElementById('svg-w-v').textContent = w;
    document.getElementById('svg-h-v').textContent = h;
    document.getElementById('svg-aa-v').textContent = aa + '×';

    const rw = w * aa;
    const rh = h * aa;
    const channels = bg === 'white' ? 3 : 4;
    const mem = (channels * rw * rh / 1024 / 1024).toFixed(2);

    const calc = document.getElementById('svg-calc');
    if(calc) calc.innerHTML = `
      超采样缓冲：<strong>${rw} × ${rh}</strong> = ${(rw * rh / 1e6).toFixed(1)} MP<br>
      超采样内存：~<strong>${mem} MB</strong>（${channels} 通道）<br>
      最终缓冲：<strong>${w} × ${h}</strong>（降采样后）<br>
      输出通道数：<strong>${channels}</strong>（${bg === 'white' ? 'RGB' : 'RGBA'}）<br>
      <span style="color:var(--text3)">降采样方式：${aa}× 逐像素平均，非整数需额外过滤</span>`;

    const outSize = document.getElementById('svg-out-size');
    const outAA = document.getElementById('svg-out-aa');
    if(outSize) outSize.textContent = `${w} × ${h} = ${(w*h).toLocaleString()} 像素（${(w*h*4/1024).toFixed(1)} KB）`;
    if(outAA) outAA.textContent = `${aa}× 超采样 → 降采样至目标分辨率`;
  };
  svgUpdate();
});
