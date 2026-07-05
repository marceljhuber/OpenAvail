<script lang="ts">
  import { board, filters } from "../lib/stores";
  import { enumerateDays, formatLongDate, toISO } from "../lib/date";
  import { summarizeDay, VOTE_LABEL } from "../lib/vote";
  import { dayMatchesFocus, sortDays } from "../lib/derive";
  import type { Vote } from "../lib/types";

  const COL_W = 46; // px per day column
  const OVERSCAN = 6;

  let scrollLeft = $state(0);
  let viewportW = $state(1200);
  let scrollEl = $state<HTMLElement | null>(null);
  let atStart = $state(true);
  let atEnd = $state(false);

  const focusActive = $derived($filters.focusMembers.length > 0);
  const focusSet = $derived(new Set($filters.focusMembers));

  // In the timeline the focus filter *hides* non-matching days (calendar
  // highlights instead), so you can isolate e.g. "days Rainer can come".
  const days = $derived.by(() => {
    const all = enumerateDays($filters.rangeFrom, $filters.rangeTo);
    const filtered = focusActive
      ? all.filter((d) => dayMatchesFocus($board.votes, toISO(d), $filters.focusMembers, $filters.focusVote))
      : all;
    return sortDays(filtered, $board.votes, $filters);
  });

  const total = $derived(days.length);
  const startIndex = $derived(Math.max(0, Math.floor(scrollLeft / COL_W) - OVERSCAN));
  const endIndex = $derived(Math.min(total, Math.ceil((scrollLeft + viewportW) / COL_W) + OVERSCAN));
  const visible = $derived(days.slice(startIndex, endIndex));
  const leftSpacer = $derived(startIndex * COL_W);
  const rightSpacer = $derived(Math.max(0, (total - endIndex) * COL_W));

  function isMonthStart(d: Date): boolean {
    return d.getDate() === 1;
  }

  // Distinct light hue per calendar month so columns stay groupable even when
  // sorted out of date order.
  function monthHue(d: Date): number {
    return ((d.getFullYear() * 12 + d.getMonth()) * 53) % 360;
  }

  function voteOf(memberId: string, iso: string): Vote | undefined {
    return $board.votes[iso]?.[memberId];
  }

  function syncEdges(el: HTMLElement) {
    scrollLeft = el.scrollLeft;
    atStart = el.scrollLeft <= 1;
    atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
  }

  function onScroll(e: Event) {
    syncEdges(e.currentTarget as HTMLElement);
  }

  // Turn a normal vertical mouse wheel into horizontal scrolling while the
  // pointer is over the grid, so you can reach the right-hand columns even when
  // the OS hides the horizontal scrollbar (overlay scrollbars).
  function onWheel(e: WheelEvent) {
    if (!scrollEl) return;
    if (scrollEl.scrollWidth <= scrollEl.clientWidth) return; // nothing to pan
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // already horizontal (trackpad)
    const before = scrollEl.scrollLeft;
    scrollEl.scrollLeft += e.deltaY;
    if (scrollEl.scrollLeft !== before) e.preventDefault(); // don't also scroll the page
  }

  // Nav buttons: jump ~80% of a screen so you can walk across long ranges.
  function nudge(dir: 1 | -1) {
    scrollEl?.scrollBy({ left: dir * Math.max(COL_W * 4, viewportW * 0.8), behavior: "smooth" });
  }
  function jump(dir: 1 | -1) {
    scrollEl?.scrollTo({ left: dir > 0 ? scrollEl.scrollWidth : 0, behavior: "smooth" });
  }

  // Keyboard steering when the grid is focused.
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") nudge(1);
    else if (e.key === "ArrowLeft") nudge(-1);
    else if (e.key === "Home") jump(-1);
    else if (e.key === "End") jump(1);
    else return;
    e.preventDefault();
  }

  // Click-and-drag to pan (grab the grid and pull). Cells aren't interactive,
  // so this never conflicts with clicks.
  let dragging = $state(false);
  let dragStartX = 0;
  let dragStartLeft = 0;
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !scrollEl) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartLeft = scrollEl.scrollLeft;
    scrollEl.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging || !scrollEl) return;
    scrollEl.scrollLeft = dragStartLeft - (e.clientX - dragStartX);
    e.preventDefault();
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    try {
      scrollEl?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  // Recompute edge state whenever the day set changes (range/filter/sort).
  $effect(() => {
    void total;
    if (scrollEl) requestAnimationFrame(() => scrollEl && syncEdges(scrollEl));
  });
</script>

<section class="timeline panel">
  <div class="toolbar">
    <div>
      <p class="eyebrow">Detailed votes</p>
      <h2>People × days</h2>
    </div>
    <div class="toolbar-right">
      <p class="hint">
        {total} day{total === 1 ? "" : "s"}
        {focusActive ? " (filtered)" : ""} · {$board.members.length} people
      </p>
      {#if total > 0}
        <div class="scroll-nav" aria-label="Scroll timeline">
          <button onclick={() => jump(-1)} disabled={atStart} title="Jump to start" aria-label="Jump to start">⏮</button>
          <button onclick={() => nudge(-1)} disabled={atStart} title="Scroll left" aria-label="Scroll left">◀</button>
          <button onclick={() => nudge(1)} disabled={atEnd} title="Scroll right" aria-label="Scroll right">▶</button>
          <button onclick={() => jump(1)} disabled={atEnd} title="Jump to end" aria-label="Jump to end">⏭</button>
        </div>
      {/if}
    </div>
  </div>

  {#if total === 0}
    <p class="empty">No days match the current range/filter.</p>
  {:else}
    <!-- Intentionally an interactive scroll region: drag/wheel/arrow-key panning.
         Accessible alternatives exist (the ⏮◀▶⏭ buttons and focus + arrow keys),
         so the non-interactive-element a11y hints don't apply here. -->
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="grid-scroll"
      class:grabbing={dragging}
      role="group"
      aria-label="Votes grid — drag, scroll or use arrow keys to pan across days"
      tabindex="0"
      bind:this={scrollEl}
      bind:clientWidth={viewportW}
      onscroll={onScroll}
      onwheel={onWheel}
      onkeydown={onKeydown}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      <div class="grid">
        <!-- sticky member-name column -->
        <div class="names">
          <div class="cell head corner">Person</div>
          <div class="cell summary-label">Yes / responses</div>
          {#each $board.members as m (m.id)}
            <div class="cell name" class:focus={focusSet.has(m.id)} title={m.name}>{m.name}</div>
          {/each}
        </div>

        <div class="spacer" style="width:{leftSpacer}px"></div>

        {#each visible as day (toISO(day))}
          {@const iso = toISO(day)}
          {@const s = summarizeDay($board.votes, iso)}
          <div class="col" class:month-start={isMonthStart(day)} style="width:{COL_W}px">
            <div class="cell head day" style="--mh:{monthHue(day)}" title={formatLongDate(day)}>
              <span class="mon">{day.toLocaleDateString(undefined, { month: "short" })}</span>
              <span class="dnum">{day.getDate()}</span>
              <span class="dow">{day.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
            </div>
            <div class="cell summary">{s.yes}/{s.total}</div>
            {#each $board.members as m (m.id)}
              {@const v = voteOf(m.id, iso)}
              <div class="cell vote {v ?? 'empty'}">{v ? VOTE_LABEL[v] : ""}</div>
            {/each}
          </div>
        {/each}

        <div class="spacer" style="width:{rightSpacer}px"></div>
      </div>
    </div>
  {/if}
</section>

<style>
  .timeline {
    padding: 18px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }
  .hint {
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .scroll-nav {
    display: flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface-a);
  }
  .scroll-nav button {
    min-width: 30px;
    height: 28px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
  }
  .scroll-nav button:hover:not(:disabled) {
    background: var(--chip);
  }
  .scroll-nav button:disabled {
    opacity: 0.32;
    cursor: default;
  }
  .empty {
    color: var(--muted);
    padding: 24px 0;
  }
  .grid-scroll {
    overflow: auto;
    max-height: 72vh;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    cursor: grab;
    /* Keep a real, always-visible horizontal scrollbar inside the panel rather
       than relying on the OS overlay bar (which hides itself and made it hard
       to reach the right-hand columns). */
    scrollbar-width: thin;
    scrollbar-color: var(--muted) transparent;
    overscroll-behavior-x: contain;
  }
  .grid-scroll.grabbing {
    cursor: grabbing;
    user-select: none;
  }
  .grid-scroll:focus-visible {
    outline: 2px solid var(--yes);
    outline-offset: 2px;
  }
  .grid-scroll::-webkit-scrollbar {
    height: 12px;
  }
  .grid-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .grid-scroll::-webkit-scrollbar-thumb {
    background: var(--line);
    border-radius: 999px;
    border: 3px solid var(--surface);
  }
  .grid-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--muted);
  }
  .grid {
    display: flex;
    align-items: flex-start;
    width: max-content;
  }
  .names {
    position: sticky;
    left: 0;
    z-index: 3;
    flex: 0 0 168px;
    width: 168px;
    background: var(--header);
    box-shadow: 2px 0 0 var(--line);
  }
  .col {
    flex: 0 0 auto;
  }
  .col.month-start {
    box-shadow: inset 2px 0 0 var(--maybe);
  }
  .spacer {
    flex: 0 0 auto;
  }
  .cell {
    height: 38px;
    min-height: 38px;
    max-height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    /* row separator painted with box-shadow, not border: a border participates
       in the box height and its sub-pixel rounding accumulates down a column,
       which shifted the lower rows a few px out of alignment on some displays */
    box-shadow: inset 0 -1px 0 var(--line);
    font-size: 12px;
    font-weight: 800;
  }
  .cell.head {
    height: 56px;
    min-height: 56px;
    max-height: 56px;
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--header);
    flex-direction: column;
    gap: 0;
  }
  /* per-month tinted day header (readable even when sorted out of date order) */
  .col .cell.head.day {
    background: hsl(var(--mh, 40) 55% 94%);
    box-shadow: inset 0 -2px 0 hsl(var(--mh, 40) 45% 82%);
  }
  .day .mon {
    color: hsl(var(--mh, 40) 45% 34%);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .names .corner {
    z-index: 4;
    justify-content: flex-start;
    padding-left: 12px;
    align-items: center;
  }
  .summary-label,
  .name {
    justify-content: flex-start;
    padding-left: 12px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    line-height: 38px;
  }
  .name.focus {
    color: var(--yes-ink);
    background: var(--yes-soft);
  }
  .summary-label {
    color: var(--muted);
    font-size: 11px;
    background: var(--surface-2);
  }
  .summary {
    color: var(--muted);
    background: var(--surface-2);
  }
  .day .dnum {
    font-size: 13px;
    font-weight: 800;
  }
  .day .dow {
    color: var(--muted);
    font-weight: 700;
    font-size: 10px;
  }
  .vote {
    color: var(--muted);
  }
  .vote.yes {
    color: white;
    background: var(--yes);
  }
  .vote.maybe {
    color: #3d2c00;
    background: var(--maybe);
  }
  .vote.no {
    color: white;
    background: var(--no);
  }
  .vote.empty {
    background: var(--surface);
  }

  @media (max-width: 620px) {
    .timeline {
      padding: 12px;
    }
    .toolbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .names {
      flex-basis: 118px;
      width: 118px;
    }
    .grid-scroll {
      max-height: 66vh;
    }
  }
</style>
