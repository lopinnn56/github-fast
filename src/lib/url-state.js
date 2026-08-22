// 地址栏 ?url= 参数的读写：用于分享链接（转换后地址带参数，对方打开即见同样结果）

/**
 * 把当前结果同步到地址栏 ?url= 参数；列表为空时清空查询串。
 * @param {string[]} links
 */
export function syncUrlParam(links) {
    try {
        const url = new URL(location.href);
        if (links.length) {
            url.searchParams.delete('url');
            links.forEach(function (l) { url.searchParams.append('url', l); });
        } else {
            url.search = '';
        }
        history.replaceState(null, '', url);
    } catch {
        // ignore (e.g. file://)
    }
}

/**
 * 读取地址栏中的全部 ?url= 参数值。
 * @returns {string[]}
 */
export function readUrlParams() {
    try {
        return new URLSearchParams(location.search).getAll('url').filter(Boolean);
    } catch {
        return [];
    }
}
