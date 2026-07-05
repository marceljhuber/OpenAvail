<script lang="ts">
  import { appConfig, session, filters, selectedDay, theme, toggleTheme, logout } from "../lib/stores";
  import type { ViewKind } from "../lib/stores";
  import { t, locale, setLocale, LOCALES } from "../lib/i18n";
  import DayModal from "./DayModal.svelte";
  import CalendarView from "./CalendarView.svelte";
  import TimelineView from "./TimelineView.svelte";
  import Sidebar from "./Sidebar.svelte";
  import Controls from "./Controls.svelte";
  import VotingsPanel from "./VotingsPanel.svelte";
  import AdminPanel from "./AdminPanel.svelte";

  let adminOpen = $state(false);

  // Language menu: open on hover/focus, but linger briefly after the pointer
  // leaves so you can move down into the list without it vanishing.
  let langOpen = $state(false);
  let langTimer: ReturnType<typeof setTimeout> | undefined;
  function openLang() {
    clearTimeout(langTimer);
    langOpen = true;
  }
  function closeLangSoon() {
    clearTimeout(langTimer);
    langTimer = setTimeout(() => (langOpen = false), 1600);
  }
  function pickLang(code: Parameters<typeof setLocale>[0]) {
    setLocale(code);
    clearTimeout(langTimer);
    langOpen = false;
  }

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
      <span class="name">{$t("app.title", { owner: $appConfig?.ownerName ?? "" })}</span>
    </div>
    <div class="session">
      <!-- language picker: opens on hover/focus and lingers after mouse-out -->
      <div
        class="lang"
        role="menu"
        tabindex="-1"
        onmouseenter={openLang}
        onmouseleave={closeLangSoon}
        onfocusin={openLang}
        onfocusout={closeLangSoon}
      >
        <button
          class="btn secondary icon lang-btn"
          aria-haspopup="menu"
          aria-expanded={langOpen}
          title={$t("lang.choose")}
          onclick={() => (langOpen ? (langOpen = false) : openLang())}
        >
          {LOCALES.find((l) => l.code === $locale)?.flag}
        </button>
        {#if langOpen}
          <div class="lang-menu">
            {#each LOCALES as l (l.code)}
              <button
                class="lang-item"
                class:on={$locale === l.code}
                role="menuitemradio"
                aria-checked={$locale === l.code}
                onclick={() => pickLang(l.code)}
              >
                <span class="flag">{l.flag}</span>
                {l.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button
        class="btn secondary icon"
        onclick={toggleTheme}
        title={$t("topbar.theme")}
        aria-label={$t("topbar.theme")}
      >
        {$theme === "dark" ? "☀️" : "🌙"}
      </button>
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
          <button class="tab" class:active={$filters.view === "calendar"} onclick={() => setView("calendar")}>
            {$t("tab.calendar")}
          </button>
          <button class="tab" class:active={$filters.view === "timeline"} onclick={() => setView("timeline")}>
            {$t("tab.timeline")}
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
  .mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    color: var(--btn-fg);
    background: var(--btn);
    font-size: 13px;
  }
  .session {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .btn.icon {
    padding: 0 10px;
    font-size: 15px;
  }
  .lang {
    position: relative;
  }
  .lang-btn {
    font-size: 17px;
    line-height: 1;
  }
  .lang-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 2px;
    /* top padding bridges the gap to the button so the pointer never leaves
       the .lang region on the way down to the list */
    padding: 8px 6px 6px;
    min-width: 160px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: var(--shadow);
  }
  .lang-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--ink);
    font-weight: 700;
    font-size: 14px;
    text-align: left;
  }
  .lang-item:hover {
    background: var(--chip);
  }
  .lang-item.on {
    background: var(--chip);
  }
  .lang-item .flag {
    font-size: 16px;
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
