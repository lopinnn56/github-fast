// 单元测试：Node 内置测试运行器（node --test tests/），零额外依赖。
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
        assert.strictEqual(validNode(NODE_A), true);
        assert.strictEqual(validNode(null), false);
        assert.strictEqual(validNode({ name: 'x' }), false); // 缺 prefix
        assert.strictEqual(validNode({ prefix: 'ftp://x/', name: 'x' }), false); // 非 http 协议
        assert.strictEqual(validNode({ prefix: 'https://ok.example/' }), false); // 缺 name
    });
});

describe('loadNodeState 回退链', () => {
    it('无 storage 时返回默认节点', () => {
        const s = loadNodeState(null);
        assert.strictEqual(s.migrated, false);
        assert.deepStrictEqual(s.main, DEFAULT_NODES);
        assert.deepStrictEqual(s.pinned, []);
    });

    it('storage 为空时返回默认节点', () => {
        const st = mockStorage();
        assert.deepStrictEqual(loadNodeState(st).main, DEFAULT_NODES);
    });

    it('读取 v3 格式并过滤脏数据', () => {
        const st = mockStorage({
            [STORAGE_KEY]: JSON.stringify({ main: [NODE_A, { bad: 1 }], pinned: [NODE_B] })
        });
        const s = loadNodeState(st);
        assert.deepStrictEqual(s.main, [NODE_A]);
        assert.deepStrictEqual(s.pinned, [NODE_B]);
        assert.strictEqual(s.migrated, false);
    });

    it('v2 数组迁移：main 承接、pinned 置空、标记 migrated', () => {
        const st = mockStorage({ gh_accel_nodes_v2: JSON.stringify([NODE_A, { corrupt: true }, NODE_B]) });
        const s = loadNodeState(st);
        assert.strictEqual(s.migrated, true);
        assert.deepStrictEqual(s.pinned, []);
        assert.deepStrictEqual(s.main, [NODE_A, NODE_B]); // 脏数据被剔除
    });

    it('v3 数据损坏（非对象/缺 main）时回退默认', () => {
        const st = mockStorage({ [STORAGE_KEY]: '{"oops":true}' });
        assert.deepStrictEqual(loadNodeState(st).main, DEFAULT_NODES);
    });

    it('跨置顶和普通列表去除重复节点', () => {
        const st = mockStorage({
            [STORAGE_KEY]: JSON.stringify({
                main: [NODE_A, NODE_A, NODE_B],
                pinned: [NODE_B, NODE_B]
            })
        });
        const state = loadNodeState(st);
        assert.deepStrictEqual(state.pinned, [NODE_B]);
        assert.deepStrictEqual(state.main, [NODE_A]);
    });

    it('缺失 mode 的旧节点按 prefix 模式加载', () => {
        const legacyNode = { name: 'legacy', prefix: 'https://legacy.example' };
        const st = mockStorage({ [STORAGE_KEY]: JSON.stringify({ main: [legacyNode], pinned: [] }) });
        assert.deepStrictEqual(
            loadNodeState(st).main,
            [{ ...legacyNode, prefix: 'https://legacy.example/', mode: 'prefix' }]
        );
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
        assert.deepStrictEqual(JSON.parse(dumped[STORAGE_KEY]), { main: [NODE_A], pinned: [NODE_B] });
        assert.strictEqual(dumped.gh_accel_nodes_v2, undefined);
    });

    it('storage 不可用时静默降级（不抛错）', () => {
        const broken = { setItem() { throw new Error('quota'); }, removeItem() {} };
        assert.doesNotThrow(() => saveNodeState(broken, { main: [], pinned: [] }));
    });
});
