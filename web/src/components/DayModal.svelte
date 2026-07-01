<script lang="ts">
  import { api } from "../lib/api";
  import { board, session, commentCounts } from "../lib/stores";
  import { getDayVoters, VOTE_LABEL } from "../lib/vote";
  import { formatLongDate, formatRelativeTime, parseISODate } from "../lib/date";
  import type { Comment, Vote } from "../lib/types";

  let { iso, onClose }: { iso: string; onClose: () => void } = $props();

  let comments = $state<Comment[]>([]);
  let body = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);
  let lastKey = "";

  const voters = $derived(getDayVoters($board.votes, $board.members, iso));
  const rows = $derived(
    (["yes", "maybe", "no"] as Vote[]).map((v) => ({ vote: v, names: voters[v] })),
  );

  async function load() {
    try {
      comments = await api.listComments(iso);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load comments.";
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
      error = e instanceof Error ? e.message : "Could not post comment.";
    } finally {
      busy = false;
    }
  }

  async function remove(c: Comment) {
    if (!confirm("Delete this comment?")) return;
    await api.deleteComment(c.id);
    await load();
  }

  function canDelete(c: Comment): boolean {
    return c.userId === $session?.id || $session?.role === "admin";
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onClose()} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onClose()}>
  <div class="modal panel" role="dialog" aria-label="Day details" aria-modal="true" tabindex="-1">
    <header>
      <div>
        <p class="eyebrow">Day</p>
        <h2>{formatLongDate(parseISODate(iso))}</h2>
      </div>
      <button class="x" onclick={onClose} aria-label="Close">✕</button>
    </header>

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
      <h3>Comments</h3>
      {#if comments.length === 0}
        <p class="muted">No comments yet. Start the discussion.</p>
      {:else}
        <ul>
          {#each comments as c (c.id)}
            <li>
              <div class="chead">
                <strong>{c.userName}</strong>
                <span class="muted">{formatRelativeTime(c.createdAt)}</span>
                {#if canDelete(c)}
                  <button class="del" onclick={() => remove(c)} aria-label="Delete comment">✕</button>
                {/if}
              </div>
              <p class="cbody">{c.body}</p>
            </li>
          {/each}
        </ul>
      {/if}

      {#if error}<p class="error">{error}</p>{/if}

      <form class="add" onsubmit={(e) => { e.preventDefault(); add(); }}>
        <input placeholder="Add a comment (e.g. can't do mornings)" bind:value={body} maxlength="1000" />
        <button class="btn" type="submit" disabled={!body.trim() || busy}>
          {busy ? "…" : "Post"}
        </button>
      </form>
    </section>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(20, 16, 8, 0.42);
    backdrop-filter: blur(3px);
  }
  .modal {
    width: min(560px, 100%);
    max-height: 88vh;
    overflow: auto;
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
  h2 {
    font-size: 22px;
  }
  .x {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 17px;
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
  }
  .chead .del {
    margin-left: auto;
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
</style>
