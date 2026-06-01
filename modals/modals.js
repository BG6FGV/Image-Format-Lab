/**
 * modals.js — 高级模式弹出窗口系统
 *
 * 用法：
 *   openAdvanced(title, contentHTML);
 *   弹窗内可通过 window.closeAdvanced() 关闭
 */

let activeModal = null;

function openAdvanced(title, contentHTML) {
  // 移除已有弹窗
  if (activeModal) closeAdvanced();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="closeAdvanced()">×</button>
      </div>
      <div class="modal-body">${contentHTML}</div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeAdvanced();
  });

  document.body.appendChild(overlay);

  // 入场动画
  requestAnimationFrame(() => overlay.classList.add('modal-visible'));

  activeModal = overlay;
  window.closeAdvanced = closeAdvanced;

  return overlay;
}

function closeAdvanced() {
  if (!activeModal) return;
  activeModal.classList.remove('modal-visible');
  setTimeout(() => {
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
  }, 250);
}

// ESC 关闭
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeModal) closeAdvanced();
});
