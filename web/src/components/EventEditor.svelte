<script lang="ts">
  // Admin-only editor for a day's event. Saves the whole event in one PUT —
  // links and attendees replace whatever is stored.
  import { untrack } from "svelte";
  import { board, removeDayEvent, saveDayEvent } from "../lib/stores";
  import { colorStyle, prefillAttendees } from "../lib/dayEvents";
  import { EVENT_COLORS, type DayEventView, type EventColor } from "../lib/types";
  import { t } from "../lib/i18n";

  let {
    iso,
    event,
    onDone,
  }: { iso: string; event: DayEventView | null; onDone: () => void } = $props();

  interface LinkDraft {
    key: string;
    url: string;
    label: string;
  }
  interface AttendeeDraft {
    key: string;
    userId: string | null;
    name: string;
  }

  let nextKey = 0;
  const key = () => `k${nextKey++}`;

  // The form is seeded once, when the editor is opened — later prop changes
  // (e.g. an SSE refresh mid-edit) must not clobber what is being typed.
  const seed = untrack(() => event);

  let title = $state(seed?.title ?? "");
  let color = $state<EventColor>(seed?.color ?? "sage");
  let description = $state(seed?.description ?? "");
  let links = $state<LinkDraft[]>(
    seed?.links.map((l) => ({ key: key(), url: l.url, label: l.label })) ?? [],
  );
  let attendees = $state<AttendeeDraft[]>(
    seed?.attendees.map((a) => ({ key: key(), userId: a.userId, name: a.name })) ?? [],
  );
  let guestName = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);

  const memberIds = $derived(new Set(attendees.map((a) => a.userId).filter(Boolean) as string[]));
  const guests = $derived(attendees.filter((a) => a.userId === null));
  const canSave = $derived(title.trim().length > 0);

  function toggleMember(id: string, name: string) {
    attendees = memberIds.has(id)
      ? attendees.filter((a) => a.userId !== id)
      : [...attendees, { key: key(), userId: id, name }];
  }

  /** Reset the member selection to whoever voted yes, keeping typed guests. */
  function fromYesVotes() {
    const seeded = prefillAttendees($board.votes, $board.members, iso);
    attendees = [
      ...seeded.map((a) => ({ key: key(), userId: a.userId, name: a.name })),
      ...attendees.filter((a) => a.userId === null),
    ];
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    const clash = attendees.some((a) => a.name.toLowerCase() === name.toLowerCase());
    if (!clash) attendees = [...attendees, { key: key(), userId: null, name }];
    guestName = "";
  }

  function removeAttendee(k: string) {
    attendees = attendees.filter((a) => a.key !== k);
  }

  function addLink() {
    links = [...links, { key: key(), url: "", label: "" }];
  }

  function removeLink(k: string) {
    links = links.filter((l) => l.key !== k);
  }

  async function save() {
    if (!canSave) {
      error = $t("ev.titleRequired");
      return;
    }
    busy = true;
    error = null;
    try {
      await saveDayEvent(iso, {
        title: title.trim(),
        color,
        description: description.trim(),
        // blank rows are just an unfinished thought — drop them silently
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url.trim(), label: l.label.trim() })),
        attendees: attendees.map((a) => ({ userId: a.userId, name: a.name })),
      });
      onDone();
    } catch (e) {
      error = e instanceof Error ? e.message : $t("ev.saveError");
    } finally {
      busy = false;
    }
  }

  async function destroy() {
    if (!event) return;
    if (!confirm($t("ev.confirmDelete", { title: event.title }))) return;
    busy = true;
    error = null;
    try {
      await removeDayEvent(iso);
      onDone();
    } catch (e) {
      error = e instanceof Error ? e.message : $t("ev.deleteError");
    } finally {
      busy = false;
    }
  }
</script>

