<script lang="ts">
  import { castVote } from "../lib/stores";
  import type { Vote } from "../lib/types";

  let { date, current }: { date: string; current: Vote | undefined } = $props();

  const options: { vote: Vote; label: string }[] = [
    { vote: "yes", label: "Yes" },
    { vote: "maybe", label: "Maybe" },
    { vote: "no", label: "No" },
  ];
</script>

<div class="vote-buttons" role="group" aria-label="Vote for this day">
  {#each options as o (o.vote)}
    <button
      type="button"
      class="vb {o.vote}"
      class:active={current === o.vote}
      aria-pressed={current === o.vote}
      onclick={() => castVote(date, o.vote)}
    >
      {o.label}
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
