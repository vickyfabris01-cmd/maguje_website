// js/components/match-teaser.js  (NEW: full file)
import { supabase } from "../supabase-client.js";
import { injectStyle } from "../utils/inject-style.js";
import { combineDateTime } from "../utils/format.js";
import { liveIcon, clockIcon, chevronIcon } from "./icons.js";

injectStyle("match-teaser", `
  .match-teasers {
    display: flex; flex-direction: column; gap: var(--sp-xs); width: 100%;
  }
  .match-teaser {
    display: flex; align-items: center; gap: var(--sp-xs);
    padding: var(--sp-xs) var(--sp-sm);
    border: 1px solid var(--color-line); border-radius: var(--radius-lg);
    background: var(--color-summit-white); color: var(--color-ink);
    font-size: var(--fs-sm); text-decoration: none;
  }
  .match-teaser:focus-visible { outline: 2px solid var(--color-ridge-green); outline-offset: 2px; }
  .match-teaser__label {
    font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .match-teaser--live .match-teaser__label { color: var(--color-live); }
  .match-teaser__time {
    margin-left: auto; white-space: nowrap;
    font-family: var(--font-mono); font-size: var(--fs-xs); color: rgba(16, 36, 26, 0.6);
  }
  .match-teaser__chevron { display: inline-flex; flex-shrink: 0; color: rgba(16, 36, 26, 0.4); }
  .match-teaser--live .match-teaser__chevron { margin-left: auto; }
`);

/**
 * What anonymous visitors may know: whether a match is live, and when
 * the next one kicks off (same window the fixtures section uses: today
 * and tomorrow, scheduled or pending). No teams, venue or score.
 * Returns { live, upcoming }, each a row or null.
 */
export async function fetchMatchTeasers() {
  const { data, error } = await supabase.rpc("get_match_teaser");
  if (!error) {
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    return {
      live: rows.find((r) => r.is_live) || null,
      upcoming: rows.find((r) => !r.is_live) || null,
    };
  }

  // get_match_teaser is not deployed yet: same rules, direct lookup.
  return fetchTeasersFallback();
}

async function fetchTeasersFallback() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const [{ data: live }, { data: upcoming }] = await Promise.all([
    supabase
      .from("matches")
      .select("id")
      .eq("is_live", true)
      .eq("is_internal", true)
      .limit(1),
    supabase
      .from("matches")
      .select("id, is_live, match_date, match_time")
      .eq("is_internal", true)
      .in("status", ["scheduled", "pending"])
      .gte("match_date", today)
      .lte("match_date", tomorrow)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true }),
  ]);

  const next = (upcoming || []).find((m) => !m.is_live) || null;

  return {
    live: live?.length ? { is_live: true, kickoff_at: null } : null,
    upcoming: next
      ? { is_live: false, kickoff_at: combineDateTime(next.match_date, next.match_time) }
      : null,
  };
}

function formatKickoff(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

// Each row is a plain link; the destination pages are gated, so the
// sign-in overlay appears there. Returns "" when there is nothing to show.
export function matchTeasersHtml({ live, upcoming } = {}) {
  const rows = [];

  if (live) {
    rows.push(`
      <a href="/live" class="match-teaser match-teaser--live">
        ${liveIcon({ size: 16 })}
        <span class="match-teaser__label">Live now</span>
        <span class="match-teaser__chevron">${chevronIcon()}</span>
      </a>
    `);
  }

  if (upcoming) {
    const when = formatKickoff(upcoming.kickoff_at);
    rows.push(`
      <a href="/fixtures" class="match-teaser">
        ${clockIcon({ size: 16 })}
        <span class="match-teaser__label">Upcoming match</span>
        ${when ? `<span class="match-teaser__time">${when}</span>` : ""}
        <span class="match-teaser__chevron">${chevronIcon()}</span>
      </a>
    `);
  }

  return rows.length ? `<div class="match-teasers">${rows.join("")}</div>` : "";
}