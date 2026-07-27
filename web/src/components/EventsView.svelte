<script lang="ts">
  // Reverse-chronological log of everything that happened, grouped by year.
  import { dayEvents, selectedDay, session } from "../lib/stores";
  import { toISO } from "../lib/date";
  import { t } from "../lib/i18n";
  import type { DayEventView } from "../lib/types";
  import EventCard from "./EventCard.svelte";

  let query = $state("");

  const isAdmin = $derived($session?.role === "admin");

  // The calendar is the other way in, but reaching a date years back means
  // scrolling a year of months — so admins get a date box straight to the day.
  let newDate = $state(toISO(new Date()));

  // ISO dates are zero-padded (the server enforces YYYY-MM-DD), so a plain
  // string compare is a correct date compare.
  let oldestFirst = $state(false);

  const all = $derived.by(() => {
    const dir = oldestFirst ? -1 : 1;
    return Object.values($dayEvents).sort(
      (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) * dir,
    );
  });

  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.attendees.some((a) => a.name.toLowerCase().includes(q)) ||
        e.date.includes(q),
    );
  });

  /** [year, events] newest year first; `matches` is already sorted by date desc. */
  const years = $derived.by(() => {
    const groups: { year: string; events: DayEventView[] }[] = [];
    for (const ev of matches) {
      const year = ev.date.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === year) last.events.push(ev);
      else groups.push({ year, events: [ev] });
    }
    return groups;
  });
</script>

<section class="events panel">
  <div class="head">
    <div class="heading">
      <p class="eyebrow">{$t("events.eyebrow")}</p>
      <h2>{$t("events.title")}</h2>
      <span class="count">
        {all.length === 1
          ? $t("events.countOne", { n: all.length })
          : $t("events.count", { n: all.length })}
      </span>
    </div>
    <div class="tools">
      {#if isAdmin}
        <div class="new" title={$t("events.newHint")}>
          <input type="date" bind:value={newDate} aria-label={$t("events.newDate")} />
          <button
            class="btn"
            onclick={() => newDate && selectedDay.set(newDate)}
            disabled={!newDate}
          >
            {$t("events.new")}
          </button>
        </div>
      {/if}
      {#if all.length > 0}
        <button
          class="order"
          onclick={() => (oldestFirst = !oldestFirst)}
          title={$t("events.orderHint")}
          aria-pressed={oldestFirst}
        >
          {oldestFirst ? "↑" : "↓"}
          {oldestFirst ? $t("events.oldestFirst") : $t("events.newestFirst")}
        </button>
        <input
          class="search"
          type="search"
          bind:value={query}
          placeholder={$t("events.search")}
          aria-label={$t("events.search")}
        />
      {/if}
    </div>
  </div>

  {#if all.length === 0}
    <p class="empty">{$t("events.empty")}</p>
  {:else if matches.length === 0}
    <p class="empty">{$t("events.noMatch")}</p>
  {:else}
    <div class="scroll">
      {#each years as group (group.year)}
        <section class="year-block">
          <h3 class="year">{group.year}</h3>
          <div class="cards">
            {#each group.events as event (event.date)}
              <EventCard {event} />
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .events {
    display: grid;
    gap: 14px;
    padding: 18px;
    min-width: 0;
  }
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .heading {
    min-width: 0;
  }
  .heading h2 {
    font-size: 22px;
    display: inline;
  }
  .count {
    margin-left: 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
  }
  .new {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .new input {
    min-width: 0;
  }
  .order {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 800;
    white-space: nowrap;
  }
  .order:hover {
    background: var(--chip);
  }
  .search {
    flex: 0 1 280px;
    min-width: 0;
  }

  .empty {
    margin: 0;
    padding: 26px 0;
    text-align: center;
    color: var(--muted);
    font-weight: 600;
  }

  .scroll {
    max-height: 76vh;
    max-height: min(76vh, 100svh - 260px);
    overflow: auto;
    display: grid;
    gap: 20px;
    padding-right: 6px;
  }
  .year-block {
    display: grid;
    gap: 10px;
  }
  /* sticky year divider, same treatment as the calendar's month titles */
  .year {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    padding: 8px 0;
    color: var(--muted);
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.16em;
    background: linear-gradient(var(--header), var(--header));
    backdrop-filter: blur(8px);
  }
  .year::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--line);
  }
  .cards {
    display: grid;
    gap: 10px;
  }

  @media (max-width: 640px) {
    .events {
      padding: 14px;
    }
    .tools {
      width: 100%;
    }
    .new {
      flex: 1 1 100%;
    }
    .new input {
      flex: 1;
    }
    .search {
      flex: 1 1 100%;
    }
    .scroll {
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
  }
</style>
