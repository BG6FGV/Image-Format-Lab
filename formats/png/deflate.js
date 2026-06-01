/**
 * formats/png/deflate.js — Deflate 压缩深度演示（LZ77 + Huffman）
 * 注册为 deflate 步骤渲染器
 */

REGISTER_RENDERER('deflate', function(container){
  container.innerHTML = `
  <div class="detail-badge">Deflate 压缩</div>
  <div class="detail-title">Deflate 压缩算法详解（LZ77 + Huffman）</div>
  <div class="detail-desc">
    PNG 使用 <span class="hl">Deflate</span> 算法压缩滤波后的扫描线数据。Deflate 由两层算法组合：
    <span class="hl">LZ77</span>（后向引用消除重复序列）+ <span class="hl">Huffman 编码</span>（变长编码压缩高频符号）。
    最终包裹在 <span class="hl">zlib 容器</span>中，写入一个或多个 IDAT 块。
  </div>

  <!-- LZ77 滑动窗口可视化 -->
  <div class="viz-card">
    <div class="viz-card-title">① LZ77 滑动窗口可视化</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:8px">
      LZ77 将输入数据通过<span class="hl">滑动窗口</span>查找重复子串。重复部分用「<strong>距离—长度</strong>」后向引用替代，
      无匹配时输出「<strong>字面量</strong>」（原始字节）。两种标记混合形成 LZ77 Token 流，送入下一层 Huffman 编码。
    </div>

    <div id="dl-sliding-window" style="border:0.5px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:8px">
      <div style="display:flex;font-family:'Courier New',monospace;font-size:10px;line-height:1;height:36px">
        <div style="flex:none;width:45%;background:var(--surface2);border-right:1px solid var(--accent);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px">
          <span style="font-size:9px;color:var(--text2)">搜索缓冲区（已处理，32KB）</span>
          <span style="font-size:8px;color:var(--text3)">查找匹配用</span>
        </div>
        <div style="flex:1;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px">
          <span style="font-size:9px;color:var(--accent)">前瞻缓冲区（待处理）</span>
          <span style="font-size:8px;color:var(--text3)">查找重复序列</span>
        </div>
      </div>
      <div id="dl-window-content" style="padding:8px 10px;font-family:'Courier New',monospace;font-size:11px;height:50px;display:flex;align-items:center;overflow:hidden;background:var(--surface)">
        <span style="color:var(--text3)">请输入文本查看窗口滑动过程</span>
      </div>
    </div>

    <div class="param-row">
      <span class="param-label">输入文本</span>
      <input type="text" id="dl-text" value="ABBABBBABBABBA" style="flex:1;border:0.5px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;font-family:'Courier New',monospace" oninput="dlLZDemo()">
      <span class="param-val" id="dl-text-len-v" style="width:auto;padding:1px 8px">15</span>
    </div>
    <div class="param-row">
      <span class="param-label">最小匹配长度</span>
      <input type="range" class="param-slider" id="dl-min-match" min="2" max="6" step="1" value="3" oninput="dlLZDemo()">
      <span class="param-val" id="dl-min-match-v">3</span>
    </div>
  </div>

  <!-- LZ77 Token 输出 + Huffman -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">② LZ77 Token 流解析</div>
      <div id="dl-lz-output" style="font-size:11px;color:var(--text2);line-height:2"></div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">③ Huffman 树构建与编码</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:6px">
        Deflate 对 LZ77 输出的 Literal/Length 码和 Distance 码分别使用 Huffman 编码。
        出现频率越高的符号获得越短的编码（前缀码，无码是另一码的前缀）。
      </div>
      <div id="dl-huff-viz" style="font-size:11px"></div>
    </div>
  </div>

  <!-- Huffman 树可视 + zlib 封装 -->
  <div class="two-col">
    <div class="viz-card">
      <div class="viz-card-title">④ Huffman 树构建过程（自底向上合并）</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:8px">
        贪心算法：初始每个符号为一棵树，权重=出现次数。每次选<span class="hl">权重最小的两棵树</span>合并，
        新树权重=两子树权重之和。重复至只剩一棵树。左分支标 0，右分支标 1，从根到叶的路径即编码。
      </div>
      <div id="dl-huff-tree-viz" style="overflow-x:auto;padding:6px 0;font-size:10px;font-family:'Courier New',monospace;color:var(--text2);line-height:1.6;min-height:40px;border:0.5px solid var(--border);border-radius:6px;padding:8px;background:var(--surface2)"></div>

      <div style="margin-top:8px;font-size:11px;color:var(--text2);line-height:1.7">
        <strong>Deflate 中的距离编码</strong>：距离值本身不直接 Huffman 编码。Deflate 将距离
        映射到 30 个区间（slot），每个区间用 5 位码 + 额外比特表示精确距离。0-3 距离直接编码，
        4+ 距离使用分组编码。
      </div>
    </div>

    <div class="viz-card">
      <div class="viz-card-title">⑤ PNG 中的 zlib 封装结构</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.9">
        zlib 在纯 Deflate 数据的首尾各添加固定字段：
      </div>
      <div style="display:flex;gap:0;margin:8px 0">
        <div style="flex:none;width:70px;height:36px;background:var(--warn-bg);border:0.5px solid #EF9F27;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:6px 0 0 6px;line-height:1.3">
          <span style="font-size:8px;color:var(--warn);font-weight:500">CMF</span><span style="font-size:7px;color:var(--text3)">1 字节</span>
        </div>
        <div style="flex:none;width:70px;height:36px;background:var(--warn-bg);border:0.5px solid #EF9F27;border-left:none;display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1.3">
          <span style="font-size:8px;color:var(--warn);font-weight:500">FLG</span><span style="font-size:7px;color:var(--text3)">1 字节</span>
        </div>
        <div style="flex:1;height:36px;background:var(--accent-bg);border:0.5px solid var(--accent);border-left:none;display:flex;align-items:center;justify-content:center;text-align:center">
          <span style="font-size:9px;color:var(--accent);font-weight:500">纯 Deflate 压缩数据流</span>
        </div>
        <div style="flex:none;width:80px;height:36px;background:var(--danger-bg);border:0.5px solid var(--danger);border-left:none;display:flex;align-items:center;justify-content:center;flex-direction:column;border-radius:0 6px 6px 0;line-height:1.3">
          <span style="font-size:8px;color:var(--danger);font-weight:500">Adler32</span><span style="font-size:7px;color:var(--text3)">4 字节</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8">
        · <strong>CMF</strong>：压缩方法（8=Deflate）+ 窗口对数（7=32KB）<br>
        · <strong>FLG</strong>：压缩级别 + 校验位（CMF*256+FLG 必须被 31 整除）<br>
        · <strong>Deflate</strong>：由多个「块」组成，最后一块标记 BFINAL=1<br>
        · <strong>Adler32</strong>：解压后数据的校验和（比 CRC32 快但检测力稍弱）
      </div>
    </div>
  </div>

  <!-- Deflate 块结构 -->
  <div class="viz-card">
    <div class="viz-card-title">⑥ Deflate 数据块结构</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.9">
      Deflate 流由多个 <strong>Block</strong> 组成，每个块有独立的压缩方式：
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
      <div style="padding:10px;background:var(--surface2);border-radius:6px;border:0.5px solid var(--border)">
        <div style="font-weight:500;font-size:11px;margin-bottom:4px;color:var(--text)">BTYPE=00 不压缩</div>
        <div style="font-size:10px;color:var(--text3);line-height:1.6">直接存储原始字节，附带 LEN+NLEN 长度校验。用于已压缩数据无法进一步压缩的情况。</div>
      </div>
      <div style="padding:10px;background:var(--accent-bg);border-radius:6px;border:0.5px solid var(--accent)">
        <div style="font-weight:500;font-size:11px;margin-bottom:4px;color:var(--accent)">BTYPE=01 固定 Huffman</div>
        <div style="font-size:10px;color:var(--text3);line-height:1.6">使用 RFC1951 预定义的固定 Huffman 码表，无需传输码表。适合小数据块或快速编码。</div>
      </div>
      <div style="padding:10px;background:var(--success-bg);border-radius:6px;border:0.5px solid #97C459">
        <div style="font-weight:500;font-size:11px;margin-bottom:4px;color:var(--success)">BTYPE=10 动态 Huffman</div>
        <div style="font-size:10px;color:var(--text3);line-height:1.6">自适应构建 Huffman 码表并随数据一起传输。压缩率最高，PNG 默认使用此模式。</div>
      </div>
    </div>

    <div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.8">
      <strong>PNG 压缩级别与 Deflate 行为对照</strong>：
      <div style="margin-top:4px;font-size:10px;line-height:1.9">
        ${[
          ['0','Z_NO_COMPRESSION','BTYPE=00','存储','0% CPU'],
          ['1-3','Z_BEST_SPEED','BTYPE=01 为主','快速压缩','低CPU'],
          ['4-5','中等压缩','BTYPE=10 部分','平衡模式','中等'],
          ['6（默认）','Z_DEFAULT','BTYPE=10 自适应','libpng 默认','合理的速度比'],
          ['7-9','Z_BEST_COMPRESSION','BTYPE=10 全量','最大压缩','高CPU，额外 5-15%'],
        ].map(([lv,algo,type,desc,perf])=>`
          <div style="display:flex;gap:10px;padding:4px 8px;background:var(--surface2);border-radius:4px;margin-bottom:3px">
            <span style="flex:none;width:40px;font-weight:500;color:var(--accent)">${lv}</span>
            <span style="flex:none;width:160px;font-size:9px">${algo}</span>
            <span style="flex:none;width:100px;font-size:9px;color:var(--accent)">${type}</span>
            <span style="flex:1;font-size:9px">${desc}</span>
            <span style="flex:none;width:80px;font-size:9px;color:var(--text3)">${perf}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Python 实现 -->
  <div class="viz-card">
    <div class="viz-card-title">Python 完整实现片段</div>
    <div class="formula-box"><span class="hl">import</span> zlib, struct

<span style="color:var(--text3)"># 原始像素数据（已滤波）</span>
filtered = bytearray(raw_pixels)

<span style="color:var(--text3)"># Deflate 压缩（PNG 使用级别 6）</span>
compressed = zlib.compress(filtered, level=<span class="hl">6</span>)

<span style="color:var(--text3)"># 验证：解压回原始数据</span>
decompressed = zlib.decompress(compressed)
<span class="hl">assert</span> decompressed == filtered, <span class="hl-g">"完整性校验失败"</span>

<span style="color:var(--text3)"># 写入 IDAT 块</span>
chunk = <span class="hl-g">b'IDAT'</span> + compressed
length = struct.pack(<span class="hl-g">'>I'</span>, len(compressed))
crc   = zlib.crc32(chunk) &amp; 0xFFFFFFFF
idat  = length + chunk + struct.pack(<span class="hl-g">'>I'</span>, crc)

<span style="color:var(--text3)"># 分块写入（大文件需拆分多个 IDAT）</span>
<span class="hl">def</span> write_idat_chunks(f, data, max_chunk=<span class="hl">8192</span>):
    <span class="hl">for</span> i <span class="hl">in</span> range(0, len(data), max_chunk):
        chunk_data = data[i:i+max_chunk]
        f.write(struct.pack(<span class="hl-g">'>I'</span>, len(chunk_data)))
        f.write(<span class="hl-g">b'IDAT'</span>)
        f.write(chunk_data)
        crc = zlib.crc32(<span class="hl-g">b'IDAT'</span> + chunk_data) &amp; 0xFFFFFFFF
        f.write(struct.pack(<span class="hl-g">'>I'</span>, crc))</div>
  </div>
  `;

  // LZ77 演示
  window.dlLZDemo = function(){
    var text = document.getElementById('dl-text').value || '';
    var minMatch = +document.getElementById('dl-min-match').value;
    document.getElementById('dl-text-len-v').textContent = text.length;
    document.getElementById('dl-min-match-v').textContent = minMatch;

    var winEl = document.getElementById('dl-window-content');
    if(text.length===0){
      winEl.innerHTML = '<span style="color:var(--text3)">请输入文本查看窗口滑动过程</span>';
      document.getElementById('dl-lz-output').innerHTML='<span style="color:var(--text3)">等待输入…</span>';
      document.getElementById('dl-huff-viz').innerHTML='';
      document.getElementById('dl-huff-tree-viz').innerHTML='';
      return;
    }

    var maxShow=40;
    var showText = text.length>maxShow ? text.slice(0,maxShow)+'...' : text;
    var charsHtml = showText.split('').map(function(c,i){
      var color = i < text.length-4 ? 'var(--text2)' : 'var(--accent)';
      var bg = i < text.length-4 ? 'var(--surface2)' : 'var(--accent-bg)';
      return '<span style="display:inline-block;width:18px;text-align:center;background:'+bg+';border:0.5px solid var(--border);border-radius:2px;margin:0 1px;color:'+color+';font-weight:'+(i>=text.length-4?'500':'400')+'">'+c+'</span>';
    });
    winEl.innerHTML = charsHtml.join('') + '<span style="margin-left:8px;font-size:9px;color:var(--text3)">高亮=前瞻区</span>';

    var tokens = [];
    var pos = 0;
    while(pos < text.length){
      var bestLen = 0, bestDist = 0;
      var searchStart = Math.max(0, pos - 32);
      for(var i=searchStart; i<pos; i++){
        var len=0;
        while(i+len < pos && pos+len < text.length && text[i+len]===text[pos+len]) len++;
        if(len >= minMatch && len > bestLen){
          bestLen = len; bestDist = pos - i;
        }
      }
      if(bestLen >= minMatch){
        tokens.push({type:'ref', len:bestLen, dist:bestDist, literal:'['+bestDist+','+bestLen+']'});
        pos += bestLen;
      } else {
        tokens.push({type:'lit', literal:text[pos]});
        pos++;
      }
    }

    var lzEl = document.getElementById('dl-lz-output');
    var litCount = tokens.filter(function(t){return t.type==='lit';}).length;
    var refCount = tokens.filter(function(t){return t.type==='ref';}).length;
    var savedChars = tokens.filter(function(t){return t.type==='ref';}).reduce(function(s,t){return s+t.len;},0);
    lzEl.innerHTML =
      '<div style="margin-bottom:8px"><strong>输入</strong>：<span style="font-family:Courier New,monospace;background:var(--surface2);padding:2px 6px;border-radius:3px">'+text+'</span>（'+text.length+' 字符）</div>'+
      '<div style="margin-bottom:8px"><strong>Token 序列</strong>（共 '+tokens.length+' 个）：</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">'+
        tokens.map(function(t,i){
          if(t.type==='lit'){
            return '<div style="padding:3px 7px;background:var(--success-bg);border:0.5px solid #97C459;border-radius:4px;font-size:10px;font-family:Courier New,monospace"><span style="font-size:8px;color:var(--text3)">#'+i+'</span> <span style="color:var(--success);font-weight:500">\''+t.literal+'\'</span></div>';
          } else {
            return '<div style="padding:3px 7px;background:var(--accent-bg);border:0.5px solid var(--accent);border-radius:4px;font-size:10px;font-family:Courier New,monospace"><span style="font-size:8px;color:var(--text3)">#'+i+'</span> <span style="color:var(--accent);font-weight:500">('+t.dist+','+t.len+')</span></div>';
          }
        }).join('')+
      '</div>'+
      '<div style="font-size:10px;color:var(--text2);line-height:1.6">'+
        '<span style="color:var(--success)">■</span> 字面量 = '+litCount+' 个'+
        ' &nbsp; <span style="color:var(--accent)">■</span> 后向引用 = '+refCount+' 个<br>'+
        '压缩比估算：'+text.length+' 字符 → '+tokens.length+' Token'+
        (tokens.length>0?'（'+((1-tokens.length/text.length)*100).toFixed(1)+'% 减少）':'')+
        (refCount>0? '<br>消除重复字符：'+savedChars+' 字符通过后向引用替代':'')+
      '</div>';

    var freq = {};
    tokens.forEach(function(t){
      var key = t.type==='lit' ? t.literal : 'R'+t.dist+','+t.len;
      freq[key] = (freq[key]||0)+1;
    });

    var nodes = [];
    for(var sym in freq){ nodes.push({sym:sym, wt:freq[sym], left:null, right:null, code:''}); }
    if(nodes.length <= 1){
      document.getElementById('dl-huff-viz').innerHTML = '<span style="color:var(--text3)">Token 种类太少，无需 Huffman 编码</span>';
      document.getElementById('dl-huff-tree-viz').innerHTML = '';
      return;
    }

    var q = nodes.slice().sort(function(a,b){return a.wt-b.wt;});
    while(q.length>1){
      var a=q.shift(), b=q.shift();
      var merged={sym:'.', wt:a.wt+b.wt, left:a, right:b};
      var ins=0;
      while(ins<q.length && q[ins].wt<merged.wt) ins++;
      q.splice(ins,0,merged);
    }
    var root = q[0];

    function assignCodes(node, code){
      if(!node.left && !node.right){ node.code=code; return; }
      if(node.left) assignCodes(node.left, code+'0');
      if(node.right) assignCodes(node.right, code+'1');
    }
    assignCodes(root, '');

    function findLeaf(node, sym){
      if(!node.left && !node.right && node.sym===sym) return node;
      var r=null; if(node.left) r=findLeaf(node.left,sym); if(!r&&node.right) r=findLeaf(node.right,sym);
      return r;
    }

    var leafNodes = nodes.map(function(n){
      var found = findLeaf(root, n.sym);
      return {sym:n.sym, wt:n.wt, code:found?found.code:''};
    });

    var totalBits = leafNodes.reduce(function(s,n){return s+n.wt*n.code.length;},0);
    var fixedBits = tokens.length * (Math.ceil(Math.log2(nodes.length))||1);

    var huffEl = document.getElementById('dl-huff-viz');
    var rows = leafNodes.sort(function(a,b){return b.wt-a.wt;}).map(function(n){
      var color = n.sym.indexOf('R')===0 ? 'var(--accent)' : 'var(--success)';
      return '<div style="font-family:Courier New,monospace;color:'+color+'">'+n.sym+'</div>'+
        '<div style="text-align:center">'+n.wt+'</div>'+
        '<div style="font-family:Courier New,monospace;color:var(--accent);font-weight:500">'+n.code+'</div>'+
        '<div style="text-align:center">'+n.code.length+'</div>'+
        '<div style="text-align:center;color:var(--text3)">'+(n.wt*n.code.length)+'</div>';
    }).join('');

    huffEl.innerHTML =
      '<div style="margin-bottom:8px">'+
        '<div style="font-weight:500;margin-bottom:4px;font-size:11px">Huffman 编码表（按频率降序）</div>'+
        '<div style="display:grid;grid-template-columns:auto 1fr auto auto auto;gap:3px 8px;font-size:10px">'+
          '<div style="font-weight:500;color:var(--text2)">符号</div>'+
          '<div style="font-weight:500;color:var(--text2)">权重</div>'+
          '<div style="font-weight:500;color:var(--text2)">编码</div>'+
          '<div style="font-weight:500;color:var(--text2)">长度</div>'+
          '<div style="font-weight:500;color:var(--text2)">总 bits</div>'+
          rows+
        '</div>'+
      '</div>'+
      '<div style="padding:6px 8px;background:var(--surface2);border-radius:6px;font-size:10px;line-height:1.7">'+
        '编码后总位数 = <strong>'+totalBits+'</strong> bits<br>'+
        '定长编码（对比）= <strong>'+fixedBits+'</strong> bits<br>'+
        '压缩率 = <span style="color:var(--success);font-weight:500">'+(fixedBits>0?((totalBits/fixedBits)*100).toFixed(1):'-')+'%</span>'+
      '</div>';

    var treeEl = document.getElementById('dl-huff-tree-viz');
    var treeStr = '';
    function treeLines(node, indent, prefix){
      if(!node) return;
      var label = (!node.left&&!node.right) ? node.sym+'('+node.wt+')' : '.('+node.wt+')';
      treeStr += prefix+label+'\n';
      if(node.left) treeLines(node.left, indent+1, prefix+'  +--0-- ');
      if(node.right) treeLines(node.right, indent+1, prefix+'  +--1-- ');
    }
    treeLines(root, 0, '');
    treeEl.innerHTML = '<pre style="margin:0;white-space:pre">'+treeStr+'</pre>';
  };

  setTimeout(dlLZDemo, 100);
});
