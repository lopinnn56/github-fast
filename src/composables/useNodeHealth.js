import { reactive, ref } from 'vue';
import { LIMITS, STORAGE_KEYS } from '../config/constants.js';
import { getNodeId } from '../lib/convert.js';
import {
    HEALTH_PKG_URL,
    HEALTH_README_URL,
    buildHealthProbeUrl,
    classifyHealthSamples,
    summarizeVerdicts
} from '../lib/node-health.js';
import { createBrowserPlatform } from '../platform/browser.js';
import { defineFallback, useStore } from '../app/context.js';

function readBool(storage, key, fallback) {
    try {
        if (!storage) return fallback;
        const raw = storage.getItem(key);
        // 从未写入过（null）时用默认值，不能把「没设置」当成 false
        if (raw === null || raw === undefined || raw === '') return fallback;
        return raw === '1' || raw === 'true';
    } catch { return fallback; }
}
function readNumber(storage, key) {
    try { const n = Number(storage && storage.getItem(key)); return Number.isFinite(n) ? n : 0; } catch { return 0; }
}
function writeValue(storage, key, value) {
    try { if (storage) storage.setItem(key, String(value)); } catch { /* 隐私模式 */ }
}

function fetchOnce(url, fetchFn, timeout) {
    if (!fetchFn) return Promise.resolve({ status: 0, body: '' });
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = null;
    return new Promise(function (resolve) {
        const done = (r) => {
            if (timer) clearTimeout(timer);
            resolve(r);
        };
        if (ctrl) timer = setTimeout(function () { ctrl.abort(); }, timeout);
        const opts = { cache: 'no-store', redirect: 'follow' };
        if (ctrl) opts.signal = ctrl.signal;
        Promise.resolve()
            .then(function () { return fetchFn(url, opts); })
            .then(async function (res) {
                let body = '';
                try { body = await res.text(); } catch { /* opaque / 读取失败 */ }
                done({ status: res && typeof res.status === 'number' ? res.status : 0, body });
            }, function () { done({ status: 0, body: '' }); });
    });
}

/**
 * 节点健康检查 Store（v4 新功能）：真实内容探测 + 多轮采样 + 结果判定。
 * 只负责「测 + 判 + 持久化开关/时间」，不直接改节点列表（由 useAutoPrune 编排）。
 * 所有平台能力注入，便于 Node 单测。
 */
export function createNodeHealthStore({ storage = null, fetchFn = null } = {}) {
    const doFetch = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    const results = reactive({});            // id -> { verdict, ms, ts, status }
    const progress = reactive({ active: false, done: 0, total: 0 });
    const autoEnabled = ref(readBool(storage, STORAGE_KEYS.healthAuto, true));
    const lastRunAt = ref(readNumber(storage, STORAGE_KEYS.healthLastRun));
    let running = false;

    function setAutoEnabled(value) {
        const v = Boolean(value);
        autoEnabled.value = v;
        writeValue(storage, STORAGE_KEYS.healthAuto, v ? 1 : 0);
    }

    /** 距上次检查超过 healthAutoInterval 才允许自动跑，避免每次刷新都打满节点。 */
    function shouldAutoRun(now) {
        if (!autoEnabled.value) return false;
        const t = typeof now === 'number' ? now : Date.now();
        return t - lastRunAt.value >= LIMITS.healthAutoInterval;
    }

    async function probeNode(node, rounds) {
        const start = Date.now();
        const samples = [];
        for (let i = 0; i < rounds; i++) {
            const salt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            const r = await fetchOnce(buildHealthProbeUrl(node, HEALTH_PKG_URL, salt), doFetch, LIMITS.healthTimeout);
            samples.push({ status: r.status, body: r.body, kind: 'pkg' });
        }
        // 主探针没有铁证时，用 README 再给一次机会（部分节点只接受特定路径）
        if (!samples.some(function (s) { return s.status >= 200 && s.status < 300 && s.body && s.body.includes('"name"'); })) {
            const salt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            const r = await fetchOnce(buildHealthProbeUrl(node, HEALTH_README_URL, salt), doFetch, LIMITS.healthTimeout);
            samples.push({ status: r.status, body: r.body, kind: 'readme' });
        }
        const verdict = classifyHealthSamples(samples);
        return { verdict, ms: Date.now() - start, ts: Date.now(), status: samples[0] ? samples[0].status : 0 };
    }

    /**
     * 对全部节点做健康检查。
     * @param {Array<object>} nodes
     * @param {{rounds?:number, concurrency?:number, auto?:boolean}} [opts]
     * @returns {Promise<{verdicts:object, summary:object, total:number}|null>} 运行中返回 null
     */
    async function run(nodes, opts) {
        if (running) return null;
        const options = opts || {};
        const list = Array.isArray(nodes) ? nodes : [];
        const rounds = Math.max(1, Number(options.rounds) || LIMITS.healthRounds);
        const concurrency = Math.max(1, Number(options.concurrency) || LIMITS.healthConcurrency);
        running = true;
        progress.active = true;
        progress.done = 0;
        progress.total = list.length;
        const verdicts = {};
        try {
            let idx = 0;
            async function worker() {
                while (idx < list.length) {
                    const node = list[idx++];
                    let r;
                    try {
                        r = await probeNode(node, rounds);
                    } catch {
                        r = { verdict: 'unknown', ms: 0, ts: Date.now(), status: 0 };
                    }
                    const id = getNodeId(node);
                    results[id] = r;
                    verdicts[id] = r.verdict;
                    progress.done++;
                }
            }
            await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
            lastRunAt.value = Date.now();
            writeValue(storage, STORAGE_KEYS.healthLastRun, lastRunAt.value);
            return { verdicts, summary: summarizeVerdicts(list, verdicts), total: list.length };
        } finally {
            running = false;
            progress.active = false;
        }
    }

    return { results, progress, autoEnabled, lastRunAt, setAutoEnabled, shouldAutoRun, run };
}

defineFallback('nodeHealth', () => {
    const platform = createBrowserPlatform();
    return createNodeHealthStore({ storage: platform.localStorage, fetchFn: platform.fetchFn });
});

/** 应用级共享健康检查状态。 */
export function useNodeHealth() {
    return useStore('nodeHealth');
}
