// v4 新增：平台适配层 / URL 状态 / Release 网关的依赖注入行为。
// 目标：证明「浏览器能力可整体替换」，且 import 不再触碰任何全局。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserPlatform } from '../src/platform/browser.js';
import { createUrlState } from '../src/lib/url-state.js';
import { createReleaseGateway } from '../src/platform/release-gateway.js';
import { RELEASE_TOKEN_KEY, releaseCacheKey } from '../src/lib/releases-core.js';

function memoryStorage() {
    const data = new Map();
    return {
        getItem(k) { return data.has(k) ? data.get(k) : null; },
        setItem(k, v) { data.set(k, String(v)); },
        removeItem(k) { data.delete(k); }
    };
}

describe('createBrowserPlatform', () => {
    it('覆盖项优先；字段显式存在（含 null）即生效', () => {
        const sentinel = { getItem: () => 'x' };
        const p = createBrowserPlatform({
            localStorage: sentinel,
            sessionStorage: null,
            fetchFn: null,
            timers: { setTimer: () => 1, clearTimer: () => {} }
        });
        assert.strictEqual(p.localStorage, sentinel);
        assert.strictEqual(p.sessionStorage, null);
        assert.strictEqual(p.fetchFn, null);
        assert.strictEqual(typeof p.timers.setTimer, 'function');
    });

    it('null 覆盖会屏蔽同名全局', () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        const sentinel = { getItem: () => 'global' };
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true, value: sentinel, writable: true
        });
        try {
            assert.strictEqual(createBrowserPlatform().localStorage, sentinel);
            assert.strictEqual(createBrowserPlatform({ localStorage: null }).localStorage, null);
        } finally {
            if (original) Object.defineProperty(globalThis, 'localStorage', original);
            else delete globalThis.localStorage;
        }
    });

    it('默认平台片段结构完整且 timers 可调用', () => {
        const p = createBrowserPlatform();
        for (const k of ['localStorage', 'sessionStorage', 'location', 'history', 'fetchFn', 'timers']) {
            assert.ok(Object.prototype.hasOwnProperty.call(p, k), k);
        }
        const id = p.timers.setTimer(() => {}, 0);
        assert.doesNotThrow(() => p.timers.clearTimer(id));
    });
});

describe('createUrlState（可注入 location/history）', () => {
    it('写入多个 ?url=，清空时移除参数，保留其它查询串', () => {
        const calls = [];
        const us = createUrlState({
            location: { href: 'https://example.test/app?foo=1&url=old', search: '?foo=1&url=old' },
            history: { replaceState(_s, _t, url) { calls.push(String(url)); } }
        });
        assert.deepStrictEqual(us.readUrlParams(), ['old']);
        us.syncUrlParam(['https://github.com/o/r', 'https://github.com/x/y']);
        assert.strictEqual(calls.length, 1);
        const u = new URL(calls[0]);
        assert.strictEqual(u.searchParams.get('foo'), '1');
        assert.deepStrictEqual(u.searchParams.getAll('url'), [
            'https://github.com/o/r', 'https://github.com/x/y'
        ]);
        us.syncUrlParam([]);
        assert.deepStrictEqual(new URL(calls[1]).searchParams.getAll('url'), []);
    });

    it('显式 null 环境：读返回空、写静默跳过', () => {
        const us = createUrlState({ location: null, history: null });
        assert.deepStrictEqual(us.readUrlParams(), []);
        assert.doesNotThrow(() => us.syncUrlParam(['https://github.com/o/r']));
    });
});

describe('createReleaseGateway（浏览器副作用收敛点）', () => {
    it('Token 存取：空串删除键', () => {
        const storage = memoryStorage();
        const gw = createReleaseGateway({ localStorage: storage });
        assert.strictEqual(gw.getToken(), '');
        gw.setToken('ghp_demo');
        assert.strictEqual(storage.getItem(RELEASE_TOKEN_KEY), 'ghp_demo');
        assert.strictEqual(gw.getToken(), 'ghp_demo');
        gw.setToken('');
        assert.strictEqual(storage.getItem(RELEASE_TOKEN_KEY), null);
    });

    it('缓存读写大小写不敏感，过期项删除并返回 null', () => {
        const storage = memoryStorage();
        const gw = createReleaseGateway({ sessionStorage: storage });
        gw.writeCache('o/r', { tag: 'v1', assets: [] });
        assert.deepStrictEqual(gw.readCache('O/R'), { tag: 'v1', assets: [] });
        const key = releaseCacheKey('o/r');
        // savedAt 用真实但过期的时间戳（0 会被当作损坏数据短路返回、不触发删除分支）
        storage.setItem(key, JSON.stringify({ savedAt: 1, data: { tag: 'stale' } }));
        assert.strictEqual(gw.readCache('o/r'), null);
        assert.strictEqual(storage.getItem(key), null);
    });

    it('fetchRelease 使用注入的 fetchFn，不读全局 fetch', async () => {
        const calls = [];
        const gw = createReleaseGateway({
            fetchFn: async (url) => {
                calls.push(url);
                return { ok: true, status: 200, json: async () => ({ tag_name: 'v9.0.0', assets: [] }) };
            }
        });
        const result = await gw.fetchRelease('o/r');
        assert.strictEqual(result.fromCache, false);
        assert.strictEqual(result.release.tag, 'v9.0.0');
        assert.strictEqual(calls.length, 1);
        assert.ok(calls[0].includes('/repos/o/r/releases/latest'));
    });

    it('无存储环境全部静默降级', () => {
        const gw = createReleaseGateway();
        assert.strictEqual(gw.getToken(), '');
        assert.strictEqual(gw.readCache('o/r'), null);
        assert.doesNotThrow(() => gw.setToken('x'));
        assert.doesNotThrow(() => gw.writeCache('o/r', {}));
    });
});
