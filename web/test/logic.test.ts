import { describe, expect, it } from "vitest";
import { enumerateDays, mondayBasedDay, toISO } from "../src/lib/date";
import { getBestDays, summarizeDay } from "../src/lib/vote";
import {
  dayMatchesFocus,
  dayPassesEventFilter,
  focusYesCount,
  sortDays,
} from "../src/lib/derive";
import { linkIcon, linkKind, linkLabel, monthHue, prefillAttendees } from "../src/lib/dayEvents";
import type { Filters } from "../src/lib/stores";
import type { User, VotesByDate } from "../src/lib/types";

describe("date helpers", () => {
  it("toISO formats local dates", () => {
    expect(toISO(new Date(2026, 6, 1))).toBe("2026-07-01");
  });
  it("mondayBasedDay maps Monday→0 … Sunday→6", () => {
    expect(mondayBasedDay(new Date(2026, 6, 6))).toBe(0); // Mon 6 Jul 2026
    expect(mondayBasedDay(new Date(2026, 6, 5))).toBe(6); // Sun 5 Jul 2026
  });
  it("enumerateDays is inclusive", () => {
    expect(enumerateDays("2026-07-01", "2026-07-03").map(toISO)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
    expect(enumerateDays("2026-07-03", "2026-07-01")).toEqual([]);
  });
});

describe("vote summary", () => {
  it("counts yes/maybe/no/total", () => {
    const votes: VotesByDate = { "2026-07-01": { a: "yes", b: "yes", c: "maybe", d: "no" } };
    expect(summarizeDay(votes, "2026-07-01")).toEqual({ yes: 2, maybe: 1, no: 1, total: 4 });
  });
});

describe("strongest days", () => {
  const days = enumerateDays("2026-07-01", "2026-07-05");
  const votes: VotesByDate = {
    "2026-07-01": { a: "yes", b: "yes", c: "yes" }, // best, but in the past
    "2026-07-04": { a: "yes", b: "yes" },
    "2026-07-05": { a: "yes" },
  };

  it("ranks by yes, then by responses", () => {
    expect(getBestDays(days, votes).map((d) => d.iso)).toEqual([
      "2026-07-01",
      "2026-07-04",
      "2026-07-05",
    ]);
  });

  it("drops days before `notBefore` — a past day is never a suggestion", () => {
    const from = new Date(2026, 6, 3);
    expect(getBestDays(days, votes, from).map((d) => d.iso)).toEqual([
      "2026-07-04",
      "2026-07-05",
    ]);
  });
});

describe("focus filter + sort", () => {
  const votes: VotesByDate = {
    "2026-07-01": { rainer: "yes", ann: "yes", ben: "yes" }, // rainer yes, 3 yes
    "2026-07-02": { rainer: "yes", ann: "yes" }, //            rainer yes, 2 yes
    "2026-07-03": { rainer: "no", ann: "yes", ben: "yes" }, // rainer no
    "2026-07-04": { ann: "maybe" }, //                         rainer absent
  };
  const days = enumerateDays("2026-07-01", "2026-07-04");

  const base: Filters = {
    rangeFrom: "2026-07-01",
    rangeTo: "2026-07-04",
    focusMembers: ["rainer"],
    focusVote: "yes",
    sortBy: "date",
    view: "calendar",
    heatmap: false,
  };

  it("dayMatchesFocus keeps only days where Rainer voted yes", () => {
    const kept = days.filter((d) => dayMatchesFocus(votes, toISO(d), ["rainer"], "yes")).map(toISO);
    expect(kept).toEqual(["2026-07-01", "2026-07-02"]);
  });

  it("no focus members → every day passes", () => {
    expect(dayMatchesFocus(votes, "2026-07-03", [], "yes")).toBe(true);
  });

  it("focusYesCount counts focused members with the required vote", () => {
    expect(focusYesCount(votes, "2026-07-01", ["rainer", "ann"], "yes")).toBe(2);
    expect(focusYesCount(votes, "2026-07-03", ["rainer", "ann"], "yes")).toBe(1);
  });

  it("'sort by most yes' over Rainer-yes days ranks Jul 1 before Jul 2", () => {
    const filtered = days.filter((d) => dayMatchesFocus(votes, toISO(d), ["rainer"], "yes"));
    const sorted = sortDays(filtered, votes, { ...base, sortBy: "yes" }).map(toISO);
    expect(sorted).toEqual(["2026-07-01", "2026-07-02"]);
  });
});

describe("with-event filter", () => {
  const events = { "2026-07-01": {} };

  it("passes everything while the filter is off", () => {
    expect(dayPassesEventFilter(events, "2026-07-02", false)).toBe(true);
    expect(dayPassesEventFilter({}, "2026-07-02", false)).toBe(true);
  });

  it("keeps only days that have an event once it is on", () => {
    expect(dayPassesEventFilter(events, "2026-07-01", true)).toBe(true);
    expect(dayPassesEventFilter(events, "2026-07-02", true)).toBe(false);
  });
});

describe("day event links", () => {
  it("classifies known hosts and falls back to a generic link", () => {
    expect(linkKind("https://www.youtube.com/watch?v=x")).toBe("youtube");
    expect(linkKind("https://youtu.be/x")).toBe("youtube");
    expect(linkKind("https://instagram.com/p/abc")).toBe("instagram");
    expect(linkKind("https://www.tiktok.com/@a/video/1")).toBe("tiktok");
    expect(linkKind("https://example.com/thing")).toBe("link");
    expect(linkKind("not a url")).toBe("link");
  });

  it("gives every kind an icon", () => {
    expect(linkIcon("https://youtu.be/x")).not.toBe(linkIcon("https://example.com"));
  });

  it("labels a link with its own label, else the bare hostname", () => {
    expect(linkLabel("https://youtu.be/x", "recap")).toBe("recap");
    expect(linkLabel("https://www.example.com/a/b", "")).toBe("example.com");
    expect(linkLabel("https://www.example.com/a/b", "   ")).toBe("example.com");
  });
});

describe("attendee prefill", () => {
  const members: User[] = [
    { id: "u1", email: "a@x.com", name: "Ann", picture: "", role: "member" },
    { id: "u2", email: "b@x.com", name: "Bo", picture: "", role: "member" },
    { id: "u3", email: "c@x.com", name: "Cy", picture: "", role: "member" },
  ];

  it("seeds from the day's yes-voters only", () => {
    const votes: VotesByDate = { "2026-07-01": { u1: "yes", u2: "maybe", u3: "yes" } };
    expect(prefillAttendees(votes, members, "2026-07-01")).toEqual([
      { id: "member:u1", userId: "u1", name: "Ann" },
      { id: "member:u3", userId: "u3", name: "Cy" },
    ]);
  });

  it("is empty for a day nobody said yes to", () => {
    expect(prefillAttendees({ "2026-07-01": { u1: "no" } }, members, "2026-07-01")).toEqual([]);
    expect(prefillAttendees({}, members, "2026-07-01")).toEqual([]);
  });

  it("matches on id, so a namesake is not seeded by someone else's yes-vote", () => {
    const namesakes: User[] = [
      { id: "u1", email: "ann1@x.com", name: "Ann", picture: "", role: "member" },
      { id: "u2", email: "ann2@x.com", name: "Ann", picture: "", role: "member" },
    ];
    expect(prefillAttendees({ "2026-07-01": { u1: "yes" } }, namesakes, "2026-07-01")).toEqual([
      { id: "member:u1", userId: "u1", name: "Ann" },
    ]);
  });
});

describe("monthHue", () => {
  it("is stable per month and spans the wheel", () => {
    expect(monthHue(0)).toBe(0);
    expect(monthHue(6)).toBe(180);
    expect(monthHue(11)).toBe(330);
    // same month in a different year gets the same tint
    expect(monthHue(12)).toBe(monthHue(0));
  });
});
