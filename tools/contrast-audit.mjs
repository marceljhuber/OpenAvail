// WCAG AA contrast audit for every theme palette.
//
// CLAUDE.md claims all six palettes clear 4.5:1 everywhere. This is what backs
// that claim: it boots the real app against a throwaway database, seeds it so
// every view has something to show (including one day event per palette colour),
// then walks 6 themes x 8 views measuring the *computed* colour of every text
// node against its real composited background.
//
//   npm i --no-save playwright-core && node tools/contrast-audit.mjs
//
// playwright-core is deliberately NOT a repo dependency — it drives the Chrome
// already installed on the machine (channel "chrome"), and this never runs in
// `npm test`. Pass --keep-open to leave the browser up for a look around.
//
// Exit code is the number of failing pairs, so CI could gate on it later.

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8899;
const BASE = `http://127.0.0.1:${PORT}`;
// must equal what the browser dev-login derives from the name below:
// `${name.toLowerCase()}@dev.local` — otherwise the audit runs as a member and
// never sees the admin-only views.
const ADMIN_NAME = "Alexandra";
const ADMIN_EMAIL = `${ADMIN_NAME.toLowerCase()}@dev.local`;
const KEEP_OPEN = process.argv.includes("--keep-open");

const THEMES = ["warm", "paper", "dark", "midnight", "ocean", "forest"];
const COLORS = ["sage", "amber", "coral", "plum", "ocean", "forest", "rose", "slate"];

// ── seeding ──────────────────────────────────────────────────────────────────

/** Cookie-jar-less fetch helper: keeps one session cookie per "user". */
function client() {
  let cookie = "";
  return async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  };
}

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

async function seed() {
  const admin = client();
  await admin("POST", "/api/auth/dev", { name: ADMIN_NAME, email: ADMIN_EMAIL });

  // A few members with deliberately long names — truncation and wrapping bugs
  // only show up when the text is wider than its box.
  const members = [
    "Maximilian Bartholomew",
    "Bo",
    "Katharina Übelacker",
    "Jonas",
    "Priya Ramachandran",
  ];
  const others = [];
  for (const name of members) {
    const c = client();
    await c("POST", "/api/auth/dev", { name });
    others.push(c);
  }

  // votes spread across past and future so the heatmap, "top day" ring and the
  // past-day styling all have something to render
  const votes = ["yes", "maybe", "no"];
  for (const [i, c] of others.entries()) {
    for (let d = -20; d <= 20; d += 3) {
      await c("POST", "/api/vote", { date: iso(d), vote: votes[(i + d + 60) % 3] });
    }
  }

  // one poll voted, one not, one closed — the three blind/revealed states
  // the poll routes return a poll *view*, not a { poll } envelope
  const open = await admin("POST", "/api/polls", {
    title: "Where should the summer trip go?",
    options: ["Slovenia", "Italian lakes", "Somewhere with fewer mosquitoes"],
    mode: "multi",
  });
  await admin("POST", `/api/polls/${open.id}/vote`, { optionIds: [open.options[0].id] });
  // left unvoted on purpose: the blind state has its own colours
  await admin("POST", "/api/polls", {
    title: "Pizza or ramen?",
    options: ["Pizza", "Ramen"],
    mode: "single",
  });
  const closed = await admin("POST", "/api/polls", {
    title: "Was the karaoke a good idea?",
    options: ["Yes", "Absolutely not"],
    mode: "single",
  });
  await admin("POST", `/api/polls/${closed.id}/close`, {});

  await admin("POST", "/api/comments", {
    date: iso(2),
    body: "Can't do mornings — anything after 14:00 works for me.",
  });

  // ONE EVENT PER COLOUR. This is the point of the rewrite: the previous audit
  // only measured whatever colours happened to be in the seed data, so most of
  // the --ev-* tokens were never checked against text drawn on them.
  for (const [i, color] of COLORS.entries()) {
    await admin("PUT", `/api/day-events/${iso(-2 - i * 3)}`, {
      title: `One Piece Ketchup Day (${color})`,
      color,
      description:
        "A long enough description that it wraps onto a second line in the card, " +
        "because clipped and wrapped text land on different backgrounds.",
      links: [
        { url: "https://www.youtube.com/watch?v=x", label: "" },
        { url: "https://instagram.com/p/abc", label: "the photos" },
      ],
      attendees: [
        { userId: null, name: "A guest from outside" },
        { userId: null, name: "Another guest" },
      ],
    });
  }
}

// ── measurement ──────────────────────────────────────────────────────────────

/**
 * Parse anything getComputedStyle can hand back. Chrome serialises color-mix()
 * results as `color(srgb r g b / a)` — missing that made an earlier run report
 * false failures, because unparsed backgrounds fell through to the page colour.
 */
