/* Stargazer constellation field — a dependency-free canvas starfield that
   drifts slowly, parallaxes toward the cursor, and draws violet links
   between stars near the pointer (the brand's "calm monochrome until you
   reach" language, echoing the dashboard tile hover). A copy of the one in
   the dashboard's base.html (StargazerBio/infra), so the landing page opens
   on the same sky. Honors prefers-reduced-motion and pauses when the tab is
   hidden. */
(function () {
    const canvas = document.getElementById("sky");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const VIOLET = [167, 139, 250];   // brand primary — petals
    const GREEN = [156, 212, 127];    // ready/run — stamen
    const LINK_DIST = 130;            // px around cursor that grows constellations
    const PARALLAX = 26;              // max px the field shifts toward the cursor

    let w = 0, h = 0, dpr = 1;
    let stars = [];
    let raf = null;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    function rgba(c, a) {
        return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
    }

    function build() {
        // Density scales with viewport area, capped so dense displays and
        // shared-pod clients stay smooth.
        const count = Math.min(220, Math.round((w * h) / 9000));
        stars = [];
        for (let i = 0; i < count; i++) {
            const depth = 0.25 + Math.random() * 0.75; // 0..1, drives size+parallax
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: depth,
                r: 0.4 + depth * 1.5,
                base: 0.25 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                tw: 0.6 + Math.random() * 1.4,            // twinkle speed
                vx: (Math.random() - 0.5) * 0.06 * depth, // slow drift
                vy: (Math.random() - 0.5) * 0.06 * depth,
                green: Math.random() < 0.12,              // a sparse sage minority
            });
        }
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build();
    }

    function frame(t) {
        ctx.clearRect(0, 0, w, h);

        // Ease the field toward the cursor for a gentle parallax.
        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        const cx = pointer.active ? (pointer.x / w - 0.5) : 0;
        const cy = pointer.active ? (pointer.y / h - 0.5) : 0;

        const time = t * 0.001;
        const near = [];

        for (const s of stars) {
            // Drift + wrap so the sky never empties out.
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
            if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;

            const ox = cx * PARALLAX * s.z;
            const oy = cy * PARALLAX * s.z;
            const px = s.x - ox;
            const py = s.y - oy;

            const tw = REDUCED ? 1 : 0.55 + 0.45 * Math.sin(time * s.tw + s.phase);
            const alpha = s.base * tw;
            const col = s.green ? GREEN : VIOLET;

            ctx.beginPath();
            ctx.arc(px, py, s.r, 0, Math.PI * 2);
            ctx.fillStyle = rgba(col, alpha);
            ctx.fill();

            if (pointer.active) {
                const dx = px - pointer.x;
                const dy = py - pointer.y;
                if (dx * dx + dy * dy < LINK_DIST * LINK_DIST) {
                    near.push([px, py, Math.sqrt(dx * dx + dy * dy)]);
                }
            }
        }

        // Constellation links: stars within reach of the cursor connect in
        // violet, brightest at the pointer and fading with distance.
        for (let i = 0; i < near.length; i++) {
            const a = near[i];
            const la = (1 - a[2] / LINK_DIST) * 0.5;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(a[0], a[1]);
            ctx.strokeStyle = rgba(VIOLET, la);
            ctx.lineWidth = 0.6;
            ctx.stroke();
            for (let j = i + 1; j < near.length; j++) {
                const b = near[j];
                const ddx = a[0] - b[0], ddy = a[1] - b[1];
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 < (LINK_DIST * 0.7) * (LINK_DIST * 0.7)) {
                    ctx.beginPath();
                    ctx.moveTo(a[0], a[1]);
                    ctx.lineTo(b[0], b[1]);
                    ctx.strokeStyle = rgba(VIOLET, la * 0.4);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", function (e) {
        pointer.tx = e.clientX;
        pointer.ty = e.clientY;
        if (!pointer.active) { pointer.x = e.clientX; pointer.y = e.clientY; }
        pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { pointer.active = false; });
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else start();
    });

    resize();
    if (REDUCED) {
        // One static paint — no loop, no twinkle, no parallax.
        frame(0);
        stop();
    } else {
        start();
    }
})();
