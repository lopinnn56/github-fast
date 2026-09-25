<script setup>
// Release 自动解析：仓库主页链接 → latest release 全部附件 → 一键加入加速列表。
// 一键加速后行内展开原链 + 前 N 条加速链 + “查看全部”滚动定位，不自动触发下载。
// 自动查询由父组件通过 auto 控制（批量时只自动前 N 个），失败可手动重试。
import { computed, onMounted, ref, watch } from 'vue';
import { useReleaseResolver } from '../composables/useReleaseResolver.js';
import { useNodes } from '../composables/useNodes.js';
import { useToast } from '../composables/useToast.js';
import { copyText } from '../lib/clipboard.js';
import { getNodeId } from '../lib/convert.js';
import { parseRepoSlug, formatSize, buildArchiveUrl, buildTopAccelLinks, TOP_ACCEL_LINKS } from '../lib/releases.js';

const props = defineProps({
    repoUrl: { type: String, required: true },
    auto: { type: Boolean, default: true }
});

const { getState, resolveRepo, addAssetToConvert } = useReleaseResolver();
const nodesStore = useNodes();
const { showToast } = useToast();

// 已展开下载提示的 downloadUrl 集合（key 为 true 即展开）
const expanded = ref(Object.create(null));

const slug = computed(function () {
    return parseRepoSlug(props.repoUrl);
});
const state = computed(function () {
    if (!slug.value) return null;
    return getState(props.repoUrl);
});
const totalAccelCount = computed(function () {
    try {
        return nodesStore.all.value.length;
    } catch {
        return 0;
    }
});

function load(force) {
    if (!slug.value) return;
    resolveRepo(props.repoUrl, { force: Boolean(force) });
}

onMounted(function () {
    if (props.auto) load(false);
});

function copyWithToast(text, btn) {
    copyText(text, btn).then(function (ok) {
        showToast(ok ? '已复制' : '复制失败，请手动复制');
    });
}

// 展开行的加速链缓存：同一下载链接只在首次展开时计算一次（节点列表变化时自动失效）。
const topLinksCache = new Map();

function topLinks(downloadUrl) {
    if (topLinksCache.has(downloadUrl)) return topLinksCache.get(downloadUrl);
    const links = buildTopAccelLinks(downloadUrl, nodesStore.all.value, TOP_ACCEL_LINKS);
    topLinksCache.set(downloadUrl, links);
    return links;
}

// 节点列表变化（增删/排序）时清空缓存，保证展开行反映最新节点
watch(function () { return nodesStore.all.value.map(getNodeId).join('|'); }, function () {
    topLinksCache.clear();
});

function onAccelerate(url) {
    if (!url) return;
    addAssetToConvert(url);
    // 无论新加入还是已存在，都展开行内提示，让用户直接看到原链与下载入口
    expanded.value[url] = true;
    topLinksCache.delete(url);
}

function isExpanded(url) {
    return Boolean(url && expanded.value[url]);
}

