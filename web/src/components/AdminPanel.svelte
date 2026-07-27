<script lang="ts">
  import { api } from "../lib/api";
  import { refreshBoard, session } from "../lib/stores";
  import { t, localeTag } from "../lib/i18n";
  import { focusTrap } from "../lib/focusTrap";
  import type { Invite, User } from "../lib/types";

  let { onClose }: { onClose: () => void } = $props();

  type InviteRow = Invite & { active: boolean };

  let invites = $state<InviteRow[]>([]);
  let members = $state<User[]>([]);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let copied = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let editName = $state("");

  async function load() {
    error = null;
    try {
      const [inv, mem] = await Promise.all([api.listInvites(), api.listMembers()]);
      invites = inv;
      members = mem;
    } catch (e) {
      error = e instanceof Error ? e.message : $t("admin.loadError");
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
      error = e instanceof Error ? e.message : $t("admin.createInviteError");
    } finally {
      busy = false;
    }
  }

  async function copy(row: InviteRow) {
    await navigator.clipboard?.writeText(row.url).catch(() => {});
    copied = row.token;
  }

  async function revoke(token: string) {
    if (!confirm($t("admin.confirmRevoke"))) return;
    await api.revokeInvite(token);
    await load();
  }

  function startEdit(member: User) {
    editingId = member.id;
    editName = member.name;
    error = null;
  }

  function cancelEdit() {
    editingId = null;
    editName = "";
  }

  async function saveEdit(member: User) {
    const next = editName.trim();
    if (!next || next === member.name) {
      cancelEdit();
      return;
    }
    busy = true;
    error = null;
    try {
      await api.renameMember(member.id, next);
      cancelEdit();
      await Promise.all([load(), refreshBoard()]);
    } catch (e) {
      error = e instanceof Error ? e.message : $t("admin.renameError");
    } finally {
      busy = false;
    }
  }

  async function remove(member: User) {
    if (!confirm($t("admin.confirmRemove", { name: member.name }))) return;
    await api.removeMember(member.id);
    await Promise.all([load(), refreshBoard()]);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString($localeTag, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** Stable identifier — also used as the CSS class, so it must stay English. */
  function status(row: InviteRow): "active" | "expired" | "revoked" {
    if (row.revoked) return "revoked";
    if (!row.active) return "expired";
    return "active";
  }

  const STATUS_KEY = {
    active: "admin.statusActive",
    expired: "admin.statusExpired",
    revoked: "admin.statusRevoked",
  } as const;
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onClose()} />

<div
  class="backdrop"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <div
    class="modal panel"
    role="dialog"
    aria-label={$t("admin.title")}
    aria-modal="true"
    tabindex="-1"
    use:focusTrap
  >
    <header>
      <h2>{$t("admin.title")}</h2>
      <button class="x" onclick={onClose} aria-label={$t("admin.close")}>✕</button>
    </header>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <section>
      <div class="sec-head">
        <h3>{$t("admin.invites")}</h3>
        <button class="btn" onclick={createInvite} disabled={busy}>
          {busy ? $t("admin.creating") : $t("admin.createInvite")}
        </button>
      </div>
      <p class="hint">{$t("admin.inviteHint")}</p>

      {#if invites.length === 0}
        <p class="muted">{$t("admin.noInvites")}</p>
      {:else}
        <ul class="list">
          {#each invites as row (row.token)}
            <li class="row">
              <span class="badge {status(row)}">{$t(STATUS_KEY[status(row)])}</span>
              <code class="url">{row.url}</code>
              <span class="exp muted">{$t("admin.expires", { when: fmt(row.expiresAt) })}</span>
              <span class="actions">
                <button class="link" onclick={() => copy(row)}>
                  {copied === row.token ? $t("admin.copied") : $t("admin.copy")}
                </button>
                {#if status(row) === "active"}
                  <button class="link danger" onclick={() => revoke(row.token)}>
                    {$t("admin.revoke")}
                  </button>
                {/if}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h3>{$t("admin.members", { n: members.length })}</h3>
      <ul class="list">
        {#each members as m (m.id)}
          <li class="row member">
            {#if editingId === m.id}
              <form
                class="editform"
                onsubmit={(e) => { e.preventDefault(); saveEdit(m); }}
              >
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  class="editname"
                  bind:value={editName}
                  maxlength="80"
                  autofocus
                  onkeydown={(e) => e.key === "Escape" && cancelEdit()}
                  aria-label={$t("admin.memberName")}
                />
                <button class="link" type="submit" disabled={busy || !editName.trim()}>
                  {$t("admin.save")}
                </button>
                <button class="link muted" type="button" onclick={cancelEdit}>
                  {$t("admin.cancel")}
                </button>
              </form>
            {:else}
              <span class="who">
                <strong>{m.name}</strong>
                <span class="muted">{m.email}</span>
              </span>
              <span class="role {m.role}">
                {m.role === "admin" ? $t("admin.roleAdmin") : $t("admin.roleMember")}
              </span>
              <button class="link" onclick={() => startEdit(m)}>{$t("admin.rename")}</button>
              {#if m.role === "admin" || m.id === $session?.id}
                <span class="muted small">—</span>
              {:else}
                <button class="link danger" onclick={() => remove(m)}>{$t("admin.remove")}</button>
              {/if}
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
    z-index: var(--z-modal);
    display: grid;
    place-items: center;
    padding: 18px;
    background: var(--backdrop);
    backdrop-filter: blur(3px);
  }
  .modal {
    width: min(720px, 100%);
    max-height: 88vh;
    max-height: 88svh;
    overflow: auto;
    overscroll-behavior: contain;
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
    background: var(--surface);
    font-size: 13px;
    min-width: 0;
  }
  .url {
    flex: 1;
    min-width: 0;
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
    flex: 0 0 auto;
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
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .member .who > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .editform {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .editname {
    flex: 1;
    min-width: 0;
  }
  .role {
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 800;
    background: var(--empty);
    color: var(--muted);
  }
  .role.admin {
    color: var(--btn-fg);
    background: var(--btn);
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

  @media (max-width: 640px) {
    .backdrop {
      padding: 0;
      place-items: end center;
    }
    .modal {
      width: 100%;
      max-height: 92svh;
      border-radius: 22px 22px 0 0;
      padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
    }
    .sec-head {
      flex-direction: column;
      align-items: flex-start;
    }
    .row {
      flex-wrap: wrap;
    }
    .url {
      flex-basis: 100%;
      order: 3;
    }
    .exp {
      font-size: 12px;
    }
    .editform {
      flex-wrap: wrap;
    }
  }
</style>
