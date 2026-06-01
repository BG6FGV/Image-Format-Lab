/**
 * formats/gif/lzw.js — LZW 编码
 */
REGISTER_RENDERER('lzwCompress', function(container){
  container.innerHTML = `
  <div class="detail-badge">LZW 编码</div>
  <div class="detail-title">GIF LZW 编码</div>
  <div class="detail-desc">LZW 以调色板索引流为输入，动态建立字典，遇到重复序列直接输出字典码，实现无损压缩。</div>
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">参数</div>
      <div class="param-row"><span class="param-label">最小码长</span><input type="range" class="param-slider" id="lz-min" min="2" max="8" step="1" value="8" oninput="lzUpdate()"><span class="param-val" id="lz-min-v">8</span></div>
      <div id="lz-info" style="margin-top:8px;font-size:11px;color:var(--text2)"></div>
    </div>
    <div class="viz-card">
      <div class="viz-card-title">LZW 流程</div>
      <div style="font-size:11px;color:var(--text2);line-height:2">
        1. 初始字典：单像素索引 0~2^min-1<br>
        2. 加入<span class="tag tag-info">清除码</span>和<span class="tag tag-warn">结束码</span><br>
        3. 读入像素，拼接到当前字符串<br>
        4. 在字典中 → 继续读；不在 → 输出码，添加条目<br>
        5. 字典满 4096 → 输出清除码，重置
      </div>
    </div>
  </div>`;
  window.lzUpdate=function(){
    const m=+document.getElementById('lz-min').value; document.getElementById('lz-min-v').textContent=m;
    document.getElementById('lz-info').innerHTML=`颜色深度=${m-1}位（最多${1<<(m-1)}色）<br>初始字典：<strong>${(1<<(m-1))+2}</strong>条<br>码长：${m}→12位（最大4096条）`;
  };
  lzUpdate();
});
