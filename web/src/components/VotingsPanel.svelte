<script lang="ts">
  import { polls, createPoll } from "../lib/stores";
  import type { PollMode } from "../lib/types";
  import { t } from "../lib/i18n";
  import PollCard from "./PollCard.svelte";

  const DEFAULTS = ["Pokemon Day", "One Piece Day", "Friends Day"];

  let creating = $state(false);
  let title = $state("");
  let options = $state<string[]>([...DEFAULTS]);
  let touched = $state<boolean[]>(DEFAULTS.map(() => false));
  let mode = $state<PollMode>("multi");
  let busy = $state(false);
  let error = $state<string | null>(null);

  const canStart = $derived(title.trim().length > 0 && options.some((o) => o.trim().length > 0));

  function isGhost(i: number): boolean {
    return !touched[i] && options[i] === DEFAULTS[i];
  }

  function markTouched(i: number) {
    if (!touched[i]) {
      const next = [...touched];
      next[i] = true;
      touched = next;
    }
  }

  function addOption() {
    options = [...options, ""];
    touched = [...touched, true];
  }
  function removeOption(i: number) {
    options = options.filter((_, idx) => idx !== i);
    touched = touched.filter((_, idx) => idx !== i);
  }

  function reset() {
    title = "";
    options = [...DEFAULTS];
    touched = DEFAULTS.map(() => false);
    mode = "multi";
    error = null;
  }

  async function start() {
    if (!canStart) return;
    busy = true;
    error = null;
    try {
      await createPoll(
        title.trim(),
        options.map((o) => o.trim()).filter((o) => o.length > 0),
        mode,
      );
      reset();
      creating = false;
    } catch (e) {
      error = e instanceof Error ? e.message : $t("votings.error");
    } finally {
      busy = false;
    }
  }
</script>

<aside class="votings panel">
  <div class="head">
    <h2>{$t("votings.title")}</h2>
    {#if !creating}
      <button class="btn sm" onclick={() => (creating = true)}>{$t("votings.new")}</button>
    {/if}
  </div>

  {#if creating}
    <div class="create">
      <label class="field">
        <span>{$t("votings.fieldTitle")}</span>
        <input placeholder={$t("votings.titlePlaceholder")} bind:value={title} />
      </label>

      <div class="field">
        <span>{$t("votings.options")}</span>
        <div class="opt-list">
          {#each options as _, i (i)}
            <div class="opt-row">
              <input
                class:ghost={isGhost(i)}
                placeholder={$t("votings.optionN", { n: i + 1 })}
                bind:value={options[i]}
                oninput={() => markTouched(i)}
                onfocus={(e) => isGhost(i) && e.currentTarget.select()}
              />
              <button
                class="rm"
                type="button"
                onclick={() => removeOption(i)}
                disabled={options.length <= 1}
                aria-label={$t("votings.removeOption")}
              >
                ✕
              </button>
            </div>
          {/each}
        </div>
        <button class="add" type="button" onclick={addOption}>{$t("votings.addOption")}</button>
      </div>

      <div class="field">
        <span>{$t("votings.mode")}</span>
        <div class="mode-seg">
          <button
            type="button"
            class="seg-btn"
            class:on={mode === "single"}
            onclick={() => (mode = "single")}
          >{$t("mode.single")}</button>
          <button
            type="button"
            class="seg-btn"
            class:on={mode === "multi"}
            onclick={() => (mode = "multi")}
          >{$t("mode.multi")}</button>
        </div>
      </div>

      {#if error}<p class="error">{error}</p>{/if}

      <div class="actions">
        <button class="btn ghost-btn" onclick={() => { reset(); creating = false; }}>{$t("votings.cancel")}</button>
        <button class="btn" onclick={start} disabled={!canStart || busy}>
          {busy ? $t("votings.starting") : $t("votings.start")}
        </button>
      </div>
      <p class="hint">
        {$t("votings.hint", { mode: mode === "single" ? $t("mode.single") : $t("mode.multi") })}
      </p>
    </div>
  {/if}

  <div class="list">
    {#if $polls.length === 0}
      <p class="empty">{$t("votings.empty")} <strong>{$t("votings.new")}</strong> {$t("votings.emptyNew")}</p>
    {:else}
      {#each $polls as poll (poll.id)}
        <PollCard {poll} />
      {/each}
    {/if}
  </div>
</aside>

<style>
  .votings {
    padding: 16px;
    display: grid;
    gap: 14px;
    align-content: start;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .head h2 {
    font-size: 20px;
  }
  .btn.sm {
    min-height: 34px;
    padding: 0 12px;
    font-size: 13px;
  }
  .create {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface-a);
  }
  .field {
    display: grid;
    gap: 7px;
  }
  .field > span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .opt-list {
    display: grid;
    gap: 7px;
  }
  .opt-row {
    display: flex;
    gap: 7px;
  }
  .opt-row input {
    flex: 1;
    min-width: 0;
  }
  /* editable default shown as grayed ghost text until touched */
  input.ghost {
    color: var(--muted);
    font-style: italic;
    opacity: 0.7;
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
    justify-self: start;
    border: 1px dashed var(--line);
    border-radius: 11px;
    background: transparent;
    color: var(--muted);
    min-height: 34px;
    padding: 0 12px;
    font-weight: 800;
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
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .ghost-btn {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 11.5px;
  }
  .error {
    margin: 0;
    color: var(--no-ink);
    font-weight: 700;
  }
  .list {
    display: grid;
    gap: 12px;
  }
  .empty {
    color: var(--muted);
    font-size: 13px;
  }
</style>
