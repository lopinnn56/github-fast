// v4 新增：应用容器（provide/inject）、显式依赖注入、容器外回退作用域。
// 重点验证：releaseResolver 与 converter 不再靠隐藏模块单例，而是共享同一实例。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from 'vue';
import {
    APP_CONTEXT_KEY,
    installAppContext,
    contextStore,
    defineFallback,
    useStore,
    resetFallbackStores
} from '../src/app/context.js';
import { createAppContext } from '../src/app/createAppContext.js';
import { STORAGE_KEYS } from '../src/config/constants.js';
import { useConverter } from '../src/composables/useConverter.js';
import { useReleaseResolver } from '../src/composables/useReleaseResolver.js';

function memoryStorage() {
    const data = new Map();
    return {
        getItem(k) { return data.has(k) ? data.get(k) : null; },
        setItem(k, v) { data.set(k, String(v)); },
        removeItem(k) { data.delete(k); }
    };
}

function fakePlatform() {
    return {
        localStorage: memoryStorage(),
        sessionStorage: memoryStorage(),
        location: { href: 'https://example.test/?foo=1', search: '?foo=1' },
        history: { replaceState() {} },
        fetchFn: async () => ({ ok: true, status: 200, json: async () => ({ tag_name: 'v0', assets: [] }) }),
        timers: {
            setTimer() { return 0; },
            clearTimer() {}
        }
    };
}

describe('installAppContext / contextStore', () => {
    it('在 createApp() 后 provide 容器，setup 上下文里可取到同一个 store', () => {
        const ctx = { toast: { id: 1 }, mode: { id: 2 } };
        const app = createApp({ render() { return null; } });
        const returned = installAppContext(app, ctx);
        assert.strictEqual(returned, ctx);
        app.runWithContext(() => {
            assert.strictEqual(contextStore('toast'), ctx.toast);
            assert.strictEqual(useStore('toast'), ctx.toast);
            assert.strictEqual(contextStore('missing'), null);
        });
        app.unmount();
    });

    it('容器外 contextStore 返回 null；useStore 走回退作用域', () => {
        assert.strictEqual(contextStore('toast'), null);
        resetFallbackStores();
        let created = 0;
        defineFallback('probe-store', () => {
            created++;
            return { tag: 'fallback' };
        });
        const a = useStore('probe-store');
        const b = useStore('probe-store');
        assert.strictEqual(a, b);
        assert.strictEqual(created, 1);
        resetFallbackStores();
        assert.notStrictEqual(useStore('probe-store'), a);
        assert.strictEqual(created, 2);
    });

    it('未注册回退的 store 抛出明确错误', () => {
        assert.throws(() => useStore('never-registered'), /未注册回退 store/);
    });

    it('installAppContext 可用最小 app 对象（便于非 DOM 环境）', () => {
        const provided = [];
        const fakeApp = { provide(key, value) { provided.push([key, value]); } };
        const ctx = { converter: {} };
        installAppContext(fakeApp, ctx);
        assert.deepStrictEqual(provided, [[APP_CONTEXT_KEY, ctx]]);
    });
});

describe('createAppContext（显式依赖顺序）', () => {
    it('一次构造全部 store，platform 可整体替换', () => {
        const platform = fakePlatform();
        const ctx = createAppContext({ platform });
        assert.strictEqual(ctx.platform, platform);
        for (const k of ['gateway', 'urlState', 'toast', 'mode', 'nodes', 'speedTest', 'converter', 'releaseResolver', 'copy']) {
            assert.ok(ctx[k] && typeof ctx[k] === 'object', k);
        }
        // mode 写入的是注入的 localStorage，而不是某个模块级全局
        ctx.mode.setMode('clone');
        assert.strictEqual(platform.localStorage.getItem(STORAGE_KEYS.mode), 'clone');
    });

    it('releaseResolver 通过显式注入的 converter 写入同一份 links/rawText', () => {
        const ctx = createAppContext({ platform: fakePlatform() });
        const url = 'https://github.com/o/r/releases/download/v1/app.zip';
        assert.strictEqual(ctx.releaseResolver.addAssetToConvert(url), 'added');
        assert.deepStrictEqual(ctx.converter.links.value, [url]);
        assert.strictEqual(ctx.converter.rawText.value, url);
        assert.strictEqual(ctx.releaseResolver.addAssetToConvert(url), 'exists');
        assert.strictEqual(ctx.releaseResolver.addAssetToConvert(''), false);
    });

    it('两个不同容器互不共享状态', () => {
        const a = createAppContext({ platform: fakePlatform() });
        const b = createAppContext({ platform: fakePlatform() });
        a.converter.links.value = ['https://github.com/a/b'];
        assert.deepStrictEqual(b.converter.links.value, []);
        assert.notStrictEqual(a.releaseResolver, b.releaseResolver);
    });
});

describe('容器外回退作用域（无 Vue app）', () => {
    it('useConverter() 与 useReleaseResolver() 共享同一 converter 实例', () => {
        resetFallbackStores();
        // 用无副作用的 toast 替身，避免 Node 里留下 1800ms 的定时器
        defineFallback('toast', () => ({ toast: { msg: '', visible: false }, showToast() {} }));
        const converter = useConverter();
        const resolver = useReleaseResolver();
        const url = 'https://github.com/o/r/releases/download/v2/app.tar.gz';
        assert.strictEqual(resolver.addAssetToConvert(url), 'added');
        assert.deepStrictEqual(converter.links.value, [url]);
        assert.strictEqual(converter.rawText.value, url);
        assert.strictEqual(resolver.addAssetToConvert(url), 'exists');
        resetFallbackStores();
    });
});
