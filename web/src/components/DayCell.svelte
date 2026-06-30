<script lang="ts">
  import type { DaySummary, User, Vote, VotesByDate } from "../lib/types";
  import { summarizeDay, getDayVoters, VOTE_LABEL } from "../lib/vote";
  import { WEEKDAYS, mondayBasedDay } from "../lib/date";
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
  }: {
    date: Date;
    iso: string;
    votes: VotesByDate;
    members: User[];
    currentUserId: string;
    maxYes: number;
    focusActive: boolean;
    matches: boolean;
  } = $props();

  const summary = $derived<DaySummary>(summarizeDay(votes, iso));
  const voters = $derived(getDayVoters(votes, members, iso));
  const current = $derived<Vote | undefined>(votes[iso]?.[currentUserId]);
  const alpha = $derived(Math.min(0.38, (summary.yes / Math.max(1, maxYes)) * 0.34));
  const isTop = $derived(maxYes > 0 && summary.yes === maxYes);

  const voterRows: { vote: Vote; names: string[] }[] = $derived(
    (["yes", "maybe", "no"] as Vote[])
      .map((v) => ({ vote: v, names: voters[v] }))
      .filter((r) => r.names.length > 0),
  );
</script>

<article
  class="day-cell"
  class:top-day={isTop}
  class:match={focusActive && matches}
  class:dim={focusActive && !matches}
  style="--yes-alpha: {alpha.toFixed(2)}"
>
  <div class="day-head">
    <span class="date-number" data-weekday={WEEKDAYS[mondayBasedDay(date)]}>{date.getDate()}</span>
    <span class="yes-score">{summary.yes}/{members.length} yes</span>
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
    background:
      linear-gradient(rgba(32, 178, 107, var(--yes-alpha, 0)), rgba(32, 178, 107, var(--yes-alpha, 0))),
      rgba(255, 255, 255, 0.9);
    transition: opacity 0.15s, outline-color 0.15s;
  }
  .day-cell.top-day {
    outline: 3px solid rgba(32, 178, 107, 0.28);
  }
  .day-cell.match {
    outline: 3px solid var(--yes);
  }
  .day-cell.dim {
    opacity: 0.32;
  }
  .day-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .date-number {
    display: grid;
    place-items: center;
    min-width: 32px;
    height: 30px;
    padding: 0 6px;
    border-radius: 10px;
    background: #f2eadc;
    font-weight: 900;
  }
  .yes-score {
    color: var(--yes-ink);
    font-weight: 800;
    font-size: 12px;
  }
  .counts {
    display: flex;
    gap: 6px;
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
</style>
