// 单元测试：Release 自动解析纯函数（node --test tests/），零额外依赖。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseRepoSlug,
    buildLatestUrl,
    buildListUrl,
    buildArchiveUrl,
    buildAuthHeaders,
    buildTopAccelLinks,
    pickDisplayRelease,
    formatSize,
    releaseCacheKey,
    AUTO_RESOLVE_LIMIT,
    TOP_ACCEL_LINKS,
    GITHUB_API_BASE
} from '../src/lib/releases.js';

describe('parseRepoSlug', () => {
    const ok = [
        ['https://github.com/lopinnn56/Melodia', 'lopinnn56/Melodia'],
        ['https://github.com/lopinnn56/Melodia/', 'lopinnn56/Melodia'],
        ['https://github.com/lopinnn56/Melodia.git', 'lopinnn56/Melodia'],
        ['https://www.github.com/lopinnn56/Melodia', 'lopinnn56/Melodia'],
        ['github.com/lopinnn56/Melodia', 'lopinnn56/Melodia'],
        ['lopinnn56/Melodia', 'lopinnn56/Melodia'],
        ['https://github.com/Owner/Repo/tree/main/docs', 'Owner/Repo'],
        ['https://github.com/u/r/blob/main/f.js', 'u/r'],
        ['  https://github.com/u/r  ', 'u/r']
    ];
    for (const [input, want] of ok) {
        it(JSON.stringify(input) + ' -> ' + want, () => {
            assert.strictEqual(parseRepoSlug(input), want);
        });
    }

    const bad = [
        '',
        'not a url',
        'https://evil.com/github.com/x',
        'https://github.com.evil.com/x/y',
        'https://github.com/onlyone',
        'https://github.com/',
        'https://gist.github.com/x/1',
        'https://raw.githubusercontent.com/u/r/main/f.js',
        'https://api.github.com/repos/u/r',
        'example.com/x'
    ];
    for (const input of bad) {
        it('拒绝 ' + JSON.stringify(input), () => {
            assert.strictEqual(parseRepoSlug(input), null);
        });
    }
});

describe('release urls & headers', () => {
    it('latest/list/archive 地址拼接', () => {
        assert.strictEqual(buildLatestUrl('o/r'), GITHUB_API_BASE + '/repos/o/r/releases/latest');
        assert.strictEqual(buildListUrl('o/r', 5), GITHUB_API_BASE + '/repos/o/r/releases?per_page=5');
        assert.strictEqual(buildArchiveUrl('o/r', 'v1.5.1'), 'https://github.com/o/r/archive/refs/tags/v1.5.1.zip');
    });
    it('Auth 头：无 token 不带 Authorization', () => {
        const h = buildAuthHeaders('');
        assert.strictEqual('Authorization' in h, false);
        assert.strictEqual(h.Accept, 'application/vnd.github+json');
    });
    it('Auth 头：有 token 带 Bearer', () => {
        const h = buildAuthHeaders('ghp_abc');
        assert.strictEqual(h.Authorization, 'Bearer ghp_abc');
    });
    it('AUTO_RESOLVE_LIMIT 为 10', () => {
        assert.strictEqual(AUTO_RESOLVE_LIMIT, 10);
    });
    it('缓存键大小写不敏感', () => {
        assert.strictEqual(releaseCacheKey('O/R'), releaseCacheKey('o/r'));
    });
});

describe('pickDisplayRelease', () => {
    it('归一 Melodia 例子', () => {
        const api = {
            tag_name: 'v1.5.1',
            name: 'Melodia v1.5.1',
            prerelease: false,
            html_url: 'https://github.com/lopinnn56/Melodia/releases/tag/v1.5.1',
            published_at: '2026-08-16T23:19:12Z',
            assets: [
                {
                    name: 'Melodia-optimized.apk',
                    size: 23888204,
                    browser_download_url: 'https://github.com/lopinnn56/Melodia/releases/download/v1.5.1/Melodia-optimized.apk',
                    download_count: 16,
                    content_type: 'application/vnd.android.package-archive'
                }
            ]
        };
        const r = pickDisplayRelease(api);
        assert.strictEqual(r.tag, 'v1.5.1');
        assert.strictEqual(r.assets.length, 1);
        assert.strictEqual(r.assets[0].downloadUrl, 'https://github.com/lopinnn56/Melodia/releases/download/v1.5.1/Melodia-optimized.apk');
    });
    it('坏数据返回 null', () => {
        assert.strictEqual(pickDisplayRelease(null), null);
        assert.strictEqual(pickDisplayRelease({}), null);
    });
    it('过滤掉没有 download_url 的附件', () => {
        const r = pickDisplayRelease({ tag_name: 'v1', assets: [{ name: 'x' }, { name: 'y', browser_download_url: 'https://x/y' }] });
        assert.strictEqual(r.assets.length, 1);
    });
});

