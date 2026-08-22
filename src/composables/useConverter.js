import { ref, watch } from 'vue';
import { parseBatch, isGitHubUrl, MAX_BATCH } from '../lib/convert.js';
import { syncUrlParam, readUrlParams } from '../lib/url-state.js';
import { useToast } from './useToast.js';

// 模块级单例：转换结果跨组件共享（输入面板 ↔ 结果列表）
const links = ref([]);
const rawText = ref('');
const { showToast } = useToast();

// 结果变更（转换 / 删除分组 / 清空）时同步地址栏 ?url= 参数
watch(links, function (l) { syncUrlParam(l); });

/**
 * 执行批量转换：规范化 → 过滤 GitHub 链接 → 截断上限 → 更新结果与地址栏。
 * 全部提示语与旧版一致。
 */
function doConvert() {
    const all = parseBatch(rawText.value);
    if (!all.length) {
        showToast('请输入链接');
        return false;
    }
    let valid = all.filter(isGitHubUrl);
    if (!valid.length) {
        // 清掉旧结果与地址栏参数，避免无效输入后仍残留上次的结果
        links.value = [];
        showToast('请输入有效的 GitHub 链接');
        return false;
    }
    if (valid.length > MAX_BATCH) {
        showToast('一次最多转换 ' + MAX_BATCH + ' 个链接，已忽略后 ' + (valid.length - MAX_BATCH) + ' 个');
        valid = valid.slice(0, MAX_BATCH);
    } else if (valid.length < all.length) {
        showToast('已跳过 ' + (all.length - valid.length) + ' 个无效链接');
    }
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
    const urls = readUrlParams();
    if (!urls.length) return;
    rawText.value = urls.join('\n');
    links.value = urls.filter(isGitHubUrl).slice(0, MAX_BATCH);
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
