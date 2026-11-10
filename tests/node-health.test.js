// v4 新功能：节点健康判定纯函数单测（不联网，用构造的响应体）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    verifyHealthResponse,
    classifyHealthSamples,
    pruneUnhealthy,
    summarizeVerdicts,
    buildHealthProbeUrl,
    HEALTH_PKG_URL,
    HEALTH_PKG_NAME
} from '../src/lib/node-health.js';
import { getNodeId } from '../src/lib/convert.js';

const PKG_BODY = JSON.stringify({ name: HEALTH_PKG_NAME, version: '4.0.0' });
const node = (name, host) => ({ name, prefix: 'https://' + host + '/', mode: 'prefix' });

const A = node('a', 'a.example');
const B = node('b', 'b.example');
const C = node('c', 'c.example');
const D = node('d', 'd.example');

describe('verifyHealthResponse', () => {
    it('真实 package.json 内容判 healthy', () => {
        assert.strictEqual(verifyHealthResponse(200, PKG_BODY, 'pkg'), 'healthy');
    });

    it('README 探针命中独特文案判 healthy', () => {
        assert.strictEqual(verifyHealthResponse(200, '# 标题\n将 GitHub 链接一键转换为加速镜像', 'readme'), 'healthy');
    });

    it('网络层失败（status 0）判 unknown，不据此剔除', () => {
        assert.strictEqual(verifyHealthResponse(0, '', 'pkg'), 'unknown');
    });

    it('5xx 判 unhealthy', () => {
        assert.strictEqual(verifyHealthResponse(502, 'bad gateway', 'pkg'), 'unhealthy');
        assert.strictEqual(verifyHealthResponse(530, '', 'readme'), 'unhealthy');
    });

    it('JS 挑战页 / 停放广告页 / 403 / 404 / 空内容判 unhealthy', () => {
        const cases = [
            [200, "<html><head><title>Loading...</title></head>", 'pkg'],
            [200, '<html><script>window.location.href="/x"</script>', 'readme'],
            [200, '<html><title>Just a moment...</title>', 'pkg'],
            [200, 'searchresultsworld.com SAFEFRAME', 'pkg'],
            [403, '403 Forbidden', 'pkg'],
            [404, '404: Not Found', 'pkg'],
            [200, '   ', 'readme'],
            [200, '{"name":"other-project"}', 'pkg']
        ];
        for (const [status, body, kind] of cases) {
            assert.strictEqual(verifyHealthResponse(status, body, kind), 'unhealthy', status + ' ' + body.slice(0, 30));
        }
    });
});

describe('classifyHealthSamples', () => {
    it('任一铁证即 healthy（多轮采样宁可保留）', () => {
        assert.strictEqual(classifyHealthSamples([
            { status: 0, body: '', kind: 'pkg' },
            { status: 200, body: PKG_BODY, kind: 'pkg' }
        ]), 'healthy');
    });

    it('无铁证但有网络错误 → unknown（保守保留）', () => {
        assert.strictEqual(classifyHealthSamples([
            { status: 0, body: '', kind: 'pkg' },
            { status: 403, body: 'forbidden', kind: 'pkg' }
        ]), 'unknown');
    });

    it('全部明确失败才 unhealthy', () => {
        assert.strictEqual(classifyHealthSamples([
            { status: 403, body: '403 Forbidden', kind: 'pkg' },
            { status: 404, body: '404: Not Found', kind: 'readme' }
        ]), 'unhealthy');
    });

    it('空采样 → unknown', () => {
        assert.strictEqual(classifyHealthSamples([]), 'unknown');
        assert.strictEqual(classifyHealthSamples(null), 'unknown');
    });
});

describe('pruneUnhealthy', () => {
    const verdicts = {
        [getNodeId(A)]: 'healthy',
        [getNodeId(B)]: 'unhealthy',
        [getNodeId(C)]: 'unknown',
        [getNodeId(D)]: 'unhealthy'
    };

    it('只剔除 unhealthy，healthy / unknown 保留并保持顺序', () => {
        const out = pruneUnhealthy([A, B, C, D], verdicts, { minKeep: 1 });
        assert.deepStrictEqual(out.kept.map(n => n.name), ['a', 'c']);
        assert.deepStrictEqual(out.removed.map(n => n.name), ['b', 'd']);
        assert.strictEqual(out.guarded, false);
    });

    it('护栏：剔除后不足 minKeep 时按顺序留足', () => {
        const out = pruneUnhealthy([B, D], verdicts, { minKeep: 1 });
        assert.strictEqual(out.kept.length, 1);
        assert.strictEqual(out.kept[0].name, 'b');
        assert.strictEqual(out.removed.length, 1);
        assert.strictEqual(out.guarded, true);
    });

    it('没有判定结果的节点默认保留', () => {
        const out = pruneUnhealthy([A, B], {}, { minKeep: 1 });
        assert.strictEqual(out.kept.length, 2);
        assert.strictEqual(out.removed.length, 0);
    });

    it('非法输入安全返回', () => {
        assert.deepStrictEqual(pruneUnhealthy(null, null), { kept: [], removed: [], guarded: false });
    });
});

describe('summarizeVerdicts', () => {
    it('按三类计数并给出总数', () => {
        const verdicts = {
            [getNodeId(A)]: 'healthy',
            [getNodeId(B)]: 'unhealthy',
            [getNodeId(C)]: 'unknown'
        };
        assert.deepStrictEqual(summarizeVerdicts([A, B, C, D], verdicts),
            { healthy: 1, unhealthy: 1, unknown: 1, total: 4 });
    });
});

describe('buildHealthProbeUrl', () => {
    it('按 prefix 拼接并附加 cache-busting 参数', () => {
        const u = buildHealthProbeUrl(A, HEALTH_PKG_URL, 'salt1');
        assert.ok(u.startsWith('https://a.example/raw.githubusercontent.com/'));
        assert.ok(u.includes('_ghfast=salt1'));
    });
});
