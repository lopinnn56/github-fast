import { ref } from 'vue';
import { STORAGE_KEYS, MODES } from '../config/constants.js';
import { createBrowserPlatform } from '../platform/browser.js';
import { defineFallback, useStore } from '../app/context.js';

const MODE_KEY = STORAGE_KEYS.mode;
const DEFAULT_MODE = MODES[0];

function readInitial(storage) {
    try {
        if (!storage) return DEFAULT_MODE;
        const m = storage.getItem(MODE_KEY);
        // 校验持久化的模式，避免脏数据破坏分段控件
        return MODES.includes(m) ? m : DEFAULT_MODE;
    } catch {
        return DEFAULT_MODE;
    }
}

/**
 * 模式 Store（链接 / Clone 命令），v4：纯工厂 + 容器注入。
 * `createModeStore(storage)` 可在测试中注入内存 storage，签名与 v3.1 保持一致。
 */
export function createModeStore(storage) {
    const mode = ref(readInitial(storage));

    function setMode(m) {
        if (!MODES.includes(m)) return;
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

// 容器外（node:test / 脚本）：首次调用时才探测浏览器全局，显式 null 也生效。
defineFallback('mode', () => createModeStore(createBrowserPlatform().localStorage));

/** 应用级共享模式（跨组件同步：结果区头部 ↔ 复制行为）。 */
export function useMode() {
    return useStore('mode');
}
