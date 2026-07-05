// Minimal i18n: a `locale` store, a reactive `t()` translator, and a
// locale-aware date tag. Add a language by extending `Locale` and `dict`.
import { derived, writable } from "svelte/store";

export type Locale = "en" | "de";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

const LOCALE_TAG: Record<Locale, string> = { en: "en-GB", de: "de-AT" };
const KEY = "openavail-locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "de") return saved;
  } catch {
    /* storage unavailable */
  }
  try {
    if (navigator.language?.toLowerCase().startsWith("de")) return "de";
  } catch {
    /* no navigator */
  }
  return "en";
}

export const locale = writable<Locale>(initialLocale());

export function setLocale(l: Locale): void {
  locale.set(l);
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
}

/** BCP-47 tag for `toLocaleDateString`, reactive to the chosen locale. */
export const localeTag = derived(locale, ($l) => LOCALE_TAG[$l]);

type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "{owner}'s OpenAvail",
  "topbar.theme": "Toggle dark mode",
  "topbar.admin": "admin",
  "topbar.manage": "Manage",
  "topbar.signout": "Sign out",
  "lang.choose": "Language",

  "tab.calendar": "Calendar",
  "tab.timeline": "Timeline",

  "controls.range": "Range",
  "controls.rangeStart": "Range start",
  "controls.rangeEnd": "Range end",
  "controls.onlyWhere": "Only days where",
  "controls.voted": "voted",
  "controls.requiredVote": "Required vote",
  "controls.clear": "clear",
  "controls.sort": "Sort",
  "controls.noMembers": "no members yet",
  "vote.yes": "Yes",
  "vote.maybe": "Maybe",
  "vote.no": "No",
  "sort.date": "Date",
  "sort.yes": "Most yes",
  "sort.total": "Most responses",
  "sort.maybe": "Most maybe",
  "sort.no": "Most no",
  "sort.focus": "Most yes (focus)",

  "cal.heatmap": "Heatmap",
  "cal.heatmapHint": "Shade each day green→red by how many said yes",
  "cal.fewer": "fewer",
  "cal.mostYes": "most yes",
  "cal.saidYes": "{yes} of {total} said yes",
  "cal.comments": "Comments & details",
  "cal.voteForDay": "Vote for this day",

  "tl.eyebrow": "Detailed votes",
  "tl.peopleDays": "People × days",
  "tl.days": "{n} days",
  "tl.day": "{n} day",
  "tl.filtered": " (filtered)",
  "tl.people": "{n} people",
  "tl.person": "Person",
  "tl.yesResponses": "Yes / responses",
  "tl.noMatch": "No days match the current range/filter.",
  "tl.jumpStart": "Jump to start",
  "tl.scrollLeft": "Scroll left",
  "tl.scrollRight": "Scroll right",
  "tl.jumpEnd": "Jump to end",
  "tl.gridAria": "Votes grid — drag, scroll or use arrow keys to pan across days",

  "votings.title": "Votings",
  "votings.new": "+ New",
  "votings.fieldTitle": "Title",
  "votings.titlePlaceholder": "e.g. 25.07. Day?",
  "votings.options": "Options",
  "votings.optionN": "Option {n}",
  "votings.removeOption": "Remove option",
  "votings.addOption": "+ Add option",
  "votings.mode": "Mode",
  "votings.cancel": "Cancel",
  "votings.start": "Start voting",
  "votings.starting": "Starting…",
  "votings.hint": "{mode} · results hidden until each person votes. Editable later.",
  "votings.empty": "No votings yet. Tap",
  "votings.emptyNew": "to start one.",
  "votings.error": "Could not start the voting.",
  "mode.single": "Single choice",
  "mode.multi": "Multiple choice",

  "poll.by": "by {name}",
  "poll.modeSingle": "single choice",
  "poll.modeMulti": "multiple choice",
  "poll.voters": "{n} voters",
  "poll.voter": "{n} voter",
  "poll.saving": "saving…",
  "poll.edit": "Edit",
  "poll.done": "Done",
  "poll.editVoting": "Edit voting",
  "poll.end": "End",
  "poll.endVoting": "End voting",
  "poll.reopen": "Re-open",
  "poll.reopenVoting": "Re-open voting",
  "poll.ended": "Ended",
  "poll.delete": "Delete voting",
  "poll.blindClosed": "🏁 Voting ended — here are the final results.",
  "poll.blindOpen": "🔒 Tap an option to vote — results reveal once you do.",
  "poll.whoVoted": "Who voted",
  "poll.whoAria": "{n} voters — show who",
  "poll.newOption": "New option…",
  "poll.add": "+ Add",
  "poll.confirmDelete": 'Delete the voting "{title}"?',
  "poll.confirmEnd":
    'End the voting "{title}"? Results become visible to everyone and no more votes can be cast.',

  "side.people": "People",
  "side.bestYes": "Best yes",
  "side.votedDays": "Voted days",
  "side.strongest": "Strongest days",
  "side.noVotes": "No votes in this range yet.",
  "side.recentChanges": "Recent changes",
  "side.noChanges": "No changes yet.",
  "side.summary": "{yes} yes · {maybe} maybe · {no} no",
};

