<script lang="ts">
  import { appConfig, session, filters, logout } from "../lib/stores";
  import type { ViewKind } from "../lib/stores";
  import CalendarView from "./CalendarView.svelte";
  import TimelineView from "./TimelineView.svelte";
  import Sidebar from "./Sidebar.svelte";
  import Controls from "./Controls.svelte";
  import PollsView from "./PollsView.svelte";
  import AdminPanel from "./AdminPanel.svelte";

  let adminOpen = $state(false);

  function setView(view: ViewKind) {
    filters.update((f) => ({ ...f, view }));
  }

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
        {#if $session.role === "admin"}
          <button class="btn" onclick={() => (adminOpen = true)}>Manage</button>
        {/if}
        <button class="btn secondary" onclick={onSignOut}>Sign out</button>
      {/if}
    </div>
  </header>

  {#if adminOpen}
    <AdminPanel onClose={() => (adminOpen = false)} />
  {/if}

  <div class="tabbar">
    <div class="tabs panel">
      <button class="tab" class:active={$filters.view === "calendar"} onclick={() => setView("calendar")}>
        Calendar
      </button>
      <button class="tab" class:active={$filters.view === "timeline"} onclick={() => setView("timeline")}>
        Timeline
      </button>
      <button class="tab" class:active={$filters.view === "votings"} onclick={() => setView("votings")}>
        Votings
      </button>
    </div>
  </div>

  {#if $filters.view !== "votings"}
    <Controls />
  {/if}

  {#if $filters.view === "calendar"}
    <main class="calendar-layout">
      <Sidebar />
      <CalendarView />
    </main>
  {:else if $filters.view === "timeline"}
    <main>
      <TimelineView />
    </main>
  {:else}
    <main>
      <PollsView />
    </main>
  {/if}
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
  .tabs {
    display: flex;
    gap: 6px;
    padding: 6px;
    width: fit-content;
  }
  .tab {
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    padding: 0 18px;
    color: var(--muted);
    background: transparent;
    font-weight: 800;
  }
  .tab.active {
    color: white;
    background: #17201d;
  }
  .calendar-layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 980px) {
    .calendar-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
