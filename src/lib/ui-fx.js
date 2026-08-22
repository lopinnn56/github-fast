/**
 * 页面级 UI 效果：防抖 / 字体异步加载 / 滚动入场 / 导航与返回顶部。
 * 与 Vue 组件解耦：reveal 直接操作既有类名，滚动状态通过 ref 暴露给组件。
 */
import { ref } from 'vue';


export function debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

// Google Fonts 对大陆用户不可达：以非阻塞方式加载（不写入 HTML，避免 CSP 需要 unsafe-inline）。
// 加载失败 / 超时自动留在 print 媒体上（等效禁用），页面始终使用系统字体回退。
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Noto+Serif+SC:wght@500;600&family=Inter:wght@400;500;600;700&display=swap';

export function loadWebFontsAsync() {
    try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONTS_HREF;
        link.media = 'print';
        link.onload = function () { link.media = 'all'; };
        link.onerror = function () { link.remove(); };
        document.head.appendChild(link);
    } catch { /* ignore */ }
}

const REVEAL_SELECTOR = '.section-head, .feature-card, .tool-panel, .nodes-card, .faq-item';

/** 入场动画：给目标元素加 .reveal 并用 IntersectionObserver 触发 .in-view */
export function initReveal() {
    const els = document.querySelectorAll(REVEAL_SELECTOR);
    if (!('IntersectionObserver' in window) || !els.length) return;
    els.forEach(function (el) {
        const parent = el.parentElement;
        let i = 0;
        if (parent) {
            const kids = parent.children;
            for (let k = 0; k < kids.length; k++) {
                if (kids[k] === el) { i = k; break; }
            }
        }
        el.style.setProperty('--i', Math.min(i * 70, 420) + 'ms');
        el.classList.add('reveal');
    });
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (en.isIntersecting) {
                en.target.classList.add('in-view');
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });

    function forceShowAll() {
        els.forEach(function (el) {
            if (!el.classList.contains('in-view')) el.classList.add('in-view');
        });
    }
    // 兜底：观察器失效（如 bfcache 恢复）时不至于永久隐藏内容
    setTimeout(forceShowAll, 1500);
    window.addEventListener('pageshow', forceShowAll);
}

/** 导航阴影 + 返回顶部按钮可见性（rAF 节流的被动滚动监听） */
export function useScrollFx() {
    const scrolled = ref(false);
    const showBackTop = ref(false);
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = null;
    function onScroll() {
        if (raf) return;
        raf = requestAnimationFrame(function () {
            raf = null;
            const y = window.scrollY;
            scrolled.value = y > 10;
            showBackTop.value = y > 600;
        });
    }

    function backToTop() {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }

    return { scrolled, showBackTop, backToTop, bind: () => window.addEventListener('scroll', onScroll, { passive: true }) };
}