const PARSE = String.raw`
function parseColor(str) {
  if (!str) return null;
  let m = /^rgba?\(([^)]+)\)$/.exec(str);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  m = /^color\(srgb ([^)]+)\)$/.exec(str);
  if (m) {
    const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number);
    return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
  }
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}
function over(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}
function lum(c) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/**
 * Real background behind an element: walk ancestors compositing each layer,
 * and at every level also composite any *absolutely positioned sibling* that
 * overlaps and paints behind us. Ancestors alone are not enough — the poll
 * result bar is an absolutely positioned sibling underlay, so a white-ish fill
 * behind near-white text read as "text on the dark page background" and the
 * failure went unreported.
 */
function bgOf(el) {
  const rect = el.getBoundingClientRect();
  let acc = { r: 0, g: 0, b: 0, a: 0 };
  for (let n = el; n; n = n.parentElement) {
    // the node's own background first: it paints ABOVE a sibling underlay
    // (that is the whole point of the .opt z-index rules)
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) acc = over(acc, c);
    if (acc.a >= 0.999) return acc;

    for (const sib of n.parentElement?.children ?? []) {
      if (sib === n || sib.contains(el)) continue;
      const scs = getComputedStyle(sib);
      if (scs.position !== 'absolute' && scs.position !== 'fixed') continue;
      const sr = sib.getBoundingClientRect();
      // only count it if it actually sits under our text box
      if (sr.left > rect.left || sr.right < rect.right) continue;
      if (sr.top > rect.top || sr.bottom < rect.bottom) continue;
      const sc = parseColor(scs.backgroundColor);
      if (sc && sc.a > 0) acc = over(acc, sc);
      if (acc.a >= 0.999) return acc;
    }
  }
  return over(acc, { r: 255, g: 255, b: 255, a: 1 });
}
function label(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).join('.') : '';
  return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
}
`;

// One expression: page.evaluate() takes a string as an *expression*, so the
// helper declarations have to live inside the IIFE.
const COLLECT = `(() => {
${PARSE}
  const out = [];
  const seen = new Set();

  function record(key, text, fg, bg, size, weight) {
    const composited = over(fg, bg);
    // Dedupe on the label AND the actual colours. Keying on the class list
    // alone collapsed all eight event cards into one row — they share every
    // class and differ only in the --ev custom property, so seven of the eight
    // palette colours were never measured at all.
    const id = key + '|' + [composited, bg].map((c) =>
      [c.r, c.g, c.b].map((v) => Math.round(v)).join(',')).join('|');
    if (seen.has(id)) return;
    seen.add(id);
    // WCAG: 3.0 is enough for large text (>=24px, or >=18.66px bold)
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    out.push({
      key,
      text: text.slice(0, 40),
      ratio: Math.round(ratio(composited, bg) * 100) / 100,
      need: large ? 3 : 4.5,
      size,
    });
  }

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Deliberate de-emphasis (.dim, :disabled) is exempt, but anything else
    // faded with opacity is NOT: opacity multiplies straight into the ratio,
    // and skipping those elements is what hid the past-day-cell problem before.
    if (el.matches('.dim, .dim *, :disabled, :disabled *')) continue;

    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');

    const fg = parseColor(cs.color);
    const bg = bgOf(el);
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;

    if (own && fg) {
      // key on the full class chain, not a truncated one: collapsing
      // .vote.yes/.maybe/.no into a single row hid two of the three.
      record(label(el), own, fg, bg, size, weight);
    }

    // ::placeholder is a separate colour the UA can override; check it too.
    if (el.matches('input, textarea') && el.placeholder) {
      const ph = parseColor(getComputedStyle(el, '::placeholder').color);
      if (ph) record(label(el) + '::placeholder', el.placeholder, ph, bg, size, weight);
    }
  }
  return out;
})()
`;

// ── driving ──────────────────────────────────────────────────────────────────

