import { describe, expect, it } from "vitest";
import { enumerateDays, mondayBasedDay, toISO } from "../src/lib/date";
import { summarizeDay } from "../src/lib/vote";
import { dayMatchesFocus, focusYesCount, sortDays } from "../src/lib/derive";
import type { Filters } from "../src/lib/stores";
import type { VotesByDate } from "../src/lib/types";

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
