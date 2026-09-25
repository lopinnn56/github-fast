<script setup>
// 结果区：链接 × 节点 的分组展示、复制 / 打开 / 删除本组 / 复制全部。
// 全部由响应式驱动：节点增删排序或模式切换时自动重绘（替代旧版手动 refreshNodes）。
import { computed, ref, watch } from 'vue';
import { useConverter } from '../composables/useConverter.js';
import { useNodes } from '../composables/useNodes.js';
import { useMode } from '../composables/useMode.js';
import { useToast } from '../composables/useToast.js';
import { copyText } from '../lib/clipboard.js';
import { detectType, TYPE_LABEL, buildAccelUrl, buildCloneCommand, getNodeId } from '../lib/convert.js';
import { AUTO_RESOLVE_LIMIT } from '../lib/releases.js';
import ModeSwitch from './ModeSwitch.vue';
import ReleaseResolver from './ReleaseResolver.vue';

const { links, removeGroup, convertEpoch } = useConverter();
const nodesStore = useNodes();
const { isClone } = useMode();
const { showToast } = useToast();

const RESULT_PAGE_SIZE = 10;
const visibleGroups = ref(RESULT_PAGE_SIZE);

function copyWithToast(text, btn) {
    copyText(text, btn).then(function (ok) {
        showToast(ok ? '已复制' : '复制失败，请手动复制');
    });
}

// 轻量分组 meta：只做链接级解析（URL / 类型 / 自动解析标记），
// 不预先展开 70+ 节点的 entries —— 批量粘贴 100 链接时避免一次构建 7000 项。
const groups = computed(function () {
    let repoOrder = 0;
    return links.value.map(function (url) {
        const type = detectType(url);
        const isRepo = type === 'repo';
        const myRepoOrder = isRepo ? repoOrder++ : -1;
        return {
            url,
            typeTag: TYPE_LABEL[type] || '',
            typeClass: type,
            isRepo,
            autoResolve: myRepoOrder >= 0 && myRepoOrder < AUTO_RESOLVE_LIMIT
        };
    });
});

// 节点/模式签名：任一变化即视为 entries 失效（缓存 key 的一部分）
const groupSig = computed(function () {
    return (isClone() ? 'c' : 'l') + '|' +
        nodesStore.pinned.value.map(getNodeId).join(',') + '|' +
        nodesStore.main.value.map(getNodeId).join(',');
});

// 单个分组的完整渲染数据（含全部节点的 entries），惰性构建并缓存。
function buildGroupMeta(g, sig) {
    const pinnedNodes = nodesStore.pinned.value;
    const mainNodes = nodesStore.main.value;
    const clone = isClone();
    const entries = [];
    let animationIndex = 0;
    const pushItems = function (list, pinned) {
        list.forEach(function (n) {
            const target = buildAccelUrl(g.url, n);
            entries.push({
                kind: 'item',
                key: getNodeId(n),
                node: n,
                target,
                text: clone ? buildCloneCommand(target) : target,
                pinned,
                delay: Math.min(animationIndex++, 24) * 30 + 'ms'
            });
        });
    };
    if (pinnedNodes.length) {
        entries.push({ kind: 'subhead', key: '__sub-pinned', text: '置顶节点 · ' + pinnedNodes.length });
        pushItems(pinnedNodes, true);
    }
    if (mainNodes.length) {
        if (pinnedNodes.length) entries.push({ kind: 'subhead', key: '__sub-main', text: '普通节点 · ' + mainNodes.length });
        pushItems(mainNodes, false);
    }
    return { ...g, sig, entries };
}

// 可见分组：只构建当前可见的分组，未展示的分组不消耗构建时间。
const entryCache = new Map();
const visibleGroupList = computed(function () {
    const sig = groupSig.value;
    return groups.value.slice(0, visibleGroups.value).map(function (g) {
        const key = g.url + '\u0000' + sig;
        let built = entryCache.get(key);
        if (!built) {
            built = buildGroupMeta(g, sig);
            entryCache.set(key, built);
            if (entryCache.size > 300) { // 防御：缓存只保留最近条目
                const oldest = entryCache.keys().next().value;
                entryCache.delete(oldest);
            }
        }
        return built;
    });
});
const hiddenGroupCount = computed(function () {
    return Math.max(groups.value.length - visibleGroups.value, 0);
});
const resultStatus = computed(function () {
    if (!links.value.length) return '';
    return '已转换 ' + links.value.length + ' 个链接，显示 ' + visibleGroupList.value.length + ' / ' + groups.value.length + ' 组';
});

