/**
 * app.js — 全局状态与刷新调度
 */

// ─── 全局模拟参数（各步骤 slider 写入，预览画布读取）───
const SIM_PARAMS = {
  bmpBpp: 24, bmpWidth: 640, bmpHeight: 480, bmpCompression: 0,
  dctMean: 128, dctAmp: 25, dctFreq: 1,
  quantQuality: 75,
  subsampling: '4:2:0',
  gifColors: 256, gifDither: 'fs',
  webpQuality: 80, webpMode: 'lossy',
  avifCQ: 28,
  heifCRF: 28,
  tiffCompression: 'lzw',
  svgWidth: 800, svgHeight: 600,
};

const APP = {
  srcFmt: 'BMP',
  dstFmt: 'JPEG',
  currentStep: 0,
  doneMask: [],

  refresh(){
    const conv = getConv(this.srcFmt, this.dstFmt);
    this.doneMask = Array.from({length: conv ? conv.steps.length : 0}, (_,i)=>this.doneMask[i]||false);
    renderNav();
    renderStepDetail();
    renderZone2Select();
    renderZone2Control();
    if(srcFile) {
      const origImg = document.getElementById('preview-orig-img');
      if(origImg && origImg.src) renderProcessedPreview(origImg);
    }
    saveState();
  },

  jumpStep(i){
    if(i > this.currentStep) this.doneMask[this.currentStep] = true;
    this.currentStep = i;
    renderNav();
    renderStepDetail();
    renderZone2Control();
    if(srcFile) refreshPreview();
    saveState();
  },

  nextStep(){
    const conv = getConv(this.srcFmt, this.dstFmt);
    if(!conv) return;
    this.doneMask[this.currentStep] = true;
    if(this.currentStep < conv.steps.length - 1){
      this.currentStep++;
      renderNav();
      renderStepDetail();
      renderZone2Control();
    } else {
      document.getElementById('btn-next').textContent = '全部完成 ✓';
      document.getElementById('btn-next').disabled = true;
    }
    saveState();
  },

  prevStep(){
    if(this.currentStep > 0){
      this.currentStep--;
      renderNav();
      renderStepDetail();
      renderZone2Control();
      saveState();
    }
  }
};

function saveState(){
  try {
    localStorage.setItem('piclab_state', JSON.stringify({
      srcFmt: APP.srcFmt, dstFmt: APP.dstFmt,
      currentStep: APP.currentStep, doneMask: APP.doneMask, params: SIM_PARAMS,
    }));
  } catch(_) {}
}

function loadState(){
  try {
    const raw = localStorage.getItem('piclab_state');
    if(!raw) return;
    const s = JSON.parse(raw);
    if(s.srcFmt) APP.srcFmt = s.srcFmt;
    if(s.dstFmt) APP.dstFmt = s.dstFmt;
    if(typeof s.currentStep==='number') APP.currentStep = s.currentStep;
    if(Array.isArray(s.doneMask)) APP.doneMask = s.doneMask;
    if(s.params) Object.assign(SIM_PARAMS, s.params);
  } catch(_) {}
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadState();
  initLayout();
  APP.refresh();
});
