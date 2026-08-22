// Hero 区的终端打字动画，纯装饰，独立于主逻辑
export function initTerminal() {
    const body = document.getElementById('termBody');
    if (!body) return;
    const lines = [
        { cls: 't-cmd', text: 'git clone https://github.com/lopinnn/github-fast', type: true },
        { cls: 't-dim', text: "Cloning into 'github-fast'..." },
        { cls: 't-dim', text: '正在通过 ghproxy.net 镜像加速...' },
        { cls: 't-out', text: 'remote: Counting objects: 128, done.' },
        { cls: 't-out', text: 'Receiving objects: 100% (128/128), 1.2 MiB | 24.6 MiB/s, done.' },
        { cls: 't-out', text: 'Resolving deltas: 100% (64/64), done.' },
        { cls: 't-ok', text: 'done.' }
    ];
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idx = 0;

    function typeLine(line, done) {
        const p = document.createElement('p');
        p.className = line.cls;
        body.appendChild(p);
        if (reduced || !line.type) {
            p.textContent = line.text;
            done();
            return;
        }
        let i = 0;
        const t = setInterval(function () {
            i++;
            p.textContent = line.text.slice(0, i);
            if (i >= line.text.length) {
                clearInterval(t);
                done();
            }
        }, 34);
    }

    function next() {
        if (idx >= lines.length) {
            const cur = document.createElement('span');
            cur.className = 't-cursor';
            body.appendChild(cur);
            return;
        }
        const line = lines[idx++];
        typeLine(line, function () {
            setTimeout(next, line.type ? 380 : 240);
        });
    }
    next();
}
