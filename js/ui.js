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
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        toast('已复制');
        flashCopied(btn);
    } catch (e) {
        toast('复制失败');
    }
    document.body.removeChild(ta);
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
    initSeg();
    window.addEventListener('resize', debounce(moveSeg, 120));
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