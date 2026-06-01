/**
 * common/ycbcr.js — 色彩空间转换（RGB ↔ YCbCr）
 */
REGISTER_RENDERER('rgb2ycbcr', function(container){
  container.innerHTML = `
  <div class="detail-badge">RGB → YCbCr</div>
  <div class="detail-title">色彩空间转换：RGB → YCbCr</div>
  <div class="detail-desc">利用人眼对亮度远比色度敏感的特性，将 RGB 分解为亮度 Y 和两个色差 Cb/Cr，后续对色度做大幅下采样而不影响主观感知质量。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">调整 RGB 实时查看结果</div>
      <div class="param-row"><span class="param-label" style="color:#e24b4a">R（红）</span><input type="range" class="param-slider" id="rc-r" min="0" max="255" value="180" oninput="rcUpdate()"><span class="param-val" id="rc-r-v">180</span></div>
      <div class="param-row"><span class="param-label" style="color:#3b6d11">G（绿）</span><input type="range" class="param-slider" id="rc-g" min="0" max="255" value="120" oninput="rcUpdate()"><span class="param-val" id="rc-g-v">120</span></div>
      <div class="param-row"><span class="param-label" style="color:#185fa5">B（蓝）</span><input type="range" class="param-slider" id="rc-b" min="0" max="255" value="60" oninput="rcUpdate()"><span class="param-val" id="rc-b-v">60</span></div>
      <div id="rc-preview" style="margin-top:10px"></div>
      <div id="rc-proj"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">ITU-R BT.601 公式</div>
      <div class="formula-box">Y  = <span class="hl">0.299</span>R + <span class="hl">0.587</span>G + <span class="hl">0.114</span>B
Cb = <span class="hl">-0.1687</span>R <span class="hl">-0.3313</span>G + <span class="hl">0.5</span>B + 128
Cr = <span class="hl">0.5</span>R <span class="hl">-0.4187</span>G <span class="hl">-0.0813</span>B + 128</div>
      <div id="rc-result" style="font-size:11px;line-height:2"></div>
      <div id="rc-chans" style="margin-top:8px"></div>
    </div>
  </div>`;
  window.rcUpdate=function(){
    const R=+document.getElementById('rc-r').value,G=+document.getElementById('rc-g').value,B=+document.getElementById('rc-b').value;
    ['r','g','b'].forEach(k=>document.getElementById('rc-'+k+'-v').textContent=+document.getElementById('rc-'+k).value);
    const Y=Math.round(0.299*R+0.587*G+0.114*B),Cb=Math.round(-0.1687*R-0.3313*G+0.5*B+128),Cr=Math.round(0.5*R-0.4187*G-0.0813*B+128);
    document.getElementById('rc-preview').innerHTML=colorBar(R,G,B,`RGB(${R},${G},${B})`);
    document.getElementById('rc-result').innerHTML=`Y=<strong>${Y}</strong>（亮度）<br>Cb=<strong>${Cb}</strong>（蓝色差）<br>Cr=<strong>${Cr}</strong>（红色差）`;
    renderColorProjection('rc-proj',R,G,B); renderChannelSplit('rc-chans',Y,Cb,Cr);
  };
  rcUpdate();
});

REGISTER_RENDERER('ycbcr2rgb', function(container){
  container.innerHTML = `
  <div class="detail-badge">色彩空间反转</div>
  <div class="detail-title">YCbCr → RGB</div>
  <div class="detail-desc">用 BT.601 逆矩阵将 YCbCr 还原为 RGB，结果需钳位到 [0, 255]。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">调整 YCbCr，查看 RGB 结果</div>
      <div class="param-row"><span class="param-label">Y（亮度）</span><input type="range" class="param-slider" id="yr-y" min="0" max="255" value="150" oninput="yrUpdate()"><span class="param-val" id="yr-y-v">150</span></div>
      <div class="param-row"><span class="param-label">Cb</span><input type="range" class="param-slider" id="yr-cb" min="0" max="255" value="128" oninput="yrUpdate()"><span class="param-val" id="yr-cb-v">128</span></div>
      <div class="param-row"><span class="param-label">Cr</span><input type="range" class="param-slider" id="yr-cr" min="0" max="255" value="160" oninput="yrUpdate()"><span class="param-val" id="yr-cr-v">160</span></div>
      <div id="yr-preview" style="margin-top:10px"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">BT.601 逆变换</div>
      <div class="formula-box">R = Y + <span class="hl">1.402</span>·(Cr-128)
G = Y - <span class="hl">0.3441</span>·(Cb-128) - <span class="hl">0.7141</span>·(Cr-128)
B = Y + <span class="hl">1.772</span>·(Cb-128)
<span style="color:var(--text3)">钳位到 [0, 255]</span></div>
      <div id="yr-result" style="margin-top:6px;font-size:11px;line-height:2"></div>
    </div>
  </div>`;
  window.yrUpdate=function(){
    const Y=+document.getElementById('yr-y').value,Cb=+document.getElementById('yr-cb').value,Cr=+document.getElementById('yr-cr').value;
    document.getElementById('yr-y-v').textContent=Y;document.getElementById('yr-cb-v').textContent=Cb;document.getElementById('yr-cr-v').textContent=Cr;
    const clamp=v=>Math.min(255,Math.max(0,Math.round(v)));
    const R=clamp(Y+1.402*(Cr-128)),G=clamp(Y-0.3441*(Cb-128)-0.7141*(Cr-128)),B=clamp(Y+1.772*(Cb-128));
    document.getElementById('yr-preview').innerHTML=colorBar(R,G,B,`RGB(${R},${G},${B})`);document.getElementById('yr-result').innerHTML=`R=${R}, G=${G}, B=${B}`;
  };
  yrUpdate();
});
