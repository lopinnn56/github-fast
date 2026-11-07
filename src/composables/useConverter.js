import { ref, watch } from 'vue';
import { parseBatchWithStats, isGitHubUrl, MAX_BATCH } from '../lib/convert.js';
import { createUrlState } from '../lib/url-state.js';
import { createToastStore } from './useToast.js';
import { defineFallback, useStore } from '../app/context.js';

/**
 * 转换 Store（v4）：纯工厂 + 容器注入。
 *
 * v3.1 把 links/rawText/convertEpoch 与 watch 副作用放在模块顶层，测试/多实例互相污染；
 * 现在所有状态与副作用都在 createConverterStore 内部。地址栏读写由 urlState 注入，
 * 浏览器环境由 createAppContext() 用 platform 片段构造一次，Node 测试环境静默跳过。
 */
export function createConverterStore({ toast = createToastStore(), urlState = createUrlState() } = {}) {
    const links = ref([]);
    const rawText = ref('');
    // 转换纪元：仅在「产生新结果」（doConvert / applyUrlParams）时自增。
    // 结果区据此重置分页——删除分组（removeGroup）不应把用户展开的分页收回去。
    const convertEpoch = ref(0);
    const { showToast } = toast;
    const { syncUrlParam, readUrlParams } = urlState;

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
    const stopWatch = watch(links, function (l) { syncUrlParam(l); });

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
        convertEpoch.value++;
        return true;
    }

    /** 清空输入与结果（重置 lastLinks 由 links=[] 天然覆盖） */
    function clearAll() {
        rawText.value = '';
        links.value = [];
    }

    /** 删除结果中的某一组链接：同时从 rawText 移除该行，避免实时转换把已删链接重新加回来。 */
    function removeGroup(url) {
        links.value = links.value.filter(function (l) { return l !== url; });
        // 同步输入框：多行时要按行过滤，单行直接清空
        const lines = rawText.value.split(/\r?\n/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s && s !== url; });
        rawText.value = lines.join('\n');
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
        convertEpoch.value++;
    }

    return {
        links,
        rawText,
        convertEpoch,
        hasLinks: () => links.value.length > 0,
        doConvert,
        clearAll,
        removeGroup,
        applyUrlParams,
        dispose: stopWatch
    };
}

// 容器外：与同作用域的 toast 共享一个实例（get 解析，避免各自建单例）。
defineFallback('converter', (get) => createConverterStore({ toast: get('toast') }));

/** 应用级共享转换状态（输入面板 ↔ 结果列表）。 */
export function useConverter() {
    return useStore('converter');
}
