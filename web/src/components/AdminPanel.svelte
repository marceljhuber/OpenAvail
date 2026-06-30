<script lang="ts">
  import { api } from "../lib/api";
  import { refreshBoard, session } from "../lib/stores";
  import type { Invite, User } from "../lib/types";

  let { onClose }: { onClose: () => void } = $props();

  type InviteRow = Invite & { active: boolean };

  let invites = $state<InviteRow[]>([]);
  let members = $state<User[]>([]);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let copied = $state<string | null>(null);

  async function load() {
    error = null;
    try {
      const [inv, mem] = await Promise.all([api.listInvites(), api.listMembers()]);
      invites = inv;
      members = mem;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load.";
    }
  }

  $effect(() => {
    load();
  });

  async function createInvite() {
    busy = true;
    error = null;
    try {
      const invite = await api.createInvite();
      await navigator.clipboard?.writeText(invite.url).catch(() => {});
      copied = invite.token;
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create invite.";
    } finally {
      busy = false;
    }
  }

  async function copy(row: InviteRow) {
    await navigator.clipboard?.writeText(row.url).catch(() => {});
    copied = row.token;
  }

  async function revoke(token: string) {
    if (!confirm("Revoke this invite link? It will stop working immediately.")) return;
    await api.revokeInvite(token);
    await load();
  }

  async function remove(member: User) {
    if (!confirm(`Remove ${member.name}? Their votes will be deleted.`)) return;
    await api.removeMember(member.id);
    await Promise.all([load(), refreshBoard()]);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function status(row: InviteRow): string {
    if (row.revoked) return "revoked";
    if (!row.active) return "expired";
    return "active";
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onClose()} />

<div
  class="backdrop"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <div class="modal panel" role="dialog" aria-label="Manage board" aria-modal="true" tabindex="-1">
    <header>
      <h2>Manage board</h2>
      <button class="x" onclick={onClose} aria-label="Close">✕</button>
    </header>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <section>
      <div class="sec-head">
        <h3>Invite links</h3>
        <button class="btn" onclick={createInvite} disabled={busy}>
          {busy ? "Creating…" : "Create invite link"}
        </button>
      </div>
      <p class="hint">Anyone with an active link can sign in with Google and join (valid ~24h).</p>

      {#if invites.length === 0}
        <p class="muted">No invites yet.</p>
      {:else}
        <ul class="list">
          {#each invites as row (row.token)}
            <li class="row">
              <span class="badge {status(row)}">{status(row)}</span>
              <code class="url">{row.url}</code>
              <span class="exp muted">expires {fmt(row.expiresAt)}</span>
              <span class="actions">
                <button class="link" onclick={() => copy(row)}>
                  {copied === row.token ? "copied!" : "copy"}
                </button>
                {#if status(row) === "active"}
                  <button class="link danger" onclick={() => revoke(row.token)}>revoke</button>
                {/if}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h3>Members ({members.length})</h3>
      <ul class="list">
        {#each members as m (m.id)}
          <li class="row member">
            <span class="who">
              <strong>{m.name}</strong>
              <span class="muted">{m.email}</span>
            </span>
            <span class="role {m.role}">{m.role}</span>
            {#if m.role === "admin" || m.id === $session?.id}
              <span class="muted small">—</span>
            {:else}
              <button class="link danger" onclick={() => remove(m)}>remove</button>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(20, 16, 8, 0.42);
    backdrop-filter: blur(3px);
  }
  .modal {
    width: min(720px, 100%);
    max-height: 88vh;
    overflow: auto;
    padding: 22px;
    display: grid;
    gap: 22px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .x {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 18px;
  }
  .sec-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  h3 {
    font-size: 17px;
  }
  .hint {
    color: var(--muted);
    font-size: 13px;
    margin: 0 0 12px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: white;
    font-size: 13px;
  }
  .url {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--ink);
  }
  .exp {
    flex: 0 0 auto;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .badge {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .badge.active {
    color: var(--yes-ink);
    background: var(--yes-soft);
  }
  .badge.expired {
    color: var(--maybe-ink);
    background: var(--maybe-soft);
  }
  .badge.revoked {
    color: var(--no-ink);
    background: var(--no-soft);
  }
  .member .who {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .role {
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 800;
    background: #eee7dc;
    color: var(--muted);
  }
  .role.admin {
    color: white;
    background: #17201d;
  }
  .link {
    border: 0;
    background: transparent;
    color: var(--yes-ink);
    font-weight: 800;
    font-size: 13px;
  }
  .link.danger {
    color: var(--no-ink);
  }
  .muted {
    color: var(--muted);
  }
  .small {
    font-size: 12px;
  }
  .error {
    color: var(--no-ink);
    font-weight: 700;
  }
</style>
