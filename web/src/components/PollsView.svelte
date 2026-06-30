<script lang="ts">
  import { polls, createPoll } from "../lib/stores";
  import PollCard from "./PollCard.svelte";

  const DEFAULT_OPTIONS = ["Pokemon Day", "One Piece Day", "Friends Day"];

  let title = $state("");
  let options = $state<string[]>([...DEFAULT_OPTIONS]);
  let busy = $state(false);
  let error = $state<string | null>(null);

  const canStart = $derived(
    title.trim().length > 0 && options.some((o) => o.trim().length > 0),
  );

  function addOption() {
    options = [...options, ""];
  }
  function removeOption(i: number) {
    options = options.filter((_, idx) => idx !== i);
  }

  async function start() {
    if (!canStart) return;
    busy = true;
    error = null;
    try {
      await createPoll(
        title.trim(),
        options.map((o) => o.trim()).filter((o) => o.length > 0),
      );
      // reset to a fresh form with editable defaults
      title = "";
      options = [...DEFAULT_OPTIONS];
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not start the voting.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="votings-layout">
  <aside class="create panel">
    <p class="eyebrow">New voting</p>
    <h2>Create a voting</h2>

    <label class="field">
      <span>Title</span>
      <input placeholder="e.g. 25.07. Day?" bind:value={title} />
    </label>

    <div class="field">
      <span>Options</span>
      <div class="opt-list">
        {#each options as _, i (i)}
          <div class="opt-row">
            <input placeholder={`Option ${i + 1}`} bind:value={options[i]} />
            <button
              class="rm"
              type="button"
              onclick={() => removeOption(i)}
              disabled={options.length <= 1}
              aria-label="Remove option"
            >
              ✕
            </button>
          </div>
        {/each}
      </div>
      <button class="add" type="button" onclick={addOption}>+ Add option</button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button class="btn start" onclick={start} disabled={!canStart || busy}>
      {busy ? "Starting…" : "Start voting"}
    </button>
    <p class="hint">Multiple choice · results stay hidden until each person votes.</p>
  </aside>

  <main class="list">
    {#if $polls.length === 0}
      <div class="empty panel">
        <p class="eyebrow">No votings yet</p>
        <h3>Create your first voting on the left.</h3>
      </div>
    {:else}
      {#each $polls as poll (poll.id)}
        <PollCard {poll} />
      {/each}
    {/if}
  </main>
</div>

<style>
  .votings-layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .create {
    padding: 20px;
    display: grid;
    gap: 14px;
    position: sticky;
    top: 18px;
  }
  .field {
    display: grid;
    gap: 8px;
  }
  .field > span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .opt-list {
    display: grid;
    gap: 8px;
  }
  .opt-row {
    display: flex;
    gap: 8px;
  }
  .opt-row input {
    flex: 1;
  }
  .rm {
    width: 40px;
    border: 1px solid var(--line);
    border-radius: 11px;
    background: white;
    color: var(--no-ink);
  }
  .rm:disabled {
    opacity: 0.4;
  }
  .add {
    justify-self: start;
    border: 1px dashed var(--line);
    border-radius: 11px;
    background: transparent;
    color: var(--muted);
    min-height: 36px;
    padding: 0 12px;
    font-weight: 800;
  }
  .start {
    margin-top: 4px;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .error {
    color: var(--no-ink);
    font-weight: 700;
    margin: 0;
  }
  .list {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    align-content: start;
  }
  .empty {
    padding: 28px;
    grid-column: 1 / -1;
  }
  @media (max-width: 980px) {
    .votings-layout {
      grid-template-columns: 1fr;
    }
    .create {
      position: static;
    }
  }
</style>
