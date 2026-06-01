/**
 * nav.js — 功能区1左侧步骤导航
 */
function renderNav(){
  const conv = getConv(APP.srcFmt, APP.dstFmt);
  const navConv = document.getElementById('step-nav-conv');
  const list    = document.getElementById('step-list');
  navConv.textContent = `${APP.srcFmt} → ${APP.dstFmt}`;

  if(!conv){
    list.innerHTML = `<div style="padding:16px 14px;font-size:11px;color:var(--text3)">暂无步骤数据</div>`;
    return;
  }

  list.innerHTML = conv.steps.map((s,i)=>`
    <div class="step-item ${i===APP.currentStep?'active':''} ${APP.doneMask[i]?'done':''}"
         onclick="APP.jumpStep(${i})">
      <div class="step-num">${APP.doneMask[i] ? '✓' : (i+1)}</div>
      <div class="step-label">
        <div class="step-label-main">${s.label}</div>
        <div class="step-label-sub">${s.sub}</div>
      </div>
    </div>
  `).join('');
}

function renderStepDetail(){
  const conv = getConv(APP.srcFmt, APP.dstFmt);
  const detail = document.getElementById('step-detail');
  detail.classList.remove('anim-in');
  void detail.offsetWidth;
  detail.classList.add('anim-in');

  if(!conv){
    const src = APP.srcFmt, dst = APP.dstFmt;
    detail.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80%;gap:10px;color:var(--text3)">
        <div style="font-size:36px">↔</div>
        <div style="font-size:13px;font-weight:500;color:var(--text2)">${src} → ${dst}：${src===dst?'源格式与目标格式相同':'该转换方案未注册'}</div>
      </div>`;
    return;
  }
  const step = conv.steps[APP.currentStep];
  if(step && STEP_RENDERERS[step.id]){
    STEP_RENDERERS[step.id](detail);
  } else {
    detail.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60%;gap:10px;color:var(--text3)">
        <div style="font-size:36px">🔍</div>
        <div style="font-size:13px;font-weight:500;color:var(--text2)">${step?step.label:'?'} 渲染器未找到</div>
      </div>`;
  }
}
