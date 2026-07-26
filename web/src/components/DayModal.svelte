<script lang="ts">
  import { api } from "../lib/api";
  import { board, session, commentCounts, dayEvents } from "../lib/stores";
  import { getDayVoters, VOTE_LABEL } from "../lib/vote";
  import { colorStyle } from "../lib/dayEvents";
  import { formatLongDate, formatRelativeTime, parseISODate } from "../lib/date";
  import { t, localeTag } from "../lib/i18n";
  import type { Comment, Vote } from "../lib/types";
  import EventBody from "./EventBody.svelte";
  import EventEditor from "./EventEditor.svelte";

  let { iso, onClose }: { iso: string; onClose: () => void } = $props();

  let comments = $state<Comment[]>([]);
  let body = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);
  let lastKey = "";
  let editingEvent = $state(false);

  const voters = $derived(getDayVoters($board.votes, $board.members, iso));
  const rows = $derived(
    (["yes", "maybe", "no"] as Vote[]).map((v) => ({ vote: v, names: voters[v] })),
  );

  const event = $derived($dayEvents[iso] ?? null);
  const isAdmin = $derived($session?.role === "admin");

  async function load() {
    try {
      comments = await api.listComments(iso);
    } catch (e) {
      error = e instanceof Error ? e.message : $t("day.loadCommentsError");
    }
  }

  // (re)load when opened and whenever this day's comment count changes (via SSE)
  $effect(() => {
    const key = `${iso}:${$commentCounts[iso] ?? 0}`;
    if (key !== lastKey) {
      lastKey = key;
      load();
    }
  });

  async function add() {
    const text = body.trim();
    if (!text) return;
    busy = true;
    error = null;
    try {
      await api.addComment(iso, text);
      body = "";
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : $t("day.postCommentError");
    } finally {
      busy = false;
    }
  }

  async function remove(c: Comment) {
    if (!confirm($t("day.confirmDeleteComment"))) return;
    await api.deleteComment(c.id);
    await load();
  }

  function canDelete(c: Comment): boolean {
    return c.userId === $session?.id || $session?.role === "admin";
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && !editingEvent && onClose()} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onClose()}>
  <div class="modal panel" role="dialog" aria-label={$t("day.details")} aria-modal="true" tabindex="-1">
    <header>
      <div class="htext">
        <p class="eyebrow">{$t("day.eyebrow")}</p>
        <h2>{formatLongDate(parseISODate(iso), $localeTag)}</h2>
      </div>
      <button class="x" onclick={onClose} aria-label={$t("day.close")}>✕</button>
    </header>

    <!-- what actually happened on this day -->
    <section class="event" style={event ? colorStyle(event.color) : undefined}>
      {#if editingEvent}
        <EventEditor {iso} {event} onDone={() => (editingEvent = false)} />
      {:else if event}
        <div class="ev-head">
          <span class="dot" aria-hidden="true"></span>
          <h3>{event.title}</h3>
          {#if isAdmin}
            <button class="link-btn" onclick={() => (editingEvent = true)}>{$t("ev.edit")}</button>
          {/if}
        </div>
        <EventBody {event} />
      {:else}
        <div class="ev-empty">
          <p class="muted">{$t("ev.none")}</p>
          {#if isAdmin}
            <button class="btn secondary" onclick={() => (editingEvent = true)}>{$t("ev.add")}</button>
          {/if}
        </div>
      {/if}
    </section>

    <section class="voters">
      {#each rows as row (row.vote)}
        <div class="vrow">
          <span class="pill {row.vote}">{VOTE_LABEL[row.vote]}</span>
          {#if row.names.length}
            <span class="names">{row.names.join(", ")}</span>
          {:else}
            <span class="names muted">—</span>
          {/if}
        </div>
      {/each}
    </section>

    <section class="thread">
      <h3>{$t("day.comments")}</h3>
      {#if comments.length === 0}
        <p class="muted">{$t("day.noComments")}</p>
      {:else}
        <ul>
          {#each comments as c (c.id)}
            <li>
              <div class="chead">
                <strong>{c.userName}</strong>
                <span class="muted">{formatRelativeTime(c.createdAt, $localeTag)}</span>
                {#if canDelete(c)}
                  <button class="del" onclick={() => remove(c)} aria-label={$t("day.deleteComment")}>
                    ✕
                  </button>
                {/if}
              </div>
              <p class="cbody">{c.body}</p>
            </li>
          {/each}
        </ul>
      {/if}

      {#if error}<p class="error">{error}</p>{/if}

      <form class="add" onsubmit={(e) => { e.preventDefault(); add(); }}>
        <input placeholder={$t("day.commentPlaceholder")} bind:value={body} maxlength="1000" />
        <button class="btn" type="submit" disabled={!body.trim() || busy}>
          {busy ? "…" : $t("day.post")}
        </button>
      </form>
    </section>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: grid;
    place-items: center;
    padding: 18px;
    background: var(--backdrop);
    backdrop-filter: blur(3px);
  }
  .modal {
    width: min(600px, 100%);
    max-height: 88vh;
    max-height: 88svh;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 22px;
    display: grid;
    gap: 18px;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .htext {
    min-width: 0;
  }
  h2 {
    font-size: 22px;
  }
  .x {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    font-size: 17px;
  }
  .x:hover {
    background: var(--chip);
    color: var(--ink);
  }

  .event {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--ev, var(--line)) 35%, var(--line));
    border-radius: 16px;
    background: color-mix(in srgb, var(--ev, transparent) 7%, var(--surface-2));
  }
  .ev-head {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }
  .ev-head h3 {
    flex: 1;
    min-width: 0;
    font-size: 17px;
  }
  .dot {
    flex: 0 0 auto;
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: var(--ev);
  }
  .link-btn {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 800;
    text-decoration: underline;
    padding: 4px;
  }
  .link-btn:hover {
    color: var(--ink);
  }
  .ev-empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ev-empty p {
    margin: 0;
  }

  .voters {
    display: grid;
    gap: 8px;
  }
  .vrow {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .names {
    font-size: 14px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .thread h3 {
    font-size: 16px;
    margin-bottom: 10px;
  }
  .thread ul {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .chead {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    min-width: 0;
  }
  .chead strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chead .del {
    margin-left: auto;
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
  }
  .cbody {
    margin: 3px 0 0;
    overflow-wrap: anywhere;
  }
  .add {
    display: flex;
    gap: 8px;
  }
  .add input {
    flex: 1;
    min-width: 0;
  }
  .muted {
    color: var(--muted);
  }
  .error {
    color: var(--no-ink);
    font-weight: 700;
  }

  /* full-width sheet on phones — a centred card wastes most of the screen */
  @media (max-width: 640px) {
    .backdrop {
      padding: 0;
      place-items: end center;
    }
    .modal {
      width: 100%;
      max-height: 92svh;
      border-radius: 22px 22px 0 0;
      padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
