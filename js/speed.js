const SPEED_TIMEOUT = 3500;
const CACHE_KEY = 'gh_accel_speed';
const CACHE_TTL = 5 * 60 * 1000;
const CONCURRENCY = 6;

export const speedMap = {};

const cache = loadCache();

function loadCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function persistCache() {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        // ignore
    }
}

function cachedResult(prefix) {
    const c = cache[prefix];
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

async function probeNode(n) {
    const cached = cachedResult(n.prefix);
    if (cached) {
        speedMap[n.prefix] = cached;
        return cached;
    }
    // cache-busting：避免镜像 / CDN 缓存命中导致延迟虚低
    const bust = n.prefix + 'https://github.com/favicon.ico?_ghfast=' +
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    // 第一次：CORS 探测，尽量拿到真实 HTTP 状态
    let r = await probeOnce(bust, true, SPEED_TIMEOUT);
    if (!r) {
        // 状态码不可见（无 ACAO 头 / 重定向到无 CORS 头的目标）：
        // 第二次退回 no-cors，仅测连通性与延迟
        r = await probeOnce(bust, false, SPEED_TIMEOUT);
    }
    const result = r ? { ok: r.ok, ms: r.ms, ts: Date.now() } : { ok: false, ms: SPEED_TIMEOUT, ts: Date.now() };
    speedMap[n.prefix] = result;
    cache[n.prefix] = result;
    return result;
}

export async function runSpeedTest(nodes, onProgress) {
    const total = nodes.length;
    if (!total) return { okCount: 0, failedCount: 0, total: 0 };
    let okCount = 0;
    let failedCount = 0;
    let done = 0;
    let idx = 0;

    async function worker() {
        while (idx < total) {
            const i = idx++;
            const node = nodes[i];
            const r = await probeNode(node);
            if (r.ok) okCount++;
            else failedCount++;
            done++;
            if (onProgress) onProgress(node, r, done, total);
        }
    }

    const workers = [];
    const n = Math.min(CONCURRENCY, total);
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);
    persistCache();
    return { okCount, failedCount, total };
}
