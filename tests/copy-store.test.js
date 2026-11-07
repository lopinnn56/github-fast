// v4 新增：抽掉 ResultList / ReleaseResolver / NodeRow 三处重复 copyWithToast 后，
// 用注入式 copyFn / toast 覆盖成功、失败、Promise 与同步返回值、容器注入。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, inject } from 'vue';
import { createCopyStore, useCopy } from '../src/composables/useCopy.js';
import { installAppContext, APP_CONTEXT_KEY } from '../src/app/context.js';

function fakeToast() {
    const messages = [];
    return { messages, toast: { msg: '', visible: false }, showToast(m) { messages.push(m); } };
}

describe('createCopyStore', () => {
    it('复制成功 → 提示「已复制」并返回 true', async () => {
        const t = fakeToast();
        const seen = [];
        const { copyWithToast } = createCopyStore({
            toast: t,
            copyFn(text, btn) { seen.push([text, btn]); return true; }
        });
        const btn = { id: 'b' };
        assert.strictEqual(await copyWithToast('https://example.test/a', btn), true);
        assert.deepStrictEqual(seen, [['https://example.test/a', btn]]);
        assert.deepStrictEqual(t.messages, ['已复制']);
    });

    it('复制失败 → 提示「复制失败，请手动复制」并返回 false', async () => {
        const t = fakeToast();
        const { copyWithToast } = createCopyStore({ toast: t, copyFn: () => false });
        assert.strictEqual(await copyWithToast('x', null), false);
        assert.deepStrictEqual(t.messages, ['复制失败，请手动复制']);
    });

    it('兼容返回 Promise<boolean> 的剪贴板实现', async () => {
        const t = fakeToast();
        const { copyWithToast } = createCopyStore({
            toast: t,
            copyFn: async () => true
        });
        assert.strictEqual(await copyWithToast('y'), true);
        assert.deepStrictEqual(t.messages, ['已复制']);
    });

    it('剪贴板实现抛错时 promise 以原错误拒绝（组件可自行 catch）', async () => {
        const t = fakeToast();
        const { copyWithToast } = createCopyStore({
            toast: t,
            copyFn() { throw new Error('blocked'); }
        });
        await assert.rejects(() => copyWithToast('z'), /blocked/);
        assert.deepStrictEqual(t.messages, []);
    });
});

describe('useCopy 容器注入', () => {
    it('组件里取到的就是 installAppContext 提供的那一份 store', () => {
        const injected = { copyWithToast: () => Promise.resolve(true) };
        const app = createApp({ render() { return null; } });
        const ctx = { copy: injected };
        installAppContext(app, ctx);
        app.runWithContext(() => {
            assert.strictEqual(useCopy(), injected);
            assert.strictEqual(inject(APP_CONTEXT_KEY), ctx);
        });
    });
});
