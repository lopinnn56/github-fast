const SPEED_TIMEOUT = 4000;
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

function probeNode(n) {
    return new Promise(function (resolve) {
        const cached = cachedResult(n.prefix);
        if (cached) {
            speedMap[n.prefix] = cached;
            resolve(cached);
            return;
        }
        const start = performance.now();
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, SPEED_TIMEOUT);
        const done = function (ok, ms) {
            clearTimeout(timer);
            const r = { ok, ms, ts: Date.now() };
            speedMap[n.prefix] = r;
            cache[n.prefix] = r;
            resolve(r);
        };
        fetch(n.prefix + 'https://github.com/favicon.ico', {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: ctrl.signal
        }).then(function () {
            done(true, performance.now() - start);
        }).catch(function () {
            done(false, SPEED_TIMEOUT);
        });
    });
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
            const r = await probeNode(nodes[i]);
            if (r.ok) okCount++;
            else failedCount++;
            done++;
            if (onProgress) onProgress(i, r, done, total);
        }
    }

    const workers = [];
    const n = Math.min(CONCURRENCY, total);
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);
    persistCache();
    return { okCount, failedCount, total };
}
