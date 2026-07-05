<script lang="ts">
  import { board, filters } from "../lib/stores";
  import type { SortKey } from "../lib/stores";
  import type { Vote } from "../lib/types";
  import { t } from "../lib/i18n";

  const focusActive = $derived($filters.focusMembers.length > 0);

  function setRange(key: "rangeFrom" | "rangeTo", value: string) {
    if (value) filters.update((f) => ({ ...f, [key]: value }));
  }

  function toggleFocus(id: string) {
    filters.update((f) => {
      const has = f.focusMembers.includes(id);
      const focusMembers = has
        ? f.focusMembers.filter((x) => x !== id)
        : [...f.focusMembers, id];
      return { ...f, focusMembers };
    });
  }

  function clearFocus() {
    filters.update((f) => ({ ...f, focusMembers: [] }));
  }

  function setFocusVote(vote: Vote) {
    filters.update((f) => ({ ...f, focusVote: vote }));
  }

  function setSort(sortBy: SortKey) {
    filters.update((f) => ({ ...f, sortBy }));
  }

  const sortOptions: { key: SortKey; i18n: string }[] = [
    { key: "date", i18n: "sort.date" },
    { key: "yes", i18n: "sort.yes" },
    { key: "total", i18n: "sort.total" },
    { key: "maybe", i18n: "sort.maybe" },
    { key: "no", i18n: "sort.no" },
  ];
</script>

<section class="controls panel">
  <div class="group range">
    <span class="lab">{$t("controls.range")}</span>
    <input
      type="date"
      value={$filters.rangeFrom}
      onchange={(e) => setRange("rangeFrom", e.currentTarget.value)}
      aria-label={$t("controls.rangeStart")}
    />
    <span class="dash">→</span>
    <input
      type="date"
      value={$filters.rangeTo}
      onchange={(e) => setRange("rangeTo", e.currentTarget.value)}
      aria-label={$t("controls.rangeEnd")}
    />
  </div>

  <div class="group focus">
    <span class="lab">{$t("controls.onlyWhere")}</span>
    <div class="chips">
      {#if $board.members.length === 0}
        <span class="muted">{$t("controls.noMembers")}</span>
      {:else}
        {#each $board.members as m (m.id)}
          <button
            type="button"
            class="chip"
            class:on={$filters.focusMembers.includes(m.id)}
            onclick={() => toggleFocus(m.id)}
          >
            {m.name}
          </button>
        {/each}
      {/if}
    </div>
    <span class="lab">{$t("controls.voted")}</span>
    <select
      value={$filters.focusVote}
      onchange={(e) => setFocusVote(e.currentTarget.value as Vote)}
      aria-label={$t("controls.requiredVote")}
    >
      <option value="yes">{$t("vote.yes")}</option>
      <option value="maybe">{$t("vote.maybe")}</option>
      <option value="no">{$t("vote.no")}</option>
    </select>
    <!-- always rendered (space reserved) so appearing/disappearing never
         reflows the row or shifts the neighbouring controls -->
    <button
      type="button"
      class="clear"
      class:hidden={!focusActive}
      onclick={clearFocus}
      tabindex={focusActive ? 0 : -1}
      aria-hidden={!focusActive}
    >{$t("controls.clear")}</button>
  </div>

  {#if $filters.view === "timeline"}
  <div class="group sort">
    <span class="lab">{$t("controls.sort")}</span>
    <div class="seg">
      {#each sortOptions as o (o.key)}
        <button
          type="button"
          class="seg-btn"
          class:on={$filters.sortBy === o.key}
          onclick={() => setSort(o.key)}
        >
          {$t(o.i18n)}
        </button>
      {/each}
      {#if focusActive}
        <button
          type="button"
          class="seg-btn accent"
          class:on={$filters.sortBy === "focus"}
          onclick={() => setSort("focus")}
        >
          {$t("sort.focus")}
        </button>
      {/if}
    </div>
  </div>
  {/if}
</section>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    padding: 14px 16px;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lab {
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .range input {
    min-height: 38px;
  }
  .dash {
    color: var(--muted);
    font-weight: 900;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    min-height: 32px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0 12px;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
  }
  .chip.on {
    color: white;
    background: var(--yes);
    border-color: var(--yes);
  }
  .focus select {
    min-height: 36px;
  }
  .clear {
    border: 0;
    background: transparent;
    color: var(--no-ink);
    font-weight: 800;
    font-size: 13px;
  }
  .clear.hidden {
    visibility: hidden;
    pointer-events: none;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface-a);
  }
  .seg-btn {
    min-height: 30px;
    border: 0;
    border-radius: 9px;
    padding: 0 12px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 800;
  }
  .seg-btn.on {
    color: var(--btn-fg);
    background: var(--btn);
  }
  .seg-btn.accent.on {
    background: var(--yes);
  }
  .muted {
    color: var(--muted);
  }

  @media (max-width: 720px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
    }
    .group {
      justify-content: flex-start;
    }
    .range input {
      flex: 1;
      min-width: 0;
    }
    .seg {
      width: 100%;
    }
    .seg-btn {
      flex: 1;
    }
  }
</style>
