<script lang="ts">
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

  let horizon = $state(18); // months rendered ahead; grows as you scroll
  const start = startOfMonth(new Date());

  const months = $derived(
    Array.from({ length: horizon }, (_, i) => addMonths(start, i)),
  );

  const currentUserId = $derived($session?.id ?? "");
  const focusActive = $derived($filters.focusMembers.length > 0);

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

<div class="calendar-scroll" onscroll={onScroll}>
  {#each months as month (toISO(month))}
    <section class="month-card">
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
            />
          {/if}
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .calendar-scroll {
    max-height: 76vh;
    overflow: auto;
    display: grid;
    gap: 18px;
    padding-right: 6px;
    scroll-behavior: smooth;
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
