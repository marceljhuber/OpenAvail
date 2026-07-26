// Floating-card placement.
//
// The old voter/voters popovers were `position: absolute` inside the calendar's
// `overflow: auto` scroller, so they were clipped at the edges of the viewport
// and pinned to the width of a single day cell. This action instead moves the
// card to <body>, positions it `fixed` from the anchor's rect, and flips it
// above / clamps it horizontally so it always lands fully on screen.

export type Align = "start" | "center" | "end";

export interface FloatingOptions {
  anchor: HTMLElement | null;
  align?: Align;
  /** gap between anchor and card, px */
  gap?: number;
  /** called when the anchor scrolls out of view and the card should close */
  onDismiss?: () => void;
}

const EDGE = 8; // keep this much clearance from the viewport edge

/**
 * HoverCard's anchor wrapper is `display: contents` so it never disturbs the
 * caller's layout — but such an element generates no box, and browsers disagree
 * on what getBoundingClientRect() returns for it. Measure the real trigger
 * element instead.
 */
function anchorRect(anchor: HTMLElement): DOMRect {
  const el =
    getComputedStyle(anchor).display === "contents"
      ? ((anchor.firstElementChild as HTMLElement | null) ?? anchor)
      : anchor;
  return el.getBoundingClientRect();
}

export function floating(node: HTMLElement, options: FloatingOptions) {
  let opts = options;

  document.body.appendChild(node);
  node.style.position = "fixed";
  node.style.margin = "0";

  function place() {
    const anchor = opts.anchor;
    if (!anchor || !anchor.isConnected) return;

    const rect = anchorRect(anchor);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // anchor scrolled out of its container / off screen → let the caller close
    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
      opts.onDismiss?.();
      return;
    }

    const gap = opts.gap ?? 6;
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    // prefer below; flip above when there is not enough room and above is roomier
    const below = rect.bottom + gap;
    const above = rect.top - gap - h;
    let top = below;
    if (below + h > vh - EDGE && above >= EDGE) top = above;
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - h - EDGE));

    const align = opts.align ?? "start";
    let left =
      align === "center"
        ? rect.left + rect.width / 2 - w / 2
        : align === "end"
          ? rect.right - w
          : rect.left;
    left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - w - EDGE));

    node.style.top = `${Math.round(top)}px`;
    node.style.left = `${Math.round(left)}px`;
  }

  place();
  // measure again after layout settles (fonts, images, wrapped names)
  const raf = requestAnimationFrame(place);

  // capture-phase so scrolling in a nested container repositions us too
  window.addEventListener("scroll", place, { capture: true, passive: true });
  window.addEventListener("resize", place, { passive: true });

  return {
    update(next: FloatingOptions) {
      opts = next;
      place();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      node.remove();
    },
  };
}
