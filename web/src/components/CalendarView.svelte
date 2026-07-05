<script lang="ts">
  import { onMount } from "svelte";
  import { board, session, filters } from "../lib/stores";
  import {
    WEEKDAYS,
    addMonths,
    daysInMonth,
    formatMonthYear,
    mondayBasedDay,
    startOfMonth,
    toISO,
  } from "../lib/date";
  import { summarizeDay } from "../lib/vote";
  import { dayMatchesFocus } from "../lib/derive";
  import DayCell from "./DayCell.svelte";

  const PAST = 3; // months of history shown above (so you can scroll back)
  let horizon = $state(18); // months rendered ahead; grows as you scroll

  const thisMonth = startOfMonth(new Date());
  const start = addMonths(thisMonth, -PAST);
  const thisMonthISO = toISO(thisMonth);
  // midnight today — days before it are rendered greyed out
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const months = $derived(
    Array.from({ length: horizon + PAST }, (_, i) => addMonths(start, i)),
  );

  let scrollEl = $state<HTMLElement | null>(null);

  // Open on the current month (past months sit above, reachable by scrolling up).
  onMount(() => {
    const el = scrollEl?.querySelector(`[data-month="${thisMonthISO}"]`) as HTMLElement | null;
    if (el && scrollEl) {
      scrollEl.scrollTop += el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
    }
  });

  const currentUserId = $derived($session?.id ?? "");
  const focusActive = $derived($filters.focusMembers.length > 0);

  function toggleHeatmap() {
    filters.update((f) => ({ ...f, heatmap: !f.heatmap }));
  }

  const maxYes = $derived.by(() => {
    let m = 0;
    for (const iso of Object.keys($board.votes)) {
      const yes = summarizeDay($board.votes, iso).yes;
      if (yes > m) m = yes;
    }
    return m;
  });

  interface Cell {
    blank: boolean;
    date?: Date;
    iso?: string;
    matches?: boolean;
    past?: boolean;
  }

  function cellsFor(month: Date): Cell[] {
    const lead = mondayBasedDay(month);
    const count = daysInMonth(month.getFullYear(), month.getMonth());
    const cells: Cell[] = [];
    for (let i = 0; i < lead; i++) cells.push({ blank: true });
    for (let d = 1; d <= count; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const iso = toISO(date);
      cells.push({
        blank: false,
        date,
        iso,
        past: date < todayStart,
        matches: dayMatchesFocus($board.votes, iso, $filters.focusMembers, $filters.focusVote),
      });
    }
    return cells;
  }

  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
      horizon = Math.min(horizon + 12, 600); // ~50 years cap, effectively infinite
    }
  }
</script>

<div class="cal-tools">
  <button
    type="button"
    class="heat-toggle"
    class:on={$filters.heatmap}
    onclick={toggleHeatmap}
    aria-pressed={$filters.heatmap}
    title="Shade each day green→red by how many said yes"
  >
    🔥 Heatmap
  </button>
  {#if $filters.heatmap}
    <div class="heat-legend" aria-hidden="true">
      <span>fewer</span>
      <span class="scale"></span>
      <span>most yes</span>
    </div>
  {/if}
</div>

<div class="calendar-scroll" bind:this={scrollEl} onscroll={onScroll}>
  {#each months as month (toISO(month))}
    {@const isPastMonth = toISO(month) < thisMonthISO}
    <section class="month-card" class:past-month={isPastMonth} data-month={toISO(month)}>
      <h3 class="month-title">{formatMonthYear(month)}</h3>
      <div class="weekday-grid">
        {#each WEEKDAYS as wd (wd)}
          <div class="weekday">{wd}</div>
        {/each}
      </div>
      <div class="days-grid">
        {#each cellsFor(month) as cell, i (cell.iso ?? "b" + i)}
          {#if cell.blank}
            <div class="blank"></div>
          {:else}
            <DayCell
              date={cell.date!}
              iso={cell.iso!}
              votes={$board.votes}
              members={$board.members}
              {currentUserId}
              {maxYes}
              {focusActive}
              matches={cell.matches!}
              heatmap={$filters.heatmap}
              past={cell.past!}
            />
          {/if}
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .cal-tools {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .heat-toggle {
    min-height: 34px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0 14px;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    font-weight: 800;
  }
  .heat-toggle.on {
    background: var(--btn);
    color: var(--btn-fg);
    border-color: var(--btn);
  }
  .heat-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .heat-legend .scale {
    width: 120px;
    height: 10px;
    border-radius: 999px;
    /* red → yellow → green, matching the day hue scale (0 … 140) */
    background: linear-gradient(
      90deg,
      hsl(0 68% 45%),
      hsl(45 68% 45%),
      hsl(90 68% 45%),
      hsl(140 68% 45%)
    );
  }
  .calendar-scroll {
    max-height: 76vh;
    overflow: auto;
    display: grid;
    gap: 18px;
    padding-right: 6px;
    scroll-behavior: smooth;
  }
  .month-card.past-month .month-title {
    opacity: 0.5;
  }
  .month-card {
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 16px;
    background: var(--surface-a);
  }
  .month-title {
    position: sticky;
    top: 0;
    z-index: 5;
    margin: -16px -16px 12px;
    padding: 14px 16px;
    font-size: 22px;
    background: linear-gradient(var(--header), var(--header));
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
    border-radius: 22px 22px 0 0;
  }
  .weekday-grid,
  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
  }
  .weekday {
    color: var(--muted);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 8px 6px;
  }
  .blank {
    visibility: hidden;
  }
  @media (max-width: 720px) {
    .weekday-grid {
      display: none;
    }
    .days-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .calendar-scroll {
      max-height: none;
    }
  }
</style>
