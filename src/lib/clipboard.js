/**
 * 剪贴板写入：优先异步 Clipboard API，失败回退 execCommand 兼容方案。
 * @param {string} text 要复制的文本
 * @param {HTMLElement|null} [btn] 可选按钮元素，复制成功时闪一下 .copied 样式
 * @returns {Promise<boolean>} 是否成功
 */

function flashCopied(btn) {
    if (!btn) return;
    btn.classList.remove('copied');
    void btn.offsetWidth;
    btn.classList.add('copied');
    setTimeout(function () { btn.classList.remove('copied'); }, 1200);
}

function fallbackCopy(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    // iOS Safari：非可编辑 textarea 需要 contentEditable + Range 选区才能选中
    if (/ipad|iphone|ipod/i.test(navigator.userAgent)) {
        ta.contentEditable = 'true';
        ta.readOnly = true;
        const range = document.createRange();
        range.selectNodeContents(ta);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ta.setSelectionRange(0, text.length);
    } else {
        ta.select();
    }
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(ta);
    if (ok) flashCopied(btn);
    return ok;
}

export function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(
            function () { flashCopied(btn); return true; },
            function () { return fallbackCopy(text, btn); }
        );
    }
    return Promise.resolve(fallbackCopy(text, btn));
}
