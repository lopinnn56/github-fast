import { reactive } from 'vue';

// 模块级单例：全局只有一个 toast
const toast = reactive({ msg: '', visible: false });
let timer = null;

/**
 * 全局轻提示。
 * @param {string} msg
 * @param {number} [ms] 展示时长
 */
export function useToast() {
    function showToast(msg, ms = 1800) {
        toast.msg = msg;
        toast.visible = true;
        clearTimeout(timer);
        timer = setTimeout(function () { toast.visible = false; }, ms);
    }
    return { toast, showToast };
}
