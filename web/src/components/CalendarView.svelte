<script lang="ts">
  import { onMount, tick } from "svelte";
  import { board, dayEvents, session, filters } from "../lib/stores";
  import {
    weekdayLabels,
    addMonths,
    daysInMonth,
    formatMonthYear,
    mondayBasedDay,
    startOfMonth,
    toISO,
  } from "../lib/date";
  import { summarizeDay } from "../lib/vote";
  import { dayMatchesFocus, dayPassesEventFilter } from "../lib/derive";
  import { monthHue } from "../lib/dayEvents";
  import { t, localeTag } from "../lib/i18n";
  import DayCell from "./DayCell.svelte";

  // The calendar is infinite in BOTH directions: forward to plan, backward to
  // record what happened. Both horizons grow as you approach either end.
  let horizon = $state(18); // months rendered ahead
  let past = $state(3); // months of history rendered above

  const thisMonth = startOfMonth(new Date());
  const thisMonthISO = toISO(thisMonth);
  // midnight today — days before it are rendered greyed out
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  /** Months that actually hold an event, ascending. Used when the "with event"
   * filter is on: driving the list off the events themselves (rather than
   * filtering the rolling horizon) keeps it instant no matter how far back the
   * oldest event sits, and stops the infinite-scroll growth from thrashing on a
   * list that is nearly all filtered out. */
  const eventMonths = $derived.by(() => {
    const keys = [...new Set(Object.keys($dayEvents).map((iso) => iso.slice(0, 7)))].sort();
    return keys.map((k) => new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1));
  });

  const months = $derived(
    $filters.onlyEvents
      ? eventMonths
      : Array.from({ length: horizon + past }, (_, i) => addMonths(thisMonth, i - past)),
  );

  let scrollEl = $state<HTMLElement | null>(null);

  /** True on narrow screens, where the calendar is scrolled by the page itself
   * rather than by its own container (see the ≤900px rules below). */
  function pageScrolls(): boolean {
    return !scrollEl || scrollEl.scrollHeight <= scrollEl.clientHeight + 1;
  }

  function scrollToCurrentMonth() {
    const el = scrollEl?.querySelector(`[data-month="${thisMonthISO}"]`) as HTMLElement | null;
    if (!el) return;
    if (pageScrolls()) el.scrollIntoView({ block: "start" });
    else if (scrollEl) {
      scrollEl.scrollTop += el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
    }
  }

  // Open on the current month (past months sit above, reachable by scrolling up).
  // Retry across a few frames because day cells render taller once board data
  // arrives, which would otherwise leave us parked on an earlier month.
  onMount(() => {
    for (const delay of [0, 120, 400, 900]) setTimeout(scrollToCurrentMonth, delay);
  });

  const currentUserId = $derived($session?.id ?? "");
  const focusActive = $derived($filters.focusMembers.length > 0);

  function toggleHeatmap() {
    filters.update((f) => ({ ...f, heatmap: !f.heatmap }));
  }

  function toggleOnlyEvents() {
    filters.update((f) => ({ ...f, onlyEvents: !f.onlyEvents }));
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
      // filtered-out days become blanks rather than disappearing, so the
      // remaining days stay in their real weekday column
      if (!dayPassesEventFilter($dayEvents, iso, $filters.onlyEvents)) {
        cells.push({ blank: true });
        continue;
      }
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

  const CAP = 600; // ~50 years each way, effectively infinite

  function growForward() {
    // with the event filter on the month list comes from the events, not the
    // horizon — growing it would just burn work on months nobody can see
    if ($filters.onlyEvents) return;
    horizon = Math.min(horizon + 12, CAP);
  }

  /**
   * Prepending months pushes everything down, so measure the document/container
   * height across the update and add the difference back — otherwise the view
   * jumps and you can never actually reach older months.
   */
  let growingBack = false;
  async function growBack(el: HTMLElement | null) {
    if (growingBack || past >= CAP || $filters.onlyEvents) return;
    growingBack = true;
    const heightBefore = el ? el.scrollHeight : document.documentElement.scrollHeight;
    past = Math.min(past + 12, CAP);
    await tick();
    const heightAfter = el ? el.scrollHeight : document.documentElement.scrollHeight;
    const delta = heightAfter - heightBefore;
    if (el) el.scrollTop += delta;
    else window.scrollBy(0, delta);
    growingBack = false;
  }

  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) growForward();
    else if (el.scrollTop < 400) growBack(el);
  }

  /** Mobile scrolls the page, not the container, so watch the window too. */
  function onWindowScroll() {
    if (!pageScrolls()) return;
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 600) growForward();
    else if (window.scrollY < 400) growBack(null);
  }
