/**
 * 节点数据核心逻辑 —— 与 Vue 解耦，可在 Node 环境直接单测。
 * 存储格式：v3 = { main: Node[], pinned: Node[] }（当前），v2 = Node[]（历史）。
 */
import { getNodeId, normalizeNode } from './convert.js';
import { DEFAULT_NODES } from '../data/default-nodes.js';
import { STORAGE_KEYS } from '../config/constants.js';

export { DEFAULT_NODES };

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

/**
 * 从 storage 读取节点状态，自动完成 v3 -> v2 -> 默认 的回退与迁移。
 * 迁移语义与 v2.x 完全一致，保证老用户升级后节点/置顶不丢。
 * @param {Storage|null} storage 类 localStorage 实例；null 时直接用默认节点
 * @returns {{main: Node[], pinned: Node[], migrated: boolean}} migrated=true 表示从旧版本落盘迁移
 */
export function loadNodeState(storage) {
    if (storage) {
        try {
            const raw = storage.getItem(STORAGE_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Array.isArray(p.main)) {
                    const pinned = Array.isArray(p.pinned) ? uniqueNodes(p.pinned) : [];
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
                    return {
                        main,
                        pinned,
                        migrated: false
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
                    return { main: uniqueNodes(p), pinned: [], migrated: true };
                }
            }
        } catch { /* fallthrough */ }
    }
    return { main: uniqueNodes(DEFAULT_NODES), pinned: [], migrated: false };
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
