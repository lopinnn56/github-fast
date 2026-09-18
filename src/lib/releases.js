/**
 * Release 资产自动解析 —— 纯函数 + 轻量存储/网络封装。
 * 保持与 src/lib/convert.js 一致的风格：纯函数可单测，无 Vue 依赖。
 * 网络请求由浏览器直连 api.github.com，不经过任何自建后端。
 */
import { buildAccelUrl, hostOf } from './convert.js';

export const GITHUB_API_BASE = 'https://api.github.com';
export const RELEASE_CACHE_TTL = 5 * 60 * 1000;
export const RELEASE_CACHE_PREFIX = 'github-fast:release:';
export const RELEASE_TOKEN_KEY = 'github-fast:gh-token';
// 自动查询上限：批量粘贴大量仓库主页时只自动查前 N 个，其余手动触发，避免瞬间撞上 60 次/小时限流。
export const AUTO_RESOLVE_LIMIT = 10;
// 一键加速后行内展开的加速链条数，避免 70+ 节点一次渲染导致 DOM 爆炸。
export const TOP_ACCEL_LINKS = 3;

const SEG_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * 从任意输入中提取 owner/repo。
 * 兼容：完整 URL、www 前缀、尾部斜杠、.git 后缀、/tree/main 等多余路径、user/repo 简写。
 * 仅接受 github.com 裸域（www 会被归一），gist/raw 等其它 host 一律拒绝。
 * @param {string} input 原始输入或规范化 URL
 * @returns {string|null} 小写的 "owner/repo"？不，保留原始大小写，仅用于展示与 API（API 大小写不敏感）
 */
