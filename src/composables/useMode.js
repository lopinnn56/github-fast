import { ref } from 'vue';

const MODE_KEY = 'gh_accel_mode';

function initialMode() {
    try {
        const m = localStorage.getItem(MODE_KEY);
        // 校验持久化的模式，避免脏数据破坏分段控件
        return (m === 'link' || m === 'clone') ? m : 'link';
    } catch {
        return 'link';
    }
}

// 模块级单例：模式切换需跨组件同步（结果区头部 ↔ 复制行为）
const mode = ref(initialMode());

/** 显示模式（链接 / Clone 命令），持久化到 localStorage */
export function useMode() {
    function setMode(m) {
        if (m !== 'link' && m !== 'clone') return;
        mode.value = m;
        try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
    }
    return { mode, setMode, isClone: () => mode.value === 'clone' };
}
