/**
 * formats/png/filter.js — PNG 行滤波器深度交互演示
 * 注册为 pngFilter 步骤渲染器
 */

REGISTER_RENDERER('pngFilter', function(container){
  container.innerHTML = `
  <div class="detail-badge">PNG 行滤波器</div>
  <div class="detail-title">PNG 行滤波算法详解</div>
  <div class="detail-desc">
    PNG 编码时对每行数据先滤波再 Deflate 压缩。滤波器将像素值转为与邻域像素的差值，使数据熵更低。
    每行独立选择最佳滤波器（使压缩后字节数最小的那一种）。解码时执行对应逆运算还原像素。
    这一机制是 PNG 实现<span class="hl">无损高压缩率</span>的核心创新，借鉴自 PNG 前身 paq/unix 工具的设计。
  </div>

  <!-- ══ 5 种滤波类型完整公式 ══ -->
  <div class="viz-card">
    <div class="viz-card-title">五种滤波类型 — 编码公式与解码逆运算</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:8px">
      ${[
        {
          n:'0', name:'None', color:'var(--text2)', bg:'var(--surface2)',
          enc:'Filtered[x] = Raw[x]',
          dec:'Cur[x] = Filtered[x]',
          desc:'直接存储原始字节。熵高但无需计算，对已低熵数据（如纯色块）适用。'
        },
        {
          n:'1', name:'Sub', color:'var(--accent)', bg:'var(--accent-bg)',
          enc:'Filtered[x] = Raw[x] − Raw[x−bps]',
          dec:'Cur[x] = Filtered[x] + Cur[x−bps]',
          desc:'与<span class="hl">左侧</span>同通道像素差分（bps=bytes per pixel）。对水平渐变区域效果极佳。'
        },
        {
          n:'2', name:'Up', color:'var(--success)', bg:'var(--success-bg)',
          enc:'Filtered[x] = Raw[x] − Prior[x]',
          dec:'Cur[x] = Filtered[x] + Above[x]',
          desc:'与<span class="hl">上方</span>同行位置差分。对垂直渐变区域效果极佳。'
        },
        {
          n:'3', name:'Average', color:'var(--warn)', bg:'var(--warn-bg)',
          enc:'Filtered[x] = Raw[x] − ⌊(Raw[x−bps]+Prior[x])/2⌋',
          dec:'Cur[x] = Filtered[x] + ⌊(Cur[x−bps]+Above[x])/2⌋',
          desc:'取左和上的<span class="hl">平均值</span>差分。对平滑过渡区域效果好。'
        },
        {
          n:'4', name:'Paeth', color:'var(--danger)', bg:'var(--danger-bg)',
          enc:'Filtered[x] = Raw[x] − PaethPredictor(a,b,c)',
          dec:'Cur[x] = Filtered[x] + PaethPredictor(a,b,c)',
          desc:'<strong>Paeth 预测器</strong>：从 a(左)、b(上)、c(左上)中<span class="hl">自适应选择最近似者</span>。通常整体最优。'
        },
      ].map(f=>`
        <div style="background:${f.bg};border:0.5px solid ${f.color};border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:24px;height:24px;background:${f.color};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff">${f.n}</div>
            <span style="font-weight:500;font-size:12px;color:${f.color}">${f.name}</span>
          </div>
          <div style="font-size:9px;color:var(--text3);line-height:1.5;margin-bottom:5px">${f.desc}</div>
          <div style="font-family:'Courier New',monospace;font-size:9px;color:var(--text2);line-height:1.6">
            <div style="margin-bottom:2px"><span style="color:var(--success)">编码:</span> ${f.enc}</div>
            <div><span style="color:var(--accent)">解码:</span> ${f.dec}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="font-size:10px;color:var(--text3);line-height:1.6">
      <strong>PaethPredictor(a, b, c) 算法</strong>：p = a + b − c，选 p 与 {a, b, c} 中绝对差最小者。<br>
      直观理解：若 p 离 a 最近 → 预测 a（左侧）；离 b 最近 → 预测 b（上方）；离 c 最近 → 预测 c（左上角）。
    </div>
  </div>

  <!-- ══ 交互式滤波演示 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">交互式滤波演示 — 输入样本行数据</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px">
        编辑以下两行的像素值，观察每种滤波器对它们的编码效果。编码后的值越接近 0 约有利于压缩。
      </div>

      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">当前行 Raw（被编码行）</div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap" id="pf-cur-row">
          ${(()=>{
            const vals=[105,118,132,148,160,165,158,145,130,115];
            return vals.map((v,i)=>`<input type="number" id="pf-cur-${i}" value="${v}" min="0" max="255" style="width:48px;height:28px;border:0.5px solid var(--border);border-radius:4px;text-align:center;font-size:11px;font-family:'Courier New',monospace;background:var(--accent-bg)" oninput="pfFilterDemo()">`).join('');
          })()}
        </div>
      </div>

      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:4px">上一行 Prior（参考行，None 滤波器忽略此行）</div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap" id="pf-prior-row">
          ${Array.from({length:10},(_,i)=>
            `<input type="number" id="pf-prior-${i}" value="${Math.max(10,Math.min(245,95+i*15))}" min="0" max="255" style="width:48px;height:28px;border:0.5px solid var(--border);border-radius:4px;text-align:center;font-size:11px;font-family:'Courier New',monospace;background:var(--surface2)" oninput="pfFilterDemo()">`
          ).join('')}
        </div>
      </div>

      <div style="margin-bottom:6px">
        <span style="font-size:11px;color:var(--text2)">每像素字节数 (bpp)</span>
        <select id="pf-bpp" style="margin-left:8px;border:0.5px solid var(--border);border-radius:4px;padding:2px 6px;font-size:11px;background:var(--surface)" onchange="pfFilterDemo()">
          <option value="1">1（灰度）</option>
          <option value="3" selected>3（RGB）</option>
          <option value="4">4（RGBA）</option>
        </select>
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">滤波输出对比（编码结果）</div>
      <div id="pf-output-viz" style="font-size:11px"></div>
    </div>
  </div>

  <!-- ══ 熵值对比 + 可视化 ══ -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">滤波效果评估 — 各滤波器熵值对比</div>
      <div id="pf-entropy-viz" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:6px;margin-bottom:6px"></div>
      <div id="pf-best-indicator" style="font-size:11px;font-weight:500;margin-bottom:6px;padding:6px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--success)"></div>

      <!-- 频率分布直方图 -->
      <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:6px">选定滤波器的输出值分布直方图</div>
      <div id="pf-hist-viz" style="position:relative;height:120px;border-bottom:0.5px solid var(--border);border-left:0.5px solid var(--border);margin-left:5px;padding-left:2px"></div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">
        <span style="font-size:10px;color:var(--text3)">查看滤波器：</span>
        ${[0,1,2,3,4].map(i=>`
          <label style="font-size:10px;cursor:pointer;display:flex;align-items:center;gap:3px;padding:3px 7px;background:var(--surface2);border-radius:4px;border:0.5px solid var(--border)" onmouseover="pfShowHist(${i})">
            <input type="radio" name="pf-hist-sel" value="${i}" ${i===1?'checked':''} onchange="pfShowHist(${i})">
            <span>${['None','Sub','Up','Avg','Paeth'][i]}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">滤波器选择策略与可视化演示</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:8px">
        PNG 编码器对<span class="hl">每一行</span>分别尝试 5 种滤波器，选择使压缩后输出最小的那一种。<br>
        行首字节存储滤波器编号（0-4），解码器读取此字节后执行对应逆运算。
      </div>

      <div id="pf-visual-demo">
        <div style="font-size:11px;font-weight:500;color:var(--text);margin-bottom:6px">模拟图像块 — 各行滤选</div>
        <div id="pf-image-block" style="display:grid;gap:1px;margin-bottom:6px"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="pf-filt-labels"></div>
      </div>

      <div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.7">
        <strong>经验法则</strong>：<br>
        · 纯色/随机区域 → <span style="color:var(--text3)">None(0)</span><br>
        · 水平渐变（天空）→ <span style="color:var(--accent)">Sub(1)</span><br>
        · 垂直渐变（建筑）→ <span style="color:var(--success)">Up(2)</span><br>
        · 平滑/低噪 → <span style="color:var(--warn)">Average(3)</span><br>
        · 自然图片/默认 → <span style="color:var(--danger)">Paeth(4)</span>（libpng 默认启发式）
      </div>
    </div>
  </div>
  `;

  function paethPredictor(a, b, c){
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }

  // ─── 核心交互：滤波演示 ───
  window.pfFilterDemo = function(){
    const N = 10, bpp = +document.getElementById('pf-bpp').value;
    const cur = [], prior = [];
    for(let i=0;i<N;i++){
      cur.push(+document.getElementById('pf-cur-'+i).value||0);
      prior.push(+document.getElementById('pf-prior-'+i).value||0);
    }

    const filters = [
      {name:'None',fn:()=>cur},
      {name:'Sub',
       fn:()=>cur.map((v,i)=>i<bpp ? v : v - cur[i-bpp]),
       dec:()=>cur.map((v,i)=>i<bpp ? v : v + cur[i-bpp])},
      {name:'Up',
       fn:()=>cur.map((v,i)=>v - prior[i])},
      {name:'Average',
       fn:()=>cur.map((v,i)=>{
         const left = i<bpp ? 0 : cur[i-bpp];
         const up = prior[i];
         return v - Math.floor((left + up) / 2);
       })},
      {name:'Paeth',
       fn:()=>cur.map((v,i)=>{
         const a = i<bpp ? 0 : cur[i-bpp];
         const b = prior[i];
         const c = i<bpp ? 0 : prior[i-bpp]||0;
         return v - paethPredictor(a, b, c);
       })}
    ];

    // 计算各滤波器输出
    const outputs = filters.map(f=>{
      const raw = f.fn();
      return raw.map(v=>((v%256)+256)%256);
    });

    // 显示输出对比
    const outEl = document.getElementById('pf-output-viz');
    const colorMap = ['var(--text3)','var(--accent)','var(--success)','var(--warn)','var(--danger)'];
    outEl.innerHTML = filters.map((f,fi)=>{
      const out = outputs[fi];
      const cells = out.map((v,idx)=>{
        const intensity = Math.min(1, Math.abs(v)/128);
        const hue = v===0 ? '#e8e8e0' : `rgba(${colorMap2(v)}, 0.3)`;
        return `<div style="width:28px;height:22px;background:${v===0?'var(--success-bg)':`rgba(${v>0?120:200},${120},${v>0?200:120},${intensity*0.5+0.1})`};border:0.5px solid ${v===0?'#97C459':'var(--border)'};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-family:'Courier New',monospace;color:${v===0?'var(--success)':'var(--text)'}">${v}</div>`;
      }).join('');
      const zeroCount = out.filter(v=>v===0).length;
      const absSum = out.reduce((s,v)=>s+Math.abs(v),0);
      return `
        <div style="margin-bottom:8px;padding:8px;background:var(--surface2);border-radius:6px;border-left:3px solid ${colorMap[fi]}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-weight:500;font-size:11px;color:${colorMap[fi]}">${f.name}(${fi})</span>
            <span style="font-size:10px;color:var(--text3)">零值: <strong>${zeroCount}</strong>/${N}</span>
            <span style="font-size:10px;color:var(--text3)">绝对值和: <strong>${absSum}</strong></span>
          </div>
          <div style="display:flex;gap:2px;flex-wrap:wrap">${cells}</div>
        </div>`;
    }).join('');

    // 熵与结果对比
    const entropies = outputs.map((out,fi)=>{
      const freq = {};
      out.forEach(v=>{freq[v]= (freq[v]||0)+1;});
      let entropy = 0;
      for(const k in freq){ const p = freq[k]/out.length; entropy -= p*Math.log2(p); }
      return {name:filters[fi].name, entropy:Math.round(entropy*100)/100, zero:out.filter(v=>v===0).length, sum:out.reduce((s,v)=>s+Math.abs(v),0), fi};
    });

    const best = entropies.reduce((a,b)=>a.entropy<b.entropy?a:b);

    const ev = document.getElementById('pf-entropy-viz');
    ev.innerHTML = entropies.map(e=>`
      <div style="text-align:center;padding:6px 4px;background:${e.fi===best.fi?'var(--success-bg)':'var(--surface2)'};border-radius:6px;border:0.5px solid ${e.fi===best.fi?'#97C459':'var(--border)'}">
        <div style="font-size:10px;font-weight:500;color:${colorMap[e.fi]}">${e.name}</div>
        <div style="font-size:16px;font-weight:600;color:${e.fi===best.fi?'var(--success)':'var(--text2)'}">${e.entropy.toFixed(2)}</div>
        <div style="font-size:9px;color:var(--text3)">bits/样本</div>
        <div style="font-size:9px;color:var(--text3);margin-top:2px">${e.zero}个零 和${e.sum}</div>
      </div>
    `).join('');

    document.getElementById('pf-best-indicator').innerHTML = `
      <span style="color:var(--success)">◆</span> 最低熵滤波器：<strong style="color:${colorMap[best.fi]}">${best.name}(${best.fi})</strong>
      — 熵值 ${best.entropy} bits，${best.zero}/${N} 值归零 — <span style="color:var(--success)">预计压缩效果最优</span>`;

    pfShowHist(1);
  };

  window.pfShowHist = function(filterIdx){
    const N = 10;
    const cur = [], prior = [];
    for(let i=0;i<N;i++){
      cur.push(+document.getElementById('pf-cur-'+i).value||0);
      prior.push(+document.getElementById('pf-prior-'+i).value||0);
    }
    const bpp = +document.getElementById('pf-bpp').value;

    let output;
    switch(filterIdx){
      case 0: output = cur; break;
      case 1: output = cur.map((v,i)=>i<bpp?v:v-cur[i-bpp]); break;
      case 2: output = cur.map((v,i)=>v-prior[i]); break;
      case 3: output = cur.map((v,i)=>{const l=i<bpp?0:cur[i-bpp];return v-Math.floor((l+prior[i])/2);}); break;
      case 4: output = cur.map((v,i)=>{const a=i<bpp?0:cur[i-bpp];return v-paethPredictor(a,prior[i],i<bpp?0:prior[i-bpp]||0);}); break;
    }
    output = output.map(v=>((v%256)+256)%256);

    const freq = {};
    output.forEach(v=>{freq[v]=(freq[v]||0)+1;});

    const histEl = document.getElementById('pf-hist-viz');
    const maxCount = Math.max(1,...Object.values(freq));
    const bins = Object.entries(freq).sort((a,b)=>+a[0]-+b[0]);

    histEl.innerHTML = bins.map(([v,count])=>{
      const h = Math.max(4, (count/maxCount)*110);
      const color = +v===0?'var(--success)':(+v<128?'var(--accent)':'var(--warn)');
      const x = (+v/255)*100;
      return `<div style="position:absolute;left:${x}%;bottom:0;width:18px;height:${h}px;background:${color};border-radius:2px 2px 0 0;opacity:0.8;transform:translateX(-50%)" title="${v}: ${count}">
        <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:8px;color:var(--text3);white-space:nowrap">${v}</div>
      </div>`;
    }).join('');
  };

  function colorMap2(v){
    if(v===0) return '104,196,89'; // green
    if(Math.abs(v)<30) return '50,102,173'; // blue
    if(Math.abs(v)<80) return '133,79,11'; // orange
    return '163,45,45'; // red
  }

  // ─── 模拟图像块滤波选择可视化 ───
  (function initImageBlock(){
    const rows=8, cols=12, blockEl=document.getElementById('pf-image-block');
    blockEl.style.gridTemplateColumns = `repeat(${cols},22px)`;

    // 生成模拟图像块（含渐变和纹理）
    const block = [];
    for(let y=0;y<rows;y++){
      block[y]=[];
      for(let x=0;x<cols;x++){
        const base = 100 + y*8;
        const ripple = Math.sin(x*0.5+y*0.3)*20;
        const noise = (Math.sin(x*1.7)*Math.cos(y*2.1))*15;
        block[y][x]=Math.round(Math.max(0,Math.min(255,base+ripple+noise)));
      }
    }

    // 对每行选择最佳滤波器
    const filtersToTry = [
      (r)=>r,
      (r)=>r.map((v,i)=>i<1?v:v-r[i-1]),
      (r)=>r.map((v,i)=>v-(block[-1]||r)[i]),
      (r)=>r.map((v,i)=>{const l=i<1?0:r[i-1];return v-Math.floor((l+(block[-1]||r)[i])/2);}),
      (r)=>r.map((v,i)=>{const a=i<1?0:r[i-1];const b=(block[-1]||r)[i];const c=i<1?0:(block[-1]||r)[i-1]||0;return v-paethPredictor(a,b,c);}),
    ];

    const colorMapF = ['var(--text3)','var(--accent)','var(--success)','var(--warn)','var(--danger)'];
    const bestFilters = [];

    for(let y=0;y<rows;y++){
      let best=0, bestScore=Infinity;
      for(let fi=0;fi<5;fi++){
        const out = filtersToTry[fi](block[y]);
        const score = out.reduce((s,v)=>s+Math.abs(((v%256)+256)%256),0);
        if(score<bestScore){bestScore=score;best=fi;}
      }
      bestFilters.push(best);
    }

    blockEl.innerHTML = block.flat().map((v,idx)=>{
      const y=Math.floor(idx/cols);
      const txt = v>128 ? '#222':'#eee';
      return `<div style="width:22px;height:22px;background:rgb(${v},${v},${v});display:flex;align-items:center;justify-content:center;font-size:7px;border-radius:2px;color:${txt}">${v}</div>`;
    }).join('');

    document.getElementById('pf-filt-labels').innerHTML = bestFilters.map((fi,y)=>{
      const names = ['None','Sub','Up','Avg','Paeth'];
      return `<div style="font-size:10px;padding:2px 6px;background:${colorMapF[fi]}15;border:0.5px solid ${colorMapF[fi]};border-radius:4px;color:${colorMapF[fi]}">
        行${y}: <strong>${names[fi]}</strong>
      </div>`;
    }).join('') + `<div style="font-size:10px;color:var(--text3);padding:2px 6px">（编码器逐行自动选择）</div>`;
  })();

  // 初始执行
  pfFilterDemo();
});
