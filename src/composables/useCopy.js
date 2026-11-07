import { copyText } from '../lib/clipboard.js';
import { createToastStore } from './useToast.js';
import { defineFallback, useStore } from '../app/context.js';

/**
 * 复制 + Toast Store（v4 新增）。
 *
 * v3.1 在 ResultList.vue / ReleaseResolver.vue / NodeRow.vue 三处重复了同一段
 * `copyWithToast` 实现；v4 收敛为一个可注入 store，组件只取 `copyWithToast`。
 * `createCopyStore({ toast, copyFn })` 可在单测里注入假 toast / 假剪贴板，
 * 验证成功 / 失败提示语，无需真实浏览器 navigator.clipboard。
 */
export function createCopyStore({ toast = createToastStore(), copyFn = copyText } = {}) {
    const { showToast } = toast;

    function copyWithToast(text, btn) {
        // Promise.resolve 包一层：注入的实现既可返回 Promise<boolean>，也可直接返回 boolean。
        return Promise.resolve()
            .then(function () { return copyFn(text, btn); })
            .then(function (ok) {
                showToast(ok ? '已复制' : '复制失败，请手动复制');
                return ok;
            });
    }

    return { copyWithToast };
}

defineFallback('copy', (get) => createCopyStore({ toast: get('toast') }));

/** 应用级共享复制行为（容器实例；容器外为懒建兼容实例）。 */
export function useCopy() {
    return useStore('copy');
}