</script>

<svelte:window onscroll={onWindowScroll} />

<!-- single root element so the parent .cal-grid places the whole calendar in
     one grid cell (two roots leaked the scroll area into the sidebar column) -->
<div class="calendar">
  <div class="cal-tools">
    <!-- the calendar scrolls infinitely both ways, so offer a way back -->
    <button type="button" class="heat-toggle" onclick={scrollToCurrentMonth}>
      {$t("cal.today")}
    </button>
    <button
      type="button"
      class="heat-toggle"
      class:on={$filters.heatmap}
      onclick={toggleHeatmap}
      aria-pressed={$filters.heatmap}
      title={$t("cal.heatmapHint")}
    >
      🔥 {$t("cal.heatmap")}
    </button>
    <button
      type="button"
      class="heat-toggle"
      class:on={$filters.onlyEvents}
      onclick={toggleOnlyEvents}
      aria-pressed={$filters.onlyEvents}
      title={$t("events.onlyEventsHint")}
    >
      ◆ {$t("events.onlyEvents")}
    </button>
    {#if $filters.heatmap}
      <div class="heat-legend" aria-hidden="true">
        <span>{$t("cal.fewer")}</span>
        <span class="scale"></span>
        <span>{$t("cal.mostYes")}</span>
      </div>
    {/if}
  </div>

  <div class="calendar-scroll" bind:this={scrollEl} onscroll={onScroll}>
  {#if $filters.onlyEvents && months.length === 0}
    <p class="no-events">{$t("events.empty")}</p>
  {/if}
  {#each months as month (toISO(month))}
    {@const isPastMonth = toISO(month) < thisMonthISO}
    <section
      class="month-card"
      class:past-month={isPastMonth}
      data-month={toISO(month)}
      style="--month-hue: {monthHue(month.getMonth())}"
    >
      <h3 class="month-title">{formatMonthYear(month, $localeTag)}</h3>
      <div class="weekday-grid">
        {#each weekdayLabels($localeTag) as wd, i (i)}
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
</div>

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
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
  .no-events {
    margin: 0;
    padding: 40px 16px;
    text-align: center;
    color: var(--muted);
    font-weight: 600;
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
    /* svh keeps mobile browser chrome from clipping the last row */
    max-height: min(76vh, 100svh - 230px);
    overflow: auto;
    overscroll-behavior: contain;
    display: grid;
    gap: 18px;
    padding-right: 6px;
    scroll-behavior: smooth;
  }
  .month-card.past-month .month-title {
    opacity: 0.75;
  }
  /* each month carries a faint hue of its own so they read as separate blocks
     while scrolling (shared scale with the timeline's month bands) */
  .month-card {
    --month-tint: hsl(var(--month-hue, 0) 60% 50%);
    border: 1px solid color-mix(in srgb, var(--month-tint) 18%, var(--line));
    border-radius: 22px;
    padding: 16px;
    background: color-mix(in srgb, var(--month-tint) var(--month-mix), var(--surface-a));
  }
  .month-title {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    margin: -16px -16px 12px;
    padding: 14px 16px;
    font-size: 22px;
    background: color-mix(
      in srgb,
      hsl(var(--month-hue, 0) 60% 50%) calc(var(--month-mix) * 1.6),
      var(--header)
    );
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
  @media (max-width: 900px) {
    /* the Mon–Sun header stops making sense once the week no longer fits;
       DayCell shows a per-day weekday tag below this width instead */
    .weekday-grid {
      display: none;
    }
    .days-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .calendar-scroll {
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
    .month-card {
      padding: 12px;
    }
    .month-title {
      margin: -12px -12px 10px;
      padding: 12px;
      font-size: 18px;
    }
  }

  @media (max-width: 480px) {
    .days-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
