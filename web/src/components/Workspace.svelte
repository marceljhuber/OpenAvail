<script lang="ts">
  import { appConfig, session, logout } from "../lib/stores";

  async function onSignOut() {
    await logout();
  }
</script>

<div class="shell">
  <header class="topbar panel">
    <div class="brand">
      <span class="mark">OA</span>
      <span class="name">{$appConfig?.ownerName ?? ""}'s OpenAvail</span>
    </div>
    <div class="session">
      {#if $session}
        {#if $session.picture}
          <img class="avatar" src={$session.picture} alt="" referrerpolicy="no-referrer" />
        {/if}
        <span class="who">{$session.name}{$session.role === "admin" ? " · admin" : ""}</span>
        <button class="btn secondary" onclick={onSignOut}>Sign out</button>
      {/if}
    </div>
  </header>

  <main class="body">
    <!-- Controls, calendar, timeline, and admin panel are mounted in later steps. -->
    <section class="panel placeholder">
      <p class="eyebrow">Workspace</p>
      <h2>Views are wired up next.</h2>
    </section>
  </main>
</div>

<style>
  .shell {
    width: min(1440px, 100%);
    margin: 0 auto;
    padding: 18px;
    display: grid;
    gap: 16px;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    color: white;
    background: #17201d;
    font-size: 13px;
  }
  .session {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
  }
  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }
  .who {
    font-weight: 700;
    color: var(--ink);
  }
  .placeholder {
    padding: 28px;
  }
</style>
