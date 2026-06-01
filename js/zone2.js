/**
 * zone2.js — 功能区2：预览 + 自动格式检测 + 目标格式选择 + 步骤控制
 */

let srcFile = null, srcBitmap = null, srcFileURL = null, manualFmt = false;

function renderZone2Select(){
  const inner = document.getElementById('z2-select-inner');
  const conv = getConv(APP.srcFmt, APP.dstFmt);

  inner.innerHTML = `
    <label class="file-drop ${srcFile?'has-file':''}" for="file-input" id="file-drop-label">
      <div class="file-drop-icon">${srcFile?'✓':'📂'}</div>
      <div class="file-drop-text">${srcFile ? srcFile.name : '点击选择图片或拖入此处'}</div>
      <div class="file-drop-hint">支持：BMP、JPEG、PNG、GIF、WebP、AVIF、HEIF、TIFF、SVG、ICO、TGA、PNM</div>
    </label>
    <input type="file" id="file-input" accept="image/*,.bmp,.tif,.tiff,.heic,.heif,.avif,.svg,.dib,.ico,.tga,.ppm,.pgm,.pbm">

    ${srcFile ? renderDetectedFmt() : ''}

    <div class="arrow-hint">↓</div>

    <div class="format-label">转换至</div>
    <div class="format-grid">
      ${DST_FORMATS.filter(f=>f!==APP.srcFmt).map(f=>{
        const hasConv = !!getConv(APP.srcFmt, f);
        return `<button class="fmt-btn${APP.dstFmt===f?' active':''}${!hasConv?' disabled':''}"
          onclick="${hasConv?`setDstFmt('${f}')`:''}" title="${f}">${f}</button>`;
      }).join('')}
    </div>

    <div class="conv-summary">
      <strong>${APP.srcFmt}</strong> → <strong>${APP.dstFmt}</strong>
      &nbsp;·&nbsp; ${conv ? conv.steps.length+'步' : '—'}
    </div>
  `;

  bindFileEvents();
}

function renderDetectedFmt(){
  return `
    <div class="fmt-detected">
      <span class="fmt-detected-badge">${APP.srcFmt}</span>
      <span class="fmt-detected-text">检测格式</span>
      <span class="fmt-detected-link" onclick="toggleManualFmt()">
        ${manualFmt ? '取消手动' : '不是'+APP.srcFmt+'？手动切换'}
      </span>
    </div>
    ${manualFmt ? renderManualFmtPicker() : ''}
  `;
}