const de: Dict = {
  "app.title": "{owner}s OpenAvail",
  "topbar.theme": "Dunkelmodus umschalten",
  "topbar.admin": "Admin",
  "topbar.manage": "Verwalten",
  "topbar.signout": "Abmelden",
  "lang.choose": "Sprache",

  "tab.calendar": "Kalender",
  "tab.timeline": "Zeitleiste",

  "controls.range": "Zeitraum",
  "controls.rangeStart": "Von",
  "controls.rangeEnd": "Bis",
  "controls.onlyWhere": "Nur Tage an denen",
  "controls.voted": "gestimmt hat",
  "controls.requiredVote": "Benötigte Stimme",
  "controls.clear": "zurücksetzen",
  "controls.sort": "Sortieren",
  "controls.noMembers": "noch keine Mitglieder",
  "vote.yes": "Ja",
  "vote.maybe": "Vielleicht",
  "vote.no": "Nein",
  "sort.date": "Datum",
  "sort.yes": "Meiste Ja",
  "sort.total": "Meiste Antworten",
  "sort.maybe": "Meiste Vielleicht",
  "sort.no": "Meiste Nein",
  "sort.focus": "Meiste Ja (Fokus)",

  "cal.heatmap": "Heatmap",
  "cal.heatmapHint": "Färbt jeden Tag grün→rot, je nachdem wie viele Ja gesagt haben",
  "cal.fewer": "weniger",
  "cal.mostYes": "meiste Ja",
  "cal.saidYes": "{yes} von {total} sagten Ja",
  "cal.comments": "Kommentare & Details",
  "cal.voteForDay": "Für diesen Tag abstimmen",

  "tl.eyebrow": "Detaillierte Stimmen",
  "tl.peopleDays": "Personen × Tage",
  "tl.days": "{n} Tage",
  "tl.day": "{n} Tag",
  "tl.filtered": " (gefiltert)",
  "tl.people": "{n} Personen",
  "tl.person": "Person",
  "tl.yesResponses": "Ja / Antworten",
  "tl.noMatch": "Keine Tage passen zum aktuellen Zeitraum/Filter.",
  "tl.jumpStart": "Zum Anfang springen",
  "tl.scrollLeft": "Nach links scrollen",
  "tl.scrollRight": "Nach rechts scrollen",
  "tl.jumpEnd": "Zum Ende springen",
  "tl.gridAria": "Stimmen-Raster — mit Ziehen, Scrollen oder Pfeiltasten durch die Tage bewegen",

  "votings.title": "Abstimmungen",
  "votings.new": "+ Neu",
  "votings.fieldTitle": "Titel",
  "votings.titlePlaceholder": "z. B. 25.07. Tag?",
  "votings.options": "Optionen",
  "votings.optionN": "Option {n}",
  "votings.removeOption": "Option entfernen",
  "votings.addOption": "+ Option hinzufügen",
  "votings.mode": "Modus",
  "votings.cancel": "Abbrechen",
  "votings.start": "Abstimmung starten",
  "votings.starting": "Wird gestartet…",
  "votings.hint": "{mode} · Ergebnisse verborgen bis jede Person abgestimmt hat. Später bearbeitbar.",
  "votings.empty": "Noch keine Abstimmungen. Tippe auf",
  "votings.emptyNew": "um eine zu starten.",
  "votings.error": "Abstimmung konnte nicht gestartet werden.",
  "mode.single": "Einzelauswahl",
  "mode.multi": "Mehrfachauswahl",

  "poll.by": "von {name}",
  "poll.modeSingle": "Einzelauswahl",
  "poll.modeMulti": "Mehrfachauswahl",
  "poll.voters": "{n} Stimmen",
  "poll.voter": "{n} Stimme",
  "poll.saving": "wird gespeichert…",
  "poll.edit": "Bearbeiten",
  "poll.done": "Fertig",
  "poll.editVoting": "Abstimmung bearbeiten",
  "poll.end": "Beenden",
  "poll.endVoting": "Abstimmung beenden",
  "poll.reopen": "Erneut öffnen",
  "poll.reopenVoting": "Abstimmung erneut öffnen",
  "poll.ended": "Beendet",
  "poll.delete": "Abstimmung löschen",
  "poll.blindClosed": "🏁 Abstimmung beendet — hier die Endergebnisse.",
  "poll.blindOpen": "🔒 Tippe eine Option an — Ergebnisse erscheinen, sobald du abstimmst.",
  "poll.whoVoted": "Wer hat gestimmt",
  "poll.whoAria": "{n} Stimmen — anzeigen wer",
  "poll.newOption": "Neue Option…",
  "poll.add": "+ Hinzufügen",
  "poll.confirmDelete": 'Abstimmung „{title}" löschen?',
  "poll.confirmEnd":
    'Abstimmung „{title}" beenden? Ergebnisse werden für alle sichtbar und es kann nicht mehr abgestimmt werden.',

  "side.people": "Personen",
  "side.bestYes": "Beste Ja",
  "side.votedDays": "Abgestimmte Tage",
  "side.strongest": "Stärkste Tage",
  "side.noVotes": "Noch keine Stimmen in diesem Zeitraum.",
  "side.recentChanges": "Letzte Änderungen",
  "side.noChanges": "Noch keine Änderungen.",
  "side.summary": "{yes} Ja · {maybe} Vielleicht · {no} Nein",
};

const dict: Record<Locale, Dict> = { en, de };

/** Reactive translator: `$t("key", { var: value })`. Falls back to English, then the key. */
export const t = derived(
  locale,
  ($l) =>
    (key: string, vars?: Record<string, string | number>): string => {
      let s = dict[$l][key] ?? dict.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
);
