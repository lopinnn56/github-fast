// v4 新功能：自动测速 + 自动剔除的编排单测（注入假 health / nodes / toast）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { createAutoPruneStore } from '../src/composables/useAutoPrune.js';
import { createNodeHealthStore } from '../src/composables/useNodeHealth.js';
import { getNodeId } from '../src/lib/convert.js';

const A = { name: 'a', prefix: 'https://a.example/', mode: 'prefix' };
const B = { name: 'b', prefix: 'https://b.example/', mode: 'prefix' };

function fakeToast() {
    const messages = [];
    return { messages, toast: { msg: '', visible: false }, showToast(m) { messages.push(m); } };
}

function fakeNodes(list) {
    const all = ref(list.slice());
    const pruned = [];
    return {
        all,
        pruned,
        pruneByVerdicts(verdicts, opts) {
            pruned.push({ verdicts, opts });
            const removed = all.value.filter(n => verdicts[getNodeId(n)] === 'unhealthy');
            all.value = all.value.filter(n => verdicts[getNodeId(n)] !== 'unhealthy');
            return { removed, removedFromPinned: 0, removedFromMain: removed.length, guarded: false };
        }
    };
}

function fakeHealth(verdicts, opts) {
    const options = opts || {};
    return {
        auto: options.auto !== false,
        calls: 0,
        shouldAutoRun() { return this.auto; },
        async run(nodes) {
            this.calls++;
            const summary = { healthy: 0, unhealthy: 0, unknown: 0, total: nodes.length };
            nodes.forEach(n => { summary[verdicts[getNodeId(n)]]++; });
            return { verdicts, summary, total: nodes.length };
        }
    };
}

describe('createAutoPruneStore', () => {
    it('检测后剔除 unhealthy，并提示剔除数量', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A, B]);
        const verdicts = { [getNodeId(A)]: 'healthy', [getNodeId(B)]: 'unhealthy' };
        const store = createAutoPruneStore({ health: fakeHealth(verdicts), nodes, toast: t });
        const out = await store.checkAndPrune();
        assert.strictEqual(out.removed.length, 1);
        assert.deepStrictEqual(nodes.all.value.map(n => n.name), ['a']);
        assert.deepStrictEqual(t.messages, ['正在检测节点可用性…', '已自动剔除 1 个不可用节点，保留 1 个健康节点']);
        assert.strictEqual(store.running.value, false);
    });

    it('全部健康时不删除，非 silent 下提示无需剔除', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A]);
        const verdicts = { [getNodeId(A)]: 'healthy' };
        const store = createAutoPruneStore({ health: fakeHealth(verdicts), nodes, toast: t });
        const out = await store.checkAndPrune();
        assert.strictEqual(out.removed.length, 0);
        assert.strictEqual(nodes.pruned[0].verdicts[getNodeId(A)], 'healthy');
        assert.deepStrictEqual(t.messages, ['正在检测节点可用性…', '检测完成：1 个节点可用，无需剔除']);
    });

    it('silent 模式（启动自动巡检）不打扰用户', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A]);
        const verdicts = { [getNodeId(A)]: 'healthy' };
        const store = createAutoPruneStore({ health: fakeHealth(verdicts), nodes, toast: t });
        await store.checkAndPrune({ silent: true });
        assert.deepStrictEqual(t.messages, []);
    });

    it('运行中重复调用返回 null（加锁）', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A]);
        const health = fakeHealth({ [getNodeId(A)]: 'healthy' });
        const store = createAutoPruneStore({ health, nodes, toast: t });
        const first = store.checkAndPrune();
        const second = store.checkAndPrune();
        assert.strictEqual(await second, null);
        assert.ok(await first);
    });

    it('探测抛错时提示失败并释放运行锁', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A]);
        const health = { auto: true, shouldAutoRun: () => true, run: async () => { throw new Error('boom'); } };
        const store = createAutoPruneStore({ health, nodes, toast: t });
        assert.strictEqual(await store.checkAndPrune(), null);
        assert.strictEqual(store.running.value, false);
        assert.ok(t.messages.includes('节点检测失败，请稍后重试'));
    });

    it('autoCheckIfDue 依 shouldAutoRun 节流，不满足时直接返回 null', async () => {
        const t = fakeToast();
        const nodes = fakeNodes([A]);
        const verdicts = { [getNodeId(A)]: 'healthy' };
        const due = createAutoPruneStore({ health: fakeHealth(verdicts, { auto: true }), nodes, toast: t });
        assert.ok(await due.autoCheckIfDue());
        const notDue = createAutoPruneStore({ health: fakeHealth(verdicts, { auto: false }), nodes, toast: t });
        assert.strictEqual(await notDue.autoCheckIfDue(), null);
    });
});

describe('createNodeHealthStore', () => {
    function memoryStorage() {
        const m = new Map();
        return {
            getItem: k => (m.has(k) ? m.get(k) : null),
            setItem: (k, v) => m.set(k, String(v)),
            removeItem: k => m.delete(k)
        };
    }

    it('铁证内容判 healthy，挑战页判 unhealthy，网络错误判 unknown', async () => {
        const storage = memoryStorage();
        const fetchFn = async (url) => {
            if (url.includes('a.example')) return { status: 200, text: async () => JSON.stringify({ name: 'github-fast' }) };
            if (url.includes('b.example')) return { status: 200, text: async () => '<html><title>Loading...</title>' };
            throw new Error('timeout');
        };
        const store = createNodeHealthStore({ storage, fetchFn });
        const out = await store.run([A, B, { name: 'c', prefix: 'https://c.example/', mode: 'prefix' }], { rounds: 1 });
        assert.strictEqual(out.verdicts[getNodeId(A)], 'healthy');
        assert.strictEqual(out.verdicts[getNodeId(B)], 'unhealthy');
        assert.strictEqual(out.verdicts['prefix:https://c.example/'], 'unknown');
        assert.deepStrictEqual(out.summary, { healthy: 1, unhealthy: 1, unknown: 1, total: 3 });
    });

    it('自动巡检开关与上次时间持久化，间隔未到不自动跑', async () => {
        const storage = memoryStorage();
        const store = createNodeHealthStore({ storage, fetchFn: async () => ({ status: 200, text: async () => 'x' }) });
        assert.strictEqual(store.autoEnabled.value, true);
        assert.strictEqual(store.shouldAutoRun(), true);
        await store.run([A], { rounds: 1 });
        assert.strictEqual(store.shouldAutoRun(), false);
        assert.ok(store.lastRunAt.value > 0);
        assert.ok(storage.getItem('gh_accel_health_last_run'));
        store.setAutoEnabled(false);
        assert.strictEqual(storage.getItem('gh_accel_health_auto'), '0');
        assert.strictEqual(store.shouldAutoRun(Date.now() + 10 * 60 * 60 * 1000), false);
    });

    it('运行中重复 run 返回 null', async () => {
        const store = createNodeHealthStore({ fetchFn: async () => ({ status: 200, text: async () => 'x' }) });
        const first = store.run([A], { rounds: 1 });
        assert.strictEqual(await store.run([A], { rounds: 1 }), null);
        assert.ok(await first);
        assert.strictEqual(store.progress.active, false);
    });
});
