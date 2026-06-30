<script lang="ts">
  import { votePoll, deletePoll } from "../lib/stores";
  import type { PollView } from "../lib/types";

  let { poll }: { poll: PollView } = $props();

  // Local editable selection. Resync from the server only when the server's
  // value actually changes (initial load, or another device); an in-progress
  // edit is preserved across the 10s poll refresh because the signature is
  // unchanged then.
  let selected = $state<Set<string>>(new Set());
  let busy = $state(false);
  let lastSig = "";

  $effect(() => {
    const sig = `${poll.id}|${[...poll.myVotes].sort().join(",")}`;
    if (sig !== lastSig) {
      lastSig = sig;
      selected = new Set(poll.myVotes);
    }
  });

  const myVotesSet = $derived(new Set(poll.myVotes));
  const changed = $derived(
    selected.size !== myVotesSet.size || [...selected].some((id) => !myVotesSet.has(id)),
  );
  const maxVotes = $derived(Math.max(1, ...poll.options.map((o) => o.votes ?? 0)));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  async function submit() {
    busy = true;
    try {
      await votePoll(poll.id, [...selected]);
    } finally {
      busy = false;
    }
  }

  async function onDelete() {
    if (confirm(`Delete the voting "${poll.title}"?`)) await deletePoll(poll.id);
  }
</script>

<article class="poll panel">
  <header>
    <div>
      <h3>{poll.title}</h3>
      <p class="meta">by {poll.createdByName}</p>
    </div>
    {#if poll.canManage}
      <button class="del" onclick={onDelete} aria-label="Delete voting">✕</button>
    {/if}
  </header>

  {#if !poll.revealed}
    <p class="blind">🔒 Pick your option(s) and submit to reveal the standings.</p>
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
        </button>
        {#if poll.revealed}
          <div class="bar"><span style="width:{((opt.votes ?? 0) / maxVotes) * 100}%"></span></div>
        {/if}
      </li>
    {/each}
  </ul>

  <footer>
    {#if poll.revealed}
      <span class="muted">{poll.totalVoters} voter{poll.totalVoters === 1 ? "" : "s"}</span>
      <button class="btn" onclick={submit} disabled={!changed || busy}>
        {busy ? "Saving…" : "Update vote"}
      </button>
    {:else}
      <span class="muted">Results hidden until you vote</span>
      <button class="btn" onclick={submit} disabled={selected.size === 0 || busy}>
        {busy ? "Saving…" : "Submit vote"}
      </button>
    {/if}
  </footer>
</article>

<style>
  .poll {
    padding: 18px;
    display: grid;
    gap: 14px;
    align-content: start;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  h3 {
    font-size: 18px;
  }
  .meta {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  .del {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 15px;
  }
  .blind {
    margin: 0;
    color: var(--maybe-ink);
    background: var(--maybe-soft);
    border-radius: 12px;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 700;
  }
  .options {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .opt {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 13px;
    background: white;
    color: var(--ink);
    font-weight: 700;
    text-align: left;
  }
  .opt.on {
    border-color: var(--yes);
    background: var(--yes-soft);
    color: var(--yes-ink);
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
  }
  .opt.on .check {
    border-color: var(--yes);
  }
  .label {
    flex: 1;
  }
  .count {
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
  .bar {
    height: 6px;
    margin-top: 5px;
    border-radius: 999px;
    background: #eee7dc;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--yes);
    transition: width 0.25s;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
</style>
