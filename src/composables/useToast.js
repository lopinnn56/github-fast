import { reactive } from 'vue';
import { LIMITS } from '../config/constants.js';
import { defineFallback, useStore } from '../app/context.js';

/**
 * Toast Store（v4）：纯工厂 + 容器注入。
 *
 * v3.1 在本模块内部维护 `let singleton`；v4 由 createAppContext() 统一构造，
 * 组件通过 useToast() 从 provide/inject 容器取同一实例，容器外才惰性建兼容实例。
 * `createToastStore(setTimer, clearTimer)` 仍可注入定时器便于单测。
 */
export function createToastStore(setTimer = setTimeout, clearTimer = clearTimeout) {
    const toast = reactive({ msg: '', visible: false });
    let timer = null;

    function showToast(msg, ms = LIMITS.toastMs) {
        toast.msg = msg;
        toast.visible = true;
        if (timer) clearTimer(timer);
        timer = setTimer(function () { toast.visible = false; }, ms);
    }

    return { toast, showToast };
}

defineFallback('toast', () => createToastStore());

/** 全局轻提示（容器实例；容器外为懒建兼容实例）。 */
export function useToast() {
    return useStore('toast');
}
