/**
 * 平台适配层（v4 重构）。
 *
 * 之前每个 composable 都在模块顶层写
 *   `const singletonStorage = typeof localStorage !== 'undefined' ? localStorage : null`
 * —— import 即触碰浏览器全局，Node 测试只能靠 mock globalThis 兜底，且无法整体替换。
 *
 * 现在由 createBrowserPlatform() 在「真正创建应用时」一次性探测环境，
 * 所有 store 只接受注入的 platform 片段。overrides 可整体替换任一能力（测试/CI 用）。
 */

function readGlobal(key) {
    try {
        return typeof globalThis !== 'undefined' ? globalThis[key] : undefined;
    } catch {
        return undefined;
    }
}

function pick(overrides, key, fallback) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
    }
    return fallback();
}

/**
 * @param {object} [overrides] 覆盖任意平台能力；字段显式存在（含 null）即生效
 * @returns {{
 *   localStorage: Storage|null,
 *   sessionStorage: Storage|null,
 *   location: Location|null,
 *   history: History|null,
 *   fetchFn: Function|null,
 *   timers: {setTimer: Function, clearTimer: Function}
 * }}
 */
export function createBrowserPlatform(overrides = {}) {
    return {
        localStorage: pick(overrides, 'localStorage', () => readGlobal('localStorage') || null),
        sessionStorage: pick(overrides, 'sessionStorage', () => readGlobal('sessionStorage') || null),
        location: pick(overrides, 'location', () => readGlobal('location') || null),
        history: pick(overrides, 'history', () => readGlobal('history') || null),
        fetchFn: pick(overrides, 'fetchFn', () => (typeof fetch !== 'undefined' ? fetch : null)),
        timers: pick(overrides, 'timers', () => ({
            setTimer: (...args) => setTimeout(...args),
            clearTimer: (...args) => clearTimeout(...args)
        }))
    };
}
