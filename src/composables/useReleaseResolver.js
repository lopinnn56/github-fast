import { reactive, ref } from 'vue';
import {
    parseRepoSlug,
    fetchLatestRelease,
    readReleaseCache,
    writeReleaseCache,
    getStoredToken,
    setStoredToken
} from '../lib/releases.js';
import { useConverter } from './useConverter.js';
import { createToastStore } from './useToast.js';

/**
 * Release 解析 Store（重构 v3.1）：工厂 + 应用级单例。
 * - resolveRepo 统一返回响应式 state 对象（快路径/慢路径一致），不再 Promise/对象二象性。
 * - 所有状态（states/token）由工厂字段持有，可在测试中创建隔离实例。
 */
export function createReleaseResolverStore({ toast = createToastStore() } = {}) {
    const states = reactive(Object.create(null));
    const inFlight = new Map();
    const token = ref(getStoredToken());
    const { showToast } = toast;

    function ensureState(slug) {
        const key = String(slug || '').toLowerCase();
        if (!states[key]) {
            states[key] = { status: 'idle', slug, data: null, error: '', code: '', fromCache: false };
        }
        return states[key];
    }

    function saveToken(value) {
        const t = (value || '').trim();
        // 基础形状校验：经典 PAT / fine-grained 均以 ghp_/github_pat_ 开头，空串表示清除
        if (t && !/^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)/.test(t)) {
            showToast('Token 格式看起来不对，已仍保存，使用时若 401 请检查');
        } else if (t) {
            showToast('Token 已保存到本地');
        }
        token.value = t;
        setStoredToken(t);
    }

    function clearToken() {
        token.value = '';
        setStoredToken('');
        showToast('Token 已清除');
    }

    function beginFetch(slug, st) {
        st.status = 'loading';
        st.error = '';
        st.code = '';
        st.fromCache = false;
        const p = fetchLatestRelease(slug, { token: token.value })
            .then(function (result) {
                st.status = 'done';
                st.data = result.release;
                st.error = '';
                st.code = '';
                st.fromCache = Boolean(result.fromCache);
                writeReleaseCache(slug, result.release);
            })
            .catch(function (err) {
                st.status = 'error';
                st.data = null;
                st.error = (err && err.message) || '查询失败';
                st.code = (err && err.code) || '';
            })
            .finally(function () {
                inFlight.delete(slug.toLowerCase());
            });
        inFlight.set(slug.toLowerCase(), p);
        return p;
    }

    /**
     * 解析仓库 Release。统一返回响应式 state（status: idle|loading|done|error）。
     * @param {string} repoUrl 仓库主页链接
     * @param {{force?: boolean}} [opts]
     * @returns {object|null} 响应式状态对象；无法解析的 URL 返回 null
     */
    function resolveRepo(repoUrl, opts) {
        const options = opts || {};
        const slug = parseRepoSlug(repoUrl);
        if (!slug) return null;
        const key = slug.toLowerCase();
        const st = ensureState(slug);

        // 并发去重：同一 slug 已有在途请求时直接复用（状态经同一 st 响应式可见）
        if (!options.force && inFlight.has(key)) return st;
        // 快路径：已加载 / 加载中
        if (!options.force && (st.status === 'loading' || st.status === 'done')) return st;

        // 先读 5 分钟 sessionStorage 缓存
        if (!options.force) {
            const cached = readReleaseCache(slug);
            if (cached) {
                st.status = 'done';
                st.data = cached;
                st.error = '';
                st.code = '';
                st.fromCache = true;
                return st;
            }
        }

        beginFetch(slug, st);
        return st;
    }

    /**
     * 把解析到的具体下载链接加入加速列表，走现有镜像加速流程。
     * @param {string} downloadUrl 形如 .../releases/download/v1.5.1/xxx.apk
     * @returns {'added'|'exists'|false} added=新加入，exists=已在列表，false=失败
     */
    function addAssetToConvert(downloadUrl) {
        if (!downloadUrl) return false;
        const { links, rawText } = useConverter();
        if (links.value.includes(downloadUrl)) {
            showToast('该文件已在加速列表中，下方可直接下载');
            return 'exists';
        }
        links.value = [...links.value, downloadUrl];
        rawText.value = links.value.join('\n');
        showToast('已加入加速列表');
        return 'added';
    }

    function getState(repoUrl) {
        const slug = parseRepoSlug(repoUrl);
        if (!slug) return null;
        return ensureState(slug);
    }

    return { states, token, saveToken, clearToken, resolveRepo, getState, addAssetToConvert };
}

let singleton = null;

/** 应用级共享 Release 解析状态（多个 ReleaseResolver 实例共享同一仓库的查询结果与 Token）。 */
export function useReleaseResolver() {
    if (!singleton) singleton = createReleaseResolverStore();
    return singleton;
}