<script lang="ts">
  import { selectedDay } from "../lib/stores";
  import { colorStyle } from "../lib/dayEvents";
  import { formatLongDate, parseISODate } from "../lib/date";
  import { t, localeTag } from "../lib/i18n";
  import type { DayEventView } from "../lib/types";
  import EventBody from "./EventBody.svelte";

  let { event }: { event: DayEventView } = $props();

  const date = $derived(parseISODate(event.date));
</script>

<article class="card" style={colorStyle(event.color)}>
  <span class="accent" aria-hidden="true"></span>

  <div class="inner">
    <div class="head">
      <div class="when">
        <span class="day">{date.getDate()}</span>
        <span class="mon">{date.toLocaleDateString($localeTag, { month: "short" })}</span>
      </div>
      <div class="titles">
        <h3>{event.title}</h3>
        <p class="date">{formatLongDate(date, $localeTag)}</p>
      </div>
      <button
        class="open"
        onclick={() => selectedDay.set(event.date)}
        title={$t("events.open")}
        aria-label={$t("events.open")}
      >
        {event.canManage ? $t("ev.edit") : $t("events.open")}
      </button>
    </div>

    <EventBody {event} compact />
  </div>
</article>

<style>
  .card {
    position: relative;
    display: flex;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--ev) 28%, var(--line));
    border-radius: 18px;
    background: color-mix(in srgb, var(--ev) 6%, var(--surface));
  }
  .accent {
    flex: 0 0 6px;
    background: var(--ev);
  }
  .inner {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 12px;
    padding: 14px 16px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .when {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 48px;
    padding: 6px 0;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ev) 16%, var(--surface));
    color: color-mix(in srgb, var(--ev) 45%, var(--ink));
    line-height: 1.1;
  }
  .when .day {
    font-size: 19px;
    font-weight: 900;
  }
  .when .mon {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .titles {
    flex: 1;
    min-width: 0;
  }
  .titles h3 {
    font-size: 17px;
    overflow-wrap: anywhere;
  }
  .date {
    margin: 2px 0 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }

  .open {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 800;
  }
  .open:hover {
    color: var(--ink);
    border-color: color-mix(in srgb, var(--ev) 50%, var(--line));
  }

  @media (max-width: 640px) {
    .inner {
      padding: 12px 13px;
    }
    .head {
      flex-wrap: wrap;
      gap: 10px;
    }
    /* keep date + title on line one and push the action to its own line */
    .open {
      order: 3;
      width: 100%;
    }
  }
</style>
