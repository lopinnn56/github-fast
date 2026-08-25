/**
 * 链接识别与加速地址拼装 —— 纯函数库，无 DOM / 存储副作用，可直接单测。
 */

// 允许省略协议直接书写的 GitHub 系域名（覆盖 www./gist./raw. 等子域）
const GITHUB_HOST_NO_PROTO = /^(?:www\.)?(?:github\.com|gist\.github\.com|(?:[\w-]+\.)?githubusercontent\.com|(?:[\w-]+\.)?githubassets\.com)(?:\/|$)/i;

/**
 * 解析并规范化加速节点前缀。只接受无凭据、查询串和哈希的 HTTP(S) 地址。
 * @param {string} value 节点前缀
 * @returns {string|null} 以斜杠结尾的前缀；无效时返回 null
 */
export function normalizeNodePrefix(value) {
    if (typeof value !== 'string' || !value || value.length > 2048) return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        if (url.username || url.password || url.search || url.hash) return null;
        const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '/');
        return url.origin + path;
    } catch {
        return null;
    }
}

/**
 * 校验并规范化用户自定义节点。
 * @param {{name:string,prefix:string,mode?:string}} node 待校验节点
 * @returns {{name:string,prefix:string,mode:'prefix'|'replace'}|null} 规范化节点
 */
export function normalizeNode(node) {
    if (!node || typeof node !== 'object') return null;
    const prefix = normalizeNodePrefix(node.prefix);
    if (!prefix) return null;
    const name = typeof node.name === 'string' ? node.name.trim() : '';
    if (!name || name.length > 120) return null;
    return { name, prefix, mode: node.mode === 'replace' ? 'replace' : 'prefix' };
}

/**
 * 生成跨列表稳定的节点标识，用于结果映射和测速缓存。
 * @param {{prefix:string,mode?:string}} node 节点数据
 * @returns {string} 稳定 ID；无效节点返回空串
 */
export function getNodeId(node) {
    const normalized = normalizeNode(node);
    return normalized ? normalized.mode + ':' + normalized.prefix : '';
}

/**
 * 规范化用户输入：补全协议、归一 www 前缀、支持 user/repo 简写。
 * @param {string} raw 原始输入（可为空）
 * @returns {string} 规范化后的 URL；无法识别时返回空串
 */
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

/**
 * 判断是否为 GitHub 系链接（github.com 及其子域）。
 * @param {string} url
 * @returns {boolean}
 */
export function isGitHubUrl(url) {
    try {
        const u = new URL(url);
        return /(^|\.)(github\.com|githubusercontent\.com|githubassets\.com)$/i.test(u.hostname);
    } catch {
        return false;
    }
}

/**
 * 识别链接类型：raw / release / file / repo / gist。
 * @param {string} url
 * @returns {'raw'|'release'|'file'|'repo'|'gist'}
 */
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
    } catch {
        return 'repo';
    }
}

export const TYPE_LABEL = { raw: 'RAW', release: 'RELEASE', file: 'FILE', repo: 'REPO', gist: 'GIST', clone: 'CLONE' };

/**
 * 按节点规则把原始 GitHub 地址转换为加速地址。
 * @param {string} input 原始 URL
 * @param {{prefix:string, mode?:'prefix'|'replace'}|null} node 节点配置
 * @returns {string} 加速地址；节点数据损坏时原样返回输入
 */
export function buildAccelUrl(input, node) {
    // 防御：损坏的节点数据（缺失 prefix）不应产出 undefinedxxx 链接
    if (!node || typeof node.prefix !== 'string' || !node.prefix) return input;
    const prefix = normalizeNodePrefix(node.prefix);
    if (!prefix) return input;
    if (node.mode === 'replace') {
        try {
            const u = new URL(input);
            const replacementBase = prefix.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
            return u.protocol + '//' + replacementBase + u.pathname + u.search + u.hash;
        } catch {
            // fall through to prefix mode
        }
    }
    return prefix + input.replace(/^https?:\/\//, '');
}

/**
 * 从节点 prefix 中提取裸主机名用于展示。
 * @param {string} prefix
 * @returns {string}
 */
export function hostOf(prefix) {
    return prefix.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/**
 * 生成 git clone 命令文本。
 * @param {string} targetUrl 已转换的加速地址
 * @returns {string}
 */
export function buildCloneCommand(targetUrl) {
    return 'git clone ' + targetUrl;
}

// 单次批量转换的上限，防止粘贴超大文本时 DOM 爆炸
export const MAX_BATCH = 100;

/**
 * 把多行文本解析为去重后的规范化 URL 列表。
 * @param {string} text
 * @returns {string[]}
 */
export function parseBatchWithStats(text, limit = Number.MAX_SAFE_INTEGER, filter = null) {
    const seen = new Set();
    const out = [];
    let normalizedTotal = 0;
    let acceptedTotal = 0;
    let invalidCount = 0;
    let filteredCount = 0;
    String(text || '').split(/\r?\n/).forEach(function (line) {
        const url = normalizeInput(line);
        if (!url) {
            invalidCount++;
            return;
        }
        normalizedTotal++;
        if (seen.has(url)) return;
        seen.add(url);
        if (filter && !filter(url)) {
            filteredCount++;
            return;
        }
        acceptedTotal++;
        if (out.length < limit) out.push(url);
    });
    return { urls: out, normalizedTotal, acceptedTotal, invalidCount, filteredCount };
}

/**
 * 兼容旧调用的批量解析入口。
 * @param {string} text 输入文本
 * @returns {string[]} 规范化后的 URL 列表
 */
export function parseBatch(text) {
    return parseBatchWithStats(text).urls;
}
