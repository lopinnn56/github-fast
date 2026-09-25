import { computed, reactive } from 'vue';
import { DEFAULT_NODES, loadNodeState, saveNodeState } from '../lib/nodes-core.js';

/**
 * 节点仓库 Store。
 *
 * 架构说明（重构 v3.1）：
 * - `createNodesStore` 是工厂：依赖（storage）可注入，测试可另做隔离实例，无需全局单例。
 * - `useNodes()` 返回应用级单例（模块缓存），组件间共享同一份响应式状态。
 * - 纯逻辑（校验 / 存取 / 迁移）仍在 nodes-core.js，可脱离 Vue 单测。
 */
export function createNodesStore(storage) {
    const initial = loadNodeState(storage);

    const state = reactive({
        main: initial.main,
        pinned: initial.pinned
    });

    // v2 -> v3 迁移后立即落盘，避免下次仍走旧数据分支
    if (initial.migrated) saveNodeState(storage, state);

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
        reset
    };
}

// 应用级单例：浏览器环境默认使用 localStorage（Node 测试环境自然退化为默认节点）。
const singletonStorage = typeof localStorage !== 'undefined' ? localStorage : null;
let singleton = null;

/** 获取应用级共享节点 Store。 */
export function useNodes() {
    if (!singleton) singleton = createNodesStore(singletonStorage);
    return singleton;
}

export { DEFAULT_NODES };