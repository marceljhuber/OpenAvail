<script lang="ts">
  import { appConfig, session, filters, selectedDay, logout } from "../lib/stores";
  import type { ViewKind } from "../lib/stores";
  import DayModal from "./DayModal.svelte";
  import CalendarView from "./CalendarView.svelte";
  import TimelineView from "./TimelineView.svelte";
  import Sidebar from "./Sidebar.svelte";
  import Controls from "./Controls.svelte";
  import VotingsPanel from "./VotingsPanel.svelte";
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

  {#if $selectedDay}
    <DayModal iso={$selectedDay} onClose={() => selectedDay.set(null)} />
  {/if}

  <div class="body">
    <VotingsPanel />

    <div class="mainarea">
      <div class="bar">
        <div class="tabs panel">
          <button class="tab" class:active={$filters.view === "calendar"} onclick={() => setView("calendar")}>
            Calendar
          </button>
          <button class="tab" class:active={$filters.view === "timeline"} onclick={() => setView("timeline")}>
            Timeline
          </button>
        </div>
      </div>

      <Controls />

      {#if $filters.view === "calendar"}
        <div class="cal-grid">
          <CalendarView />
          <Sidebar />
        </div>
      {:else}
        <TimelineView />
      {/if}
    </div>
  </div>
</div>

<style>
  .shell {
    width: min(1560px, 100%);
    margin: 0 auto;
    padding: 16px;
    display: grid;
    gap: 14px;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    flex-wrap: wrap;
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
    width: 34px;
    height: 34px;
    border-radius: 11px;
    color: white;
    background: #17201d;
    font-size: 13px;
  }
  .session {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    flex-wrap: wrap;
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

  /* votings rail (left) + main content (right) */
  .body {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
  }
  .mainarea {
    display: grid;
    gap: 14px;
    min-width: 0;
  }
  .bar {
    display: flex;
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

  /* calendar + stats sidebar (right) */
  .cal-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 14px;
    align-items: start;
  }

  @media (max-width: 1200px) {
    .cal-grid {
      grid-template-columns: 1fr;
    }
  }

  /* stack the votings rail below the main content on narrower screens so the
     7-column calendar keeps room */
  @media (max-width: 1100px) {
    .body {
      grid-template-columns: 1fr;
    }
    .mainarea {
      order: 1;
    }
    :global(.body > .votings) {
      order: 2;
    }
  }

  @media (max-width: 620px) {
    .shell {
      padding: 10px;
      gap: 10px;
    }
    .topbar {
      padding: 10px 12px;
    }
    .tabs {
      width: 100%;
    }
    .tab {
      flex: 1;
    }
  }
</style>
