import { describe, it, expect } from 'vitest';
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
        ['github.com/u/r', 'https://github.com/u/r'],
        ['www.github.com/u/r', 'https://github.com/u/r'],
        ['  github.com/u/r  ', 'https://github.com/u/r'], // 首尾空白
        ['u/r', 'https://github.com/u/r'],
        ['-org/r.name-1', 'https://github.com/-org/r.name-1'],
        ['', '']
    ];
    it.each(cases)('%s -> %s', (input, want) => {
        expect(normalizeInput(input)).toBe(want);
    });

    it('非 GitHub 域名不补协议（原样返回，由 isGitHubUrl 过滤）', () => {
        expect(normalizeInput('example.com/x')).toBe('example.com/x');
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
    const bad = [
        'https://evil.com/github.com/x',
        'https://github.com.evil.com/x/y',
        'javascript:alert(1)',
        'not a url',
        '',
        'file:///etc/passwd'
    ];
    it.each(ok)('接受 %s', (u) => expect(isGitHubUrl(normalizeInput(u))).toBe(true));
    it.each(bad)('拒绝 %j', (u) => {
        // 与页面行为一致：先 normalize 再判断
        if (/^javascript:|^file:|^not|^$/.test(u)) {
            expect(isGitHubUrl(u)).toBe(false);
        } else {
            expect(isGitHubUrl(normalizeInput(u))).toBe(false);
        }
    });
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
        ['https://github.com/u/r/blob/main/f.js?raw=1', 'file'] // query 不参与
    ];
    it.each(cases)('%s -> %s', (input, want) => {
        expect(detectType(normalizeInput(input))).toBe(want);
    });
});

describe('buildAccelUrl', () => {
    it('prefix 模式拼接', () => {
        expect(buildAccelUrl('https://github.com/u/r', { prefix: 'https://m.example/', mode: 'prefix' }))
            .toBe('https://m.example/github.com/u/r');
    });
    it('replace 模式保留 path/query/hash', () => {
        expect(buildAccelUrl('https://github.com/u/r?x=1#h', { prefix: 'https://m.example/', mode: 'replace' }))
            .toBe('https://m.example/u/r?x=1#h');
    });
    it('坏节点数据原样返回（不产生 undefined 链接）', () => {
        const input = 'https://github.com/u/r';
        for (const node of [null, undefined, {}, { prefix: '' }, { prefix: 123 }]) {
            expect(buildAccelUrl(input, node)).toBe(input);
        }
    });
    it('clone 命令包装', () => {
        expect(buildCloneCommand('https://m.example/github.com/u/r')).toBe('git clone https://m.example/github.com/u/r');
    });
});

describe('节点前缀校验', () => {
    it('规范化 HTTP(S) 前缀并保留自定义路径', () => {
        expect(normalizeNodePrefix('https://mirror.example/base//')).toBe('https://mirror.example/base/');
        expect(normalizeNodePrefix('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080/');
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
        bad.forEach((prefix) => expect(normalizeNodePrefix(prefix)).toBeNull());
    });

    it('规范化节点模式并生成稳定 ID', () => {
        expect(normalizeNode({ name: ' mirror ', prefix: 'https://mirror.example', mode: 'unknown' }))
            .toEqual({ name: 'mirror', prefix: 'https://mirror.example/', mode: 'prefix' });
        expect(getNodeId({ name: 'a', prefix: 'https://a.example/', mode: 'replace' })).toBe('replace:https://a.example/');
        expect(normalizeNode({ name: '', prefix: 'https://a.example/' })).toBeNull();
    });

    it('坏前缀不会拼出加速链接', () => {
        const input = 'https://github.com/u/r';
        expect(buildAccelUrl(input, { prefix: 'https://mirror.example/?x=1' })).toBe(input);
    });
});

describe('hostOf', () => {
    it('剥离协议与尾部斜杠', () => {
        expect(hostOf('https://ghproxy.net/')).toBe('ghproxy.net');
        expect(hostOf('http://a.b.c')).toBe('a.b.c');
    });
});

describe('parseBatch 批量解析', () => {
    it('去重、跳过空行与无效项', () => {
        expect(parseBatch('github.com/a/b\nhttps://github.com/a/b\nu/r\n\n'))
            .toEqual(['https://github.com/a/b', 'https://github.com/u/r']);
    });
    it('处理 CRLF 与 null 输入', () => {
        expect(parseBatch('github.com/a/b\r\ngist.github.com/x/1\r\n')).toHaveLength(2);
        expect(parseBatch(null)).toEqual([]);
    });
    it('MAX_BATCH 常量保持 100', () => {
        expect(MAX_BATCH).toBe(100);
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
        expect(parseBatchWithStats(text, 2, isGitHubUrl)).toEqual({
            urls: ['https://github.com/a/1', 'https://github.com/a/2'],
            normalizedTotal: 7,
            acceptedTotal: 4,
            invalidCount: 1,
            filteredCount: 2
        });
    });
});
