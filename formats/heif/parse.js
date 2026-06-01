/**
 * formats/heif/parse.js — HEIF/HEIC 解码（深度版）
 */
REGISTER_RENDERER('parseHEIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解码 HEIF/HEIC 文件</div>
  <div class="detail-desc">
    HEIF（High Efficiency Image File Format）是 MPEG 制定的现代图片格式，基于 ISOBMFF 容器（与 MP4 同源），
    内部使用 HEVC（H.265）编码图像数据。iOS 11+ 设备拍照默认输出 .heic 格式。
    <a class="adv-link" onclick="openAdvanced('HEIF 全盒子解析','<div class=formula-box>盒子树：<br>├─ ftyp: heic / mif1<br>├─ mdat: HEVC位流<br>└─ moov<br>&nbsp;&nbsp;&nbsp;└─ meta<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ hdlr = pict<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ pitm<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ iloc<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ iinf<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ iprp → ispe/colr/pixi/hvcC<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ iref → auxl (Alpha) / thmb (缩略图)</div>')">[查看完整盒子树]</a>
  </div>

  <!-- ① ISOBMFF 容器全景 -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① ISOBMFF 容器结构全景</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;line-height:2.2">
        <div style="display:flex;gap:0">
          <div style="flex:none;width:70px;height:38px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent);font-weight:500">ftyp</div>
          <div style="flex:1;height:38px;background:#f0efe9;border:0.5px solid #c8c5bf;border-left:none;border-radius:0 4px 0 0;display:flex;align-items:center;padding:0 8px;font-size:10px;color:var(--text2)">文件类型标识</div>
        </div>
        <div style="display:flex;gap:0">
          <div style="flex:none;width:40px;height:60px;background:#f7f5f0;border:0.5px solid #c8c5bf;border-right:none;border-radius:0 0 0 4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--text2);writing-mode:vertical-rl">moov</div>
          <div style="flex:1;height:60px;background:#f7f5f0;border:0.5px solid #c8c5bf;display:flex;flex-direction:column;justify-content:center;padding:0 8px;font-size:10px;color:var(--text2);line-height:1.6">
            meta→hdlr(pict)→pitm→iloc→iinf→iprp→iref
          </div>
        </div>
        <div style="display:flex;gap:0;margin-top:2px">
          <div style="flex:none;width:50px;height:30px;background:#eaf3de;border:0.5px solid #97C459;border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--success);font-weight:500">mdat</div>
          <div style="flex:1;height:30px;background:#eaf3de;border:0.5px solid #97C459;border-left:none;border-radius:0 4px 4px 0;display:flex;align-items:center;padding:0 8px;font-size:10px;color:var(--success)">HEVC 编码位流（图像数据本体）</div>
        </div>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">ISOBMFF 盒子头结构</div>
      <table class="byte-table">
        <tr><th>偏移</th><th>大小</th><th>字段</th><th>含义</th></tr>
        <tr><td><code>0x00</code></td><td>4B</td><td><code style="color:var(--accent)">size</code></td><td>盒子总字节数</td></tr>
        <tr><td><code>0x04</code></td><td>4B</td><td><code style="color:var(--accent)">type</code></td><td>4 字符类型标识</td></tr>
        <tr><td><code>0x08</code></td><td>可变</td><td><code>payload</code></td><td>盒子数据内容</td></tr>
      </table>
      <div style="margin-top:6px;font-size:10px;color:var(--text2)">
        特例：size = 1 → 64 位 largesize 字段（8B）在 type 之后
      </div>
    </div>
  </div>

  <!-- ② 元数据盒子链 -->
  <div class="viz-card">
    <div class="viz-card-title">② meta 盒子关键子节点链</div>
    ${[
      ['hdlr','Handler Reference','handler_type = pict（图片处理器）','10 B'],
      ['pitm','Primary Item','指定哪张图片为主图','2 B'],
      ['iloc','Item Location','每项的 {offset, length, baseOffset}','可变'],
      ['iinf','Item Info','每项的 {type(mime/hvc1/av01), name}','可变'],
      ['iprp','Item Properties','ispe(尺寸) + colr(色彩) + pixi(位深) + hvcC(HEVC配置)','可变'],
      ['iref','Item Reference','alpha→主图，thumbnail→主图','可变'],
    ].map(([c,n,d,s])=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;padding:6px 10px;background:var(--surface2);border-radius:6px">
        <code style="width:40px;font-size:10px;color:var(--accent);font-weight:500">${c}</code>
        <span style="width:120px;font-size:11px;font-weight:500">${n}</span>
        <span style="flex:1;font-size:11px;color:var(--text2)">${d}</span>
        <span style="font-size:10px;color:var(--text3)">${s}</span>
      </div>`).join('')}
  </div>

  <!-- ③ HEVC 解码管线 -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">③ HEVC 关键参数（hvcC 盒子）</div>
      <div class="param-row"><span class="param-label">配置版本</span>
        <select id="hevc-ver" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="hevcUpdate()">
          <option value="1" selected>configurationVersion = 1</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">编码档次</span>
        <select id="hevc-prof" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="hevcUpdate()">
          <option value="main" selected>Main</option><option value="main10">Main 10（10-bit）</option>
          <option value="mainstill">Main Still Picture</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="hevc-w" min="64" max="4096" step="64" value="640" oninput="hevcUpdate()"><span class="param-val" id="hevc-w-v">640</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="hevc-h" min="64" max="4096" step="64" value="480" oninput="hevcUpdate()"><span class="param-val" id="hevc-h-v">480</span></div>
      <div id="hevc-params" style="margin-top:8px;font-size:11px;line-height:1.9;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">④ HEVC 解码管线（4 大阶段）</div>
      <div style="font-size:11px;color:var(--text2);line-height:2.2">
        <div style="padding:6px 10px;margin-bottom:6px;background:var(--accent-bg);border-radius:6px">
          <strong style="color:var(--accent)">阶段1：CABAC 熵解码</strong><br>
          <span style="font-size:10px">上下文自适应二进制算术编码反变换 → 还原语法元素（模式、分区、系数）</span>
        </div>
        <div style="padding:6px 10px;margin-bottom:6px;background:#faeeda;border-radius:6px">
          <strong style="color:var(--warn)">阶段2：反量化 + 反变换</strong><br>
          <span style="font-size:10px">QStep ← QP(0~51)，DCT/DST 反变换，64×64→32×32→16×16→4×4 分层变换树</span>
        </div>
        <div style="padding:6px 10px;margin-bottom:6px;background:#eaf3de;border-radius:6px">
          <strong style="color:var(--success)">阶段3：帧内预测恢复</strong><br>
          <span style="font-size:10px">35 种方向预测模式 + Planar + DC，CTU 尺寸 16/32/64</span>
        </div>
        <div style="padding:6px 10px;background:#fcebeb;border-radius:6px">
          <strong style="color:var(--danger)">阶段4：去方块滤波 + SAO</strong><br>
          <span style="font-size:10px">Deblocking Filter → Sample Adaptive Offset → 输出重建帧</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ⑤ YUV→RGB + Alpha -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑤ ispe 图像尺寸 + colr 色彩信息</div>
      <table class="byte-table">
        <tr><th>属性</th><th>值示例</th><th>说明</th></tr>
        <tr><td>ispe width</td><td>3024</td><td>编码图像宽度</td></tr>
        <tr><td>ispe height</td><td>4032</td><td>编码图像高度（iPhone 12MP）</td></tr>
        <tr><td>colr type</td><td>nclx</td><td>色彩类型：nclx（最常见）/ prof / rICC</td></tr>
        <tr><td>color_primaries</td><td>1 (BT.709)</td><td>sRGB 色彩空间</td></tr>
        <tr><td>transfer_characteristics</td><td>13 (sRGB)</td><td>伽马 + 线性段</td></tr>
        <tr><td>matrix_coefficients</td><td>6 (BT.601)</td><td>YCbCr → RGB 转换矩阵</td></tr>
        <tr><td>full_range_flag</td><td>1</td><td>完整范围 0-255（非视频的 16-235）</td></tr>
      </table>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">⑥ Alpha 辅助通道处理</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        <div style="padding:6px 10px;margin-bottom:6px;background:var(--surface2);border-radius:6px">
          <strong>iref 引用链：</strong>主图 item → <code>auxl</code> → Alpha item
        </div>
        <div style="padding:6px 10px;margin-bottom:6px;background:var(--surface2);border-radius:6px">
          <strong>Alpha 类型：</strong><br>
          · monochrome（单通道 8/10-bit 灰度 Alpha）<br>
          · premultiplied（预乘 Alpha，渲染引擎直接合成）<br>
          · unpremultiplied（非预乘，需先乘 Alpha 再合成）
        </div>
        <div style="padding:6px 10px;background:var(--surface2);border-radius:6px">
          <strong>合成公式：</strong><br>
          <code>out = α/255 × fg + (1-α/255) × bg</code><br>
          预乘情况下：<code>out = fg_premul + (1-α/255) × bg</code>
        </div>
      </div>
    </div>
  </div>

  <!-- ⑦ Python -->
  <div class="viz-card">
    <div class="viz-card-title">⑦ Python 完整解码片段</div>
    <div class="formula-box"><span class="hl">import</span> pillow_heif
<span class="hl">from</span> PIL <span class="hl">import</span> Image

<span style="color:var(--text3)"># 注册 HEIF 解码器</span>
pillow_heif.register_heif_opener()

<span style="color:var(--text3)"># 读取 HEIC 文件</span>
img = Image.open(<span class="hl-g">'photo.heic'</span>)
<span class="hl">print</span>(img.mode)     <span style="color:var(--text3)"># 'RGBA' 或 'RGB'</span>
<span class="hl">print</span>(img.size)     <span style="color:var(--text3)"># (3024, 4032)</span>

<span style="color:var(--text3)"># 查看 EXIF 元数据（来自 ExifData 盒子）</span>
exif = img.getexif()
<span class="hl">if</span> exif:
    <span class="hl">print</span>(<span class="hl">dict</span>(exif))   <span style="color:var(--text3)"># {271: 'Apple', 272: 'iPhone 12', ...}</span>

<span style="color:var(--text3)"># 获取 HEIF 特有信息</span>
heif = pillow_heif.open_heif(<span class="hl-g">'photo.heic'</span>)
<span class="hl">print</span>(heif.bit_depth)  <span style="color:var(--text3)"># 8 或 10</span>
<span class="hl">print</span>(heif.has_alpha)  <span style="color:var(--text3)"># True/False</span>

<span style="color:var(--text3)"># 转为 numpy 数组进行后续转换</span>
<span class="hl">import</span> numpy <span class="hl">as</span> np
arr = np.array(img)  <span style="color:var(--text3)"># shape=(H, W, 3|4) uint8</span></div>
  </div>
  `;

  window.hevcUpdate = function(){
    const w=+document.getElementById('hevc-w').value,
          h=+document.getElementById('hevc-h').value,
          prof=document.getElementById('hevc-prof').value;
    document.getElementById('hevc-w-v').textContent=w;
    document.getElementById('hevc-h-v').textContent=h;
    const d={main:'Main — 8-bit 4:2:0',main10:'Main 10 — 10-bit 4:2:0',mainstill:'Main Still — 8/10-bit, 仅帧内'};
    document.getElementById('hevc-params').innerHTML=
      `图像：<strong>${w}×${h}</strong>（${(w*h/1e6).toFixed(1)} MP）<br>
       编码：<strong>HEVC Intra</strong>（仅帧内编码，无帧间）<br>
       档次：${d[prof]}<br>
       尺寸属性存储于 <code>ispe</code> 盒子`;
  };
  hevcUpdate();
});
