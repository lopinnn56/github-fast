/**
 * Release 网关（v4 平台层）。
 *
 * 把原先散落在 lib/releases.js 里的浏览器副作用（Token 存取、sessionStorage 缓存、
 * 全局 fetch 选择）收敛成一个可注入对象：
 *   - 应用启动时由 createAppContext() 用 platform 片段构造一份，注入 store；
 *   - 容器外的兼容调用（lib/releases.js 的旧导出）走 getDefaultReleaseGateway() 懒加载；
 *   - 单测可直接 createReleaseGateway({ localStorage, sessionStorage, fetchFn })。
 */
import {
    RELEASE_CACHE_TTL,
    RELEASE_TOKEN_KEY,
    releaseCacheKey,
    fetchLatestRelease
} from '../lib/releases-core.js';
import { createBrowserPlatform } from './browser.js';

/**
 * @param {object} [env]
 * @param {Storage|null} [env.localStorage] Token 持久化
 * @param {Storage|null} [env.sessionStorage] 查询结果缓存
 * @param {Function|null} [env.fetchFn] 网络实现（注入后不再读全局 fetch）
 */
export function createReleaseGateway({ localStorage = null, sessionStorage = null, fetchFn = null } = {}) {
    /** 读取本地保存的 Token（不存在 / 隐私模式 / Node 环境返回空串）。 */
    function getToken() {
        try {
            if (!localStorage) return '';
            return localStorage.getItem(RELEASE_TOKEN_KEY) || '';
        } catch {
            return '';
        }
    }

    /** 保存 Token；空串表示删除。 */
    function setToken(token) {
        const t = (token || '').trim();
        try {
            if (!localStorage) return;
            if (!t) localStorage.removeItem(RELEASE_TOKEN_KEY);
            else localStorage.setItem(RELEASE_TOKEN_KEY, t);
        } catch {
            // 配额不足 / 隐私模式：静默忽略
        }
    }

    /** 读取 sessionStorage 缓存，未命中 / 过期 / 损坏返回 null。 */
    function readCache(slug) {
        try {
            if (!sessionStorage) return null;
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

    /** 写入 sessionStorage 缓存（TTL 由读取端判定）。 */
    function writeCache(slug, data) {
        try {
            if (!sessionStorage) return;
            sessionStorage.setItem(releaseCacheKey(slug), JSON.stringify({ savedAt: Date.now(), data }));
        } catch {
            // 配额不足时忽略
        }
    }

    /** 查询 latest release；fetchFn 注入优先，未注入时由 core 回退全局 fetch。 */
    function fetchRelease(slug, opts = {}) {
        return fetchLatestRelease(slug, { ...opts, fetchFn: opts.fetchFn || fetchFn });
    }

    return { getToken, setToken, readCache, writeCache, fetchRelease };
}

let defaultGateway = null;

/** 容器外兼容路径：懒加载，避免 import 时触碰浏览器全局。 */
export function getDefaultReleaseGateway() {
    if (!defaultGateway) {
        const platform = createBrowserPlatform();
        defaultGateway = createReleaseGateway(platform);
    }
    return defaultGateway;
}

/** 测试 / 应用启动可替换默认网关。 */
export function setDefaultReleaseGateway(gateway) {
    defaultGateway = gateway;
}

/** 清空默认网关（下一个调用重新按当前全局构造）。 */
export function resetDefaultReleaseGateway() {
    defaultGateway = null;
}
