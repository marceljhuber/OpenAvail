<script lang="ts">
  // Read-only rendering of an event's description, links and attendees.
  // Shared by the day modal and the Events list so they can never drift.
  import type { DayEventView } from "../lib/types";
  import { linkIcon, linkLabel } from "../lib/dayEvents";
  import { t } from "../lib/i18n";

  let { event, compact = false }: { event: DayEventView; compact?: boolean } = $props();
</script>

{#if event.description}
  <p class="desc" class:compact>{event.description}</p>
{/if}

{#if event.links.length}
  <ul class="links">
    {#each event.links as link (link.id)}
      <li>
        <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
          <span class="ico" aria-hidden="true">{linkIcon(link.url)}</span>
          <span class="txt">{linkLabel(link.url, link.label)}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

{#if event.attendees.length}
  <div class="attendees">
    <span class="who-label">{$t("ev.attendeeCount", { n: event.attendees.length })}</span>
    <ul>
      {#each event.attendees as a (a.id)}
        <li class="who" class:guest={a.userId === null}>{a.name}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .desc {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.5;
    color: var(--ink);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  /* in the list view, keep long write-ups from dominating the card */
  .desc.compact {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .links a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-height: 30px;
    padding: 0 11px;
    border: 1px solid color-mix(in srgb, var(--ev, var(--line)) 40%, var(--line));
    border-radius: 999px;
    background: color-mix(in srgb, var(--ev, var(--chip)) 12%, var(--surface));
    color: color-mix(in srgb, var(--ev, var(--ink)) 45%, var(--ink));
    font-size: 12.5px;
    font-weight: 800;
    text-decoration: none;
  }
  .links a:hover {
    background: color-mix(in srgb, var(--ev, var(--chip)) 22%, var(--surface));
  }
  .links .ico {
    flex: 0 0 auto;
    font-size: 11px;
  }
  .links .txt {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attendees {
    display: grid;
    gap: 6px;
  }
  .who-label {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .attendees ul {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .who {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--chip);
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  /* guests aren't board members — dashed outline marks them as "from outside" */
  .who.guest {
    background: transparent;
    border: 1px dashed var(--line);
    color: var(--muted);
  }
</style>
