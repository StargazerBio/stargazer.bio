/* The landing page's sky: a still field of stars that draws faint violet
   constellation lines between the stars near the pointer. It repaints only
   when the pointer moves or the window resizes, so an idle page costs
   nothing, and touch screens just see the stars. */
(function () {
    const canvas = document.getElementById("sky");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const STAR = [238, 240, 245];
    const VIOLET = [185, 160, 236];
    const LINK_DIST = 130; // px around the pointer that joins stars into constellations

    let w = 0, h = 0;
    let stars = [];
    let pending = false;
    const pointer = { x: 0, y: 0, active: false };

    function rgba(c, a) {
        return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
    }

    function build() {
        // Density scales with viewport area, capped so large displays stay light.
        const count = Math.min(220, Math.round((w * h) / 9000));
        stars = [];
        for (let i = 0; i < count; i++) {
            const depth = 0.25 + Math.random() * 0.75;
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 0.4 + depth * 1.3,
                a: 0.2 + Math.random() * 0.45,
                violet: Math.random() < 0.1,
            });
        }
    }

    function paint() {
        pending = false;
        ctx.clearRect(0, 0, w, h);
        const near = [];
        for (const s of stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = rgba(s.violet ? VIOLET : STAR, s.a);
            ctx.fill();
            if (pointer.active) {
                const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
                if (d < LINK_DIST) near.push([s.x, s.y, d]);
            }
        }
        for (let i = 0; i < near.length; i++) {
            const a = near[i];
            const la = (1 - a[2] / LINK_DIST) * 0.45;
            ctx.lineWidth = 0.6;
            ctx.strokeStyle = rgba(VIOLET, la);
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(a[0], a[1]);
            ctx.stroke();
            for (let j = i + 1; j < near.length; j++) {
                const b = near[j];
                if (Math.hypot(a[0] - b[0], a[1] - b[1]) < LINK_DIST * 0.7) {
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = rgba(VIOLET, la * 0.4);
                    ctx.beginPath();
                    ctx.moveTo(a[0], a[1]);
                    ctx.lineTo(b[0], b[1]);
                    ctx.stroke();
                }
            }
        }
    }

    function schedule() {
        if (!pending) {
            pending = true;
            requestAnimationFrame(paint);
        }
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build();
        schedule();
    }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
        schedule();
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () {
        pointer.active = false;
        schedule();
    });

    resize();
})();