describe('formatSize', () => {
    it('字节可读化', () => {
        assert.strictEqual(formatSize(0), '0 B');
        assert.strictEqual(formatSize(23888204), '22.8 MB');
        assert.strictEqual(formatSize(1536), '1.5 KB');
        assert.strictEqual(formatSize(-1), '-');
    });
});

describe('fetchLatestRelease 网络分支（mock fetch）', async () => {
    const { fetchLatestRelease } = await import('../src/lib/releases.js');
    it('latest 200 直接返回', async () => {
        const fake = async () => ({ ok: true, json: async () => ({ tag_name: 'v1', assets: [] }) });
        const { release } = await fetchLatestRelease('o/r', { fetchFn: fake });
        assert.strictEqual(release.tag, 'v1');
    });
    it('latest 404 + 列表有值则回退', async () => {
        const fake = async (url) => {
            if (url.includes('/releases/latest')) return { ok: false, status: 404, headers: new Headers() };
            return { ok: true, json: async () => [{ tag_name: 'v2', draft: false, assets: [] }] };
        };
        const { release } = await fetchLatestRelease('o/r', { fetchFn: fake });
        assert.strictEqual(release.tag, 'v2');
    });
    it('latest 404 + 列表为空则 NO_RELEASE', async () => {
        const fake = async (url) => {
            if (url.includes('/releases/latest')) return { ok: false, status: 404, headers: new Headers() };
            return { ok: true, json: async () => [] };
        };
        await assert.rejects(fetchLatestRelease('o/r', { fetchFn: fake }), /暂无 Release/);
    });
    it('403 限流报错 RATE_LIMITED', async () => {
        const fake = async () => ({ ok: false, status: 403, headers: new Headers() });
        await assert.rejects(fetchLatestRelease('o/r', { fetchFn: fake }), /限流/);
    });
});

describe('buildTopAccelLinks 行内展开', () => {
    const dl = 'https://github.com/lopinnn56/Melodia/releases/download/v1.5.1/Melodia-optimized.apk';
    const nodes = [
        { name: '节点A', prefix: 'https://a.example/', mode: 'prefix' },
        { name: '节点B', prefix: 'https://b.example/', mode: 'prefix' },
        { name: '节点C', prefix: 'https://c.example/', mode: 'prefix' },
        { name: '节点D', prefix: 'https://d.example/', mode: 'prefix' }
    ];
    it('默认截断 TOP_ACCEL_LINKS 条', () => {
        assert.strictEqual(TOP_ACCEL_LINKS, 3);
        const out = buildTopAccelLinks(dl, nodes);
        assert.strictEqual(out.length, 3);
        assert.strictEqual(out[0].target, 'https://a.example/github.com/lopinnn56/Melodia/releases/download/v1.5.1/Melodia-optimized.apk');
        assert.strictEqual(out[0].name, '节点A');
    });
    it('limit 参数生效', () => {
        assert.strictEqual(buildTopAccelLinks(dl, nodes, 1).length, 1);
        assert.strictEqual(buildTopAccelLinks(dl, nodes, 10).length, 4);
    });
    it('坏节点自动跳过，不返回原链', () => {
        const out = buildTopAccelLinks(dl, [null, {}, { prefix: '' }, { prefix: 'https://bad/?x=1' }, nodes[0]]);
        assert.strictEqual(out.length, 1);
        assert.notStrictEqual(out[0].target, dl);
    });
    it('空输入返回空数组', () => {
        assert.deepStrictEqual(buildTopAccelLinks('', nodes), []);
        assert.deepStrictEqual(buildTopAccelLinks(dl, null), []);
    });
});
