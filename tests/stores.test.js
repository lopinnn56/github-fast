// 单元测试：Store 工厂隔离性（重构 v3.1 新增）。
// 验证 createXxxStore 可注入依赖、互不影响，且应用级单例 useXxx() 返回同一实例。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function mockStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
        dump: () => Object.fromEntries(map)
    };
}

describe('useMode 工厂隔离', async () => {
    const { createModeStore } = await import('../src/composables/useMode.js');

    it('可注入独立 storage，互不污染', () => {
        const s1 = mockStorage();
        const s2 = mockStorage();
        const a = createModeStore(s1);
        const b = createModeStore(s2);
        a.setMode('clone');
        assert.strictEqual(a.isClone(), true);
        assert.strictEqual(b.isClone(), false);
        // 只有 a 落盘
        assert.strictEqual(s1.getItem('gh_accel_mode'), 'clone');
        assert.strictEqual(s2.getItem('gh_accel_mode'), null);
    });

    it('持久化脏数据时回退默认 link', () => {
        const store = createModeStore(mockStorage({ gh_accel_mode: 'hacked' }));
        assert.strictEqual(store.mode.value, 'link');
    });
});

describe('useNodes 工厂（reorder 行为回归）', async () => {
    const { createNodesStore } = await import('../src/composables/useNodes.js');

    it('reorderMain 插入语义各方向正确', async () => {
        // 用精简节点构造独立 store
        const mk = (name, i) => ({ name, prefix: 'https://n' + i + '.example/', mode: 'prefix' });
        const store = createNodesStore(mockStorage({
            gh_accel_nodes_v3: JSON.stringify({
                main: ['A', 'B', 'C', 'D'].map((n, i) => mk(n, i)),
                pinned: []
            })
        }));
        const names = () => store.main.value.map((n) => n.name);

        // 后移：A(0) → 放到 C(2) 之前 → [B, C, A, D]
        store.reorderMain(0, 2);
        assert.deepStrictEqual(names(), ['B', 'C', 'A', 'D']);
        // 前移：D(3) → 最前 → [D, B, C, A]
        store.reorderMain(3, 0);
        assert.deepStrictEqual(names(), ['D', 'B', 'C', 'A']);
        // 相邻上移：C(2) → B(1) → [D, C, B, A]
        store.reorderMain(2, 1);
        assert.deepStrictEqual(names(), ['D', 'C', 'B', 'A']);
        // 越界保护：不会插入 undefined
        store.reorderMain(0, 99);
        assert.deepStrictEqual(names(), ['D', 'C', 'B', 'A']);
    });

    it('pin/unpin/remove/reset 基本行为', async () => {
        const mk = (name, i) => ({ name, prefix: 'https://n' + i + '.example/', mode: 'prefix' });
        const st = mockStorage({
            gh_accel_nodes_v3: JSON.stringify({
                main: ['A', 'B', 'C'].map((n, i) => mk(n, i)),
                pinned: []
            })
        });
        const store = createNodesStore(st);
        // pin A(0)
        store.pinNode(0);
        assert.deepStrictEqual(store.pinned.value.map((n) => n.name), ['A']);
        // unpin
        store.unpinNode(0);
        assert.ok(!store.pinned.value.length);
        assert.deepStrictEqual(store.main.value.map((n) => n.name), ['B', 'C', 'A']);
        // reset 恢复 DEFAULT_NODES
        store.reset();
        assert.ok(store.total.value > 0);
        assert.strictEqual(store.pinned.value.length, 0);
    });
});

describe('useConverter 工厂（removeGroup 同步 rawText 回归）', async () => {
    const { createConverterStore } = await import('../src/composables/useConverter.js');

    it('删除分组同时清理 rawText，避免已删链接实时转换时复活', () => {
        const store = createConverterStore();
        store.rawText.value = 'https://github.com/a/1\nhttps://github.com/a/2';
        store.links.value = ['https://github.com/a/1', 'https://github.com/a/2'];

        store.removeGroup('https://github.com/a/1');
        assert.deepStrictEqual(store.links.value, ['https://github.com/a/2']);
        assert.strictEqual(store.rawText.value, 'https://github.com/a/2');

        // 再转换不会把 a/1 带回来
        store.doConvert();
        assert.deepStrictEqual(store.links.value, ['https://github.com/a/2']);
    });

    it('工厂实例互相独立（links 不共享）', () => {
        const a = createConverterStore();
        const b = createConverterStore();
        a.links.value = ['x'];
        assert.deepStrictEqual(b.links.value, []);
        assert.strictEqual(a.hasLinks(), true);
        assert.strictEqual(b.hasLinks(), false);
    });
});

describe('useToast 工厂（定时器可注入）', async () => {
    const { createToastStore } = await import('../src/composables/useToast.js');

    it('可注入 setTimer/clearTimer 以便测断言', () => {
        let queued = null;
        let cleared = 0;
        const store = createToastStore(
            (fn) => { queued = fn; return 1; },
            () => { cleared++; }
        );
        store.showToast('hi');
        assert.strictEqual(store.toast.msg, 'hi');
        assert.strictEqual(store.toast.visible, true);
        assert.ok(queued, '应注册定时器');
        // 再次 show 会清除前一个定时器
        store.showToast('again', 100);
        assert.strictEqual(cleared, 1);
        // 手动触发定时器关闭
        queued();
        assert.strictEqual(store.toast.visible, false);
    });
});