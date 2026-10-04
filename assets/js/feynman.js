/*
 * Auto-cycling Feynman diagrams (drawn in the style of FeynGame).
 *
 * Each diagram is drawn line by line, labels fade in, it holds for a moment,
 * fades out, and a different random diagram follows. No clicking needed.
 *
 * Line types:  'f' fermion (arrow = fermion flow from -> to)
 *              'p' photon / W / Z (wavy)
 *              'g' gluon (curly)
 *              's' scalar / Higgs (dashed)
 * Coordinates are in a unit box [0,1] x [0,1].
 * Optional label position: 'a' start, 'b' end, 'm' midpoint, 'm-' midpoint (other side).
 * In labels, "_x" renders x as a subscript.
 */
(() => {
    const canvas = document.getElementById('feynman-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0;
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    resize();

    let visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
    }

    const INK = '#2b2b2b';
    const ACCENT = '#b8860b';      // Higgs lines in gold
    const BAR = '\u0304';          // combining macron (antiparticle bar)

    const DIAGRAMS = [
        { name: 'Drell\u2013Yan', proc: `q q${BAR} \u2192 \u03b3*/Z \u2192 \u2113\u207a\u2113\u207b`, lines: [
            ['f', [.10, .15], [.38, .5], 'q'],
            ['f', [.38, .5], [.10, .85], `q${BAR}`],
            ['p', [.38, .5], [.62, .5], '\u03b3*/Z'],
            ['f', [.62, .5], [.90, .15], '\u2113\u207b'],
            ['f', [.90, .85], [.62, .5], '\u2113\u207a']
        ]},
        { name: 'Gluon fusion', proc: 'g g \u2192 H', lines: [
            ['g', [.08, .15], [.36, .3], 'g'],
            ['g', [.08, .85], [.36, .7], 'g'],
            ['f', [.36, .3], [.60, .5]],
            ['f', [.60, .5], [.36, .7]],
            ['f', [.36, .7], [.36, .3], 't', 'm-'],
            ['s', [.60, .5], [.92, .5], 'H']
        ]},
        { name: 'Top-pair production', proc: `q q${BAR} \u2192 t t${BAR}`, lines: [
            ['f', [.10, .15], [.38, .5], 'q'],
            ['f', [.38, .5], [.10, .85], `q${BAR}`],
            ['g', [.38, .5], [.62, .5], 'g'],
            ['f', [.62, .5], [.90, .15], 't'],
            ['f', [.90, .85], [.62, .5], `t${BAR}`]
        ]},
        { name: 'M\u00f8ller scattering', proc: 'e\u207b e\u207b \u2192 e\u207b e\u207b', lines: [
            ['f', [.10, .15], [.50, .28], 'e\u207b'],
            ['f', [.50, .28], [.90, .15], 'e\u207b'],
            ['f', [.10, .85], [.50, .72], 'e\u207b'],
            ['f', [.50, .72], [.90, .85], 'e\u207b'],
            ['p', [.50, .28], [.50, .72], '\u03b3']
        ]},
        { name: 'Compton scattering', proc: 'e\u207b \u03b3 \u2192 e\u207b \u03b3', lines: [
            ['f', [.10, .85], [.35, .55], 'e\u207b'],
            ['p', [.10, .15], [.35, .55], '\u03b3'],
            ['f', [.35, .55], [.65, .55], 'e\u207b', 'm'],
            ['f', [.65, .55], [.90, .85], 'e\u207b'],
            ['p', [.65, .55], [.90, .15], '\u03b3']
        ]},
        { name: 'Higgs to diphoton', proc: 'H \u2192 \u03b3 \u03b3', lines: [
            ['s', [.08, .5], [.38, .5], 'H'],
            ['p', [.38, .5], [.64, .25], 'W', 'm'],
            ['p', [.64, .25], [.64, .75]],
            ['p', [.64, .75], [.38, .5]],
            ['p', [.64, .25], [.92, .12], '\u03b3'],
            ['p', [.64, .75], [.92, .88], '\u03b3']
        ]},
        { name: 'Vector-boson fusion', proc: 'q q \u2192 q q H', lines: [
            ['f', [.08, .12], [.40, .25], 'q'],
            ['f', [.40, .25], [.92, .12], 'q'],
            ['f', [.08, .88], [.40, .75], 'q'],
            ['f', [.40, .75], [.92, .88], 'q'],
            ['p', [.40, .25], [.58, .5], 'W/Z', 'm'],
            ['p', [.40, .75], [.58, .5]],
            ['s', [.58, .5], [.92, .5], 'H']
        ]},
        { name: 'Muon decay', proc: `\u03bc\u207b \u2192 \u03bd_\u03bc e\u207b \u03bd${BAR}_e`, lines: [
            ['f', [.08, .5], [.40, .5], '\u03bc\u207b'],
            ['f', [.40, .5], [.92, .2], '\u03bd_\u03bc'],
            ['p', [.40, .5], [.64, .72], 'W\u207b', 'm-'],
            ['f', [.64, .72], [.92, .55], 'e\u207b'],
            ['f', [.92, .92], [.64, .72], `\u03bd${BAR}_e`]
        ]},
        { name: 'Gluon scattering', proc: 'g g \u2192 g g', lines: [
            ['g', [.10, .15], [.38, .5], 'g'],
            ['g', [.10, .85], [.38, .5], 'g'],
            ['g', [.38, .5], [.62, .5]],
            ['g', [.62, .5], [.90, .15], 'g'],
            ['g', [.62, .5], [.90, .85], 'g']
        ]},
        { name: 'Higgs-strahlung', proc: `q q${BAR} \u2192 Z H`, lines: [
            ['f', [.10, .15], [.38, .5], 'q'],
            ['f', [.38, .5], [.10, .85], `q${BAR}`],
            ['p', [.38, .5], [.60, .5], 'Z*'],
            ['p', [.60, .5], [.90, .15], 'Z'],
            ['s', [.60, .5], [.90, .85], 'H']
        ]},
        { name: 'B-meson mixing', proc: `B${BAR}\u2070 \u2192 B\u2070`, lines: [
            ['f', [.08, .25], [.32, .25], 'b'],
            ['f', [.32, .25], [.68, .25], 't', 'm'],
            ['f', [.68, .25], [.92, .25], 'd'],
            ['f', [.92, .75], [.68, .75], `b${BAR}`],
            ['f', [.68, .75], [.32, .75], `t${BAR}`, 'm-'],
            ['f', [.32, .75], [.08, .75], `d${BAR}`],
            ['p', [.32, .25], [.32, .75], 'W', 'm-'],
            ['p', [.68, .25], [.68, .75], 'W', 'm']
        ]}
    ];

    // ---------- geometry ----------
    const PAD_X = 26, PAD_TOP = 24, PAD_BOTTOM = 26;
    const map = ([u, v]) => [PAD_X + u * (W - 2 * PAD_X), PAD_TOP + v * (H - PAD_TOP - PAD_BOTTOM)];

    function samplePath(type, a, b) {
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const pts = [];
        const push = (s, o) => pts.push([a[0] + ux * s + nx * o, a[1] + uy * s + ny * o]);

        if (type === 'p') {                       // wavy boson
            const n = Math.max(2, Math.round(L / 9)), A = 2.6, N = n * 14;
            for (let i = 0; i <= N; i++) {
                const s = (L * i) / N;
                push(s, A * Math.sin((2 * Math.PI * n * s) / L));
            }
        } else if (type === 'g') {                // curly gluon (prolate cycloid)
            const n = Math.max(3, Math.round(L / 8));
            const r = L / (2 * Math.PI * n);
            const d = Math.min(3.8, r * 2.6);
            const N = n * 24;
            for (let i = 0; i <= N; i++) {
                const phi = (2 * Math.PI * n * i) / N;
                const ramp = Math.min(1, phi / (2 * Math.PI), (2 * Math.PI * n - phi) / (2 * Math.PI));
                push(r * phi - d * Math.sin(phi), d * (1 - Math.cos(phi)) - d * ramp);
            }
        } else {                                  // straight (fermion / scalar)
            const N = 30;
            for (let i = 0; i <= N; i++) push((L * i) / N, 0);
        }
        return pts;
    }

    function labelPos(line, A, B) {
        const [type, a, b, , where] = line;
        let pos = where;
        if (!pos) {
            const ext = p => p[0] <= 0.15 || p[0] >= 0.85;
            pos = ext(a) ? 'a' : ext(b) ? 'b' : 'm';
        }
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        if (pos === 'a') return [A[0] - (dx / L) * 11, A[1] - (dy / L) * 11];
        if (pos === 'b') return [B[0] + (dx / L) * 11, B[1] + (dy / L) * 11];
        let nx = -dy / L, ny = dx / L;
        if (ny > 0 || (Math.abs(ny) < 1e-6 && nx < 0)) { nx = -nx; ny = -ny; }
        if (pos === 'm-') { nx = -nx; ny = -ny; }
        const off = type === 'g' ? 14 : 12;
        return [(A[0] + B[0]) / 2 + nx * off, (A[1] + B[1]) / 2 + ny * off];
    }

    // Text with simple subscript support ("_x")
    function drawRich(text, x, y, size, style, color) {
        const segs = [];
        let cur = '';
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '_' && i + 1 < text.length) {
                if (cur) segs.push({ t: cur, sub: false });
                cur = '';
                segs.push({ t: text[i + 1], sub: true });
                i++;
            } else cur += text[i];
        }
        if (cur) segs.push({ t: cur, sub: false });

        const fN = `${style} ${size}px Lora, Georgia, serif`;
        const fS = `${style} ${Math.round(size * 0.7)}px Lora, Georgia, serif`;
        let total = 0;
        for (const s of segs) { ctx.font = s.sub ? fS : fN; s.w = ctx.measureText(s.t).width; total += s.w; }

        let cx = x - total / 2;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const s of segs) {
            ctx.font = s.sub ? fS : fN;
            ctx.fillText(s.t, cx, s.sub ? y + size * 0.3 : y);
            cx += s.w;
        }
    }

    // ---------- timeline ----------
    const LINE_START = 0.15, LINE_GAP = 0.22, LINE_DUR = 0.45, HOLD = 2.6, FADE = 0.5;
    let idx = Math.floor(Math.random() * DIAGRAMS.length);
    let t = 0;

    const clamp01 = x => Math.max(0, Math.min(1, x));
    const totalTime = d => LINE_START + (d.lines.length - 1) * LINE_GAP + LINE_DUR + HOLD;

    function nextDiagram() {
        let n;
        do { n = Math.floor(Math.random() * DIAGRAMS.length); } while (n === idx && DIAGRAMS.length > 1);
        idx = n;
        t = 0;
    }

    function draw() {
        const d = DIAGRAMS[idx];
        const T = totalTime(d);
        const fade = t > T - FADE ? clamp01((T - t) / FADE) : 1;
        const linesDone = LINE_START + (d.lines.length - 1) * LINE_GAP + LINE_DUR;

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fbfbfb';
        ctx.fillRect(0, 0, W, H);

        // title & process
        const titleA = clamp01(t / 0.4) * fade;
        ctx.globalAlpha = titleA;
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.name.toUpperCase(), 10, 13);
        drawRich(d.proc, W / 2, H - 12, 11.5, 'italic', '#777');

        // lines
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const counts = new Map();
        d.lines.forEach((ln, i) => {
            const A = map(ln[1]), B = map(ln[2]);
            [A, B].forEach(P => {
                const k = P[0].toFixed(1) + ',' + P[1].toFixed(1);
                counts.set(k, (counts.get(k) || { n: 0, P }));
                counts.get(k).n++;
            });

            const p = clamp01((t - (LINE_START + i * LINE_GAP)) / LINE_DUR);
            if (p <= 0) return;

            const type = ln[0];
            const pts = samplePath(type, A, B);
            const cnt = Math.max(2, Math.ceil(p * pts.length));

            ctx.globalAlpha = fade;
            ctx.strokeStyle = type === 's' ? ACCENT : INK;
            ctx.lineWidth = 1.4;
            ctx.setLineDash(type === 's' ? [5, 4] : []);
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let k = 1; k < cnt; k++) ctx.lineTo(pts[k][0], pts[k][1]);
            ctx.stroke();
            ctx.setLineDash([]);

            // fermion-flow arrow at the midpoint
            if (type === 'f' && p >= 0.6) {
                const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
                const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
                const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
                ctx.fillStyle = INK;
                ctx.beginPath();
                ctx.moveTo(mx + ux * 4.5, my + uy * 4.5);
                ctx.lineTo(mx - ux * 4.5 + nx * 3.5, my - uy * 4.5 + ny * 3.5);
                ctx.lineTo(mx - ux * 4.5 - nx * 3.5, my - uy * 4.5 - ny * 3.5);
                ctx.closePath();
                ctx.fill();
            }

            // label
            if (ln[3]) {
                const la = clamp01((t - (LINE_START + i * LINE_GAP + LINE_DUR)) / 0.3) * fade;
                if (la > 0) {
                    ctx.globalAlpha = la;
                    const [lx, ly] = labelPos(ln, A, B);
                    drawRich(ln[3], lx, ly, 12.5, 'italic', '#333');
                }
            }
        });

        // vertex dots
        const va = clamp01((t - linesDone) / 0.3) * fade;
        if (va > 0) {
            ctx.globalAlpha = va;
            ctx.fillStyle = INK;
            for (const { n, P } of counts.values()) {
                if (n < 2) continue;
                ctx.beginPath();
                ctx.arc(P[0], P[1], 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        if (t >= T) nextDiagram();
    }

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (visible && W > 0 && H > 0) {
            t += dt;
            draw();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