<div class="editor" style={colorStyle(color)}>
  <label class="field">
    <span>{$t("ev.title")}</span>
    <input
      bind:value={title}
      placeholder={$t("ev.titlePlaceholder")}
      maxlength="120"
      autocomplete="off"
    />
  </label>

  <div class="field">
    <span>{$t("ev.color")}</span>
    <div class="swatches" role="radiogroup" aria-label={$t("ev.color")}>
      {#each EVENT_COLORS as c (c)}
        <button
          type="button"
          class="swatch"
          class:on={color === c}
          style={colorStyle(c)}
          role="radio"
          aria-checked={color === c}
          aria-label={c}
          title={c}
          onclick={() => (color = c)}
        ></button>
      {/each}
    </div>
  </div>

  <label class="field">
    <span>{$t("ev.description")}</span>
    <textarea
      bind:value={description}
      placeholder={$t("ev.descriptionPlaceholder")}
      maxlength="2000"
      rows="3"
    ></textarea>
  </label>

  <div class="field">
    <span>{$t("ev.links")}</span>
    <div class="rows">
      {#each links as link (link.key)}
        <div class="link-row">
          <input
            class="url"
            bind:value={link.url}
            placeholder={$t("ev.linkUrl")}
            maxlength="500"
            inputmode="url"
            autocomplete="off"
          />
          <input
            class="label"
            bind:value={link.label}
            placeholder={$t("ev.linkLabel")}
            maxlength="80"
            autocomplete="off"
          />
          <button
            type="button"
            class="x"
            onclick={() => removeLink(link.key)}
            aria-label={$t("ev.removeLink")}
            title={$t("ev.removeLink")}>✕</button
          >
        </div>
      {/each}
      <button type="button" class="ghost" onclick={addLink}>{$t("ev.addLink")}</button>
    </div>
  </div>

  <div class="field">
    <div class="who-head">
      <span>{$t("ev.attended")}</span>
      <button
        type="button"
        class="ghost small"
        onclick={fromYesVotes}
        title={$t("ev.fromYesHint")}>{$t("ev.fromYes")}</button
      >
    </div>

    <div class="members">
      {#each $board.members as m (m.id)}
        <button
          type="button"
          class="member"
          class:on={memberIds.has(m.id)}
          aria-pressed={memberIds.has(m.id)}
          onclick={() => toggleMember(m.id, m.name)}
        >
          <span class="tick" aria-hidden="true">{memberIds.has(m.id) ? "✓" : ""}</span>
          <span class="mname">{m.name}</span>
        </button>
      {/each}
    </div>

    {#if guests.length}
      <ul class="guests">
        {#each guests as g (g.key)}
          <li>
            {g.name}
            <button
              type="button"
              onclick={() => removeAttendee(g.key)}
              aria-label={$t("ev.removeGuest")}
              title={$t("ev.removeGuest")}>✕</button
            >
          </li>
        {/each}
      </ul>
    {/if}

    <div class="guest-add">
      <input
        bind:value={guestName}
        placeholder={$t("ev.guestPlaceholder")}
        maxlength="60"
        autocomplete="off"
        onkeydown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addGuest();
          }
        }}
      />
      <button type="button" class="btn secondary" onclick={addGuest} disabled={!guestName.trim()}>
        {$t("ev.addGuest")}
      </button>
    </div>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="actions">
    {#if event}
      <button type="button" class="btn danger" onclick={destroy} disabled={busy}>
        {$t("ev.delete")}
      </button>
    {/if}
    <span class="spacer"></span>
    <button type="button" class="btn secondary" onclick={onDone} disabled={busy}>
      {$t("ev.cancel")}
    </button>
    <button type="button" class="btn" onclick={save} disabled={busy || !canSave}>
      {busy ? $t("ev.saving") : $t("ev.save")}
    </button>
  </div>
</div>

<style>
  .editor {
    display: grid;
    gap: 14px;
  }
  .field {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .field > span,
  .who-head > span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .swatch {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: var(--ev);
    padding: 0;
  }
  .swatch.on {
    border-color: var(--ink);
    box-shadow: 0 0 0 2px var(--surface) inset;
  }

  .rows {
    display: grid;
    gap: 8px;
  }
  .link-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .link-row .url {
    flex: 2 1 0;
    min-width: 0;
  }
  .link-row .label {
    flex: 1 1 0;
    min-width: 0;
  }
  .x {
    flex: 0 0 auto;
    width: 34px;
    min-height: 34px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--muted);
    font-size: 12px;
  }
  .x:hover {
    color: var(--no-ink);
    border-color: var(--no);
  }

  .ghost {
    justify-self: start;
    min-height: 34px;
    padding: 0 12px;
    border: 1px dashed var(--line);
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 800;
  }
  .ghost:hover {
    color: var(--ink);
    border-style: solid;
  }
  .ghost.small {
    min-height: 28px;
    font-size: 12px;
  }

  .who-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .member {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-height: 32px;
    padding: 0 11px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 700;
  }
  .member.on {
    border-color: color-mix(in srgb, var(--ev) 60%, var(--line));
    background: color-mix(in srgb, var(--ev) 16%, var(--surface));
    color: var(--ink);
  }
  .member .tick {
    width: 10px;
    flex: 0 0 auto;
    color: color-mix(in srgb, var(--ev) 45%, var(--ink));
    font-weight: 900;
  }
  .member .mname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .guests {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .guests li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 11px;
    border: 1px dashed var(--line);
    border-radius: 999px;
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .guests li button {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 11px;
    padding: 2px 4px;
    line-height: 1;
  }
  .guests li button:hover {
    color: var(--no-ink);
  }

  .guest-add {
    display: flex;
    gap: 8px;
  }
  .guest-add input {
    flex: 1;
    min-width: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }
  .error {
    margin: 0;
    color: var(--no-ink);
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .link-row {
      flex-wrap: wrap;
    }
    .link-row .url,
    .link-row .label {
      flex: 1 1 100%;
    }
    .actions .btn {
      flex: 1 1 auto;
    }
  }
</style>
