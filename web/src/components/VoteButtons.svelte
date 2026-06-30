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
  .vote-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .vb {
    min-height: 32px;
    padding: 0 6px;
    border: 0;
    border-radius: 11px;
    color: var(--muted);
    background: #f7f2e9;
    font-size: 12px;
    font-weight: 800;
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
