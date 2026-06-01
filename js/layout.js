/**
 * layout.js — 拖拽分割线
 */
function initLayout(){
  const workspace = document.getElementById('workspace');
  const zone1 = document.getElementById('zone1');
  const zone2 = document.getElementById('zone2');
  const divH = document.getElementById('divider-h');

  // 水平分割线
  let hDrag = false;
  divH.addEventListener('mousedown', e=>{ hDrag=true; e.preventDefault(); });
  document.addEventListener('mousemove', e=>{
    if(!hDrag) return;
    const rect = workspace.getBoundingClientRect();
    let pct = (e.clientY - rect.top) / rect.height * 100;
    pct = Math.min(88, Math.max(12, pct));
    zone1.style.height = pct + '%';
    zone2.style.height = (100-pct) + '%';
  });
  document.addEventListener('mouseup', ()=>{ hDrag=false; });

  // 垂直分割线
  const z2Preview = document.getElementById('z2-preview');
  const z2Select  = document.getElementById('z2-select');
  const z2Control = document.getElementById('z2-control');
  const dv1 = document.getElementById('divider-v1');
  const dv2 = document.getElementById('divider-v2');
  const zone2El = document.getElementById('zone2');
  let vDrag = null;

  dv1.addEventListener('mousedown', e=>{ vDrag='v1'; e.preventDefault(); });
  dv2.addEventListener('mousedown', e=>{ vDrag='v2'; e.preventDefault(); });
  document.addEventListener('mousemove', e=>{
    if(!vDrag) return;
    const rect = zone2El.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width * 100;
    if(vDrag==='v1'){
      const lp = Math.min(50, Math.max(15, pct));
      z2Preview.style.flex = `0 0 ${lp}%`;
    } else {
      const rp = Math.min(40, Math.max(15, 100-pct));
      z2Control.style.flex = `0 0 ${rp}%`;
    }
  });
  document.addEventListener('mouseup', ()=>{ vDrag=null; });
}
