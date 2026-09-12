import assert from 'node:assert/strict';
import test from 'node:test';

test('测速缓存损坏时安全回退', async () => {
    const writes = [];
    globalThis.sessionStorage = {
        getItem() {
            return 'null';
        },
        setItem(key, value) {
            writes.push([key, value]);
        }
    };

    const { useSpeedTest } = await import('../src/composables/useSpeedTest.js');
    const summary = await useSpeedTest().run([]);

    assert.deepStrictEqual(summary, { okCount: 0, failedCount: 0, total: 0 });
    assert.deepStrictEqual(writes.at(-1), ['gh_accel_speed', '{}']);
});
