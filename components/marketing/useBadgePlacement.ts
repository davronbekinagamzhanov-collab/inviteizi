"use client";
import { useEffect, useState, type RefObject } from 'react';
/** Existing badge stays small. Lower-screen reappearance is brief and only in a collision-free slot. */
export function useBadgePlacement(ref: RefObject<HTMLAnchorElement | null>, enabled: boolean, soft: boolean, raised = false) {
    const [placement, setPlacement] = useState<{
        shown: boolean;
        lower: boolean;
        bottom: number;
    }>({ shown: true, lower: false, bottom: 24 });
    useEffect(() => {
        if (!enabled)
            return;
        let frame = 0, until = 0, timer: ReturnType<typeof setTimeout> | undefined;
        const seen = new WeakSet<Element>();
        const probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        Object.assign(probe.style, { position: "fixed", height: "env(safe-area-inset-bottom)", width: "0", pointerEvents: "none" });
        document.body.append(probe);
        const check = () => {
            frame = 0;
            const el = ref.current;
            if (!el)
                return;
            const first = scrollY < innerHeight * .35, lower = !first;
            let shown = first || Date.now() < until, bottom = raised ? 64 : 24;
            if (shown && lower) {
                const vw = window.visualViewport, h = vw?.height ?? innerHeight, top = vw?.offsetTop ?? 0, left = Math.max(12, (innerWidth - 430) / 2 + 12), width = el.offsetWidth || 180, height = el.offsetHeight || 32;
                const obstacles = [...document.querySelectorAll<HTMLElement>('a,button,input,textarea,select,[data-rsvp],[data-watermark] > p')].filter(x => x !== el && !x.closest('[data-brand-badge]') && getComputedStyle(x).visibility !== 'hidden' && getComputedStyle(x).display !== 'none').map(x => x.getBoundingClientRect()).filter(r => r.width && r.height && r.bottom > top && r.top < top + h);
                const found = [raised ? 64 : 24, 88, 136, 184].find(y => { const t = top + h - y - height - probe.offsetHeight, b = t + height; return !obstacles.some(r => left < r.right + 8 && left + width > r.left - 8 && t < r.bottom + 8 && b > r.top - 8); });
                if (found === undefined)
                    shown = false;
                else
                    bottom = found + Math.max(0, innerHeight - h - top);
            }
            setPlacement(old => old.shown === shown && old.lower === lower && old.bottom === bottom ? old : { shown, lower, bottom });
        };
        const schedule = () => { if (!frame)
            frame = requestAnimationFrame(check); };
        const io = new IntersectionObserver(entries => { for (const e of entries)
            if (e.isIntersecting && !seen.has(e.target)) {
                seen.add(e.target);
                until = Date.now() + 5000;
                clearTimeout(timer);
                timer = setTimeout(schedule, 5050);
            } schedule(); }, { threshold: .15, rootMargin: "0px 0px 120px 0px" });
        document.querySelectorAll('[data-brand-trigger],a[href*="2gis"],a[href*="maps.google"],[data-rsvp]').forEach(el => io.observe(el));
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        visualViewport?.addEventListener('resize', schedule);
        visualViewport?.addEventListener('scroll', schedule);
        schedule();
        return () => { probe.remove(); io.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); visualViewport?.removeEventListener('resize', schedule); visualViewport?.removeEventListener('scroll', schedule); };
    }, [ref, enabled, soft, raised]);
    return placement;
}
