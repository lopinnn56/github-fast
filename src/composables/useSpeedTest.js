import { reactive } from 'vue';
import { buildAccelUrl, getNodeId, normalizeNode } from '../lib/convert.js';

const SPEED_TIMEOUT = 3500;
const CACHE_KEY = 'gh_accel_speed';
const CACHE_TTL = 5 * 60 * 1000;
const CONCURRENCY = 6;

function loadCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

const cache = loadCache();

function persistCache() {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* 隐私模式：仅内存缓存 */ }
}

function cachedResult(id) {
    const c = cache[id];
    if (c && Date.now() - c.ts < CACHE_TTL) return c;
    return null;
}

// 单次探测。cors=true 时可读取 HTTP 状态码（状态码 >=500 判不可用）；
// cors=false 时为 no-cors 模式，状态码不可见，仅以「请求是否成功完成」判定连通性。
// 返回 {ok, ms}；网络层失败（DNS/超时/中断）返回 null。
function probeOnce(url, cors, timeout) {
    return new Promise(function (resolve) {
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, timeout);
        const start = performance.now();
        const opts = { cache: 'no-store', signal: ctrl.signal, redirect: 'follow' };
        if (!cors) opts.mode = 'no-cors';
        fetch(url, opts).then(function (res) {
            clearTimeout(timer);
            resolve({ ok: cors ? (res.status > 0 && res.status < 500) : true, ms: performance.now() - start });
        }, function () {
            clearTimeout(timer);
            resolve(null);
        });
    });
}

async function probeNode(rawNode) {
    const node = normalizeNode(rawNode);
    if (!node) return { ok: false, ms: SPEED_TIMEOUT, ts: Date.now() };
    const id = getNodeId(node);
    const hit = cachedResult(id);
    if (hit) return hit;
    // cache-busting：避免镜像 / CDN 缓存命中导致延迟虚低
    const probeUrl = new URL(buildAccelUrl('https://github.com/favicon.ico', node));
    probeUrl.searchParams.set('_ghfast', Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    const bust = probeUrl.href;
    // 第一次：CORS 探测拿真实状态；失败退回 no-cors 仅测连通性
    let r = await probeOnce(bust, true, SPEED_TIMEOUT);
    if (!r) r = await probeOnce(bust, false, SPEED_TIMEOUT);
    const result = r ? { ok: r.ok, ms: r.ms, ts: Date.now() } : { ok: false, ms: SPEED_TIMEOUT, ts: Date.now() };
    cache[id] = result;
    return result;
}

// 模块级单例状态：results[prefix] = {ok, ms}，供节点行徽章响应式渲染
const results = reactive({});
const progress = reactive({ active: false, done: 0, total: 0 });

let running = false;

/**
 * 节点测速：并发探测 + sessionStorage 缓存（TTL 5 分钟）。
 * 无论探测过程是否抛错，finally 都会释放运行锁（修复旧版锁死问题）。
 */
export function useSpeedTest() {
    /**
     * @param {Array<{prefix:string}>} nodes 待测节点列表
     * @param {(node:{prefix:string}, result:{ok:boolean,ms:number}) => void} [onResult] 单节点完成回调
     * @returns {Promise<{okCount:number, failedCount:number, total:number}|null>} running 时返回 null
     */
    async function run(nodes, onResult) {
        if (running) return null;
        running = true;
        progress.active = true;
        progress.done = 0;
        progress.total = nodes.length;
        try {
            let okCount = 0;
            let failedCount = 0;
            let idx = 0;

            async function worker() {
                while (idx < nodes.length) {
                    const node = nodes[idx++];
                    let r;
                    try {
                        r = await probeNode(node);
                    } catch {
                        r = { ok: false, ms: SPEED_TIMEOUT, ts: Date.now() };
                    }
                    const id = getNodeId(node);
                    results[id] = r;
                    cache[id] = cache[id] || Object.assign({ ts: Date.now() }, r);
                    if (r.ok) okCount++;
                    else failedCount++;
                    progress.done++;
                    if (onResult) onResult(node, r);
                }
            }

            const workers = [];
            const n = Math.min(CONCURRENCY, nodes.length);
            for (let i = 0; i < n; i++) workers.push(worker());
            await Promise.all(workers);
            persistCache();
            return { okCount, failedCount, total: nodes.length };
        } finally {
            running = false;
            progress.active = false;
        }
    }

    return { results, progress, run };
}
