/**
 * common/upsampling.js — 色度上采样
 */
REGISTER_RENDERER('upsample', function(container){
  container.innerHTML = `
  <div class="detail-badge">色度上采样</div>
  <div class="detail-title">色度上采样：恢复 Cb/Cr 原始分辨率</div>
  <div class="detail-desc">JPEG 编码时对 Cb/Cr 做了 4:2:0 下采样，解码后需通过插值将它们放大回原始分辨率。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">插值方式选择</div>
      <div class="param-row"><span class="param-label">插值算法</span>
        <select id="up-mode" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="upUpdate()">
          <option value="nearest">最近邻</option>
          <option value="bilinear" selected>双线性（JPEG 标准）</option>
          <option value="bicubic">双三次</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">下采样方案</span>
        <select id="up-sub" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="upUpdate()">
          <option value="420" selected>4:2:0</option>
          <option value="422">4:2:2</option>
          <option value="444">4:4:4</option>
        </select>
      </div>
      <div id="up-info" style="margin-top:10px;font-size:11px;color:var(--text2)"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Python 片段</div>
      <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image
cb_full = Image.fromarray(cb_small).resize((width, height), Image.BILINEAR)
cr_full = Image.fromarray(cr_small).resize((width, height), Image.BILINEAR)</div>
    </div>
  </div>`;
  window.upUpdate=function(){
    const sub=document.getElementById('up-sub').value, mode=document.getElementById('up-mode').value;
    const d={nearest:'最近邻：直接复制，速度快但有块感。', bilinear:'双线性：对4邻域加权平均，JPEG标准选择。', bicubic:'双三次：对16邻域三次插值，质量最高。'};
    const s={420:'Cb/Cr 从 ½W×½H → W×H（×4）', 422:'Cb/Cr 从 ½W×H → W×H（×2）', 444:'无需上采样'};
    document.getElementById('up-info').innerHTML=`<strong>操作：</strong>${s[sub]}<br><strong>插值：</strong>${d[mode]}`;
  };
  upUpdate();
});
