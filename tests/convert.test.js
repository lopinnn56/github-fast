// 单元测试：Node 内置测试运行器（node --test tests/），零额外依赖。
// 断言语义与原 Vitest 版本逐一对应（toBe→strictEqual、toEqual→deepStrictEqual 等）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeInput,
    isGitHubUrl,
    detectType,
    normalizeNodePrefix,
    normalizeNode,
    getNodeId,
    buildAccelUrl,
    hostOf,
    parseBatch,
    parseBatchWithStats,
    buildCloneCommand,
    MAX_BATCH
} from '../src/lib/convert.js';

describe('normalizeInput', () => {
    const cases = [
        ['https://github.com/u/r', 'https://github.com/u/r'],
        ['https://www.github.com/u/r', 'https://github.com/u/r'],
        ['https://www.github.com', 'https://github.com'],
        ['github.com/u/r', 'https://github.com/u/r'],
        ['www.github.com/u/r', 'https://github.com/u/r'],
        ['  github.com/u/r  ', 'https://github.com/u/r'], // 首尾空白
        ['u/r', 'https://github.com/u/r'],
        ['-org/r.name-1', 'https://github.com/-org/r.name-1'],
        ['', '']
    ];
    for (const [input, want] of cases) {
        it(JSON.stringify(input) + ' -> ' + JSON.stringify(want), () => {
            assert.strictEqual(normalizeInput(input), want);
        });
    }

    // 回归（BUG-3）：github.com 子域（codeload / api / download 等）无协议也要补全
    const subdomainCases = [
        ['codeload.github.com/u/r/tar.gz', 'https://codeload.github.com/u/r/tar.gz'],
        ['api.github.com/repos/u/r', 'https://api.github.com/repos/u/r'],
        ['download.github.com/u/r', 'https://download.github.com/u/r'],
        ['gist.github.com/x/1', 'https://gist.github.com/x/1'],
        ['raw.githubusercontent.com/u/r/m/f.js', 'https://raw.githubusercontent.com/u/r/m/f.js']
    ];
    for (const [input, want] of subdomainCases) {
        it('子域无协议补全: ' + input, () => {
            assert.strictEqual(normalizeInput(input), want);
            assert.strictEqual(isGitHubUrl(normalizeInput(input)), true);
        });
    }

    it('非 GitHub 域名不补协议（原样返回，由 isGitHubUrl 过滤）', () => {
        assert.strictEqual(normalizeInput('example.com/x'), 'example.com/x');
    });
});

describe('isGitHubUrl 安全边界', () => {
    const ok = [
        'https://github.com/u/r',
        'https://raw.githubusercontent.com/u/r/m/f.js',
        'https://gist.github.com/x/1',
        'https://gist.githubusercontent.com/x/1/raw/f.txt',
        'https://objects.githubusercontent.com/x'
    ];
    for (const u of ok) {
        it('接受 ' + u, () => assert.strictEqual(isGitHubUrl(normalizeInput(u)), true));
    }

    const bad = [
        'https://evil.com/github.com/x',
        'https://github.com.evil.com/x/y',
        'javascript:alert(1)',
        'not a url',
        '',
        'file:///etc/passwd'
    ];
    for (const u of bad) {
        it('拒绝 ' + JSON.stringify(u), () => {
            // 与页面行为一致：先 normalize 再判断
            if (/^javascript:|^file:|^not|^$/.test(u)) {
                assert.strictEqual(isGitHubUrl(u), false);
            } else {
                assert.strictEqual(isGitHubUrl(normalizeInput(u)), false);
            }
        });
    }

    // 回归（BUG-3 修复不得放宽安全锚定）：子域仿冒域仍然拒绝
    for (const u of ['codeload.github.com.evil.com/x', 'api.github.com.evil.com/x/y']) {
        it('拒绝仿冒子域 ' + u, () => {
            assert.strictEqual(isGitHubUrl(normalizeInput(u)), false);
        });
    }
});

describe('detectType', () => {
    const cases = [
        ['https://github.com/u/r', 'repo'],
        ['raw.githubusercontent.com/u/r/main/f.js', 'raw'],
        ['gist.github.com/x/abc', 'gist'],
        ['https://github.com/u/r/blob/main/a.zip', 'file'], // blob 内 zip 不算 release
        ['https://github.com/u/r/releases/download/v1/a.zip', 'release'],
        ['https://github.com/u/r/archive/refs/heads/main.zip', 'release'],
        ['https://github.com/u/r/releases/download/v1/a.tar.gz', 'release'],
        ['https://github.com/u/r/tags/v1', 'release'],
        ['https://github.com/u/r/wiki', 'repo'],
        ['https://github.com/u/r/blob/main/f.js?raw=1', 'file'], // query 不参与
        ['codeload.github.com/u/r/tar.gz', 'release'] // 回归（BUG-3）：codeload 归档识别
    ];
    for (const [input, want] of cases) {
        it(JSON.stringify(input) + ' -> ' + want, () => {
            assert.strictEqual(detectType(normalizeInput(input)), want);
        });
    }
});

