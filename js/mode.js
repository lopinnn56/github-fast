// 显示模式（链接 / Clone 命令）的状态与分段控件，独立成模块避免 main <-> results 循环依赖
const MODE_KEY = 'gh_accel_mode';

let mode = (function () {
    try {
        const m = localStorage.getItem(MODE_KEY);
        // 校验持久化的模式，避免脏数据破坏分段控件
        return (m === 'link' || m === 'clone') ? m : 'link';
    } catch (e) {
        return 'link';
    }
})();

export function getMode() {
    return mode;
}

export function isClone() {
    return mode === 'clone';
}

export function setMode(m) {
    if (m !== 'link' && m !== 'clone') return;
    mode = m;
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* ignore */ }
}

export function initModeControls(onChange) {
    const btns = document.querySelectorAll('.seg-btn[data-mode]');
    btns.forEach(function (b) {
        b.addEventListener('click', function () {
            btns.forEach(function (x) {
                x.classList.remove('active');
                x.setAttribute('aria-pressed', 'false');
            });
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
            setMode(b.dataset.mode);
            onChange(getMode());
        });
    });

    // Restore saved mode
    btns.forEach(function (b) {
        if (b.dataset.mode === mode) {
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
        } else {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        }
    });
}
