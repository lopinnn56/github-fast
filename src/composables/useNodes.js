import { computed, reactive } from 'vue';
import { DEFAULT_NODES, loadNodeState, saveNodeState } from '../lib/nodes-core.js';

// 模块级单例：全应用共享一份节点状态（等价旧版 nodes.js 的模块级可变状态，
// 但把「读取/落盘」收敛到显式函数，且核心逻辑在 nodes-core 中可单测）
const storage = typeof localStorage !== 'undefined' ? localStorage : null;
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

/**
 * 节点仓库：置顶 / 取消置顶 / 删除 / 排序 / 恢复默认。
 * 所有操作带越界保护并在变更后自动持久化。
 */
export function useNodes() {
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
        // 越界保护：splice 越界会把 undefined 插入数组
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

export { DEFAULT_NODES };
