<script lang="ts">
  import { appConfig, session, filters, selectedDay, logout } from "../lib/stores";
  import type { ViewKind } from "../lib/stores";
  import { t, locale, setLocale, LOCALES } from "../lib/i18n";
  import DayModal from "./DayModal.svelte";
  import CalendarView from "./CalendarView.svelte";
  import TimelineView from "./TimelineView.svelte";
  import EventsView from "./EventsView.svelte";
  import Sidebar from "./Sidebar.svelte";
  import Controls from "./Controls.svelte";
  import VotingsPanel from "./VotingsPanel.svelte";
  import AdminPanel from "./AdminPanel.svelte";
  import HoverCard from "./HoverCard.svelte";
  import ThemePicker from "./ThemePicker.svelte";
  import Logo from "./Logo.svelte";

  let adminOpen = $state(false);

  const TABS: { view: ViewKind; key: string }[] = [
    { view: "calendar", key: "tab.calendar" },
    { view: "timeline", key: "tab.timeline" },
    { view: "events", key: "tab.events" },
  ];

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
      <Logo size={32} />
      <span class="name">{$t("app.title", { owner: $appConfig?.ownerName ?? "" })}</span>
    </div>
    <div class="session">
      <!-- language picker -->
      <HoverCard align="end" role="menu" label={$t("lang.choose")} cardClass="pick-menu">
        {#snippet trigger()}
          <button class="btn secondary icon badge" aria-haspopup="menu" title={$t("lang.choose")}>
            {LOCALES.find((l) => l.code === $locale)?.short}
          </button>
        {/snippet}
        {#snippet content(close)}
          {#each LOCALES as l (l.code)}
            <button
              class="pick-item"
              class:on={$locale === l.code}
              role="menuitemradio"
              aria-checked={$locale === l.code}
              onclick={() => {
                setLocale(l.code);
                close();
              }}
            >
              <span class="short">{l.short}</span>
              {l.label}
            </button>
          {/each}
        {/snippet}
      </HoverCard>

      <ThemePicker />

      {#if $session}
        {#if $session.picture}
          <img class="avatar" src={$session.picture} alt="" referrerpolicy="no-referrer" />
        {/if}
        <span class="who">{$session.name}{$session.role === "admin" ? ` · ${$t("topbar.admin")}` : ""}</span>
        {#if $session.role === "admin"}
          <button class="btn" onclick={() => (adminOpen = true)}>{$t("topbar.manage")}</button>
        {/if}
        <button class="btn secondary" onclick={onSignOut}>{$t("topbar.signout")}</button>
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
          {#each TABS as tab (tab.view)}
            <button
              class="tab"
              class:active={$filters.view === tab.view}
              onclick={() => setView(tab.view)}
            >
              {$t(tab.key)}
            </button>
          {/each}
        </div>
      </div>

      <!-- range/focus/sort only mean something for the day views -->
      {#if $filters.view !== "events"}
        <Controls />
      {/if}

      {#if $filters.view === "calendar"}
        <div class="cal-grid">
          <CalendarView />
          <Sidebar />
        </div>
      {:else if $filters.view === "timeline"}
        <TimelineView />
      {:else}
        <EventsView />
      {/if}
    </div>
  </div>
</div>

<style>
  .shell {
    width: min(1720px, 100%);
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
  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .session {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    flex-wrap: wrap;
    min-width: 0;
  }
  .btn.icon {
    min-width: var(--tap);
    padding: 0 10px;
    font-size: 15px;
    line-height: 1;
  }
  .btn.icon.badge {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex: 0 0 auto;
  }
  .who {
    font-weight: 700;
    color: var(--ink);
    max-width: 22ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* votings rail (left) + main content (right) */
  .body {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
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
    color: var(--btn-fg);
    background: var(--btn);
  }

  /* calendar + stats sidebar (right) */
  .cal-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 14px;
    align-items: start;
  }

  /* stack the votings rail below the main content so the 7-column calendar
     keeps room, and drop the stats sidebar under the calendar */
  @media (max-width: 1200px) {
    .cal-grid {
      grid-template-columns: 1fr;
    }
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

  @media (max-width: 640px) {
    .shell {
      padding: 10px;
      gap: 10px;
    }
    .topbar {
      padding: 10px 12px;
      gap: 8px;
    }
    .brand .name {
      font-size: 14px;
    }
    .who {
      max-width: 12ch;
    }
    .tabs {
      width: 100%;
    }
    .tab {
      flex: 1;
      padding: 0 8px;
      min-height: var(--tap);
    }
  }
</style>
