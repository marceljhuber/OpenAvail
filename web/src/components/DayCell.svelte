<script lang="ts">
  import type { DaySummary, User, Vote, VotesByDate } from "../lib/types";
  import { summarizeDay, getDayVoters } from "../lib/vote";
  import { commentCounts, dayEvents, selectedDay, session } from "../lib/stores";
  import { colorStyle } from "../lib/dayEvents";
  import { t, localeTag } from "../lib/i18n";
  import HoverCard from "./HoverCard.svelte";
  import VoteButtons from "./VoteButtons.svelte";

  let {
    date,
    iso,
    votes,
    members,
    currentUserId,
    maxYes,
    focusActive,
    matches,
    heatmap = false,
    past = false,
  }: {
    date: Date;
    iso: string;
    votes: VotesByDate;
    members: User[];
    currentUserId: string;
    maxYes: number;
    focusActive: boolean;
    matches: boolean;
    heatmap?: boolean;
    past?: boolean;
  } = $props();

  const summary = $derived<DaySummary>(summarizeDay(votes, iso));
  const voters = $derived(getDayVoters(votes, members, iso));
  const current = $derived<Vote | undefined>(votes[iso]?.[currentUserId]);
  const alpha = $derived(Math.min(0.38, (summary.yes / Math.max(1, maxYes)) * 0.34));
  const isTop = $derived(maxYes > 0 && summary.yes === maxYes);

  // Heatmap: shade each day that has responses from dark-green (most yes) through
  // yellow to dark-red (fewest), relative to the busiest day. Hue 0=red … 140=green.
  const heatOn = $derived(heatmap && summary.total > 0 && maxYes > 0);
  const heatHue = $derived((summary.yes / maxYes) * 140);

  const commentN = $derived($commentCounts[iso] ?? 0);
  const event = $derived($dayEvents[iso] ?? null);
  const isAdmin = $derived($session?.role === "admin");

  const voterRows: { vote: Vote; names: string[] }[] = $derived(
    (["yes", "maybe", "no"] as Vote[])
      .map((v) => ({ vote: v, names: voters[v] }))
      .filter((r) => r.names.length > 0),
  );

  const longDate = $derived(
    date.toLocaleDateString($localeTag, { weekday: "long", day: "numeric", month: "long" }),
  );
</script>

<article
  class="day-cell"
  class:top-day={isTop && !heatOn}
  class:match={focusActive && matches}
  class:dim={focusActive && !matches}
  class:heat={heatOn}
  class:past
  class:has-event={!!event}
  style="--yes-alpha: {alpha.toFixed(2)}; --heat-hue: {heatHue.toFixed(0)}; {event
    ? colorStyle(event.color)
    : ''}"
