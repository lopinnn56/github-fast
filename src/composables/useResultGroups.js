/**
 * 结果分组逻辑（v4：从 ResultList.vue 抽出）。
 *
 * v3.1 把 130 行「链接 × 节点」分组/分页/惰性构建全塞在组件 script setup 里，
 * 无法单测。v4 收敛为纯工厂 createResultGroups(依赖)：只接收响应式 ref / computed /
 * 纯函数，返回渲染所需的全部状态；useResultGroups() 只是从应用容器取依赖的薄封装。
 *
 * 关键设计：groups 只算链接级 meta（不展开 70+ 节点），entries 在可见分组里
 * 惰性构建并按「url + 节点/模式签名」缓存，批量粘贴 100 链接时避免一次构建 7000 项。
 */
import { computed, ref, watch } from 'vue';
import { detectType, TYPE_LABEL, buildAccelUrl, buildCloneCommand, getNodeId } from '../lib/convert.js';
import { AUTO_RESOLVE_LIMIT } from '../lib/releases.js';
import { LIMITS } from '../config/constants.js';
import { useConverter } from './useConverter.js';
import { useNodes } from './useNodes.js';
import { useMode } from './useMode.js';
import { useToast } from './useToast.js';
import { useCopy } from './useCopy.js';

/**
 * @param {object} deps
 * @param {import('vue').Ref<string[]>} deps.links 已转换的链接列表
 * @param {{pinned:import('vue').ComputedRef, main:import('vue').ComputedRef, all:import('vue').ComputedRef}} deps.nodesStore
 * @param {() => boolean} deps.isClone 当前是否 Clone 模式
 * @param {import('vue').Ref<number>} deps.convertEpoch 每次新转换自增，用于重置分页
 * @param {(msg:string)=>void} [deps.showToast]
 * @param {(text:string, btn?:object)=>Promise<boolean>} [deps.copyWithToast]
 * @returns {object} 结果分组状态与操作
 */
export function createResultGroups({ links, nodesStore, isClone, convertEpoch, showToast, copyWithToast }) {
    const pageSize = LIMITS.resultPageSize;
    const visibleGroups = ref(pageSize);

    // 轻量分组 meta：只做链接级解析（URL / 类型 / 自动解析标记）
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

    /** 单个分组的完整渲染数据（含全部节点的 entries），惰性构建并缓存。 */
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
                    delay: Math.min(animationIndex++, LIMITS.resultAnimationMax) * LIMITS.resultAnimationStepMs + 'ms'
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

    const entryCache = new Map();
    const visibleGroupList = computed(function () {
        const sig = groupSig.value;
        return groups.value.slice(0, visibleGroups.value).map(function (g) {
            const key = g.url + '\u0000' + sig;
            let built = entryCache.get(key);
            if (!built) {
                built = buildGroupMeta(g, sig);
                entryCache.set(key, built);
                if (entryCache.size > LIMITS.resultEntryCache) { // 防御：缓存只保留最近条目
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
    const hasLinks = computed(function () { return links.value.length > 0; });
    const multi = computed(function () { return links.value.length > 1; });

    // 仅在新转换发生时重置分页；删除分组（removeGroup 只改 links）不收回已展开的分页
    const stopEpochWatch = watch(convertEpoch, function () {
        visibleGroups.value = pageSize;
    });
    const stopSigWatch = watch(groupSig, function () {
        entryCache.clear();
    });

    function showMoreGroups() {
        visibleGroups.value += pageSize;
    }

    /** 复制全部：链接模式输出 URL，Clone 模式输出命令；forUrl 时只输出该组。 */
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
            if (showToast) showToast('暂无结果');
            return;
        }
        if (copyWithToast) copyWithToast(allLines().join('\n'), e && e.currentTarget);
    }

    function dispose() {
        stopEpochWatch();
        stopSigWatch();
    }

    return {
        visibleGroups, groups, groupSig, visibleGroupList, hiddenGroupCount,
        resultStatus, hasLinks, multi, showMoreGroups, allLines, onCopyAll, dispose
    };
}

/** 应用容器内取依赖的薄封装（组件用）。 */
export function useResultGroups() {
    const { links, convertEpoch } = useConverter();
    const nodesStore = useNodes();
    const { isClone } = useMode();
    const { showToast } = useToast();
    const { copyWithToast } = useCopy();
    return createResultGroups({ links, nodesStore, isClone, convertEpoch, showToast, copyWithToast });
}
