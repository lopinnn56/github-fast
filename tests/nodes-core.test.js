import { describe, it, expect, beforeEach } from 'vitest';
import { loadNodeState, saveNodeState, validNode, DEFAULT_NODES, STORAGE_KEY } from '../src/lib/nodes-core.js';

/** 内存版 localStorage，模拟配额异常等场景 */
function mockStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
        dump: () => Object.fromEntries(map)
    };
}

const NODE_A = { name: 'a', prefix: 'https://a.example/', mode: 'prefix' };
const NODE_B = { name: 'b', prefix: 'https://b.example/', mode: 'prefix' };

describe('validNode 结构校验', () => {
    it('过滤缺失/非法字段', () => {
        expect(validNode(NODE_A)).toBe(true);
        expect(validNode(null)).toBe(false);
        expect(validNode({ name: 'x' })).toBe(false); // 缺 prefix
        expect(validNode({ prefix: 'ftp://x/', name: 'x' })).toBe(false); // 非 http 协议
        expect(validNode({ prefix: 'https://ok.example/' })).toBe(false); // 缺 name
    });
});

describe('loadNodeState 回退链', () => {
    it('无 storage 时返回默认节点', () => {
        const s = loadNodeState(null);
        expect(s.migrated).toBe(false);
        expect(s.main).toEqual(DEFAULT_NODES);
        expect(s.pinned).toEqual([]);
    });

    it('storage 为空时返回默认节点', () => {
        const st = mockStorage();
        expect(loadNodeState(st).main).toEqual(DEFAULT_NODES);
    });

    it('读取 v3 格式并过滤脏数据', () => {
        const st = mockStorage({
            [STORAGE_KEY]: JSON.stringify({ main: [NODE_A, { bad: 1 }], pinned: [NODE_B] })
        });
        const s = loadNodeState(st);
        expect(s.main).toEqual([NODE_A]);
        expect(s.pinned).toEqual([NODE_B]);
        expect(s.migrated).toBe(false);
    });

    it('v2 数组迁移：main 承接、pinned 置空、标记 migrated', () => {
        const st = mockStorage({ gh_accel_nodes_v2: JSON.stringify([NODE_A, { corrupt: true }, NODE_B]) });
        const s = loadNodeState(st);
        expect(s.migrated).toBe(true);
        expect(s.pinned).toEqual([]);
        expect(s.main).toEqual([NODE_A, NODE_B]); // 脏数据被剔除
    });

    it('v3 数据损坏（非对象/缺 main）时回退默认', () => {
        const st = mockStorage({ [STORAGE_KEY]: '{"oops":true}' });
        expect(loadNodeState(st).main).toEqual(DEFAULT_NODES);
    });

    it('跨置顶和普通列表去除重复节点', () => {
        const st = mockStorage({
            [STORAGE_KEY]: JSON.stringify({
                main: [NODE_A, NODE_A, NODE_B],
                pinned: [NODE_B, NODE_B]
            })
        });
        const state = loadNodeState(st);
        expect(state.pinned).toEqual([NODE_B]);
        expect(state.main).toEqual([NODE_A]);
    });

    it('缺失 mode 的旧节点按 prefix 模式加载', () => {
        const legacyNode = { name: 'legacy', prefix: 'https://legacy.example' };
        const st = mockStorage({ [STORAGE_KEY]: JSON.stringify({ main: [legacyNode], pinned: [] }) });
        expect(loadNodeState(st).main).toEqual([{ ...legacyNode, prefix: 'https://legacy.example/', mode: 'prefix' }]);
    });
});

describe('saveNodeState 落盘与旧 key 清理', () => {
    let st;
    beforeEach(() => {
        st = mockStorage({ gh_accel_nodes_v2: '[{"name":"old","prefix":"https://old/"}]' });
    });

    it('写入 v3 并清除 v2', () => {
        saveNodeState(st, { main: [NODE_A], pinned: [NODE_B] });
        const dumped = st.dump();
        expect(JSON.parse(dumped[STORAGE_KEY])).toEqual({ main: [NODE_A], pinned: [NODE_B] });
        expect(dumped.gh_accel_nodes_v2).toBeUndefined();
    });

    it('storage 不可用时静默降级（不抛错）', () => {
        const broken = { setItem() { throw new Error('quota'); }, removeItem() {} };
        expect(() => saveNodeState(broken, { main: [], pinned: [] })).not.toThrow();
    });
});
