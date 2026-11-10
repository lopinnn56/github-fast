/**
 * 节点健康判定 —— 纯函数库（v4 新功能）。
 *
 * 旧版测速只看 HTTP 状态码（favicon），实测会大量误判：403 / 404 / JS 跳转挑战页 /
 * 域名停放广告页都算「可用」。本模块改用「铁证校验」：
 * 让节点代理一个本仓库的真实文件，只有响应体确实是该文件内容才算健康。
 *
 * 无 DOM / 存储 / Vue 依赖，可直接 Node 单测。
 */
import { buildAccelUrl, getNodeId } from './convert.js';
import { LIMITS } from '../config/constants.js';

/** 探针目标：本仓库 package.json 与 README，内容固定可校验。 */
export const HEALTH_PKG_URL = 'https://raw.githubusercontent.com/lopinnn56/github-fast/main/package.json';
export const HEALTH_README_URL = 'https://raw.githubusercontent.com/lopinnn56/github-fast/main/README.md';
export const HEALTH_PKG_NAME = 'github-fast';
export const HEALTH_README_MARK = '将 GitHub 链接一键转换为加速镜像';

// 明确失效特征：JS 挑战页、域名停放/广告页、WAF 拦截、Worker 报错、非法 URL 提示。
const FAIL_MARKERS = [
    /<title>\s*Loading\s*\.\.\./i,
    /window\.location\s*=|location\.(replace|href)\s*\(/i,
    /just a moment|attention required|checking your browser/i,
    /searchresultsworld|findsearchresults|skenzo|domain (is )?for sale|parked domain|abovedomains/i,
    /403 forbidden|access denied|cfworker error|invalid input\./i,
    /URL 格式不合法|url (is )?invalid/i,
    /^404: Not Found/i,
    /error 10\d\d|origin (is )?unreachable/i
];

/** 生成带 cache-busting 的探针 URL（贴着项目 buildAccelUrl 的拼接规则）。 */
export function buildHealthProbeUrl(node, input, salt) {
    const u = new URL(buildAccelUrl(input, node));
    u.searchParams.set('_ghfast', String(salt || Date.now().toString(36)));
    return u.href;
}

/**
 * 校验单次响应体是否为真实内容。
 * @param {number} status HTTP 状态码；0 表示网络层失败
 * @param {string} body 响应文本
 * @param {'pkg'|'readme'} kind 探针类型
 * @returns {'healthy'|'unhealthy'|'unknown'} 单次判定
 */
export function verifyHealthResponse(status, body, kind) {
    if (!status || status === 0) return 'unknown';   // 网络/超时/CORS 失败：不据此剔除
    if (status >= 500) return 'unhealthy';
    const text = typeof body === 'string' ? body : '';
    // 铁证优先：内容确为仓库文件
    if (kind === 'pkg') {
        try {
            const json = JSON.parse(text);
            if (json && json.name === HEALTH_PKG_NAME) return 'healthy';
        } catch { /* not json */ }
    } else if (text.includes(HEALTH_README_MARK)) {
        return 'healthy';
    }
    if (FAIL_MARKERS.some(function (re) { return re.test(text.slice(0, 4000)); })) return 'unhealthy';
    // 4xx / 空内容 / 内容不符：明确不可用
    if (status >= 400 || !text.trim()) return 'unhealthy';
    return 'unhealthy';
}

/**
 * 汇总一个节点的多轮采样，得出最终判定。
 * 任一「铁证」即健康；全部明确失败才剔除；含网络错误则保守保留（unknown）。
 * @param {Array<{status:number, body:string, kind:'pkg'|'readme'}>} samples
 * @returns {'healthy'|'unhealthy'|'unknown'}
 */
export function classifyHealthSamples(samples) {
    const list = Array.isArray(samples) ? samples : [];
    if (!list.length) return 'unknown';
    const verdicts = list.map(function (s) { return verifyHealthResponse(s.status, s.body, s.kind); });
    if (verdicts.includes('healthy')) return 'healthy';
    if (verdicts.includes('unknown')) return 'unknown';
    return 'unhealthy';
}

/**
 * 依据判定结果生成保留/剔除名单，带安全护栏。
 * - 只剔除 verdict === 'unhealthy' 的节点；healthy / unknown 一律保留。
 * - 剔除后至少保留 minKeep 个节点（不足时按原顺序留足），防止整表被清空。
 * @param {Array<object>} nodes 节点列表
 * @param {Record<string,'healthy'|'unhealthy'|'unknown'>} verdicts 以 getNodeId 为键
 * @param {{minKeep?:number}} [opts]
 * @returns {{kept:Array<object>, removed:Array<object>, guarded:boolean}}
 */
export function pruneUnhealthy(nodes, verdicts, opts) {
    const options = opts || {};
    const minKeep = Number.isInteger(options.minKeep) ? Math.max(options.minKeep, 0) : LIMITS.healthMinKeep;
    const list = Array.isArray(nodes) ? nodes : [];
    const bad = list.filter(function (n) { return verdicts[getNodeId(n)] === 'unhealthy'; });
    const maxRemovable = Math.max(list.length - minKeep, 0);
    // 未触发护栏时全部剔除；触发护栏（bad 多于可删名额）时优先保留排在前面的节点，从队尾剔。
    const cut = Math.min(bad.length, maxRemovable);
    const removeIds = new Set(bad.slice(bad.length - cut).map(getNodeId));
    const kept = [];
    const removed = [];
    list.forEach(function (n) {
        if (removeIds.has(getNodeId(n))) removed.push(n);
        else kept.push(n);
    });
    return { kept, removed, guarded: bad.length > maxRemovable };
}

/** 把探测结论压成便于展示的摘要。 */
export function summarizeVerdicts(nodes, verdicts) {
    const list = Array.isArray(nodes) ? nodes : [];
    const counts = { healthy: 0, unhealthy: 0, unknown: 0 };
    list.forEach(function (n) {
        const v = verdicts[getNodeId(n)];
        if (v === 'healthy' || v === 'unhealthy' || v === 'unknown') counts[v]++;
    });
    return { ...counts, total: list.length };
}
