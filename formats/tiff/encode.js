/**
 * formats/tiff/encode.js — TIFF 压缩编码（深度版）
 */
REGISTER_RENDERER('tiffEncode', function(container){
  container.innerHTML = `
  <div class="detail-badge">TIFF 压缩</div>
  <div class="detail-title">TIFF 压缩编码 —— 5 种压缩方式详解</div>
  <div class="detail-desc">
    TIFF 的独特之处在于每条带/瓦片可以独立选择压缩算法。从无压缩的原始数据到有损 JPEG，全在同一文件中并存。
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">压缩方式选择与参数</div>
      <div class="param-row"><span class="param-label">压缩算法</span>
        <select id="tf2-algo" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" onchange="tf2Update()">
          <option value="1">1 — 无压缩（原始像素）</option>
          <option value="32773">32773 — PackBits (RLE)</option>
          <option value="5" selected>5 — LZW</option>
          <option value="32946">32946 — Deflate / ZIP</option>
          <option value="7">7 — JPEG（有损）</option>
        </select>
      </div>
      <div class="param-row"><span class="param-label">图像宽度</span><input type="range" class="param-slider" id="tf2-w" min="64" max="4096" step="64" value="800" oninput="tf2Update()"><span class="param-val" id="tf2-w-v">800</span></div>
      <div class="param-row"><span class="param-label">图像高度</span><input type="range" class="param-slider" id="tf2-h" min="64" max="4096" step="64" value="600" oninput="tf2Update()"><span class="param-val" id="tf2-h-v">600</span></div>
      <div class="param-row"><span class="param-label">RowsPerStrip</span><input type="range" class="param-slider" id="tf2-rps" min="1" max="256" step="1" value="32" oninput="tf2Update()"><span class="param-val" id="tf2-rps-v">32</span></div>
      <div id="tf2-stats" style="margin-top:10px;font-size:11px;line-height:2;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">算法原理与适用场景</div>
      <div id="tf2-desc" style="font-size:11px;color:var(--text2);line-height:1.8"></div>
    </div>
  </div>

  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">PackBits 编码示例（交互）</div>
      <div class="param-row"><span class="param-label">输入字节序列</span>
        <input type="text" id="tf2-pb-in" value="AA AA 00 11 22 33 FF" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;background:var(--surface)" oninput="tf2PackBitsUpdate()">
      </div>
      <div id="tf2-pb-out" style="margin-top:8px;font-size:11px;color:var(--text2)"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">LZW 字典编码过程（模拟）</div>
      <div style="max-height:140px;overflow-y:auto;font-size:10px;font-family:'Courier New',monospace" id="tf2-lzw-demo"></div>
    </div>
  </div>

  <div class="viz-card">
    <div class="viz-card-title">Python 多格式 TIFF 写入</div>
    <div class="formula-box"><span class="hl">from</span> PIL <span class="hl">import</span> Image
<span class="hl">import</span> numpy <span class="hl">as</span> np

<span style="color:var(--text3)"># 无压缩 TIFF</span>
img.save(<span class="hl-g">'uncompressed.tif'</span>, compression=<span class="hl-g">'raw'</span>)

<span style="color:var(--text3)"># LZW 压缩（推荐，无损 + 约 2:1 压缩比）</span>
img.save(<span class="hl-g">'lzw.tif'</span>, compression=<span class="hl-g">'tiff_lzw'</span>)

<span style="color:var(--text3)"># Deflate 压缩（无损 + 约 2.5:1）</span>
img.save(<span class="hl-g">'deflate.tif'</span>, compression=<span class="hl-g">'tiff_deflate'</span>)

<span style="color:var(--text3)"># JPEG 压缩（有损，可指定质量）</span>
img.save(<span class="hl-g">'jpeg.tif'</span>, compression=<span class="hl-g">'tiff_jpeg'</span>, quality=<span class="hl">85</span>)

<span style="color:var(--text3)"># 指定条带行数</span>
img.save(<span class="hl-g">'out.tif'</span>, compression=<span class="hl-g">'tiff_lzw'</span>,
    tiffinfo={<span class="hl">317</span>: <span class="hl">32</span>})  <span style="color:var(--text3)"># tag 317 = RowsPerStrip</span></div>
  </div>
  `;

  window.tf2Update = function(){
    const algo=document.getElementById('tf2-algo').value;
    const w=+document.getElementById('tf2-w').value, h=+document.getElementById('tf2-h').value, rps=+document.getElementById('tf2-rps').value;
    document.getElementById('tf2-w-v').textContent=w;
    document.getElementById('tf2-h-v').textContent=h;
    document.getElementById('tf2-rps-v').textContent=rps;
    const rawSize = w*h*3;
    const nStrips = Math.ceil(h/rps);
    const stripsPer = w*3*rps;
    const ratios={1:'1:1（无压缩）',32773:'约 1.5:1~3:1',5:'约 2:1',32946:'约 2.5:1',7:'约 10:1~20:1（有损）'};
    const descs={
      1:'原始字节直接写入。文件最大，读写最快。适用于临时文件、中间输出。',
      32773:'简单 RLE：连续相同字节 → (计数+1, 值)；不同字节 → (1-计数, 字节序列)。适合有大面积纯色的图像。',
      5:'LZW（Lempel-Ziv-Welch）：构建动态字典，发现重复序列时输出字典码。无损，广泛应用于 GIF 和 TIFF。',
      32946:'Deflate = LZ77 + 哈夫曼，与 PNG 的 zlib 压缩相同。压缩比略高于 LZW，但速度较慢。',
      7:'在 TIFF 容器内使用 JPEG 压缩。每个条带/瓦片独立 JPEG 编码。二次有损，慎用。标签 259=7。'
    };
    document.getElementById('tf2-stats').innerHTML=
      `原始数据：<strong>${(rawSize/1024).toFixed(0)} KB</strong>（${w}×${h}×3 字节）<br>
       条带数：<strong>${nStrips}</strong>（每带 ${rps} 行 × ${(stripsPer/1024).toFixed(1)} KB）<br>
       预估压缩比：${ratios[algo]}`;
    document.getElementById('tf2-desc').innerHTML=`<strong>${descs[algo]}</strong>`;
  };
  tf2Update();

  window.tf2PackBitsUpdate = function(){
    const input = document.getElementById('tf2-pb-in').value.trim();
    const bytes = input.split(/\s+/).map(s=>parseInt(s,16)||0);
    if(bytes.length===0){ document.getElementById('tf2-pb-out').innerHTML='';return; }
    const out=[];
    let i=0;
    while(i<bytes.length){
      let run=1;
      while(i+run<bytes.length && bytes[i+run]===bytes[i] && run<127) run++;
      if(run>=2){
        out.push({type:'run',count:run-1,val:bytes[i]});
        i+=run;
      }else{
        let start=i;
        while(i<bytes.length){
          if(i+1<bytes.length && bytes[i]===bytes[i+1]) break;
          if(i-start>=127) break;
          i++;
        }
        out.push({type:'lit',count:i-start,vals:bytes.slice(start,i)});
      }
    }
    let html='原始：'+bytes.map(b=>b.toString(16).toUpperCase().padStart(2,'0')).join(' ')+'<br><br>';
    let totalOut=0;
    out.forEach((o,i)=>{
      if(o.type==='run'){html+=`<span style="color:var(--accent)">#${i+1} 游程</span>：(0x${(129+o.count).toString(16).toUpperCase()}, 0x${o.val.toString(16).toUpperCase()}) 重复${o.count+1}次<br>`;totalOut+=2;}
      else{html+=`<span style="color:var(--success)">#${i+1} 字面</span>：(0x${(o.count-1).toString(16).toUpperCase()}, ${o.vals.map(v=>'0x'+v.toString(16).toUpperCase()).join(', ')}) ${o.count}B<br>`;totalOut+=1+o.count;}
    });
    html+=`<br>输出：<strong>${totalOut}</strong> B → 节省 <strong>${((1-totalOut/bytes.length)*100).toFixed(0)}%</strong>`;
    document.getElementById('tf2-pb-out').innerHTML=html;
  };

  // LZW demo
  (function(){
    const sample='ABABABXYXYXYXY';
    const dict=[], codes=[];
    for(let i=65;i<91;i++) dict.push(String.fromCharCode(i));
    dict.push('A'); // 添加一个初始字符
    let w='';
    let out='初始字典：65=A, 66=B, ... 90=Z<br>清除码=256, 结束码=257<br><br>';
    for(let i=0;i<sample.length;i++){
      const wc=w+sample[i];
      let found=false;
      for(let j=0;j<dict.length;j++){if(dict[j]===wc){found=true;break;}}
      if(found){w=wc;}else{
        out+=`${w} → 输出码 ${dict.indexOf(w)}<br>`;
        dict.push(wc);
        out+=`添加 "${wc}" → 码 ${dict.length-1}<br>`;
        w=sample[i];
      }
    }
    if(w) out+=`最后 "${w}" → 输出码 ${dict.indexOf(w)}<br>`;
    out+=`<br>字典条目：${dict.length} 条<br>输出码：${codes.length||sample.length/3|0} 个`;
    setTimeout(()=>{const el=document.getElementById('tf2-lzw-demo');if(el)el.innerHTML=out;}, 100);
  })();
});
