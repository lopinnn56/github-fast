// GitHub hosts allowed to be written without a protocol (also covers www./gist/raw subdomains)
const GITHUB_HOST_NO_PROTO = /^(?:www\.)?(?:github\.com|gist\.github\.com|(?:[\w-]+\.)?githubusercontent\.com|(?:[\w-]+\.)?githubassets\.com)(?:\/|$)/i;

export function normalizeInput(raw) {
    let s = (raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) {
        if (GITHUB_HOST_NO_PROTO.test(s)) {
            s = 'https://' + s;
            // www.github.com -> github.com（镜像节点通常只接受裸域名）
            s = s.replace(/^https?:\/\/www\.github\.com\//i, 'https://github.com/');
        } else if (/^[\w-]+\/[\w.-]+/.test(s)) {
            // user/repo 简写：GitHub 用户名/组织名不含点号，含点号的一律不当作简写，
            // 避免 github.com.evil.com/x 之类被拼成坏链接
            s = 'https://github.com/' + s.replace(/^\/+/, '');
        }
    }
    return s;
}

export function isGitHubUrl(url) {
    try {
        const u = new URL(url);
        return /(^|\.)(github\.com|githubusercontent\.com|githubassets\.com)$/i.test(u.hostname);
    } catch (e) {
        return false;
    }
}

export function detectType(url) {
    try {
        const u = new URL(url);
        const h = u.hostname.toLowerCase();
        const p = u.pathname.toLowerCase();
        if (h === 'raw.githubusercontent.com' || h === 'raw.github.com' || h === 'gist.githubusercontent.com') return 'raw';
        if (/^gist\./.test(h)) return 'gist';
        // blob 优先于归档判断，否则仓库里的 .zip 文件会被误判为 release
        if (/\/blob\//.test(p)) return 'file';
        if (/\/releases\/|\/tags\/|\/archive\//.test(p)) return 'release';
        // 注：对 pathname 匹配，query 不参与；常见归档后缀均视为 release 下载
        if (/\.(zip|tar|gz|tgz|bz2|xz|rar|7z|apk|dmg|exe|deb|rpm|appimage)$/i.test(p)) return 'release';
        return 'repo';
    } catch (e) {
        return 'repo';
    }
}

export const TYPE_LABEL = { raw: 'RAW', release: 'RELEASE', file: 'FILE', repo: 'REPO', gist: 'GIST', clone: 'CLONE' };

export function buildAccelUrl(input, node) {
    // 防御：损坏的节点数据（缺失 prefix）不应产出 undefinedxxx 链接
    if (!node || typeof node.prefix !== 'string' || !node.prefix) return input;
    if (node.mode === 'replace') {
        try {
            const u = new URL(input);
            const host = node.prefix.replace(/^https?:\/\//, '').replace(/\/+$/, '');
            return u.protocol + '//' + host + u.pathname + u.search + u.hash;
        } catch (e) {
            // fall through to prefix mode
        }
    }
    return node.prefix + input.replace(/^https?:\/\//, '');
}

export function hostOf(prefix) {
    return prefix.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

// 单次批量转换的上限，防止粘贴超大文本时 DOM 爆炸
export const MAX_BATCH = 100;

export function parseBatch(text) {
    const seen = new Set();
    const out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
        const url = normalizeInput(line);
        if (!url || seen.has(url)) return;
        seen.add(url);
        out.push(url);
    });
    return out;
}
