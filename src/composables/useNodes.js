import { computed, reactive } from 'vue';
import { DEFAULT_NODES, loadNodeState, saveNodeState } from '../lib/nodes-core.js';
import { getNodeId } from '../lib/convert.js';
import { pruneUnhealthy } from '../lib/node-health.js';
import { createBrowserPlatform } from '../platform/browser.js';
import { defineFallback, useStore } from '../app/context.js';

/**
 * 节点仓库 Store（v4）：纯工厂 + 容器注入。
 *
 * v3.1 在本模块顶层维护 `const singletonStorage = typeof localStorage !== 'undefined' ? ...`，
 * import 即触碰浏览器全局；v4 由 createAppContext() 统一构造，组件通过 useNodes()
 * 从 provide/inject 容器取同一实例，容器外才惰性建兼容实例。
 * 纯逻辑（校验 / 存取 / 迁移）仍在 nodes-core.js，可脱离 Vue 单测。
 */
export function createNodesStore(storage) {
    const initial = loadNodeState(storage);

    const state = reactive({
        main: initial.main,
        pinned: initial.pinned
    });

    // v2 -> v3 迁移后立即落盘，避免下次仍走旧数据分支
    if (initial.migrated) saveNodeState(storage, state);
    // 过滤了已退役节点后同样要落盘，否则下次仍会从旧缓存读到它们
    else if (initial.retiredRemoved) saveNodeState(storage, state);

    function persist() {
        saveNodeState(storage, state);
    }

    function boundsCheck(list, i) {
        return Number.isInteger(i) && i >= 0 && i < list.length;
    }

    const all = computed(() => state.pinned.concat(state.main));
    const total = computed(() => all.value.length);

    function pinNode(i) {
        if (!boundsCheck(state.main, i)) return;
        const node = state.main.splice(i, 1)[0];
        state.pinned.unshift(node);
        persist();
    }

    function unpinNode(i) {
        if (!boundsCheck(state.pinned, i)) return;
        const node = state.pinned.splice(i, 1)[0];
        state.main.push(node);
        persist();
    }

    function removeFrom(listKey, i) {
        if (!boundsCheck(state[listKey], i)) return;
        state[listKey].splice(i, 1);
        persist();
    }

    function reorderIn(listKey, from, to) {
        if (from === to) return;
        const list = state[listKey];
        if (!boundsCheck(list, from) || !boundsCheck(list, to)) return;
        // 语义：把 from 元素插入到「(移除 from 后的)数组的第 to 位」之前。
        // 已验证所有方向（前移/后移/相邻）均符合拖放目标行索引的直觉。
        list.splice(to, 0, list.splice(from, 1)[0]);
        persist();
    }

    function reset() {
        state.main = JSON.parse(JSON.stringify(DEFAULT_NODES));
        state.pinned = [];
        persist();
    }

    /**
     * 按健康判定剔除失效节点（v4 新功能）。
     * 置顶队列与主列表一起参与，保留原有相对顺序；护栏见 pruneUnhealthy。
     * @param {Record<string,'healthy'|'unhealthy'|'unknown'>} verdicts 以 getNodeId 为键
     * @param {{minKeep?:number}} [opts]
     * @returns {{removed:Array<object>, removedFromPinned:number, removedFromMain:number, guarded:boolean}}
     */
    function pruneByVerdicts(verdicts, opts) {
        const flat = state.pinned.concat(state.main);
        const out = pruneUnhealthy(flat, verdicts || {}, opts);
        if (!out.removed.length) return { removed: [], removedFromPinned: 0, removedFromMain: 0, guarded: out.guarded };
        const keptIds = new Set(out.kept.map(getNodeId));
        const prevPinned = state.pinned.length;
        state.pinned = state.pinned.filter(function (n) { return keptIds.has(getNodeId(n)); });
        state.main = state.main.filter(function (n) { return keptIds.has(getNodeId(n)); });
        persist();
        const removedFromPinned = prevPinned - state.pinned.length;
        return {
            removed: out.removed,
            removedFromPinned,
            removedFromMain: out.removed.length - removedFromPinned,
            guarded: out.guarded
        };
    }

    return {
        main: computed(() => state.main),
        pinned: computed(() => state.pinned),
        all,
        total,
        pinNode,
        unpinNode,
        removeMain: (i) => removeFrom('main', i),
        removePinned: (i) => removeFrom('pinned', i),
        reorderMain: (from, to) => reorderIn('main', from, to),
        reorderPinned: (from, to) => reorderIn('pinned', from, to),
        pruneByVerdicts,
        reset
    };
}

// 容器外（node:test / 脚本）：首次调用时才探测浏览器全局，显式 null 也生效。
defineFallback('nodes', () => createNodesStore(createBrowserPlatform().localStorage));

/** 应用级共享节点 Store。 */
export function useNodes() {
    return useStore('nodes');
}

export { DEFAULT_NODES };
