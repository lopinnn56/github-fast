/**
 * 全局常量单一来源（v4 重构）。
 *
 * 之前 MODE_KEY / STORAGE_KEY / SPEED_* / CACHE_* / AUTO_RESOLVE_LIMIT / MAX_BATCH
 * 等散落在 6 个 composable 与 3 个 lib 文件中，改动一个行为要翻多处。
 * 现在统一在此声明，各业务模块只做 `export const X = LIMITS.x` 的兼容再导出。
 */

export const APP_VERSION = '4.1.0';

/** 浏览器持久化键。改动会破坏老用户数据，务必保持值不变。 */
export const STORAGE_KEYS = Object.freeze({
    mode: 'gh_accel_mode',
    nodes: 'gh_accel_nodes_v3',
    legacyNodes: Object.freeze(['gh_accel_nodes_v2']),
    speedCache: 'gh_accel_speed',
    releaseCachePrefix: 'github-fast:release:',
    releaseToken: 'github-fast:gh-token',
    healthAuto: 'gh_accel_health_auto',
    healthLastRun: 'gh_accel_health_last_run'
});

/** 各种上限 / 超时 / 分页参数。 */
export const LIMITS = Object.freeze({
    maxBatch: 100,
    resultPageSize: 10,
    resultEntryCache: 300,
    resultAnimationMax: 24,
    resultAnimationStepMs: 30,
    autoResolve: 10,
    topAccelLinks: 3,
    topAccelLinksMax: 10,
    speedTimeout: 3500,
    speedConcurrency: 6,
    cacheTtl: 5 * 60 * 1000,
    toastMs: 1800,
    copyFlashMs: 1200,
    revealFallbackMs: 1500,
    healthTimeout: 4500,
    healthRounds: 2,
    healthConcurrency: 6,
    healthAutoInterval: 6 * 60 * 60 * 1000,
    healthMinKeep: 3
});

export const GITHUB_API_BASE = 'https://api.github.com';

export const MODES = Object.freeze(['link', 'clone']);

export const NODE_MODES = Object.freeze(['prefix', 'replace']);
