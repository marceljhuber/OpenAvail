<script lang="ts">
  import { board, filters } from "../lib/stores";
  import { enumerateDays, formatLongDate, formatRelativeTime, parseISODate, toISO } from "../lib/date";
  import { getBestDays, summarizeDay, VOTE_LABEL } from "../lib/vote";

  const rangeDays = $derived(enumerateDays($filters.rangeFrom, $filters.rangeTo));
  const bestDays = $derived(getBestDays(rangeDays, $board.votes).slice(0, 8));

  const stats = $derived.by(() => {
    let bestYes = 0;
    let voted = 0;
    for (const day of rangeDays) {
      const s = summarizeDay($board.votes, toISO(day));
      if (s.yes > bestYes) bestYes = s.yes;
      if (s.total > 0) voted += 1;
    }
    return { people: $board.members.length, bestYes, voted };
  });

  const recentChanges = $derived($board.changes.slice(0, 14));
</script>

<aside class="sidebar">
  <div class="stats">
    <div class="stat panel"><span>People</span><strong>{stats.people}</strong></div>
    <div class="stat panel pos"><span>Best yes</span><strong>{stats.bestYes}</strong></div>
    <div class="stat panel"><span>Voted days</span><strong>{stats.voted}</strong></div>
  </div>

  <section class="panel block">
    <h3>Strongest days</h3>
    {#if bestDays.length === 0}
      <p class="muted">No votes in this range yet.</p>
    {:else}
      <div class="best-list">
        {#each bestDays as d (d.iso)}
          <div class="best">
            <strong>{formatLongDate(d.date)}</strong>
            <span>{d.summary.yes} yes · {d.summary.maybe} maybe · {d.summary.no} no</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel block">
    <h3>Recent changes</h3>
    {#if recentChanges.length === 0}
      <p class="muted">No changes yet.</p>
    {:else}
      <div class="changes">
        {#each recentChanges as c (c.id)}
          <div class="change">
            <div class="row">
              <strong>{c.userName}</strong>
              <span class="muted">{formatRelativeTime(c.at)}</span>
            </div>
            <div class="muted small">{formatLongDate(parseISODate(c.date))}</div>
            <div class="votes">
              <span class="tag {c.previousVote ?? 'none'}">{c.previousVote ? VOTE_LABEL[c.previousVote] : "—"}</span>
              <span class="arrow">→</span>
              <span class="tag {c.nextVote ?? 'none'}">{c.nextVote ? VOTE_LABEL[c.nextVote] : "—"}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</aside>

<style>
  .sidebar {
    display: grid;
    gap: 14px;
    align-content: start;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .stat {
    padding: 14px;
  }
  .stat span {
    display: block;
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .stat strong {
    display: block;
    margin-top: 6px;
    font-size: 30px;
    letter-spacing: -0.04em;
  }
  .stat.pos strong {
    color: var(--yes-ink);
  }
  .block {
    padding: 16px;
  }
  .block h3 {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .muted {
    color: var(--muted);
  }
  .small {
    font-size: 12px;
  }
  .best-list,
  .changes {
    display: grid;
    gap: 8px;
    max-height: 320px;
    overflow: auto;
  }
  .best {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
  }
  .best strong {
    font-size: 14px;
  }
  .best span {
    color: var(--muted);
    font-size: 12px;
  }
  .change {
    display: grid;
    gap: 5px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
  }
  .change .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
  }
  .votes {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tag {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 900;
  }
  .tag.yes {
    color: var(--yes-ink);
    background: var(--yes-soft);
  }
  .tag.maybe {
    color: var(--maybe-ink);
    background: var(--maybe-soft);
  }
  .tag.no {
    color: var(--no-ink);
    background: var(--no-soft);
  }
  .tag.none {
    color: var(--muted);
    background: var(--empty);
  }
  .arrow {
    color: var(--muted);
    font-weight: 900;
  }
</style>