async function waitForHealth(timeoutMs = 30000) {
  const started = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > timeoutMs) throw new Error("server did not start");
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function main() {
  if (!existsSync(join(ROOT, "web", "dist", "index.html"))) {
    throw new Error("web/dist is missing — run `npm run build` first.");
  }

  const dbDir = await mkdtemp(join(tmpdir(), "openavail-audit-"));
  // node directly, not `npx tsx`: on Windows npx is a .cmd shim that needs
  // shell:true, and then server.kill() only kills the shell — the orphaned
  // server keeps the port and the next run silently talks to the *old* build.
  const server = spawn(
    process.execPath,
    ["--import", "tsx", "src/index.ts"],
    {
      cwd: join(ROOT, "server"),
      env: {
        ...process.env,
        NODE_ENV: "development",
        DEV_LOGIN: "true",
        PORT: String(PORT),
        DB_PATH: join(dbDir, "audit.db"),
        STATIC_DIR: join(ROOT, "web", "dist"),
        ADMIN_EMAIL,
        OWNER_NAME: "Contrast Audit",
        GOOGLE_CLIENT_ID: "audit-client-id",
      },
      stdio: "ignore",
    },
  );

  let browser;
  const failures = [];
  let measured = 0;
  const perTheme = {};

  try {
    await waitForHealth();
    await seed();

    browser = await chromium.launch({ channel: "chrome", headless: !KEEP_OPEN });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    // The app auto-detects German from the machine locale; pin it so the
    // selectors below (and the reported labels) stay stable.
    await ctx.addInitScript(() => {
      localStorage.setItem("openavail-locale", "en");
    });
    const page = await ctx.newPage();

    await page.goto(BASE);
    await page.getByPlaceholder("Your name").fill(ADMIN_NAME);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForSelector(".topbar");

    const views = [
      { name: "calendar", go: async () => clickTab(page, "Calendar") },
      {
        name: "calendar-heatmap",
        go: async () => {
          await clickTab(page, "Calendar");
          await page.getByRole("button", { name: /Heatmap/ }).click();
        },
        after: async () => page.getByRole("button", { name: /Heatmap/ }).click(),
      },
      {
        name: "calendar-only-events",
        go: async () => {
          await clickTab(page, "Calendar");
          await page.getByRole("button", { name: /With event/ }).click();
        },
        after: async () => page.getByRole("button", { name: /With event/ }).click(),
      },
      { name: "timeline", go: async () => clickTab(page, "Timeline") },
      { name: "events", go: async () => clickTab(page, "Events") },
      {
        name: "day-modal",
        go: async () => {
          await clickTab(page, "Events");
          await page.locator(".card .open").first().click();
          await page.waitForSelector('[role="dialog"]');
        },
        after: async () => page.keyboard.press("Escape"),
      },
      {
        name: "event-editor",
        go: async () => {
          await clickTab(page, "Events");
          await page.locator(".card .open").first().click();
          await page.waitForSelector('[role="dialog"]');
          const edit = page.getByRole("button", { name: "Edit event" });
          if (await edit.count()) await edit.first().click();
        },
        // the day modal deliberately ignores Escape while the editor is open
        // (so a stray keypress can't discard what you typed) — cancel first
        after: async () => {
          const cancel = page.getByRole("button", { name: "Cancel" });
          if (await cancel.count()) await cancel.first().click();
          await page.keyboard.press("Escape");
        },
      },
      {
        name: "admin",
        go: async () => {
          await page.getByRole("button", { name: "Manage" }).click();
          await page.waitForSelector('[role="dialog"]');
        },
        after: async () => page.keyboard.press("Escape"),
      },
    ];

    for (const theme of THEMES) {
      await page.evaluate((t) => {
        localStorage.setItem("openavail-theme", t);
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
      perTheme[theme] = { min: Infinity, minWhere: "", pairs: 0 };

      for (const view of views) {
        await view.go();
        await page.waitForTimeout(220);
        const rows = await page.evaluate(COLLECT);
        for (const row of rows) {
          measured += 1;
          perTheme[theme].pairs += 1;
          if (row.ratio < perTheme[theme].min) {
            perTheme[theme].min = row.ratio;
            perTheme[theme].minWhere = `${view.name} ${row.key}`;
          }
          if (row.ratio < row.need) {
            failures.push({ theme, view: view.name, ...row });
          }
        }
        if (view.after) await view.after();
      }
    }

    if (KEEP_OPEN) await page.waitForTimeout(600000);
  } finally {
    await browser?.close().catch(() => {});
    server.kill();
    await rm(dbDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log(
    `\n${measured} text/background pairs measured across ${THEMES.length} themes x 8 views\n`,
  );
  for (const theme of THEMES) {
    const t = perTheme[theme];
    console.log(
      `  ${theme.padEnd(9)} ${String(t.pairs).padStart(4)} pairs   min ${t.min.toFixed(2)}  (${t.minWhere})`,
    );
  }

  if (failures.length === 0) {
    console.log("\nPASS — every pair clears its WCAG AA threshold.\n");
    return 0;
  }
  console.log(`\nFAIL — ${failures.length} pairs below threshold:\n`);
  for (const f of failures.sort((a, b) => a.ratio - b.ratio)) {
    console.log(
      `  ${f.ratio.toFixed(2)} (need ${f.need})  ${f.theme}/${f.view}  ${f.key}  "${f.text}"`,
    );
  }
  return failures.length;
}

async function clickTab(page, name) {
  await page.locator(".tabs .tab", { hasText: new RegExp(`^${name}$`) }).click();
}

process.exitCode = await main();
