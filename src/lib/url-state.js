// 地址栏 ?url= 参数的读写：用于分享链接（转换后地址带参数，对方打开即见同样结果）
//
// v4：改为可注入工厂。之前模块顶层直接引用全局 location/history，store 无法整体替换环境；
// 现在 createConverterStore({ urlState }) 可以注入内存实现，浏览器环境由 createAppContext()
// 用 platform 片段构造一次。兼容导出仍保留，但全局探测发生在「调用时」而非 import 时。

function currentGlobal(key) {
    try {
        return typeof globalThis !== 'undefined' ? globalThis[key] : null;
    } catch {
        return null;
    }
}

/**
 * 创建地址栏状态适配器。
 * @param {object} [env]
 * @param {Location|null|undefined} [env.location] 显式传入（含 null）即生效；省略时惰性读全局
 * @param {History|null|undefined} [env.history]
 */
export function createUrlState({ location: injectedLocation, history: injectedHistory } = {}) {
    function location() {
        if (injectedLocation !== undefined) return injectedLocation;
        return currentGlobal('location');
    }

    function history() {
        if (injectedHistory !== undefined) return injectedHistory;
        return currentGlobal('history');
    }

    /** 把当前结果同步到地址栏 ?url= 参数；列表为空时清空查询串。 */
    function syncUrlParam(links) {
        try {
            const loc = location();
            const hist = history();
            if (!loc || !hist) return;
            const url = new URL(loc.href);
            url.searchParams.delete('url');
            if (links.length) {
                links.forEach(function (l) { url.searchParams.append('url', l); });
            }
            hist.replaceState(null, '', url);
        } catch {
            // 非 http(s) 页面（如 file://）或 Node 测试环境：静默跳过
        }
    }

    /** 读取地址栏中的全部 ?url= 参数值。 */
    function readUrlParams() {
        try {
            const loc = location();
            if (!loc) return [];
            return new URLSearchParams(loc.search).getAll('url').filter(Boolean);
        } catch {
            return [];
        }
    }

    return { syncUrlParam, readUrlParams };
}

// 容器外兼容入口：保持旧调用签名，内部惰性读取当前全局。
const defaultUrlState = createUrlState();

/** @param {string[]} links */
export function syncUrlParam(links) {
    return defaultUrlState.syncUrlParam(links);
}

/** @returns {string[]} */
export function readUrlParams() {
    return defaultUrlState.readUrlParams();
}
