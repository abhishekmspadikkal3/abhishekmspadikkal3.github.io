/*
 * Proton–proton collision event display (side view, beam axis horizontal).
 *
 * Cycle: two proton bunches enter along the beam pipe (beam 1 from the left,
 * beam 2 from the right) -> they cross at the interaction point -> a spray of
 * curved charged-particle tracks, a few muons and calorimeter deposits
 * appears -> next bunch crossing. Runs continuously; no interaction needed.
 */
(() => {
    const canvas = document.getElementById('collision-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ---------- sizing (crisp on retina screens) ----------
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

    // Pause the animation while it is scrolled out of view
    let visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
    }

    // ---------- palette ----------
    const BEAM1 = '150,200,255';   // beam 1 (blue), enters from the left
    const BEAM2 = '255,150,140';   // beam 2 (red),  enters from the right
    const TRACK_COLORS = ['#ffd447', '#ffc933', '#ffbb1f', '#ffe27a', '#ff9f2e'];
    const MUON_COLOR = '#8fd8ff';

    // ---------- helpers ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const gauss = () => {
        let u = 0, v = 0;
        while (!u) u = Math.random();
        while (!v) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    // ---------- state ----------
    let bunches = [], tracks = [], towers = [];
    let phase = 'inject', phaseT = 0, flash = 0;
    let vertex = { x: 0, y: 0 };

    function inject() {
        const off = W * 0.08;
        bunches = [
            { dir: 1,  x: -off,    alpha: 1, col: BEAM1, crossed: false },
            { dir: -1, x: W + off, alpha: 1, col: BEAM2, crossed: false }
        ];
        phase = 'inject';
        phaseT = 0;
    }

    function makeTrack(angle, muon) {
        // u ~ transverse momentum: low-pT tracks are slow and curl up tightly
        const u = muon ? rand(0.85, 1) : Math.pow(Math.random(), 0.8);
        const speed = W * (0.22 + 0.75 * u);                      // px / s
        const sign = Math.random() < 0.5 ? -1 : 1;                 // charge
        const curv = muon ? sign * rand(0.02, 0.15)
                          : sign * (0.15 + 4.5 * Math.pow(1 - u, 3)); // rad / s
        return {
            x: vertex.x, y: vertex.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            curv,
            path: [[vertex.x, vertex.y]],
            life: 0,
            maxLife: muon ? rand(2.4, 3.0) : rand(1.4, 2.4),
            active: true,
            color: muon ? MUON_COLOR : TRACK_COLORS[(Math.random() * TRACK_COLORS.length) | 0],
            w: muon ? 1.6 : rand(0.8, 1.4)
        };
    }

    function makeTower(a, E) {
        // Calorimeter deposit where the direction `a` leaves the detector volume
        const cx = W / 2, cy = H / 2;
        const hx = (W / 2) * 0.93, hy = (H / 2) * 0.86;
        const c = Math.cos(a), s = Math.sin(a);
        const t = Math.min(
            Math.abs(c) > 1e-6 ? hx / Math.abs(c) : Infinity,
            Math.abs(s) > 1e-6 ? hy / Math.abs(s) : Infinity
        );
        return {
            x: cx + c * t, y: cy + s * t, a,
            len: 6 + E * Math.min(W, H) * 0.22,
            wid: rand(4, 7),
            life: 0,
            delay: t / (W * 0.6),
            maxLife: 2.4
        };
    }

    function collide() {
        vertex = { x: W / 2 + rand(-0.01, 0.01) * W, y: H / 2 + rand(-0.03, 0.03) * H };
        flash = 1;

        // 1–3 jets, back-to-back dijets most common
        const r = Math.random();
        const nJets = r < 0.6 ? 2 : (r < 0.8 ? 3 : 1);
        const jets = [];
        const a0 = rand(0, Math.PI * 2);
        for (let j = 0; j < nJets; j++) {
            const a = (nJets === 2 && j === 1)
                ? jets[0].a + Math.PI + rand(-0.35, 0.35)
                : a0 + j * (2 * Math.PI / nJets) + rand(-0.4, 0.4);
            jets.push({ a, E: rand(0.6, 1) });
        }

        const n = Math.round(rand(45, 85));
        for (let i = 0; i < n; i++) {
            const angle = Math.random() < 0.55
                ? jets[(Math.random() * jets.length) | 0].a + gauss() * 0.22
                : rand(0, Math.PI * 2);
            tracks.push(makeTrack(angle, false));
        }

        const nMu = Math.random() < 0.35 ? (Math.random() < 0.5 ? 1 : 2) : 0;
        for (let i = 0; i < nMu; i++) tracks.push(makeTrack(rand(0, Math.PI * 2), true));

        for (const j of jets) {
            const k = Math.round(rand(2, 4));
            for (let i = 0; i < k; i++) towers.push(makeTower(j.a + gauss() * 0.12, j.E * rand(0.5, 1)));
        }
        for (let i = 0; i < 6; i++) towers.push(makeTower(rand(0, Math.PI * 2), rand(0.15, 0.4)));

        phase = 'decay';
        phaseT = 0;
    }

    // ---------- simulation step ----------
    function step(dt) {
        phaseT += dt;

        const v = W * 0.75; // bunch speed, px / s
        for (const b of bunches) {
            b.x += b.dir * v * dt;
            if (b.crossed) b.alpha = Math.max(0, b.alpha - dt * 2.2);
        }
        if (phase === 'inject' && bunches.length === 2 && bunches[0].x >= W / 2) {
            bunches.forEach(b => { b.crossed = true; });
            collide();
        }
        bunches = bunches.filter(b => b.alpha > 0);
        if (phase === 'decay' && phaseT > 1.9) inject();

        flash = Math.max(0, flash - dt * 4);

        for (const t of tracks) {
            t.life += dt;
            if (!t.active) continue;
            const ang = t.curv * dt, c = Math.cos(ang), s = Math.sin(ang);
            const vx = t.vx * c - t.vy * s;
            t.vy = t.vx * s + t.vy * c;
            t.vx = vx;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.path.push([t.x, t.y]);
            if (t.path.length > 300) t.path.shift();
            if (t.x < -20 || t.x > W + 20 || t.y < -20 || t.y > H + 20) t.active = false;
        }
        tracks = tracks.filter(t => t.life < t.maxLife);

        for (const tw of towers) tw.life += dt;
        towers = towers.filter(tw => tw.life < tw.maxLife);
    }

    // ---------- drawing ----------
    function drawBackground() {
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
        g.addColorStop(0, '#868b92');
        g.addColorStop(1, '#5d6269');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // faint tracker layers (golden-ratio ellipses)
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.ellipse(W / 2, H / 2, H * 0.11 * i * 1.618, H * 0.11 * i, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // beam pipe
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath();
        ctx.moveTo(0, H / 2 - 4); ctx.lineTo(W, H / 2 - 4);
        ctx.moveTo(0, H / 2 + 4); ctx.lineTo(W, H / 2 + 4);
        ctx.stroke();
    }

    function drawBunch(b) {
        const cy = H / 2;
        const len = Math.max(18, W * 0.045);
        const x0 = b.dir === 1 ? 0 : W;

        // beam trail from the edge of the detector to the bunch
        if (Math.abs(b.x - x0) > 1) {
            const g = ctx.createLinearGradient(x0, 0, b.x, 0);
            g.addColorStop(0, `rgba(${b.col},0)`);
            g.addColorStop(1, `rgba(${b.col},${0.6 * b.alpha})`);
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x0, cy);
            ctx.lineTo(b.x, cy);
            ctx.stroke();
        }

        // the bunch itself: an elongated glow
        const rg = ctx.createRadialGradient(b.x, cy, 0, b.x, cy, len * 0.6);
        rg.addColorStop(0, `rgba(255,255,255,${0.95 * b.alpha})`);
        rg.addColorStop(0.3, `rgba(${b.col},${0.75 * b.alpha})`);
        rg.addColorStop(1, `rgba(${b.col},0)`);
        ctx.save();
        ctx.translate(b.x, cy);
        ctx.scale(1, 0.22);
        ctx.translate(-b.x, -cy);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(b.x, cy, len * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        drawBackground();

        // calorimeter towers (behind tracks)
        for (const tw of towers) {
            const age = tw.life - tw.delay;
            if (age <= 0) continue;
            let a = Math.min(1, age / 0.15);
            if (tw.life > tw.maxLife * 0.6) a *= 1 - (tw.life - 0.6 * tw.maxLife) / (0.4 * tw.maxLife);
            ctx.save();
            ctx.translate(tw.x, tw.y);
            ctx.rotate(tw.a);
            ctx.globalAlpha = Math.max(0, a) * 0.9;
            ctx.fillStyle = '#c83c2b';
            ctx.fillRect(-tw.len, -tw.wid / 2, tw.len, tw.wid);
            ctx.strokeStyle = '#ff8a66';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(-tw.len, -tw.wid / 2, tw.len, tw.wid);
            ctx.restore();
        }

        // tracks
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const t of tracks) {
            if (t.path.length < 2) continue;
            let a = 1;
            if (t.life > t.maxLife * 0.6) a = 1 - (t.life - 0.6 * t.maxLife) / (0.4 * t.maxLife);
            ctx.globalAlpha = Math.max(0, a) * 0.92;
            ctx.strokeStyle = t.color;
            ctx.lineWidth = t.w;
            ctx.beginPath();
            ctx.moveTo(t.path[0][0], t.path[0][1]);
            for (let i = 1; i < t.path.length; i++) ctx.lineTo(t.path[i][0], t.path[i][1]);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // incoming / outgoing proton bunches
        bunches.forEach(drawBunch);

        // flash at the interaction point
        if (flash > 0) {
            const r = Math.min(W, H) * 0.5 * (1.2 - flash * 0.4);
            const g = ctx.createRadialGradient(vertex.x, vertex.y, 0, vertex.x, vertex.y, r);
            g.addColorStop(0, `rgba(255,250,220,${0.9 * flash})`);
            g.addColorStop(1, 'rgba(255,250,220,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        // small caption
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('p p \u2192 X    \u221As = 13.6 TeV', 10, H - 8);
    }

    // ---------- main loop ----------
    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (visible && W > 0 && H > 0) {
            step(dt);
            draw();
        }
        requestAnimationFrame(frame);
    }

    inject();
    requestAnimationFrame(frame);
})();
