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
  import { t } from "../lib/i18n";

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
    if (confirm($t("poll.confirmDelete", { title: poll.title }))) await deletePoll(poll.id);
  }

  async function setMode(mode: PollMode) {
    if (poll.mode !== mode) await updatePoll(poll.id, { mode });
  }

  async function saveTitle(value: string) {
    const val = value.trim();
    if (val && val !== poll.title) await updatePoll(poll.id, { title: val });
  }

  async function saveOption(optionId: string, value: string, current: string) {
    const val = value.trim();
    if (val && val !== current) await renamePollOption(poll.id, optionId, val);
  }

  async function addOption() {
    const val = newOption.trim();
    if (!val) return;
    newOption = "";
    await addPollOption(poll.id, val);
  }

  async function removeOption(optionId: string) {
    if (poll.options.length <= 1) return;
    await deletePollOption(poll.id, optionId);
  }

  async function onEnd() {
    if (confirm($t("poll.confirmEnd", { title: poll.title }))) await closePoll(poll.id);
  }

  async function onReopen() {
    await closePoll(poll.id, true);
  }
</script>

<article class="poll">
  <header>
    <div class="titles">
      <h3>{poll.title}{#if poll.closed}<span class="ended-tag">{$t("poll.ended")}</span>{/if}</h3>
      <p class="meta">
        {$t("poll.by", { name: poll.createdByName })}
        · {poll.mode === "single" ? $t("poll.modeSingle") : $t("poll.modeMulti")}
        {#if poll.revealed}· {poll.totalVoters === 1 ? $t("poll.voter", { n: poll.totalVoters }) : $t("poll.voters", { n: poll.totalVoters ?? 0 })}{/if}
        {#if saving}· <span class="saving">{$t("poll.saving")}</span>{/if}
      </p>
    </div>
    {#if poll.canManage}
      <div class="manage">
        <button class="mbtn" class:on={editing} onclick={() => (editing = !editing)} title={$t("poll.editVoting")}>
          {editing ? $t("poll.done") : $t("poll.edit")}
        </button>
        {#if poll.closed}
          <button class="mbtn" onclick={onReopen} title={$t("poll.reopenVoting")}>{$t("poll.reopen")}</button>
        {:else}
          <button class="mbtn" onclick={onEnd} title={$t("poll.endVoting")}>{$t("poll.end")}</button>
        {/if}
        <button class="del" onclick={onDelete} aria-label={$t("poll.delete")} title={$t("poll.delete")}>✕</button>
      </div>
    {/if}
  </header>

  {#if editing && poll.canManage}
    <div class="editor">
      <label class="ed-field">
        <span>{$t("votings.fieldTitle")}</span>
        <input
          value={poll.title}
          onblur={(e) => saveTitle(e.currentTarget.value)}
          onkeydown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </label>

      <div class="ed-field">
        <span>{$t("votings.mode")}</span>
        <div class="mode-seg">
          <button class="seg-btn" class:on={poll.mode === "single"} onclick={() => setMode("single")}>
            {$t("mode.single")}
          </button>
          <button class="seg-btn" class:on={poll.mode === "multi"} onclick={() => setMode("multi")}>
            {$t("mode.multi")}
          </button>
        </div>
      </div>

      <div class="ed-field">
        <span>{$t("votings.options")}</span>
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
                aria-label={$t("poll.delete")}
              >✕</button>
            </div>
          {/each}
        </div>
        <div class="ed-add">
          <input
            placeholder={$t("poll.newOption")}
            bind:value={newOption}
            onkeydown={(e) => e.key === "Enter" && addOption()}
          />
          <button class="add" type="button" onclick={addOption} disabled={!newOption.trim()}>{$t("poll.add")}</button>
        </div>
      </div>
    </div>
  {/if}

  {#if poll.closed}
    <p class="blind ended">{$t("poll.blindClosed")}</p>
  {:else if !poll.revealed}
    <p class="blind">{$t("poll.blindOpen")}</p>
  {/if}

  <ul class="options">
    {#each poll.options as opt (opt.id)}
      {@const mine = selected.has(opt.id)}
      {@const voters = opt.voters ?? []}
      <li class="opt-li">
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
            {#if voters.length > 0}
              <span
                class="who-badge"
                tabindex="0"
                role="button"
                aria-label={$t("poll.whoAria", { n: voters.length })}
                title={$t("poll.whoVoted")}
              >👤 {voters.length}</span>
            {/if}
            <span class="count">{opt.votes}</span>
            <span class="bar" style="--w:{((opt.votes ?? 0) / maxVotes) * 100}%"></span>
          {/if}
        </button>
        <!-- names hidden by default; revealed as a little card on hover/focus -->
        {#if poll.revealed && voters.length > 0}
          <div class="voters-pop" role="tooltip">
            {#each voters as name (name)}<span class="who">{name}</span>{/each}
          </div>
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
  .opt-li {
    position: relative;
  }
  /* small "👤 n" affordance inside the option row */
  .who-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 800;
    color: var(--muted);
    background: var(--chip);
    border-radius: 999px;
    padding: 1px 8px;
    cursor: help;
  }
  /* voter names: hidden by default, shown as a floating white card on hover/focus */
  .voters-pop {
    position: absolute;
    top: calc(100% - 4px);
    right: 8px;
    z-index: 30;
    display: none;
    grid-auto-flow: row;
    gap: 2px;
    min-width: 150px;
    max-height: 240px;
    overflow: auto;
    padding: 7px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow: var(--shadow);
  }
  .opt-li:hover .voters-pop,
  .opt-li:focus-within .voters-pop {
    display: grid;
  }
  .voters-pop .who {
    padding: 5px 9px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink);
    white-space: nowrap;
  }
  .voters-pop .who:hover {
    background: var(--chip);
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
