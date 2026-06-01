/**
 * common/alpha.js — 透明通道处理
 */
REGISTER_RENDERER('alphaHandle', function(container){
  container.innerHTML = `
  <div class="detail-badge">Alpha 通道</div>
  <div class="detail-title">透明通道处理策略</div>
  <div class="detail-desc">不同目标格式对 Alpha 通道的支持差异显著，转换时需明确处理策略。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">Alpha 支持对照</div>
      ${[['PNG','完整 RGBA'],['WebP 无损','完整 RGBA'],['AVIF','独立Alpha编码'],['HEIF','辅助 item Alpha'],['GIF','1位透明<span class="tag tag-warn">限制</span>'],['JPEG','不支持<span class="tag tag-danger">丢弃</span>'],['BMP 24位','不支持<span class="tag tag-danger">丢弃</span>'],['TIFF','可选保留'],['SVG','光栅化处理']].map(([f,d])=>`
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;font-size:11px">
          <span style="width:80px;font-weight:500">${f}</span>
          <span style="color:var(--text2)">${d}</span>
        </div>`).join('')}
    </div>
    <div class="viz-card">
      <div class="viz-card-title">Alpha 合成参数</div>
      <div class="param-row"><span class="param-label">背景色 R</span><input type="range" class="param-slider" id="ah-r" min="0" max="255" value="255" oninput="ahUpdate()"><span class="param-val" id="ah-r-v">255</span></div>
      <div class="param-row"><span class="param-label">背景色 G</span><input type="range" class="param-slider" id="ah-g" min="0" max="255" value="255" oninput="ahUpdate()"><span class="param-val" id="ah-g-v">255</span></div>
      <div class="param-row"><span class="param-label">背景色 B</span><input type="range" class="param-slider" id="ah-b" min="0" max="255" value="255" oninput="ahUpdate()"><span class="param-val" id="ah-b-v">255</span></div>
      <div id="ah-preview" style="margin-top:8px"></div>
      <div class="formula-box" style="margin-top:8px">out = α/255 × src + (1-α/255) × bg</div>
    </div>
  </div>`;
  window.ahUpdate=function(){
    const r=+document.getElementById('ah-r').value, g=+document.getElementById('ah-g').value, b=+document.getElementById('ah-b').value;
    ['r','g','b'].forEach(k=>document.getElementById('ah-'+k+'-v').textContent=+document.getElementById('ah-'+k).value);
    document.getElementById('ah-preview').innerHTML=colorBar(r,g,b,`背景色 RGB(${r},${g},${b})`);
  };
  ahUpdate();
});