function renderManualFmtPicker(){
  return `
    <div class="src-fmt-picker" id="src-fmt-picker">
      <div class="src-fmt-label">手动选择源格式</div>
      <div class="src-fmt-grid">
        ${SRC_FORMATS.map(f=>`
          <button class="src-btn${APP.srcFmt===f?' active':''}" onclick="setSrcFmtManual('${f}')">${f}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function toggleManualFmt(){ manualFmt = !manualFmt; renderZone2Select(); }

function setSrcFmtManual(fmt){
  APP.srcFmt = fmt; manualFmt = true;
  if(APP.dstFmt === fmt) APP.dstFmt = DST_FORMATS.find(f=>f!==fmt && getConv(fmt,f)) || 'JPEG';
  APP.currentStep = 0; APP.doneMask = []; APP.refresh();
}

function bindFileEvents(){
  const fi = document.getElementById('file-input');
  if(fi) fi.addEventListener('change', handleFileChange);
  const dropLabel = document.getElementById('file-drop-label');
  if(dropLabel){
    dropLabel.addEventListener('dragover', e=>{e.preventDefault();dropLabel.classList.add('dragover');});
    dropLabel.addEventListener('dragleave', ()=>dropLabel.classList.remove('dragover'));
    dropLabel.addEventListener('drop', e=>{
      e.preventDefault(); dropLabel.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if(f) loadFile(f);
    });
  }
}

function handleFileChange(e){ const f = e.target.files[0]; if(f) loadFile(f); }

async function loadFile(file){
  srcFile = file; manualFmt = false;
  const detected = await detectFormat(file);
  if(detected.fmt){
    APP.srcFmt = detected.fmt;
    const defaultDst = DST_FORMATS.find(f=>f!==detected.fmt && getConv(detected.fmt, f));
    if(defaultDst) APP.dstFmt = defaultDst;
    APP.currentStep = 0; APP.doneMask = [];
  }
  const reader = new FileReader();
  reader.onload = ev => {
    srcFileURL = ev.target.result;
    const img = new Image();
    img.onload = () => {
      const origWrap = document.getElementById('preview-orig-wrap');
      const origImg = document.getElementById('preview-orig-img');
      const origPH  = document.getElementById('preview-orig-ph');
      if(origImg){ origImg.src = srcFileURL; origImg.style.display='block'; }
      if(origPH) origPH.style.display='none';
      renderProcessedPreview(img);
      const bar = document.getElementById('preview-info-bar');
      if(bar) bar.innerHTML = `
        <span>${file.name}</span>
        <span>${img.width}×${img.height}</span>
        <span>${(file.size/1024).toFixed(1)} KB</span>
        <span class="fmt-detected-mini">${detected.fmt || '?'}<span style="color:var(--text3)"> (${detected.source||''})</span></span>`;
    };
    img.src = srcFileURL;
  };
  reader.readAsDataURL(file);
  APP.refresh();
}

function renderProcessedPreview(img){
  const wrap = document.getElementById('preview-proc-wrap');
  if(!wrap) return; wrap.innerHTML = '';
  const canvas = document.createElement('canvas'), id = 'preview-canvas';
  canvas.id = id;
  const maxW = wrap.clientWidth || 200, maxH = wrap.clientHeight || 150;
  const scale = Math.min(maxW/img.width, maxH/img.height, 1);
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.style.cssText = 'max-width:100%;max-height:100%;border-radius:3px;display:block';
  const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const conv = getConv(APP.srcFmt, APP.dstFmt);
  const stepId = conv ? conv.steps[APP.currentStep]?.id : null;
  applyStepFilter(ctx, canvas, stepId);
  wrap.appendChild(canvas);
}

function applyStepFilter(ctx, canvas, stepId){
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
  switch(stepId){
    case 'rgb2ycbcr':
      for(let i=0;i<d.length;i+=4){ const y=Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]); d[i]=d[i+1]=d[i+2]=y; }
      break;
    case 'subsample':
      if(SIM_PARAMS.subsampling==='4:2:0') for(let i=0;i<d.length;i+=4){ const y=Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]); d[i]=y; d[i+1]=128; d[i+2]=128; }
      break;
    case 'dct': { const q=SIM_PARAMS.dctMean/255; for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]*q+64*(1-q)); d[i+1]=Math.round(d[i+1]*q+64*(1-q)); d[i+2]=Math.round(d[i+2]*q+64*(1-q)); } } break;
    case 'quant': { const lv=Math.max(2,Math.round(SIM_PARAMS.quantQuality/100*32)), st=Math.round(255/(lv-1)); for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]/st)*st; d[i+1]=Math.round(d[i+1]/st)*st; d[i+2]=Math.round(d[i+2]/st)*st; } } break;
    case 'parseBMP': if(SIM_PARAMS.bmpBpp>=24){ for(let i=0;i<d.length;i+=4)[d[i],d[i+2]]=[d[i+2],d[i]]; } else { const lv=Math.max(2,1<<Math.min(SIM_PARAMS.bmpBpp,8)), st=Math.round(255/(lv-1)); for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]/st)*st; d[i+1]=Math.round(d[i+1]/st)*st; d[i+2]=Math.round(d[i+2]/st)*st; } } break;
    case 'colorQuant': { const c=SIM_PARAMS.gifColors,b=Math.max(1,Math.round(Math.cbrt(c))),st=Math.round(255/(b-1)); for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]/st)*st; d[i+1]=Math.round(d[i+1]/st)*st; d[i+2]=Math.round(d[i+2]/st)*st; } } break;
    case 'webpEncode': { const lv=Math.max(2,Math.round(SIM_PARAMS.webpQuality/100*32)),st=Math.round(255/(lv-1)); for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]/st)*st; d[i+1]=Math.round(d[i+1]/st)*st; d[i+2]=Math.round(d[i+2]/st)*st; } } break;
    default: if(APP.dstFmt==='GIF'){ const c=SIM_PARAMS.gifColors,b=Math.max(2,Math.round(Math.cbrt(c))),st=Math.round(255/(b-1)); for(let i=0;i<d.length;i+=4){ d[i]=Math.round(d[i]/st)*st; d[i+1]=Math.round(d[i+1]/st)*st; d[i+2]=Math.round(d[i+2]/st)*st; } }
  }
  ctx.putImageData(id, 0, 0);
}

function exportPreview(){
  const canvas = document.getElementById('preview-canvas');
  if(!canvas) return;
  const ext = APP.dstFmt==='JPEG'?'jpg':APP.dstFmt.toLowerCase();
  const link = document.createElement('a');
  link.download = `converted.${ext}`;
  link.href = canvas.toDataURL(APP.dstFmt==='JPEG'?'image/jpeg':'image/png', 0.92);
  link.click();
}

function renderZone2Control(){
  const inner = document.getElementById('z2-control-inner');
  const conv = getConv(APP.srcFmt, APP.dstFmt);
  if(!conv){ inner.innerHTML=`<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:16px">请先选择转换方案</div>`; return; }
  const steps = conv.steps, cur = APP.currentStep, isLast = cur===steps.length-1;
  inner.innerHTML = `
    <div class="step-counter">步骤 ${cur+1} / ${steps.length}</div>
    <div class="step-progress">${steps.map((_,i)=>`<div class="step-dot ${i<cur?'done':i===cur?'active':''}"></div>`).join('')}</div>
    <div class="step-brief-title">${['一','二','三','四','五','六','七','八','九','十'][cur] || (cur+1)}、${steps[cur].label}</div>
    <div class="step-brief-text">${steps[cur].brief}</div>
    <button class="btn-prev" id="btn-prev" ${cur===0?'disabled':''} onclick="APP.prevStep()">← 上一步</button>
    <button class="btn-next" id="btn-next" onclick="APP.nextStep()">${isLast ? '全部完成 ✓' : '进入下一步 →'}</button>
    ${isLast && srcFile ? `
      <button class="btn-export" onclick="exportPreview()">📥 下载结果 (${APP.dstFmt})</button>
      <div style="font-size:10px;color:var(--text3);text-align:center;margin-top:2px">
        导出右侧预览图为 ${APP.dstFmt==='JPEG'?'.jpg':'.'+APP.dstFmt.toLowerCase()} 文件
      </div>
    ` : ''}
  `;
}

function setDstFmt(fmt){ APP.dstFmt = fmt; APP.currentStep = 0; APP.doneMask = []; APP.refresh(); }

function refreshPreview(){
  if(!srcFile) return;
  const origImg = document.getElementById('preview-orig-img');
  if(origImg && origImg.complete && origImg.naturalWidth) renderProcessedPreview(origImg);
}