/** 滚动到下方结果区中该下载链接的完整分组，并闪一下高亮。 */
function scrollToGroup(url) {
    try {
        const esc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(url) : url.replace(/"/g, '');
        const el = document.querySelector('.link-group[data-url="' + esc + '"]');
        if (!el) {
            showToast('该分组不在当前页，点击“显示更多”后重试');
            return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
        setTimeout(function () { el.classList.remove('flash'); }, 1600);
    } catch {
        showToast('定位失败，请手动向下查找该链接分组');
    }
}

const archiveFallback = computed(function () {
    if (!slug.value || !state.value || !state.value.data) return '';
    return buildArchiveUrl(slug.value, state.value.data.tag);
});
</script>

<template>
    <div v-if="slug" class="release-box" :data-slug="slug">
        <div class="rb-head">
            <span class="rb-title">Release 解析 · {{ slug }}</span>
            <span v-if="state && state.data" class="rb-tag">{{ state.data.tag }}{{ state.data.prerelease ? ' · 预发布' : '' }}</span>
        </div>

        <div v-if="!state || state.status === 'idle'" class="rb-row">
            <span class="rb-muted">可自动获取最新版的具体下载链接（如 .apk / .zip）。</span>
            <button class="mini-btn" type="button" @click="load(false)">获取下载链接</button>
        </div>

        <div v-else-if="state.status === 'loading'" class="rb-row">
            <span class="rb-muted">正在查询最新 Release…</span>
        </div>

        <div v-else-if="state.status === 'error'" class="rb-row rb-error">
            <span class="rb-muted">{{ state.error }}</span>
            <span class="rb-actions">
                <button class="mini-btn" type="button" @click="load(true)">重试</button>
            </span>
        </div>

        <div v-else-if="state.status === 'done' && state.data">
            <p class="rb-meta">
                {{ state.data.name }} · {{ state.data.assets.length }} 个文件
                <a v-if="state.data.htmlUrl" class="rb-link" :href="state.data.htmlUrl" target="_blank" rel="noopener">查看 Release 页</a>
            </p>
            <ul v-if="state.data.assets.length" class="rb-list">
                <li v-for="a in state.data.assets" :key="a.downloadUrl" class="rb-item">
                    <span class="rb-name" :title="a.downloadUrl">{{ a.name }}</span>
                    <span class="rb-size">{{ formatSize(a.size) }}{{ a.downloadCount ? ' · ' + a.downloadCount + ' 次下载' : '' }}</span>
                    <span class="rb-actions">
                        <button class="mini-btn rb-go" type="button" @click="onAccelerate(a.downloadUrl)">{{ isExpanded(a.downloadUrl) ? '已加入 ✓' : '一键加速' }}</button>
                        <button class="mini-btn" type="button" @click="copyWithToast(a.downloadUrl, $event.currentTarget)">复制原链</button>
                        <a class="mini-btn" :href="a.downloadUrl" target="_blank" rel="noopener">打开</a>
                    </span>
                    <div v-if="isExpanded(a.downloadUrl)" class="rb-accel">
                        <div class="rb-accel-row rb-accel-orig">
                            <span class="rb-accel-label">原链</span>
                            <span class="rb-accel-url" :title="a.downloadUrl">{{ a.downloadUrl }}</span>
                            <span class="rb-actions">
                                <button class="mini-btn" type="button" @click="copyWithToast(a.downloadUrl, $event.currentTarget)">复制</button>
                                <a class="mini-btn" :href="a.downloadUrl" target="_blank" rel="noopener">打开</a>
                            </span>
                        </div>
                        <div v-for="t in topLinks(a.downloadUrl)" :key="t.target" class="rb-accel-row">
                            <span class="rb-accel-label" :title="t.name">{{ t.name }}</span>
                            <span class="rb-accel-url" :title="t.target">{{ t.target }}</span>
                            <span class="rb-actions">
                                <button class="mini-btn" type="button" @click="copyWithToast(t.target, $event.currentTarget)">复制</button>
                                <a class="mini-btn rb-dl" :href="t.target" target="_blank" rel="noopener">下载</a>
                            </span>
                        </div>
                        <button class="mini-btn rb-more" type="button" @click="scrollToGroup(a.downloadUrl)">在下方查看全部 {{ totalAccelCount }} 个节点 →</button>
                    </div>
                </li>
            </ul>
            <div v-else class="rb-row">
                <span class="rb-muted">该版本无附件，可直接加速源码包。</span>
                <span class="rb-actions">
                    <button class="mini-btn rb-go" type="button" @click="onAccelerate(archiveFallback)">{{ isExpanded(archiveFallback) ? '已加入 ✓' : '一键加速源码包' }}</button>
                    <button class="mini-btn" type="button" @click="copyWithToast(archiveFallback, $event.currentTarget)">复制原链</button>
                </span>
            </div>
            <div v-if="isExpanded(archiveFallback) && !state.data.assets.length" class="rb-accel">
                <div class="rb-accel-row rb-accel-orig">
                    <span class="rb-accel-label">原链</span>
                    <span class="rb-accel-url" :title="archiveFallback">{{ archiveFallback }}</span>
                    <span class="rb-actions">
                        <button class="mini-btn" type="button" @click="copyWithToast(archiveFallback, $event.currentTarget)">复制</button>
                        <a class="mini-btn" :href="archiveFallback" target="_blank" rel="noopener">打开</a>
                    </span>
                </div>
                <div v-for="t in topLinks(archiveFallback)" :key="t.target" class="rb-accel-row">
                    <span class="rb-accel-label" :title="t.name">{{ t.name }}</span>
                    <span class="rb-accel-url" :title="t.target">{{ t.target }}</span>
                    <span class="rb-actions">
                        <button class="mini-btn" type="button" @click="copyWithToast(t.target, $event.currentTarget)">复制</button>
                        <a class="mini-btn rb-dl" :href="t.target" target="_blank" rel="noopener">下载</a>
                    </span>
                </div>
                <button class="mini-btn rb-more" type="button" @click="scrollToGroup(archiveFallback)">在下方查看全部 {{ totalAccelCount }} 个节点 →</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.release-box {
    background: var(--field);
    border: 1px dashed var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.rb-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rb-title { font-size: .82rem; font-weight: 700; color: var(--text); }
.rb-tag {
    font-size: .68rem;
    font-weight: 700;
    color: #101010;
    background: #4ecf9a;
    padding: 2px 8px;
    border-radius: 6px;
}
.rb-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rb-muted { font-size: .82rem; color: var(--muted); }
.rb-error .rb-muted { color: var(--bad, #ff7a90); }
.rb-actions { display: flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.rb-meta { font-size: .8rem; color: var(--muted); }
.rb-link { color: var(--accent); text-decoration: none; margin-left: 8px; }
.rb-link:hover { text-decoration: underline; }
.rb-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.rb-item {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: var(--row-bg);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 8px 10px;
}
.rb-name {
    font-family: var(--font-mono);
    font-size: .8rem;
    color: var(--text);
    word-break: break-all;
    flex: 1;
    min-width: 140px;
}
.rb-size { font-size: .76rem; color: var(--muted2); white-space: nowrap; }
.rb-go { border-color: var(--accent); color: var(--accent); }
.rb-go:hover { background: var(--accent); color: #fff; }
/* 一键加速后的行内下载提示 */
.rb-accel {
    flex: 1 1 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px dashed var(--border);
}
.rb-accel-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    background: var(--field);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 9px;
}
.rb-accel-orig { border-style: solid; border-color: var(--accent); }
.rb-accel-label {
    font-size: .7rem;
    font-weight: 700;
    color: var(--accent);
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
}
.rb-accel-url {
    font-family: var(--font-mono);
    font-size: .74rem;
    color: var(--muted);
    word-break: break-all;
    flex: 1;
    min-width: 140px;
}
.rb-accel .rb-actions { margin-left: auto; }
.rb-dl { border-color: var(--accent); color: var(--accent); }
.rb-dl:hover { background: var(--accent); color: #fff; }
.rb-more { align-self: flex-start; }
</style>
