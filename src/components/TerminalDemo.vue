<script setup>
// Hero 区终端打字动画，纯装饰。与旧版差异：所有定时器登记可取消，
// 组件卸载即清理；prefers-reduced-motion 时直接输出完整文本。
import { onMounted, onBeforeUnmount, ref } from 'vue';

const bodyEl = ref(null);

const LINES = [
    { cls: 't-cmd', text: 'git clone https://github.com/lopinnn/github-fast', type: true },
    { cls: 't-dim', text: "Cloning into 'github-fast'..." },
    { cls: 't-dim', text: '正在通过 ghproxy.net 镜像加速...' },
    { cls: 't-out', text: 'remote: Counting objects: 128, done.' },
    { cls: 't-out', text: 'Receiving objects: 100% (128/128), 1.2 MiB | 24.6 MiB/s, done.' },
    { cls: 't-out', text: 'Resolving deltas: 100% (64/64), done.' },
    { cls: 't-ok', text: 'done.' }
];

let timers = [];
let disposed = false;

function later(fn, ms) {
    const id = setTimeout(function () {
        timers = timers.filter(function (t) { return t !== id; });
        if (!disposed) fn();
    }, ms);
    timers.push(id);
}

function typeLine(line, done) {
    const p = document.createElement('p');
    p.className = line.cls;
    bodyEl.value.appendChild(p);
    if (!line.type) {
        p.textContent = line.text;
        done();
        return;
    }
    let i = 0;
    const id = setInterval(function () {
        i++;
        p.textContent = line.text.slice(0, i);
        if (i >= line.text.length) {
            clearInterval(id);
            timers = timers.filter(function (t) { return t !== id; });
            done();
        }
    }, 34);
    timers.push(id);
}

function start() {
    let idx = 0;
    function next() {
        if (disposed || !bodyEl.value) return;
        if (idx >= LINES.length) {
            const cur = document.createElement('span');
            cur.className = 't-cursor';
            bodyEl.value.appendChild(cur);
            return;
        }
        const line = LINES[idx++];
        typeLine(line, function () {
            later(next, line.type ? 380 : 240);
        });
    }
    next();
}

onMounted(function () {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        // 直接静态呈现全部行
        LINES.forEach(function (line) {
            const p = document.createElement('p');
            p.className = line.cls;
            p.textContent = line.text;
            bodyEl.value.appendChild(p);
        });
        const cur = document.createElement('span');
        cur.className = 't-cursor';
        bodyEl.value.appendChild(cur);
        return;
    }
    start();
});

onBeforeUnmount(function () {
    disposed = true;
    timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    timers = [];
});
</script>

<template>
    <div class="terminal" role="img" aria-label="终端演示：通过加速镜像克隆 GitHub 仓库">
        <div class="terminal-bar">
            <span class="tdot tdot-red" aria-hidden="true"></span>
            <span class="tdot tdot-yellow" aria-hidden="true"></span>
            <span class="tdot tdot-green" aria-hidden="true"></span>
            <span class="terminal-title">github-fast — zsh — 80×24</span>
        </div>
        <div ref="bodyEl" class="terminal-body" aria-hidden="true"></div>
    </div>
</template>