describe('buildAccelUrl', () => {
    it('prefix 模式拼接', () => {
        assert.strictEqual(
            buildAccelUrl('https://github.com/u/r', { prefix: 'https://m.example/', mode: 'prefix' }),
            'https://m.example/github.com/u/r'
        );
    });
    it('replace 模式保留 path/query/hash', () => {
        assert.strictEqual(
            buildAccelUrl('https://github.com/u/r?x=1#h', { prefix: 'https://m.example/', mode: 'replace' }),
            'https://m.example/u/r?x=1#h'
        );
    });
    it('replace 模式保留节点自定义路径并使用节点协议', () => {
        assert.strictEqual(
            buildAccelUrl('http://github.com/u/r?x=1#h', {
                prefix: 'https://m.example/base/',
                mode: 'replace'
            }),
            'https://m.example/base/u/r?x=1#h'
        );
    });
    it('坏节点数据原样返回（不产生 undefined 链接）', () => {
        const input = 'https://github.com/u/r';
        for (const node of [null, undefined, {}, { prefix: '' }, { prefix: 123 }]) {
            assert.strictEqual(buildAccelUrl(input, node), input);
        }
    });
    it('clone 命令包装', () => {
        assert.strictEqual(
            buildCloneCommand('https://m.example/github.com/u/r'),
            'git clone https://m.example/github.com/u/r'
        );
    });
});

describe('节点前缀校验', () => {
    it('规范化 HTTP(S) 前缀并保留自定义路径', () => {
        assert.strictEqual(normalizeNodePrefix('https://mirror.example/base//'), 'https://mirror.example/base/');
        assert.strictEqual(normalizeNodePrefix('http://127.0.0.1:8080'), 'http://127.0.0.1:8080/');
    });

    it('拒绝凭据、查询串、哈希和非 HTTP 协议', () => {
        const bad = [
            'https://user:pass@mirror.example/',
            'https://mirror.example/?x=1',
            'https://mirror.example/#h',
            'ftp://mirror.example/',
            'javascript:alert(1)',
            ''
        ];
        for (const prefix of bad) {
            assert.strictEqual(normalizeNodePrefix(prefix), null);
        }
    });

    it('规范化节点模式并生成稳定 ID', () => {
        assert.deepStrictEqual(
            normalizeNode({ name: ' mirror ', prefix: 'https://mirror.example', mode: 'unknown' }),
            { name: 'mirror', prefix: 'https://mirror.example/', mode: 'prefix' }
        );
        assert.strictEqual(getNodeId({ name: 'a', prefix: 'https://a.example/', mode: 'replace' }), 'replace:https://a.example/');
        assert.strictEqual(normalizeNode({ name: '', prefix: 'https://a.example/' }), null);
    });

    it('坏前缀不会拼出加速链接', () => {
        const input = 'https://github.com/u/r';
        assert.strictEqual(buildAccelUrl(input, { prefix: 'https://mirror.example/?x=1' }), input);
    });
});

describe('hostOf', () => {
    it('剥离协议与尾部斜杠', () => {
        assert.strictEqual(hostOf('https://ghproxy.net/'), 'ghproxy.net');
        assert.strictEqual(hostOf('http://a.b.c'), 'a.b.c');
    });
});

describe('parseBatch 批量解析', () => {
    it('去重、跳过空行与无效项', () => {
        assert.deepStrictEqual(
            parseBatch('github.com/a/b\nhttps://github.com/a/b\nu/r\n\n'),
            ['https://github.com/a/b', 'https://github.com/u/r']
        );
    });
    it('处理 CRLF 与 null 输入', () => {
        assert.strictEqual(parseBatch('github.com/a/b\r\ngist.github.com/x/1\r\n').length, 2);
        assert.deepStrictEqual(parseBatch(null), []);
    });
    it('MAX_BATCH 常量保持 100', () => {
        assert.strictEqual(MAX_BATCH, 100);
    });

    it('统计有效数量并在限制处截断输出', () => {
        const text = [
            'github.com/a/1',
            'not a url',
            'github.com/a/1',
            'example.com/x',
            'github.com/a/2',
            '',
            'github.com/a/3',
            'github.com/a/4'
        ].join('\n');
        assert.deepStrictEqual(parseBatchWithStats(text, 2, isGitHubUrl), {
            urls: ['https://github.com/a/1', 'https://github.com/a/2'],
            normalizedTotal: 7,
            acceptedTotal: 4,
            invalidCount: 1,
            filteredCount: 2
        });
    });
});