>
  <div class="day-head">
    <!-- the date opens the day: comments, and what happened on it -->
    <button
      class="date-number"
      onclick={() => selectedDay.set(iso)}
      title={longDate}
      aria-label={longDate}
    >
      {date.getDate()}
    </button>
    <span class="weekday-tag">{date.toLocaleDateString($localeTag, { weekday: "short" })}</span>
    <span class="spacer"></span>
    <span class="yes-score" title={$t("cal.saidYes", { yes: summary.yes, total: members.length })}>
      {summary.yes}/{members.length}
    </span>
    <button
      class="cbtn"
      class:has={commentN > 0}
      onclick={() => selectedDay.set(iso)}
      title={$t("cal.comments")}
      aria-label={$t("cal.comments")}
    >
      💬{commentN > 0 ? ` ${commentN}` : ""}
    </button>
  </div>

  {#if event}
    <button class="ev-chip" onclick={() => selectedDay.set(iso)} title={event.title}>
      <span class="ev-dot" aria-hidden="true"></span>
      <span class="ev-title">{event.title}</span>
    </button>
  {:else if isAdmin}
    <button class="ev-add" onclick={() => selectedDay.set(iso)} title={$t("ev.add")}>
      + {$t("ev.eyebrow")}
    </button>
  {/if}

  <!-- counts double as the hover/focus/tap trigger: names stay hidden until then -->
  <HoverCard align="center" disabled={summary.total === 0} label={$t("poll.whoVoted")}>
    {#snippet trigger()}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="counts-wrap"
        tabindex={summary.total > 0 ? 0 : -1}
        class:has-voters={summary.total > 0}
      >
        <span class="pill yes">{summary.yes}</span>
        <span class="pill maybe">{summary.maybe}</span>
        <span class="pill no">{summary.no}</span>
      </div>
    {/snippet}
    {#snippet content()}
      {#each voterRows as row (row.vote)}
        {#each row.names as name (name)}
          <div class="who"><span class="dot {row.vote}"></span>{name}</div>
        {/each}
      {/each}
    {/snippet}
  </HoverCard>

  <VoteButtons date={iso} {current} />
</article>

<style>
  .day-cell {
    min-height: 168px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 10px;
    min-width: 0;
    /* blend the "yes" tint into the surface so text stays readable in both
       light and dark themes (a translucent bright-green overlay washed out
       text in dark mode) */
    background: color-mix(
      in srgb,
      var(--yes) calc(var(--yes-alpha, 0) * 100%),
      var(--surface)
    );
    transition: opacity 0.15s, outline-color 0.15s, background 0.15s;
  }
  .day-cell.top-day {
    outline: 3px solid color-mix(in srgb, var(--yes) 30%, transparent);
  }
  /* A recorded event colours the whole day, not just its chip: a tinted border,
     a solid bar along the top edge, and a wash that fades out downward so the
     vote buttons keep a neutral base to sit on.
     The wash is a background-IMAGE layered over .day-cell's background-color,
     so the yes-tint underneath still reads through it — and so the heatmap's
     `background` shorthand below cleanly replaces it (in heatmap mode the fill
     is the point; the top bar still marks the day). --month-mix is the
     palette's "how strong may a decorative tint be" knob, ~7% light / 10% dark. */
  .day-cell.has-event {
    border-color: color-mix(in srgb, var(--ev) 62%, var(--line));
    background-image: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--ev) calc(var(--month-mix) * 2.6), transparent),
      transparent 74%
    );
    box-shadow: inset 0 3px 0 var(--ev);
  }
  /* heatmap fill overrides the subtle yes-tint; mixed with the surface so the
     day's chips/text stay legible in both themes */
  .day-cell.heat {
    background: color-mix(
      in srgb,
      hsl(var(--heat-hue, 0) 68% 45%) 48%,
      var(--surface)
    );
    border-color: color-mix(in srgb, hsl(var(--heat-hue, 0) 68% 45%) 55%, var(--line));
  }
  .day-cell.match {
    outline: 3px solid var(--yes);
  }
  .day-cell.dim {
    opacity: 0.32;
  }
  /* Past days are where the Events feature lives, so they must stay fully
     readable. Fading the whole cell dragged every label under 4.5:1, so "past"
     is signalled with a dashed border and a quieter date chip instead — no
     opacity, no contrast cost. */
  .day-cell.past {
    border-style: dashed;
  }
  .day-cell.past .date-number {
    background: transparent;
    box-shadow: inset 0 0 0 1px var(--line);
  }

  .day-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .spacer {
    flex: 1;
    min-width: 0;
  }
  .date-number {
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    border: 0;
    border-radius: 10px;
    background: var(--chip);
    color: var(--ink);
    font-weight: 900;
    flex: 0 0 auto;
  }
  .date-number:hover {
    background: var(--btn);
    color: var(--btn-fg);
  }
  /* the calendar's Mon–Sun header is hidden on mobile (see CalendarView),
     so surface each day's weekday inline there instead */
  .weekday-tag {
    display: none;
    color: var(--muted);
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
  }
  /* --ink, not --yes-ink: the cell behind this is itself tinted with --yes (and
     with the heatmap fill on top of that), so a green ink on a green wash
     measured 3.4–4.4:1 in every palette. */
  .yes-score {
    flex: 0 0 auto;
    color: var(--ink);
    font-weight: 800;
    font-size: 12px;
    white-space: nowrap;
  }
  .cbtn {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: 800;
    /* Neither an opacity fade nor --muted survives here: --muted is solved
       against --surface, but this button sits on the yes-tinted (and, in
       heatmap mode, strongly coloured) cell, where it measured 2.65:1. */
    color: var(--ink);
    line-height: 1;
  }
  .cbtn.has {
    color: var(--ink);
  }

  .ev-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    min-height: 26px;
    padding: 0 9px;
    border: 1px solid color-mix(in srgb, var(--ev) 42%, var(--line));
    border-radius: 9px;
    background: color-mix(in srgb, var(--ev) 18%, var(--surface));
    /* mostly --ink with a hint of the event colour — the reverse fails 4.5:1
       against the chip's own tinted fill */
    color: color-mix(in srgb, var(--ev) 45%, var(--ink));
    font-size: 12px;
    font-weight: 800;
    text-align: left;
  }
  .ev-chip:hover {
    background: color-mix(in srgb, var(--ev) 30%, var(--surface));
  }
  .ev-dot {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--ev);
  }
  /* two lines rather than one hard ellipsis — day columns are narrow */
  .ev-title {
    min-width: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.25;
  }

  /* admins get a quiet "record something here" affordance on hover. Hidden
     entirely where there is no hover: tapping the date opens the same modal,
     and a dashed button on all 31 days is just noise. */
  .ev-add {
    display: none;
    align-self: start;
    min-height: 24px;
    padding: 0 8px;
    border: 1px dashed var(--line);
    border-radius: 9px;
    background: transparent;
    /* same reason as .cbtn: --muted is too light against the tinted cell */
    color: var(--ink);
    font-size: 11px;
    font-weight: 800;
    opacity: 0;
    transition: opacity 0.15s;
  }
  @media (hover: hover) {
    .ev-add {
      display: block;
    }
    .day-cell:hover .ev-add,
    .day-cell:focus-within .ev-add,
    .ev-add:focus-visible {
      opacity: 1;
    }
  }

  /* counts fill the middle so the vote buttons stay pinned to the bottom */
  .counts-wrap {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    flex: 1;
    align-items: flex-start;
  }
  .counts-wrap.has-voters {
    cursor: help;
  }
  .counts-wrap .pill {
    flex: 1 1 0;
    min-width: 0;
  }

  /* voter rows live inside the portaled hover card, hence :global */
  :global(.hc-card .who) {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink);
  }
  :global(.hc-card .who:hover) {
    background: var(--chip);
  }
  :global(.hc-card .who .dot) {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    flex: 0 0 auto;
  }
  :global(.hc-card .who .dot.yes) {
    background: var(--yes);
  }
  :global(.hc-card .who .dot.maybe) {
    background: var(--maybe);
  }
  :global(.hc-card .who .dot.no) {
    background: var(--no);
  }

  @media (max-width: 900px) {
    .weekday-tag {
      display: inline;
    }
  }

  /* single-column phone layout: the fixed 168px floor makes every day a
     full screen of scrolling, so let cells shrink to their content */
  @media (max-width: 480px) {
    .day-cell {
      min-height: 0;
      gap: 6px;
    }
    .counts-wrap {
      flex: 0 0 auto;
    }
  }
</style>
