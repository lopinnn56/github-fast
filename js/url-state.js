// 地址栏 ?url= 参数的读写：用于分享链接（转换后地址带参数，对方打开即见同样结果）
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
    } catch (e) {
        // ignore (e.g. file://)
    }
}

export function readUrlParams() {
    try {
        return new URLSearchParams(location.search).getAll('url').filter(Boolean);
    } catch (e) {
        return [];
    }
}
