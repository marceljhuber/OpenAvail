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

  // sorted by date for display order indicator? keep array order from sortDays.
  function isMonthStart(d: Date): boolean {
    return d.getDate() === 1;
  }

  function voteOf(memberId: string, iso: string): Vote | undefined {
    return $board.votes[iso]?.[memberId];
  }

  function onScroll(e: Event) {
    scrollLeft = (e.currentTarget as HTMLElement).scrollLeft;
  }
</script>

<section class="timeline panel">
  <div class="toolbar">
    <div>
      <p class="eyebrow">Detailed votes</p>
      <h2>People × days</h2>
    </div>
    <p class="hint">
      {total} day{total === 1 ? "" : "s"}
      {focusActive ? " (filtered)" : ""} · {$board.members.length} people
    </p>
  </div>

  {#if total === 0}
    <p class="empty">No days match the current range/filter.</p>
  {:else}
    <div class="grid-scroll" bind:clientWidth={viewportW} onscroll={onScroll}>
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
            <div class="cell head day" title={formatLongDate(day)}>
              {#if isMonthStart(day)}
                <span class="mon">{day.toLocaleDateString(undefined, { month: "short" })}</span>
              {/if}
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
  .empty {
    color: var(--muted);
    padding: 24px 0;
  }
  .grid-scroll {
    overflow: auto;
    max-height: 72vh;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: white;
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
    background: #fffaf0;
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
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
    font-weight: 800;
  }
  .cell.head {
    height: 52px;
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fffaf0;
    flex-direction: column;
    gap: 1px;
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
    background: #f7f2e9;
  }
  .summary {
    color: var(--muted);
    background: #f7f2e9;
  }
  .day .mon {
    color: var(--maybe-ink);
    font-size: 10px;
    text-transform: uppercase;
  }
  .day .dnum {
    font-size: 13px;
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
    background: white;
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