// 仅在新转换发生时重置分页；删除分组（removeGroup 只改 links）不收回已展开的分页
watch(convertEpoch, function () {
    visibleGroups.value = RESULT_PAGE_SIZE;
});

watch(groupSig, function () {
    entryCache.clear();
});

function showMoreGroups() {
    visibleGroups.value += RESULT_PAGE_SIZE;
}

const hasLinks = computed(function () { return links.value.length > 0; });
const multi = computed(function () { return links.value.length > 1; });

/** 复制全部：链接模式输出 URL，Clone 模式输出命令 */
function allLines(forUrl) {
    const urls = forUrl ? [forUrl] : links.value;
    const lines = [];
    const clone = isClone();
    urls.forEach(function (url) {
        nodesStore.all.value.forEach(function (n) {
            const t = buildAccelUrl(url, n);
            lines.push(clone ? buildCloneCommand(t) : t);
        });
    });
    return lines;
}

function onCopyAll(e) {
    if (!links.value.length) {
        showToast('暂无结果');
        return;
    }
    copyWithToast(allLines().join('\n'), e.currentTarget);
}
</script>

<template>
    <div class="results" :hidden="!hasLinks">
        <div class="results-head">
            <h3>加速链接</h3>
            <div class="results-head-right">
                <ModeSwitch />
                <button class="btn btn-ghost btn-sm" type="button" :disabled="!hasLinks"
                        title="复制当前全部结果" @click="onCopyAll">复制全部</button>
            </div>
        </div>
        <p class="visually-hidden" aria-live="polite">{{ resultStatus }}</p>
        <div class="result-list">
            <div v-for="g in visibleGroupList" :key="g.url" class="link-group" :data-url="g.url">
                <div v-if="multi" class="group-head">
                    <span class="gh-link" :title="g.url">{{ g.url }}</span>
                    <span class="ri-tag">{{ g.typeTag }}</span>
                    <div class="ri-actions">
                        <button class="mini-btn" type="button"
                                @click="copyWithToast(allLines(g.url).join('\n'), $event.currentTarget)">复制本组</button>
                        <button class="mini-btn" type="button" @click="removeGroup(g.url)">删除本组</button>
                    </div>
                </div>

                <ReleaseResolver v-if="g.isRepo" :repo-url="g.url" :auto="g.autoResolve" />

                <template v-for="entry in g.entries" :key="entry.key">
                    <div v-if="entry.kind === 'subhead'" class="link-subhead">{{ entry.text }}</div>
                    <div v-else class="result-item" :class="['ti-' + g.typeClass, { pinned: entry.pinned }]"
                         :style="{ animationDelay: entry.delay }">
                        <div class="ri-head">
                            <div class="ri-left">
                                <span class="ri-name">{{ entry.node.name }}</span>
                                <span class="ri-tag">{{ g.typeTag }}</span>
                            </div>
                            <div class="ri-actions">
                                <template v-if="isClone()">
                                    <button class="mini-btn" type="button"
                                            @click="copyWithToast(entry.text, $event.currentTarget)">复制命令</button>
                                </template>
                                <template v-else>
                                    <button class="mini-btn" type="button"
                                            @click="copyWithToast(entry.target, $event.currentTarget)">复制</button>
                                    <a class="mini-btn" :href="entry.target" target="_blank" rel="noopener">打开</a>
                                </template>
                            </div>
                        </div>
                        <span class="ri-url">{{ entry.text }}</span>
                    </div>
                </template>
            </div>
        </div>
        <div v-if="hiddenGroupCount" class="load-more">
            <button class="btn btn-ghost btn-sm" type="button" @click="showMoreGroups">
                显示更多（剩余 {{ hiddenGroupCount }} 组）
            </button>
        </div>
    </div>
</template>
