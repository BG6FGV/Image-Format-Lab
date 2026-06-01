/**
 * common/subsample.js — 色度下采样
 */
REGISTER_RENDERER('subsample', function(container){
  container.innerHTML = `
  <div class="detail-badge">色度下采样</div>
  <div class="detail-title">色度下采样（Chroma Subsampling）</div>
  <div class="detail-desc">降低 Cb/Cr 分量的空间分辨率，JPEG 常用 4:2:0，色度数据量减少 75%。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">采样方式与节省比例</div>
      <div class="param-row"><span class="param-label">采样方案</span>
        <select id="cs-mode" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="csUpdate()">
          <option value="444">4:4:4（无下采样）</option>
          <option value="422">4:2:2（水平 2:1）</option>
          <option value="420" selected>4:2:0（水平+垂直 2:1）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">原始宽度</span><input type="range" class="param-slider" id="cs-w" min="8" max="256" step="8" value="64" oninput="csUpdate()"><span class="param-val" id="cs-w-v">64</span></div>
      <div class="param-row"><span class="param-label">原始高度</span><input type="range" class="param-slider" id="cs-h" min="8" max="256" step="8" value="64" oninput="csUpdate()"><span class="param-val" id="cs-h-v">64</span></div>
      <div id="cs-stats" style="margin-top:10px;font-size:11px;line-height:1.9"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">4×4 块采样点示意</div>
      <div id="cs-viz"></div>
    </div>
  </div>`;
  window.csUpdate=function(){
    const m=document.getElementById('cs-mode').value;
    const w=+document.getElementById('cs-w').value, h=+document.getElementById('cs-h').value;
    document.getElementById('cs-w-v').textContent=w; document.getElementById('cs-h-v').textContent=h;
    const Ys=w*h;
    let cw=m==='444'?w:Math.ceil(w/2), ch=m==='420'?Math.ceil(h/2):h;
    const Cs=cw*ch, save=(100-(Ys+Cs*2)/(Ys*3)*100).toFixed(1);
    document.getElementById('cs-stats').innerHTML=`Y: ${w}×${h}=${Ys}，Cb/Cr: ${cw}×${ch}=${Cs} 各<br>总数据量节省：<strong style="color:var(--success)">${save}%</strong>`;
    const N=4, v=document.getElementById('cs-viz');
    let rows='';
    for(let r=0;r<N;r++){for(let c=0;c<N;c++){
      const has=m==='444'||(m==='422'&&c%2===0)||(m==='420'&&c%2===0&&r%2===0);
      rows+=`<div style="height:32px;background:${has?'#3266ad':'#d3d1c7'};opacity:${has?1:.3};border-radius:3px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">${has?'●':'○'}</div>`;
    }}
    v.innerHTML=`<div style="display:grid;grid-template-columns:repeat(${N},32px);gap:2px">${rows}</div><div style="font-size:10px;color:var(--text3);margin-top:5px">● 有采样点 ○ 插值恢复</div>`;
    SIM_PARAMS.subsampling = m==='444'?'4:4:4':m==='422'?'4:2:2':'4:2:0';
    refreshPreview();
  };
  csUpdate();
});
