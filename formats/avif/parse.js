/**
 * formats/avif/parse.js — AVIF 解码（6 个子面板深度展示）
 * 注册为 parseAVIF 步骤渲染器
 */
REGISTER_RENDERER('parseAVIF', function(container){
  container.innerHTML = `
  <div class="detail-badge">步骤一 · 解析源格式</div>
  <div class="detail-title">解码 AVIF 文件：ISOBMFF → Item Refs → AV1 帧内 → RGBA 像素</div>
  <div class="detail-desc">
    AVIF（AV1 Image File Format）将 <span class="hl">AV1 帧内编码帧</span> 存放在
    <span class="hl">ISOBMFF</span>（ISO Base Media File Format）容器中。
    容器负责组织图像项、属性和元数据，AV1 解码器负责帧内预测+反变换+YUV→RGB。
    与 HEIF（HEVC）相比，同等质量下文件更小，且免专利费。
    <a class="adv-link" onclick="openAdvanced('AVIF 标准','<div>ISO 23000-22 + AV1 bitstream</div>')">[标准详细说明]</a>
  </div>

  <!-- ══ 子面板①：ISOBMFF 容器解析 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">① ISOBMFF 容器 — Box Tree 结构</div>
      <div style="font-family:'Courier New',monospace;font-size:10px;line-height:2.2;color:var(--text2)">
        <div style="margin-bottom:2px">
          <code style="color:var(--accent)">ftyp</code> <span style="color:var(--text3)">— 文件类型：major_brand="avif"</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">├─ moov</code> <span style="color:var(--text3)">— Movie Box（元数据容器）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;├─ mvhd</code> <span style="color:var(--text3)">— 电影头</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;├─ meta</code> <span style="color:var(--text3)">— 元数据（含 item 系统）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;├─ hdlr</code> <span style="color:var(--text3)">— 处理器类型："pict"</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;├─ pitm</code> <span style="color:#E85D75">— ★ Primary Item ID</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;├─ iloc</code> <span style="color:#E85D75">— ★ Item Location（数据偏移+长度）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;├─ iinf</code> <span style="color:#E85D75">— ★ Item Information（条目列表）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;├─ iprp</code> <span style="color:#E85D75">— ★ Item Properties（属性关联）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">│&nbsp;&nbsp;│&nbsp;&nbsp;└─ iref</code> <span style="color:#E85D75">— ★ Item References（引用关系）</span>
        </div>
        <div style="margin-bottom:2px">
          &nbsp;&nbsp;<code style="color:var(--accent)">└─ mdat</code> <span style="color:var(--text3)">— Media Data（AV1 位流数据）</span>
        </div>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Box Header 结构</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        <strong>标准 Box Header：</strong>
        <table class="byte-table">
          <thead><tr><th>字段</th><th>大小</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td><code>size</code></td><td>4B (BE)</td><td>含 header 的全 box 大小</td></tr>
            <tr><td><code>type</code></td><td>4B (ASCII)</td><td>FourCC 类型标识</td></tr>
          </tbody>
        </table>
        <br>
        <strong>扩展大小：</strong>size=1 → 后接 <span class="hl">8B largesize</span><br>
        size=0 → box 到文件尾<br>
        <strong>FullBox 扩展：</strong>type 后接 <span class="hl">1B version + 3B flags</span>
      </div>
    </div>
  </div>

  <!-- ══ 子面板②：Item Reference 系统 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">② Item Reference 系统 — iloc + iinf + iprp + iref</div>
    <table class="byte-table">
      <thead><tr><th>Box</th><th>作用</th><th>关键字段</th></tr></thead>
      <tbody>
        ${[
          ['<code style="color:var(--accent)">pitm</code>','主图像项','<code>item_ID</code> — 指向主图像项'],
          ['<code style="color:var(--accent)">iinf</code>','Item Info','<code>entry_count + [item_ID, protection, name, type]</code> — 列出所有图像项'],
          ['<code style="color:var(--accent)">iloc</code>','Item Location','<code>item_ID + method(0=mdat,1=idat) + offset + length</code> — 告知 mdat 中数据位置'],
          ['<code style="color:var(--accent)">iprp</code>','Item Properties','<code>ipco(容器:av1C/ispe/pixi/...) + ipma(每项关联属性索引)</code>'],
          ['<code style="color:var(--accent)">iref</code>','Item References','<code>from_item_ID + ref_type("auxl"/"thmb"/"dimg") + to_item_ID[]</code>'],
        ].map(([box,role,fields])=>`
          <tr>
            <td>${box}</td>
            <td style="font-size:10px">${role}</td>
            <td style="font-size:10px;color:var(--text2)">${fields}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:8px;font-size:10px;color:var(--text3)">
      典型流程：pitm 获取主图像 item_ID → iloc 找到 mdat 偏移 → iprp/ipma 取得 av1C 解码配置 → 送入 AV1 解码器
    </div>
  </div>

  <!-- ══ 子面板③：AV1 编码属性 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">③ AV1 编码属性 — av1C Box</div>
      <table class="byte-table">
        <thead><tr><th>字段</th><th>位宽</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><code>marker</code></td><td>1B</td><td>版本=1</td></tr>
          <tr><td><code>seq_profile</code></td><td>3b</td><td>0=Main, 1=High, 2=Professional</td></tr>
          <tr><td><code>seq_level_idx_0</code></td><td>5b</td><td>级别索引 (2.0 ~ 7.3)</td></tr>
          <tr><td><code>seq_tier_0</code></td><td>1b</td><td>0=Main tier, 1=High tier</td></tr>
          <tr><td><code>high_bitdepth</code></td><td>1b</td><td>0=8bit, 1=10/12bit</td></tr>
          <tr><td><code>twelve_bit</code></td><td>1b</td><td>0=10bit, 1=12bit</td></tr>
          <tr><td><code>monochrome</code></td><td>1b</td><td>0=彩色, 1=灰度</td></tr>
          <tr><td><code>chroma_subsampling_x</code></td><td>1b</td><td>0=无水平子采样, 1=水平子采样</td></tr>
          <tr><td><code>chroma_subsampling_y</code></td><td>1b</td><td>0=无垂直子采样, 1=垂直子采样</td></tr>
          <tr><td><code>chroma_sample_position</code></td><td>2b</td><td>0=未知, 1=Top-Left, 2=居中</td></tr>
        </tbody>
      </table>
      <div style="margin-top:6px">
        <strong>ispe Box（Image Spatial Extents）：</strong><br>
        <code>image_width (4B)</code> + <code>image_height (4B)</code>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">常用 Profile 与颜色配置</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <strong>Profile：</strong><br>
        · <span class="hl">Main (0)</span>：8/10 bit，4:2:0 — 最常用<br>
        · <span class="hl">High (1)</span>：8/10 bit，4:4:4<br>
        · <span class="hl">Professional (2)</span>：8/10/12 bit，全采样<br>
        <br>
        <strong>色度采样（chroma_subsampling）：</strong><br>
        · x=0, y=0 → <span class="hl">4:4:4</span>（无子采样）<br>
        · x=1, y=1 → <span class="hl">4:2:0</span>（最常用）<br>
        · x=1, y=0 → <span class="hl">4:2:2</span><br>
        <br>
        <strong>colr Box（色彩）：</strong><br>
        · nclx (nclc)：显式声明 primary/transfer/matrix<br>
        · ICC Profile：嵌入完整色彩配置文件
      </div>
    </div>
  </div>

  <!-- ══ 子面板④：AV1 帧内解码 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">④ AV1 帧内解码 — Superblock → 预测 → 变换 → 重建</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px">
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">Superblock 分区</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.7;margin-top:4px">
          帧划分为 <span class="hl">Superblock</span>：<br>
          · SB 128×128 或 64×64<br>
          · 嵌套四叉树递归分区<br>
          · 最小块：4×4 亮度<br>
          · AVIF 仅使用帧内块
        </div>
      </div>
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">56 种帧内预测模式</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.7;margin-top:4px">
          · <span class="hl">方向预测</span>（角度模式）<br>
          · DC_PRED / SMOOTH_PRED<br>
          · <span class="hl">CfL (Chroma from Luma)</span><br>
          &nbsp;&nbsp;色度从亮度预测<br>
          · PAETH_PRED<br>
          · RECURSIVE 滤波<br>
          · Palette 调色盘模式
        </div>
      </div>
      <div style="padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:500;color:var(--text)">4 种变换类型</div>
        <div style="font-size:10px;color:var(--text2);line-height:1.7;margin-top:4px">
          · <span class="hl">DCT</span> — 离散余弦变换<br>
          · <span class="hl">ADST</span> — 非对称正弦变换<br>
          · <span class="hl">FlipADST</span> — 翻转 ADST<br>
          · <span class="hl">IDTX</span> — 恒等变换<br>
          大小：4×4 → 64×64<br>
          水平/垂直独立选择
        </div>
      </div>
    </div>
    <div style="margin-top:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;font-size:10px;color:var(--text2);line-height:1.7">
      <strong>解码步骤链：</strong>
      熵解码（CDF/算术）→ 反量化（Q索引→步长）→ 逆变换 → <span class="hl">预测值+残差→重建</span> →
      Loop滤波（去块+CDEF+LR环路修复）→ YUV→RGB转换
    </div>
  </div>

  <!-- ══ 子面板⑤：Alpha 辅助项 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑤ Alpha 辅助项 — 独立 Alpha + 预乘属性</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        <strong>Alpha 项组织：</strong><br>
        1. 主图像（彩色 YUV）和 Alpha 项各有独立 <code>item_ID</code><br>
        2. iref 中 <code>ref_type="auxl"</code> 关联二者<br>
        3. Alpha 项是 AV1 帧，编码为 <span class="hl">单色 8/10/12 bit</span><br>
        4. 通过 iloc 分别定位主图和Alpha数据<br>
        <br>
        <strong>预乘 vs 非预乘：</strong><br>
        · <code>premultiplied</code>：RGB 已乘 Alpha<br>
        · <code>unpremultiplied</code>：RGB 与 A 独立<br>
        · 标志在 AV1 序列头 <code>color_config</code> 中
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Alpha 项属性集</div>
      <table class="byte-table">
        <thead><tr><th>属性</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><code>pixi</code></td><td>像素深度（Alpha 通常 8bpp）</td></tr>
          <tr><td><code>ispe</code></td><td>Alpha 图像尺寸（同主图）</td></tr>
          <tr><td><code>av1C</code></td><td>AV1 编码配置（monochrome=1）</td></tr>
          <tr><td><code>auxC</code></td><td>Auxiliary Type URN 标识</td></tr>
        </tbody>
      </table>
      <div style="font-size:10px;color:var(--text3);margin-top:6px">
        解码后合并：主图YUV→RGB + Alpha→A → 组装RGBA矩阵
      </div>
    </div>
  </div>

  <!-- ══ 子面板⑥：Python 片段 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">⑥ 输出确认：RGBA 像素矩阵</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        经 ISOBMFF 解析、Item定位、AV1解码后：<br>
        · 图像尺寸：<span class="hl">由 ispe 声明</span><br>
        · 位深：8/10/12 bit<br>
        · 色度：4:2:0 / 4:4:4 / 4:0:0<br>
        · Alpha：可选独立项<br>
        · 色彩空间：BT.709/BT.2020等<br>
        · 数据类型：<code>uint8[H][W][4]</code> 或 <code>uint16[H][W][4]</code><br>
        <span class="tag tag-ok" style="margin-left:0">✓ AVIF 解码完成，可进入下一步</span>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">Python 完整实现片段</div>
      <div class="formula-box"><span style="color:var(--text3)"># 方案 A：Pillow-AVIF 插件（最简单）</span>
<span class="hl">from</span> PIL <span class="hl">import</span> Image
<span class="hl">import</span> pillow_avif, numpy <span class="hl">as</span> np

pillow_avif.register_avif_opener()
img = Image.open(<span class="hl-g">'input.avif'</span>)
arr = np.array(img)  <span style="color:var(--text3)"># RGBA or RGB uint8</span>

<span style="color:var(--text3)"># 方案 B：libavif 绑定（C 级性能）</span>
<span class="hl">import</span> avif, ctypes, numpy <span class="hl">as</span> np

decoder = avif.Decoder()
<span class="hl">with</span> open(<span class="hl-g">'input.avif'</span>, <span class="hl-g">'rb'</span>) <span class="hl">as</span> f:
    data = f.read()

<span style="color:var(--text3)"># ISOBMFF 解析 + AV1 解码</span>
rgb, alpha, w, h, depth = decoder.decode(data)
arr = np.zeros((h, w, 4), dtype=np.uint8)
arr[:,:,0:3] = rgb  <span style="color:var(--text3)"># RGB</span>
<span class="hl">if</span> alpha <span class="hl">is not None</span>:
    arr[:,:,3] = alpha
<span class="hl">else</span>:
    arr[:,:,3] = 255  <span style="color:var(--text3)"># 全不透明</span>

<span class="hl">return</span> arr  <span style="color:var(--text3)"># shape=(H,W,4) RGBA uint8</span></div>
    </div>
  </div>
  `;

  // AVIF 无交互控件，保留框架一致性
  window.avifUpdate = function(){};
  avifUpdate();
});
