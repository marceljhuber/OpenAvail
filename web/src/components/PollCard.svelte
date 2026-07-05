<script lang="ts">
  import {
    votePoll,
    deletePoll,
    closePoll,
    updatePoll,
    addPollOption,
    renamePollOption,
    deletePollOption,
  } from "../lib/stores";
  import type { PollMode, PollView } from "../lib/types";

  let { poll }: { poll: PollView } = $props();

  let editing = $state(false);
  let newOption = $state("");

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
  // In single-choice mode a click selects just that option (radio behaviour).
  async function toggle(id: string) {
    if (poll.closed) return; // voting has ended
    let next: Set<string>;
    if (poll.mode === "single") {
      next = selected.has(id) && selected.size === 1 ? new Set() : new Set([id]);
    } else {
      next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
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

  async function setMode(mode: PollMode) {
    if (poll.mode !== mode) await updatePoll(poll.id, { mode });
  }

  async function saveTitle(value: string) {
    const t = value.trim();
    if (t && t !== poll.title) await updatePoll(poll.id, { title: t });
  }

  async function saveOption(optionId: string, value: string, current: string) {
    const t = value.trim();
    if (t && t !== current) await renamePollOption(poll.id, optionId, t);
  }

  async function addOption() {
    const t = newOption.trim();
    if (!t) return;
    newOption = "";
    await addPollOption(poll.id, t);
  }

  async function removeOption(optionId: string) {
    if (poll.options.length <= 1) return;
    await deletePollOption(poll.id, optionId);
  }

  async function onEnd() {
    if (confirm(`End the voting "${poll.title}"? Results become visible to everyone and no more votes can be cast.`))
      await closePoll(poll.id);
  }

  async function onReopen() {
    await closePoll(poll.id, true);
  }
</script>

<article class="poll">
  <header>
    <div class="titles">
      <h3>{poll.title}{#if poll.closed}<span class="ended-tag">Ended</span>{/if}</h3>
      <p class="meta">
        by {poll.createdByName}
        · {poll.mode === "single" ? "single choice" : "multiple choice"}
        {#if poll.revealed}· {poll.totalVoters} voter{poll.totalVoters === 1 ? "" : "s"}{/if}
        {#if saving}· <span class="saving">saving…</span>{/if}
      </p>
    </div>
    {#if poll.canManage}
      <div class="manage">
        <button class="mbtn" class:on={editing} onclick={() => (editing = !editing)} title="Edit voting">
          {editing ? "Done" : "Edit"}
        </button>
        {#if poll.closed}
          <button class="mbtn" onclick={onReopen} title="Re-open voting">Re-open</button>
        {:else}
          <button class="mbtn" onclick={onEnd} title="End voting">End</button>
        {/if}
        <button class="del" onclick={onDelete} aria-label="Delete voting" title="Delete voting">✕</button>
      </div>
    {/if}
  </header>

  {#if editing && poll.canManage}
    <div class="editor">
      <label class="ed-field">
        <span>Title</span>
        <input
          value={poll.title}
          onblur={(e) => saveTitle(e.currentTarget.value)}
          onkeydown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </label>

      <div class="ed-field">
        <span>Mode</span>
        <div class="mode-seg">
          <button class="seg-btn" class:on={poll.mode === "single"} onclick={() => setMode("single")}>
            Single choice
          </button>
          <button class="seg-btn" class:on={poll.mode === "multi"} onclick={() => setMode("multi")}>
            Multiple choice
          </button>
        </div>
      </div>

      <div class="ed-field">
        <span>Options</span>
        <div class="ed-opts">
          {#each poll.options as opt (opt.id)}
            <div class="ed-opt">
              <input
                value={opt.label}
                onblur={(e) => saveOption(opt.id, e.currentTarget.value, opt.label)}
                onkeydown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <button
                class="rm"
                type="button"
                onclick={() => removeOption(opt.id)}
                disabled={poll.options.length <= 1}
                aria-label="Delete option"
              >✕</button>
            </div>
          {/each}
        </div>
        <div class="ed-add">
          <input
            placeholder="New option…"
            bind:value={newOption}
            onkeydown={(e) => e.key === "Enter" && addOption()}
          />
          <button class="add" type="button" onclick={addOption} disabled={!newOption.trim()}>+ Add</button>
        </div>
      </div>
    </div>
  {/if}

  {#if poll.closed}
    <p class="blind ended">🏁 Voting ended — here are the final results.</p>
  {:else if !poll.revealed}
    <p class="blind">🔒 Tap an option to vote — results reveal once you do.</p>
  {/if}

  <ul class="options">
    {#each poll.options as opt (opt.id)}
      {@const mine = selected.has(opt.id)}
      <li>
        <button
          class="opt"
          class:on={mine}
          class:locked={poll.closed}
          onclick={() => toggle(opt.id)}
          aria-pressed={mine}
          disabled={poll.closed}
        >
          <span class="check" class:radio={poll.mode === "single"} aria-hidden="true">{mine ? "✓" : ""}</span>
          <span class="label">{opt.label}</span>
          {#if poll.revealed}
            <span class="count">{opt.votes}</span>
            <span class="bar" style="--w:{((opt.votes ?? 0) / maxVotes) * 100}%"></span>
          {/if}
        </button>
        {#if poll.revealed && opt.voters && opt.voters.length > 0}
          <p class="voters">
            {#each opt.voters as name (name)}<span class="who">{name}</span>{/each}
          </p>
        {/if}
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
    background: var(--surface);
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
  .manage {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: start;
  }
  .mbtn {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
    padding: 4px 10px;
  }
  .mbtn.on {
    background: var(--btn);
    color: var(--btn-fg);
    border-color: var(--btn);
  }
  .del {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
  }
  .ended-tag {
    margin-left: 8px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    background: var(--chip);
    border-radius: 999px;
    padding: 2px 8px;
    vertical-align: middle;
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
  .blind.ended {
    color: var(--yes-ink);
    background: var(--yes-soft);
  }
  .options {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 7px;
  }
  .opt:disabled {
    cursor: default;
  }
  .voters {
    margin: 4px 2px 2px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .who {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    background: var(--chip);
    border-radius: 999px;
    padding: 1px 8px;
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
    background: var(--surface);
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
    background: var(--surface);
    font-size: 13px;
    color: var(--yes-ink);
    flex: 0 0 auto;
  }
  .check.radio {
    border-radius: 999px;
  }
  .opt.on .check {
    border-color: var(--yes);
    background: var(--yes);
    color: white;
  }
  /* --- inline editor --- */
  .editor {
    display: grid;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface-a);
  }
  .ed-field {
    display: grid;
    gap: 6px;
  }
  .ed-field > span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .mode-seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
  }
  .mode-seg .seg-btn {
    flex: 1;
    min-height: 32px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 800;
  }
  .mode-seg .seg-btn.on {
    background: var(--btn);
    color: var(--btn-fg);
  }
  .ed-opts {
    display: grid;
    gap: 6px;
  }
  .ed-opt,
  .ed-add {
    display: flex;
    gap: 6px;
  }
  .ed-opt input,
  .ed-add input {
    flex: 1;
    min-width: 0;
  }
  .rm {
    width: 38px;
    flex: 0 0 auto;
    border: 1px solid var(--line);
    border-radius: 11px;
    background: var(--surface);
    color: var(--no-ink);
  }
  .rm:disabled {
    opacity: 0.4;
  }
  .add {
    flex: 0 0 auto;
    border: 1px dashed var(--line);
    border-radius: 11px;
    background: transparent;
    color: var(--muted);
    padding: 0 12px;
    font-weight: 800;
  }
  .add:disabled {
    opacity: 0.4;
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
