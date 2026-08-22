let toastTimer;
let scrollRaf = null;

export function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
}

export function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
            function () { toast('已复制'); flashCopied(btn); },
            function () { fallbackCopy(text, btn); }
        );
    } else {
        fallbackCopy(text, btn);
    }
}

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
        ta.contentEditable = true;
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
    } catch (e) {
        ok = false;
    }
    document.body.removeChild(ta);
    if (ok) {
        toast('已复制');
        flashCopied(btn);
    } else {
        toast('复制失败，请手动复制');
    }
}

export function debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(function () { fn(...args); }, ms);
    };
}

export function initUx() {
    initReveal();
    initScrollFx();
    loadWebFontsAsync();
    initSeg();
    window.addEventListener('resize', debounce(moveSeg, 120));
    // 字体异步加载完成后文本宽度会变化，重算分段控件指示条位置
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        document.fonts.ready.then(moveSeg).catch(function () { /* ignore */ });
    }
    window.addEventListener('load', moveSeg);
}

// Google Fonts 对大陆用户不可达：以非阻塞方式加载（不写入 HTML，避免 CSP 需要 unsafe-inline）。
// 加载失败 / 超时自动留在 print 媒体上（等效禁用），页面始终使用系统字体回退。
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Noto+Serif+SC:wght@500;600&family=Inter:wght@400;500;600;700&display=swap';

function loadWebFontsAsync() {
    try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONTS_HREF;
        link.media = 'print';
        link.onload = function () { link.media = 'all'; };
        link.onerror = function () { link.remove(); };
        document.head.appendChild(link);
    } catch (e) { /* ignore */ }
}

const REVEAL_SELECTOR = '.section-head, .feature-card, .tool-panel, .nodes-card, .faq-item';

function initReveal() {
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
    setTimeout(forceShowAll, 1500);
    window.addEventListener('pageshow', forceShowAll);
}

function initScrollFx() {
    const nav = document.querySelector('.nav');
    const bt = document.getElementById('backTop');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (bt) {
        bt.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
        });
    }
    function onScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(function () {
            scrollRaf = null;
            const y = window.scrollY;
            if (nav) nav.classList.toggle('scrolled', y > 10);
            if (bt) bt.hidden = y <= 600;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function moveSeg() {
    const seg = document.querySelector('.seg');
    const ind = document.querySelector('.seg-ind');
    const active = seg && seg.querySelector('.seg-btn.active');
    if (!seg || !ind || !active) return;
    ind.style.left = active.offsetLeft + 'px';
    ind.style.width = active.offsetWidth + 'px';
}

function initSeg() {
    moveSeg();
    const seg = document.querySelector('.seg');
    if (seg) {
        seg.addEventListener('click', function (e) {
            if (e.target.classList && e.target.classList.contains('seg-btn')) moveSeg();
        });
    }
}