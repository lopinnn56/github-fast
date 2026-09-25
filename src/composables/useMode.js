import { ref } from 'vue';

const MODE_KEY = 'gh_accel_mode';

function readInitial(storage) {
    try {
        if (!storage) return 'link';
        const m = storage.getItem(MODE_KEY);
        // 校验持久化的模式，避免脏数据破坏分段控件
        return (m === 'link' || m === 'clone') ? m : 'link';
    } catch {
        return 'link';
    }
}

/**
 * 模式 Store（链接 / Clone 命令），重构 v3.1 为工厂 + 应用级单例。
 * `createModeStore(storage)` 可在测试中注入内存 storage。
 */
export function createModeStore(storage) {
    const mode = ref(readInitial(storage));

    function setMode(m) {
        if (m !== 'link' && m !== 'clone') return;
        mode.value = m;
        try {
            if (storage) storage.setItem(MODE_KEY, m);
        } catch { /* ignore */ }
    }

    function isClone() {
        return mode.value === 'clone';
    }

    return { mode, setMode, isClone };
}

let singleton = null;
const singletonStorage = typeof localStorage !== 'undefined' ? localStorage : null;

/** 应用级共享模式（跨组件同步：结果区头部 ↔ 复制行为）。 */
export function useMode() {
    if (!singleton) singleton = createModeStore(singletonStorage);
    return singleton;
}