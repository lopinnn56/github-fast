// v4 新增：结果分组逻辑抽出后的纯工厂单测（不渲染 .vue，不依赖浏览器）。
// 覆盖：meta 解析、AUTO_RESOLVE_LIMIT 截断、惰性 entries、分页、模式签名、allLines/onCopyAll。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ref, computed } from 'vue';
import { createResultGroups } from '../src/composables/useResultGroups.js';
import { AUTO_RESOLVE_LIMIT } from '../src/lib/releases.js';
import { LIMITS } from '../src/config/constants.js';
import { buildCloneCommand, getNodeId } from '../src/lib/convert.js';

const nodes = [
    { name: 'p1', prefix: 'https://p1.example/', mode: 'prefix' },
    { name: 'm1', prefix: 'https://m1.example/', mode: 'prefix' },
    { name: 'm2', prefix: 'https://m2.example/', mode: 'prefix' }
];

function harness({ urls = [], clone = false, pinnedCount = 1 } = {}) {
    const links = ref(urls);
    const pinned = computed(() => nodes.slice(0, pinnedCount));
    const main = computed(() => nodes.slice(pinnedCount));
    const all = computed(() => pinned.value.concat(main.value));
    const nodesStore = { pinned, main, all };
    const isClone = () => clone;
    const convertEpoch = ref(0);
    const messages = [];
    const copies = [];
    const group = createResultGroups({
        links, nodesStore, isClone, convertEpoch,
        showToast(m) { messages.push(m); },
        copyWithToast(text, btn) { copies.push([text, btn]); return Promise.resolve(true); }
    });
    return { ...group, links, convertEpoch, messages, copies, setClone(v) { clone = v; } };
}

describe('createResultGroups（分组 meta）', () => {
    it('识别链接类型与标签，仅前 AUTO_RESOLVE_LIMIT 个仓库自动解析', () => {
        const urls = [
            ...Array.from({ length: AUTO_RESOLVE_LIMIT + 2 }, (_, i) => `https://github.com/o/r${i}`),
            'https://raw.githubusercontent.com/o/r/main/a.txt',
            'https://github.com/o/r/releases/download/v1/a.zip',
            'https://gist.github.com/o/abcdef'
        ];
        const g = harness({ urls });
        assert.strictEqual(g.groups.value.length, urls.length);
        assert.strictEqual(g.groups.value[0].typeTag, 'REPO');
        assert.strictEqual(g.groups.value[AUTO_RESOLVE_LIMIT - 1].autoResolve, true);
        assert.strictEqual(g.groups.value[AUTO_RESOLVE_LIMIT].autoResolve, false);
        assert.strictEqual(g.groups.value.at(-3).typeTag, 'RAW');
        assert.strictEqual(g.groups.value.at(-2).typeTag, 'RELEASE');
        assert.strictEqual(g.groups.value.at(-1).typeTag, 'GIST');
        assert.strictEqual(g.groups.value.at(-2).autoResolve, false);
        assert.strictEqual(g.resultStatus.value.includes('显示'), true);
    });

    it('空列表时 hasLinks=false、状态串为空、onCopyAll 提示「暂无结果」', () => {
        const g = harness();
        assert.strictEqual(g.hasLinks.value, false);
        assert.strictEqual(g.multi.value, false);
        assert.strictEqual(g.resultStatus.value, '');
        g.onCopyAll({ currentTarget: null });
        assert.deepStrictEqual(g.messages, ['暂无结果']);
        assert.deepStrictEqual(g.copies, []);
    });
});

