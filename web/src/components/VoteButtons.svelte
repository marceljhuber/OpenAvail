<script lang="ts">
  import { castVote } from "../lib/stores";
  import { t } from "../lib/i18n";
  import type { Vote } from "../lib/types";

  let { date, current }: { date: string; current: Vote | undefined } = $props();

  const votes: Vote[] = ["yes", "maybe", "no"];
</script>

<div class="vote-buttons" role="group" aria-label={$t("cal.voteForDay")}>
  {#each votes as v (v)}
    <button
      type="button"
      class="vb {v}"
      class:active={current === v}
      aria-pressed={current === v}
      onclick={() => castVote(date, v)}
    >
      {$t(`vote.${v}`)}
    </button>
  {/each}
</div>

<style>
  /* flex-wrap so buttons reflow (never clip "Maybe") when the cell is narrow */
  .vote-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .vb {
    flex: 1 1 44px;
    min-width: 0;
    min-height: 32px;
    padding: 0 6px;
    border: 0;
    border-radius: 10px;
    color: var(--muted);
    background: var(--surface-2);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vb:hover {
    color: var(--ink);
  }
  /* white on these fills measures 1.9–4.1:1 in every palette, so the label is a
     deep tint of the fill instead (see --on-* in app.css) */
  .vb.active.yes {
    color: var(--on-yes);
    background: var(--yes);
  }
  .vb.active.maybe {
    color: var(--on-maybe);
    background: var(--maybe);
  }
  .vb.active.no {
    color: var(--on-no);
    background: var(--no);
  }

  /* comfortable thumb targets once the calendar goes 1–2 columns */
  @media (max-width: 900px) {
    .vb {
      min-height: var(--tap);
      font-size: 13px;
    }
  }
</style>