export function parseRepoSlug(input) {
    let s = (input || '').trim();
    if (!s) return null;
    // user/repo 简写（不含协议、不含点 host）
    if (!/^https?:\/\//i.test(s)) {
        // 形如 github.com/owner/repo... 先补协议走 URL 分支
        if (/^(?:[a-z0-9-]+\.)*github\.com(?:\/|$)/i.test(s)) {
            s = 'https://' + s.replace(/^\/+/, '');
        } else {
            const m = s.replace(/^\/+/, '').split('/');
            // owner 不含点号（含点一律不当简写，避免 example.com/x 被误判，与 convert.js 一致）
            if (m.length >= 2 && !m[0].includes('.') && SEG_RE.test(m[0]) && SEG_RE.test(m[1].replace(/\.git$/i, ''))) {
                const owner = m[0];
                const repo = m[1].replace(/\.git$/i, '');
                if (!owner || !repo || owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;
                if (owner.length > 100 || repo.length > 100) return null;
                // owner 按 GitHub 规则不能以连字符开头结尾（repo 允许点），宽松校验即可
                return owner + '/' + repo;
            }
            return null;
        }
    }
    let u;
    try {
        u = new URL(s);
    } catch {
        return null;
    }
    const host = u.hostname.toLowerCase();
    // 仅 github.com 本域，api.github.com / codeload 等子域不是仓库主页
    if (host !== 'github.com' && host !== 'www.github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (!SEG_RE.test(owner) || !SEG_RE.test(repo)) return null;
    if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;
    if (owner.length > 100 || repo.length > 100) return null;
    return owner + '/' + repo;
}

/**
 * latest release 接口地址。
 * @param {string} slug owner/repo
 */
export function buildLatestUrl(slug) {
    return GITHUB_API_BASE + '/repos/' + slug + '/releases/latest';
}

/**
 * release 列表接口地址（latest 404 时回退用）。
 * @param {string} slug owner/repo
 * @param {number} perPage 取几个
 */
export function buildListUrl(slug, perPage = 5) {
    const n = Math.min(Math.max(perPage || 5, 1), 20);
    return GITHUB_API_BASE + '/repos/' + slug + '/releases?per_page=' + n;
}

/**
 * 合成源码包下载地址（无附件或无 Release 时的兜底）。
 * @param {string} slug owner/repo
 * @param {string} tag 如 v1.5.1
 */
export function buildArchiveUrl(slug, tag) {
    return 'https://github.com/' + slug + '/archive/refs/tags/' + tag + '.zip';
}

/**
 * 构造 GitHub API 请求头。token 为空时不带 Authorization。
 * @param {string} [token]
 */
export function buildAuthHeaders(token) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    const t = (token || '').trim();
    if (t) headers.Authorization = 'Bearer ' + t;
    return headers;
}

/** 读取本地保存的 Token（不存在返回空串，Node 单测环境返回空串）。 */
export function getStoredToken() {
    try {
        if (typeof localStorage === 'undefined') return '';
        return localStorage.getItem(RELEASE_TOKEN_KEY) || '';
    } catch {
        return '';
    }
}

/** 保存 Token 到 localStorage。 */
export function setStoredToken(token) {
    const t = (token || '').trim();
    try {
        if (typeof localStorage === 'undefined') return;
        if (!t) localStorage.removeItem(RELEASE_TOKEN_KEY);
        else localStorage.setItem(RELEASE_TOKEN_KEY, t);
    } catch {
        // 配额不足/隐私模式：静默忽略
    }
}

/** 清除已保存的 Token。 */
export function clearStoredToken() {
    setStoredToken('');
}

/**
 * 把 GitHub release JSON 归一为展示结构。
 * @param {object} data /releases/latest 或 /releases 列表项
 * @returns {{tag:string,name:string,publishedAt:string,prerelease:boolean,htmlUrl:string,assets:Array<{name:string,size:number,downloadUrl:string,downloadCount:number,contentType:string}>}|null}
 */
export function pickDisplayRelease(data) {
    if (!data || typeof data !== 'object' || typeof data.tag_name !== 'string') return null;
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return {
        tag: data.tag_name,
        name: typeof data.name === 'string' && data.name ? data.name : data.tag_name,
        publishedAt: typeof data.published_at === 'string' ? data.published_at : '',
        prerelease: data.prerelease === true,
        htmlUrl: typeof data.html_url === 'string' ? data.html_url : '',
        assets: assets
            .filter(function (a) { return a && typeof a.browser_download_url === 'string'; })
            .map(function (a) {
                return {
                    name: typeof a.name === 'string' ? a.name : 'asset',
                    size: typeof a.size === 'number' ? a.size : 0,
                    downloadUrl: a.browser_download_url,
                    downloadCount: typeof a.download_count === 'number' ? a.download_count : 0,
                    contentType: typeof a.content_type === 'string' ? a.content_type : ''
                };
            })
    };
}

/** 字节数 → 人类可读（如 23.8 MB）。 */
export function formatSize(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '-';
    if (n < 1024) return n + ' B';
    const units = ['KB', 'MB', 'GB'];
    let v = n / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return (v >= 100 ? Math.round(v) : v.toFixed(1)) + ' ' + units[i];
}

/** 缓存键（slug 大小写不敏感）。 */
export function releaseCacheKey(slug) {
    return RELEASE_CACHE_PREFIX + String(slug || '').toLowerCase();
}

/**
 * 为原下载链接生成前 N 条加速链（“一键加速”后行内展开用）。
 * 节点顺序由调用方排好（一般是 pinned → main），这里只截断，不做测速排序。
 * @param {string} downloadUrl 原 GitHub 下载链接
 * @param {Array<{name:string,prefix:string,mode?:string}>} nodes 节点列表
 * @param {number} [limit] 最多几条
 * @returns {Array<{name:string,target:string}>} 加速链；节点无效/坏数据时自动跳过
 */
export function buildTopAccelLinks(downloadUrl, nodes, limit) {
    if (typeof downloadUrl !== 'string' || !downloadUrl) return [];
    const list = Array.isArray(nodes) ? nodes : [];
    const n = Math.min(Math.max(Number(limit) || TOP_ACCEL_LINKS, 1), 10);
    const out = [];
    for (const node of list) {
        if (out.length >= n) break;
        if (!node || typeof node.prefix !== 'string' || !node.prefix) continue;
        const target = buildAccelUrl(downloadUrl, node);
        // 坏节点数据会原样返回输入，跳过以免行内出现重复原链
        if (!target || target === downloadUrl) continue;
        const rawName = typeof node.name === 'string' ? node.name.trim() : '';
        out.push({ name: rawName || hostOf(node.prefix), target });
    }
    return out;
}

/** 读取 sessionStorage 缓存，未命中/过期返回 null。 */
export function readReleaseCache(slug) {
    try {
        if (typeof sessionStorage === 'undefined') return null;
        const raw = sessionStorage.getItem(releaseCacheKey(slug));
        if (!raw) return null;
        const wrap = JSON.parse(raw);
        if (!wrap || !wrap.data || !wrap.savedAt) return null;
        if (Date.now() - wrap.savedAt > RELEASE_CACHE_TTL) {
            sessionStorage.removeItem(releaseCacheKey(slug));
            return null;
        }
        return wrap.data;
    } catch {
        return null;
    }
}

/** 写入 sessionStorage 缓存。 */
export function writeReleaseCache(slug, data) {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(releaseCacheKey(slug), JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
        // 配额不足时忽略
    }
}

function rateLimitResetIn(headers) {
    try {
        const v = headers.get('x-ratelimit-reset');
        if (!v) return '';
        const sec = Number(v) - Math.floor(Date.now() / 1000);
        if (!Number.isFinite(sec) || sec <= 0) return '';
        if (sec < 60) return sec + ' 秒';
        return Math.ceil(sec / 60) + ' 分钟';
    } catch {
        return '';
    }
}

/**
 * 查询 latest release，404 时回退到列表取首个非 draft。
 * @param {string} slug owner/repo
 * @param {{token?:string, fetchFn?:Function}} [opts]
 * @returns {Promise<{release:object, fromCache:boolean}>}
 * @throws {Error} code: INVALID_SLUG | NOT_FOUND | NO_RELEASE | RATE_LIMITED | FORBIDDEN | HTTP_{status} | NETWORK
 */
export async function fetchLatestRelease(slug, opts) {
    const options = opts || {};
    if (!slug || slug.indexOf('/') < 0) {
        const e = new Error('无效的仓库地址');
        e.code = 'INVALID_SLUG';
        throw e;
    }
    const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
        const e = new Error('当前环境不支持网络请求');
        e.code = 'NETWORK';
        throw e;
    }
    const headers = buildAuthHeaders(options.token);
    let res;
    try {
        res = await fetchFn(buildLatestUrl(slug), { headers });
    } catch (err) {
        const e = new Error('网络请求失败，请检查网络后重试');
        e.code = 'NETWORK';
        e.cause = err;
        throw e;
    }
    if (res.ok) {
        const data = await res.json();
        const release = pickDisplayRelease(data);
        if (!release) {
            const e = new Error('Release 数据解析失败');
            e.code = 'NO_RELEASE';
            throw e;
        }
        return { release, fromCache: false };
    }
    if (res.status === 404) {
        // 可能是真没 latest（只有 prerelease 或空仓库），回退查列表
        let listRes;
        try {
            listRes = await fetchFn(buildListUrl(slug, 5), { headers });
        } catch (err) {
            const e = new Error('网络请求失败，请检查网络后重试');
            e.code = 'NETWORK';
            e.cause = err;
            throw e;
        }
        if (listRes.ok) {
            const list = await listRes.json();
            const first = Array.isArray(list) ? list.find(function (r) { return r && r.draft !== true; }) : null;
            if (first) {
                const release = pickDisplayRelease(first);
                if (release) return { release, fromCache: false };
            }
            const e = new Error('该仓库暂无 Release，可直接加速源码包或分支压缩包');
            e.code = 'NO_RELEASE';
            throw e;
        }
        if (listRes.status === 404) {
            const e = new Error('仓库不存在或为私有仓库');
            e.code = 'NOT_FOUND';
            throw e;
        }
        if (listRes.status === 403 || listRes.status === 429) {
            const wait = rateLimitResetIn(listRes.headers);
            const e = new Error('GitHub API 限流，请' + (wait ? wait + '后' : '稍后') + '重试或填写 Token');
            e.code = 'RATE_LIMITED';
            throw e;
        }
        const e = new Error('查询失败（' + listRes.status + '），请稍后重试');
        e.code = 'HTTP_' + listRes.status;
        throw e;
    }
    if (res.status === 403 || res.status === 429) {
        const wait = rateLimitResetIn(res.headers);
        const e = new Error('GitHub API 限流，请' + (wait ? wait + '后' : '稍后') + '重试或填写 Token');
        e.code = 'RATE_LIMITED';
        throw e;
    }
    if (res.status === 401) {
        const e = new Error('Token 无效，请检查后重新填写');
        e.code = 'FORBIDDEN';
        throw e;
    }
    const e = new Error('查询失败（' + res.status + '），请稍后重试');
    e.code = 'HTTP_' + res.status;
    throw e;
}
