<script setup>
// Release 自动解析：仓库主页链接 → latest release 全部附件 → 一键加入加速列表。
// v4：状态/缓存/滚动逻辑保留在本组件，附件列表渲染交给 ReleaseAssetList.vue，
// 行内加速链交给 AccelLinks.vue，scoped CSS 外移到 styles/release.css。
// 自动查询由父组件通过 auto 控制（批量时只自动前 N 个），失败可手动重试。
import { computed, onMounted, ref, watch } from 'vue';
import { useReleaseResolver } from '../composables/useReleaseResolver.js';
import { useNodes } from '../composables/useNodes.js';
import { useToast } from '../composables/useToast.js';
import { getNodeId } from '../lib/convert.js';
import { parseRepoSlug, buildArchiveUrl, buildTopAccelLinks, TOP_ACCEL_LINKS } from '../lib/releases.js';
import ReleaseAssetList from './ReleaseAssetList.vue';

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

        <ReleaseAssetList v-else-if="state.status === 'done' && state.data"
                          :release="state.data"
                          :archive-fallback="archiveFallback"
                          :expanded="expanded"
                          :top-links="topLinks"
                          :total="totalAccelCount"
                          @accelerate="onAccelerate"
                          @view-all="scrollToGroup" />
    </div>
</template>
