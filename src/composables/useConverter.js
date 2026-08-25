import { ref, watch } from 'vue';
import { parseBatchWithStats, isGitHubUrl, MAX_BATCH } from '../lib/convert.js';
import { syncUrlParam, readUrlParams } from '../lib/url-state.js';
import { useToast } from './useToast.js';

// 模块级单例：转换结果跨组件共享（输入面板 ↔ 结果列表）
const links = ref([]);
const rawText = ref('');
const { showToast } = useToast();

function notifySkipped(batch) {
    const overflow = batch.acceptedTotal - batch.urls.length;
    const skipped = batch.invalidCount + batch.filteredCount;
    if (overflow) {
        showToast('一次最多转换 ' + MAX_BATCH + ' 个链接，已忽略后 ' + overflow + ' 个');
    } else if (skipped) {
        showToast('已跳过 ' + skipped + ' 个无效链接');
    }
}

// 结果变更（转换 / 删除分组 / 清空）时同步地址栏 ?url= 参数
watch(links, function (l) { syncUrlParam(l); });

/**
 * 执行批量转换：规范化 → 过滤 GitHub 链接 → 截断上限 → 更新结果与地址栏。
 * 全部提示语与旧版一致。
 */
function doConvert() {
    const batch = parseBatchWithStats(rawText.value, MAX_BATCH, isGitHubUrl);
    if (!batch.normalizedTotal) {
        showToast('请输入链接');
        return false;
    }
    const valid = batch.urls;
    if (!valid.length) {
        // 清掉旧结果与地址栏参数，避免无效输入后仍残留上次的结果
        links.value = [];
        showToast('请输入有效的 GitHub 链接');
        return false;
    }
    notifySkipped(batch);
    links.value = valid;
    return true;
}

/** 清空输入与结果（重置 lastLinks 由 links=[] 天然覆盖） */
function clearAll() {
    rawText.value = '';
    links.value = [];
}

/** 删除结果中的某一组链接 */
function removeGroup(url) {
    links.value = links.value.filter(function (l) { return l !== url; });
}

/** 启动时读取 ?url= 参数：回填输入框并直接出结果 */
function applyUrlParams() {
    const params = readUrlParams();
    if (!params.length) return;
    const batch = parseBatchWithStats(params.join('\n'), MAX_BATCH, isGitHubUrl);
    rawText.value = batch.urls.join('\n');
    links.value = batch.urls;
    if (!batch.urls.length) {
        showToast('请输入有效的 GitHub 链接');
        return;
    }
    notifySkipped(batch);
}

export function useConverter() {
    return {
        links,
        rawText,
        hasLinks: () => links.value.length > 0,
        doConvert,
        clearAll,
        removeGroup,
        applyUrlParams
    };
}
