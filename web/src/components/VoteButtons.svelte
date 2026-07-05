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
    min-height: 30px;
    padding: 0 6px;
    border: 0;
    border-radius: 10px;
    color: var(--muted);
    background: var(--surface-2);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }
  .vb.active.yes {
    color: white;
    background: var(--yes);
  }
  .vb.active.maybe {
    color: #372800;
    background: var(--maybe);
  }
  .vb.active.no {
    color: white;
    background: var(--no);
  }
</style>
