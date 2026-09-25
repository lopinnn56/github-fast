import { reactive } from 'vue';

/**
 * Toast Store（重构 v3.1）：工厂 + 应用级单例。
 * `createToastStore` 可注入定时器便于测试；生产用 `useToast()` 共享同一实例。
 */
export function createToastStore(setTimer = setTimeout, clearTimer = clearTimeout) {
    const toast = reactive({ msg: '', visible: false });
    let timer = null;

    function showToast(msg, ms = 1800) {
        toast.msg = msg;
        toast.visible = true;
        if (timer) clearTimer(timer);
        timer = setTimer(function () { toast.visible = false; }, ms);
    }

    return { toast, showToast };
}

let singleton = null;

/** 全局轻提示（应用级单例）。 */
export function useToast() {
    if (!singleton) singleton = createToastStore();
    return singleton;
}