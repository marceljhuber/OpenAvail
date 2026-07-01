<script lang="ts">
  import { votePoll, deletePoll } from "../lib/stores";
  import type { PollView } from "../lib/types";

  let { poll }: { poll: PollView } = $props();

  // Local editable selection; resynced from the server only when the server
  // value actually changes and nothing is in flight (avoids clobbering clicks).
  let selected = $state<Set<string>>(new Set());
  let lastSig = "";
  let pending = 0;
  let saving = $state(false);

  $effect(() => {
    const sig = `${poll.id}|${[...poll.myVotes].sort().join(",")}`;
    if (pending === 0 && sig !== lastSig) {
      lastSig = sig;
      selected = new Set(poll.myVotes);
    }
  });

  const maxVotes = $derived(Math.max(1, ...poll.options.map((o) => o.votes ?? 0)));

  // Auto-submit: clicking an option toggles it and persists immediately.
  async function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;

    pending += 1;
    saving = true;
    try {
      await votePoll(poll.id, [...next]);
    } finally {
      pending -= 1;
      if (pending === 0) saving = false;
    }
  }

  async function onDelete() {
    if (confirm(`Delete the voting "${poll.title}"?`)) await deletePoll(poll.id);
  }
</script>

<article class="poll">
  <header>
    <div class="titles">
      <h3>{poll.title}</h3>
      <p class="meta">
        by {poll.createdByName}
        {#if poll.revealed}· {poll.totalVoters} voter{poll.totalVoters === 1 ? "" : "s"}{/if}
        {#if saving}· <span class="saving">saving…</span>{/if}
      </p>
    </div>
    {#if poll.canManage}
      <button class="del" onclick={onDelete} aria-label="Delete voting" title="Delete voting">✕</button>
    {/if}
  </header>

  {#if !poll.revealed}
    <p class="blind">🔒 Tap an option to vote — results reveal once you do.</p>
  {/if}

  <ul class="options">
    {#each poll.options as opt (opt.id)}
      {@const mine = selected.has(opt.id)}
      <li>
        <button class="opt" class:on={mine} onclick={() => toggle(opt.id)} aria-pressed={mine}>
          <span class="check" aria-hidden="true">{mine ? "✓" : ""}</span>
          <span class="label">{opt.label}</span>
          {#if poll.revealed}
            <span class="count">{opt.votes}</span>
          {/if}
          {#if poll.revealed}
            <span class="bar" style="--w:{((opt.votes ?? 0) / maxVotes) * 100}%"></span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</article>

<style>
  .poll {
    padding: 16px;
    display: grid;
    gap: 12px;
    align-content: start;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: white;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .titles {
    min-width: 0;
  }
  h3 {
    font-size: 16px;
    overflow-wrap: anywhere;
  }
  .meta {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  .saving {
    color: var(--yes-ink);
    font-weight: 700;
  }
  .del {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
    align-self: start;
  }
  .blind {
    margin: 0;
    color: var(--maybe-ink);
    background: var(--maybe-soft);
    border-radius: 11px;
    padding: 8px 11px;
    font-size: 12.5px;
    font-weight: 700;
  }
  .options {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 7px;
  }
  .opt {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: white;
    color: var(--ink);
    font-weight: 700;
    text-align: left;
    overflow: hidden;
  }
  /* result bar sits behind the label */
  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--w, 0%);
    background: var(--yes-soft);
    z-index: 0;
    transition: width 0.25s;
  }
  .opt > :not(.bar) {
    position: relative;
    z-index: 1;
  }
  .opt.on {
    border-color: var(--yes);
  }
  .opt.on .bar {
    background: color-mix(in srgb, var(--yes) 26%, white);
  }
  .check {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: white;
    font-size: 13px;
    color: var(--yes-ink);
    flex: 0 0 auto;
  }
  .opt.on .check {
    border-color: var(--yes);
    background: var(--yes);
    color: white;
  }
  .label {
    flex: 1;
    overflow-wrap: anywhere;
  }
  .count {
    font-variant-numeric: tabular-nums;
    font-weight: 900;
  }
</style>
