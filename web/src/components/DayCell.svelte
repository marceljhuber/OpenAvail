<script lang="ts">
  import type { DaySummary, User, Vote, VotesByDate } from "../lib/types";
  import { summarizeDay, getDayVoters, VOTE_LABEL } from "../lib/vote";
  import { WEEKDAYS, mondayBasedDay } from "../lib/date";
  import { commentCounts, selectedDay } from "../lib/stores";
  import VoteButtons from "./VoteButtons.svelte";

  let {
    date,
    iso,
    votes,
    members,
    currentUserId,
    maxYes,
    focusActive,
    matches,
    heatmap = false,
    past = false,
  }: {
    date: Date;
    iso: string;
    votes: VotesByDate;
    members: User[];
    currentUserId: string;
    maxYes: number;
    focusActive: boolean;
    matches: boolean;
    heatmap?: boolean;
    past?: boolean;
  } = $props();

  const summary = $derived<DaySummary>(summarizeDay(votes, iso));
  const voters = $derived(getDayVoters(votes, members, iso));
  const current = $derived<Vote | undefined>(votes[iso]?.[currentUserId]);
  const alpha = $derived(Math.min(0.38, (summary.yes / Math.max(1, maxYes)) * 0.34));
  const isTop = $derived(maxYes > 0 && summary.yes === maxYes);

  // Heatmap: shade each day that has responses from dark-green (most yes) through
  // yellow to dark-red (fewest), relative to the busiest day. Hue 0=red … 140=green.
  const heatOn = $derived(heatmap && summary.total > 0 && maxYes > 0);
  const heatHue = $derived((summary.yes / maxYes) * 140);

  const commentN = $derived($commentCounts[iso] ?? 0);

  const voterRows: { vote: Vote; names: string[] }[] = $derived(
    (["yes", "maybe", "no"] as Vote[])
      .map((v) => ({ vote: v, names: voters[v] }))
      .filter((r) => r.names.length > 0),
  );
</script>

<article
  class="day-cell"
  class:top-day={isTop && !heatOn}
  class:match={focusActive && matches}
  class:dim={focusActive && !matches}
  class:heat={heatOn}
  class:past
  style="--yes-alpha: {alpha.toFixed(2)}; --heat-hue: {heatHue.toFixed(0)}"
>
  <div class="day-head">
    <span class="date-number" data-weekday={WEEKDAYS[mondayBasedDay(date)]}>{date.getDate()}</span>
    <span class="weekday-tag">{WEEKDAYS[mondayBasedDay(date)]}</span>
    <span class="yes-score" title="{summary.yes} of {members.length} said yes">
      {summary.yes}/{members.length}
    </span>
    <button
      class="cbtn"
      class:has={commentN > 0}
      onclick={() => selectedDay.set(iso)}
      title="Comments & details"
      aria-label="Open day details and comments"
    >
      💬{commentN > 0 ? ` ${commentN}` : ""}
    </button>
  </div>
  <div class="counts">
    <span class="pill yes">{summary.yes}</span>
    <span class="pill maybe">{summary.maybe}</span>
    <span class="pill no">{summary.no}</span>
  </div>
  <div class="voter-list">
    {#each voterRows as row (row.vote)}
      <div class={row.vote} title={row.names.join(", ")}>
        <strong>{VOTE_LABEL[row.vote]}</strong>{row.names.join(", ")}
      </div>
    {/each}
  </div>
  <VoteButtons date={iso} {current} />
</article>

<style>
  .day-cell {
    min-height: 168px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 10px;
    /* blend the "yes" tint into the surface so text stays readable in both
       light and dark themes (a translucent bright-green overlay washed out
       text in dark mode) */
    background: color-mix(
      in srgb,
      var(--yes) calc(var(--yes-alpha, 0) * 100%),
      var(--surface)
    );
    transition: opacity 0.15s, outline-color 0.15s, background 0.15s;
  }
  .day-cell.top-day {
    outline: 3px solid rgba(32, 178, 107, 0.28);
  }
  /* heatmap fill overrides the subtle yes-tint; mixed with the surface so the
     day's chips/text stay legible in both themes */
  .day-cell.heat {
    background: color-mix(
      in srgb,
      hsl(var(--heat-hue, 0) 68% 45%) 48%,
      var(--surface)
    );
    border-color: color-mix(in srgb, hsl(var(--heat-hue, 0) 68% 45%) 55%, var(--line));
  }
  .day-cell.match {
    outline: 3px solid var(--yes);
  }
  .day-cell.dim {
    opacity: 0.32;
  }
  /* selected/visible past days are shown greyed so they read as "gone" */
  .day-cell.past {
    opacity: 0.55;
  }
  .day-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
  }
  .date-number {
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    border-radius: 10px;
    background: var(--chip);
    font-weight: 900;
    flex: 0 0 auto;
  }
  /* the calendar's Mon–Sun header is hidden on mobile (see CalendarView),
     so surface each day's weekday inline there instead */
  .weekday-tag {
    display: none;
    color: var(--muted);
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
  }
  .yes-score {
    color: var(--yes-ink);
    font-weight: 800;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
    text-align: right;
  }
  .cbtn {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    padding: 0 2px;
    font-size: 12px;
    font-weight: 800;
    color: var(--muted);
    opacity: 0.6;
    line-height: 1;
  }
  .cbtn.has {
    opacity: 1;
    color: var(--ink);
  }
  .counts {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
  }
  .counts .pill {
    flex: 1 1 0;
    min-width: 0;
  }
  .voter-list {
    flex: 1;
    display: grid;
    align-content: start;
    gap: 3px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.25;
    min-height: 14px;
  }
  .voter-list div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .voter-list strong {
    margin-right: 4px;
  }
  .voter-list .yes strong {
    color: var(--yes-ink);
  }
  .voter-list .maybe strong {
    color: var(--maybe-ink);
  }
  .voter-list .no strong {
    color: var(--no-ink);
  }

  @media (max-width: 720px) {
    .weekday-tag {
      display: inline;
    }
  }
</style>
