/**
 * 节点数据核心逻辑 —— 与 Vue 解耦，可在 Node 环境直接单测。
 * 存储格式：v3 = { main: Node[], pinned: Node[] }（当前），v2 = Node[]（历史）。
 */
import { getNodeId, normalizeNode } from './convert.js';
import { DEFAULT_NODES } from '../data/default-nodes.js';
import { RETIRED_NODES } from '../data/retired-nodes.js';
import { STORAGE_KEYS } from '../config/constants.js';

export { DEFAULT_NODES, RETIRED_NODES };

export const STORAGE_KEY = STORAGE_KEYS.nodes;
export const LEGACY_KEYS = STORAGE_KEYS.legacyNodes;

/** 校验节点结构，过滤损坏数据（避免 undefined prefix 产生坏链接） */
export function validNode(n) {
    return normalizeNode(n) !== null;
}

function uniqueNodes(list) {
    const seen = new Set();
    const nodes = [];
    list.forEach(function (raw) {
        const node = normalizeNode(raw);
        const id = getNodeId(node);
        if (id && !seen.has(id)) {
            seen.add(id);
            nodes.push(node);
        }
    });
    return nodes;
}

/** 已退役节点的 ID 集合（官方清单里被实测剔除的那些）。 */
const RETIRED_IDS = new Set(RETIRED_NODES.map(getNodeId));

/**
 * 过滤掉已从官方清单退役的节点。
 * 老用户 localStorage 里存的是旧版完整列表，只更新前端代码不会覆盖它；
 * 加载时按退役表过滤，保证下次打开就是精简后的列表。
 * @param {Array<object>} list 节点列表
 * @returns {{kept:Array<object>, removed:Array<object>}}
 */
export function filterRetiredNodes(list) {
    const kept = [];
    const removed = [];
    (Array.isArray(list) ? list : []).forEach(function (raw) {
        const node = normalizeNode(raw);
        if (!node) return;
        if (RETIRED_IDS.has(getNodeId(node))) removed.push(node);
        else kept.push(node);
    });
    return { kept, removed };
}

/**
 * 从 storage 读取节点状态，自动完成 v3 -> v2 -> 默认 的回退与迁移。
 * 迁移语义与 v2.x 完全一致，保证老用户升级后节点/置顶不丢。
 * 另外会过滤「已从官方清单退役的节点」：老用户缓存里是旧版完整列表，
 * 只更新前端代码不会覆盖它，过滤后才能自动拿到精简列表。
 * @param {Storage|null} storage 类 localStorage 实例；null 时直接用默认节点
 * @returns {{main: Node[], pinned: Node[], migrated: boolean, retiredRemoved: number}} migrated=true 表示从旧版本落盘迁移
 */
export function loadNodeState(storage) {
    if (storage) {
        try {
            const raw = storage.getItem(STORAGE_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Array.isArray(p.main)) {
                    const pinnedAll = Array.isArray(p.pinned) ? uniqueNodes(p.pinned) : [];
                    const pinnedRetired = filterRetiredNodes(pinnedAll);
                    const pinned = pinnedRetired.kept;
                    // 跨列表去重：置顶里已有的节点不再出现在普通列表
                    const seen = new Set(pinned.map(getNodeId));
                    const main = [];
                    p.main.forEach(function (raw) {
                        const node = normalizeNode(raw);
                        const id = getNodeId(node);
                        if (id && !seen.has(id)) {
                            seen.add(id);
                            main.push(node);
                        }
                    });
                    const mainRetired = filterRetiredNodes(main);
                    const retiredRemoved = pinnedRetired.removed.length + mainRetired.removed.length;
                    return {
                        main: mainRetired.kept,
                        pinned,
                        migrated: false,
                        retiredRemoved
                    };
                }
            }
        } catch { /* fallthrough */ }
        try {
            const raw2 = storage.getItem(LEGACY_KEYS[0]);
            if (raw2) {
                const p = JSON.parse(raw2);
                if (Array.isArray(p) && p.length) {
                    // v2 -> v3：旧数组即主列表，置顶队列为空；由调用方负责落盘并清理旧 key
                    const filtered = filterRetiredNodes(uniqueNodes(p));
                    return { main: filtered.kept, pinned: [], migrated: true, retiredRemoved: filtered.removed.length };
                }
            }
        } catch { /* fallthrough */ }
    }
    return { main: uniqueNodes(DEFAULT_NODES), pinned: [], migrated: false, retiredRemoved: 0 };
}

/**
 * 把状态序列化进 storage，并清理历史版本的 key。
 * @param {Storage|null} storage
 * @param {{main: Node[], pinned: Node[]}} state
 */
export function saveNodeState(storage, state) {
    if (!storage) return;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ main: state.main, pinned: state.pinned }));
        LEGACY_KEYS.forEach(function (k) { storage.removeItem(k); });
    } catch { /* 配额满 / 隐私模式：静默降级为内存态 */ }
}
