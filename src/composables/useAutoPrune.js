import { ref } from 'vue';
import { createBrowserPlatform } from '../platform/browser.js';
import { defineFallback, useStore } from '../app/context.js';
import { createNodeHealthStore } from './useNodeHealth.js';
import { createNodesStore } from './useNodes.js';
import { createToastStore } from './useToast.js';

/**
 * 自动测速 + 自动剔除编排（v4 新功能）。
 *
 * 分层：useNodeHealth 只负责「测 + 判」，useNodes.pruneByVerdicts 只负责「删」，
 * 本 Store 把两者串起来并负责提示文案 / 运行锁 / 自动巡检节流。
 * 依赖全部显式注入，Node 单测可构造隔离实例。
 */
export function createAutoPruneStore({ health, nodes, toast }) {
    const running = ref(false);
    const lastRemoved = ref([]);
    const lastSummary = ref(null);

    /**
     * 完整巡检：探测全部节点 → 剔除失效 → 返回结果摘要。
     * @param {{silent?:boolean, rounds?:number}} [opts] silent=true 时不弹「开始」提示（启动自动巡检用）
     * @returns {Promise<{summary:object, removed:Array<object>, guarded:boolean}|null>} 运行中返回 null
     */
    async function checkAndPrune(opts) {
        if (running.value) return null;
        const options = opts || {};
        const { showToast } = toast;
        running.value = true;
        try {
            if (!options.silent) showToast('正在检测节点可用性…');
            const list = nodes.all.value.slice();
            const probe = await health.run(list, { rounds: options.rounds });
            if (!probe) return null;
            const pruned = nodes.pruneByVerdicts(probe.verdicts);
            lastRemoved.value = pruned.removed;
            lastSummary.value = probe.summary;
            if (pruned.removed.length) {
                // 无论是否静默都要提示：用户需要知道列表变了（自动巡检同样可见）
                showToast('已自动剔除 ' + pruned.removed.length + ' 个不可用节点，保留 ' +
                    probe.summary.healthy + ' 个健康节点');
            } else if (!options.silent) {
                showToast('检测完成：' + probe.summary.healthy + ' 个节点可用，无需剔除');
            }
            return { summary: probe.summary, removed: pruned.removed, guarded: pruned.guarded };
        } catch {
            if (!options.silent) showToast('节点检测失败，请稍后重试');
            return null;
        } finally {
            running.value = false;
        }
    }

    /**
     * 启动时按节流条件自动巡检一次（默认 6 小时一次）。
     * 自动巡检不再完全静默：剔除了节点就提示，否则保持安静（不打扰）。
     */
    async function autoCheckIfDue() {
        if (!health.shouldAutoRun()) return null;
        return checkAndPrune({ silent: true });
    }

    return { running, lastRemoved, lastSummary, checkAndPrune, autoCheckIfDue };
}

// 容器外（node:test / 脚本）：惰性构造一组共享依赖的兼容实例。
defineFallback('autoPrune', (get) => {
    const platform = createBrowserPlatform();
    return createAutoPruneStore({
        health: get('nodeHealth') || createNodeHealthStore({ storage: platform.localStorage, fetchFn: platform.fetchFn }),
        nodes: get('nodes') || createNodesStore(platform.localStorage),
        toast: get('toast') || createToastStore()
    });
});

/** 应用级共享自动剔除编排。 */
export function useAutoPrune() {
    return useStore('autoPrune');
}