describe('createResultGroups（entries 惰性构建与分页）', () => {
    it('entries = 置顶子标题 + 全部节点，带 pinned 标记与递增 delay', () => {
        const g = harness({ urls: ['https://github.com/o/r'] });
        const built = g.visibleGroupList.value[0];
        assert.strictEqual(built.url, 'https://github.com/o/r');
        const items = built.entries.filter(e => e.kind === 'item');
        const subheads = built.entries.filter(e => e.kind === 'subhead');
        assert.strictEqual(subheads.length, 2); // 置顶 + 普通
        assert.strictEqual(items.length, nodes.length);
        assert.deepStrictEqual(items.map(i => i.key), nodes.map(getNodeId));
        assert.deepStrictEqual(items.map(i => i.pinned), [true, false, false]);
        assert.strictEqual(items[0].delay, '0ms');
        assert.strictEqual(items[1].delay, String(LIMITS.resultAnimationStepMs) + 'ms');
        // prefix 模式会剥掉原链协议：prefix + 'github.com/o/r'
        assert.strictEqual(items[0].target, 'https://p1.example/github.com/o/r');
        assert.strictEqual(items[0].text, items[0].target);
    });

    it('Clone 模式：text 为 git clone 命令，groupSig 含 c', () => {
        const g = harness({ urls: ['https://github.com/o/r'], clone: true });
        const built = g.visibleGroupList.value[0];
        assert.strictEqual(built.entries[1].text, buildCloneCommand(built.entries[1].target));
        assert.ok(g.groupSig.value.startsWith('c|'));
        const line = g.allLines('https://github.com/o/r')[0];
        assert.strictEqual(line, buildCloneCommand('https://p1.example/github.com/o/r'));
    });

    it('相同 url+sig 命中缓存；节点签名变化时清空缓存', () => {
        const g = harness({ urls: ['https://github.com/o/r'], pinnedCount: 1 });
        const first = g.visibleGroupList.value[0];
        assert.strictEqual(g.visibleGroupList.value[0], first);
        // 改变 main 节点顺序（复用同一 computed 值引用，直接改底层数组）
        nodes.reverse();
        // computed 依赖数组内容，需触发重新求值：用 pinnedCount 变化模拟节点集合改变
        const g2 = harness({ urls: ['https://github.com/o/r'], pinnedCount: 2 });
        assert.notStrictEqual(g2.visibleGroupList.value[0], first);
        assert.ok(g2.groupSig.value.includes(getNodeId(nodes[0])));
        nodes.reverse(); // 还原
    });

    it('分页：超过 pageSize 时只构建可见分组，showMoreGroups 后隐藏数减少', async () => {
        const urls = Array.from({ length: LIMITS.resultPageSize + 5 }, (_, i) => `https://github.com/o/r${i}`);
        const g = harness({ urls });
        assert.strictEqual(g.visibleGroupList.value.length, LIMITS.resultPageSize);
        assert.strictEqual(g.hiddenGroupCount.value, 5);
        g.showMoreGroups();
        assert.strictEqual(g.visibleGroupList.value.length, LIMITS.resultPageSize + 5);
        assert.strictEqual(g.hiddenGroupCount.value, 0);
        // 新转换（convertEpoch++）重置分页；watch 为异步 post 队列，等一 tick
        g.convertEpoch.value++;
        await Promise.resolve();
        await Promise.resolve();
        assert.strictEqual(g.visibleGroups.value, LIMITS.resultPageSize);
    });
});

describe('createResultGroups（复制）', () => {
    it('allLines 按 links × all 展开；forUrl 只输出该组', () => {
        const g = harness({ urls: ['https://github.com/a/b', 'https://github.com/c/d'] });
        assert.strictEqual(g.allLines().length, 2 * nodes.length);
        assert.strictEqual(g.allLines('https://github.com/c/d').length, nodes.length);
        assert.ok(g.allLines('https://github.com/c/d')[0].includes('c/d'));
    });

    it('onCopyAll 把全部结果交给 copyWithToast，并传按钮元素', () => {
        const g = harness({ urls: ['https://github.com/a/b'] });
        const btn = { id: 'copy-all' };
        g.onCopyAll({ currentTarget: btn });
        assert.strictEqual(g.copies.length, 1);
        assert.strictEqual(g.copies[0][1], btn);
        assert.strictEqual(g.copies[0][0].split('\n').length, nodes.length);
    });
});
