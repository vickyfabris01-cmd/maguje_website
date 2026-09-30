// js/views/live-match.js  (UPDATED: full file; signed-in behavior is the original code, unchanged)
import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { router } from "../router.js";
import { injectStyle } from "../utils/inject-style.js";
import { liveIcon } from "../components/icons.js";
import {
  withAccountGate,
  openAccountRequiredModal,
} from "../utils/account-gate.js";

injectStyle("live-teaser", `
  .live-teaser {
    all: unset; box-sizing: border-box; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: var(--sp-xs);
    width: 100%; max-width: 420px; margin: 0 auto;
    padding: var(--sp-lg) var(--sp-md);
    border: 1px solid var(--color-line); border-radius: var(--radius-lg);
    background: var(--color-summit-white); color: var(--color-ink);
    text-align: center;
  }
  .live-teaser:focus-visible { outline: 2px solid var(--color-ridge-green); outline-offset: 2px; }
  .live-teaser__badge {
    display: inline-flex; align-items: center; gap: var(--sp-2xs);
    color: var(--color-live); font-weight: 700; font-size: var(--fs-sm);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .live-teaser__title { font-size: var(--fs-lg); font-weight: 600; }
  .live-teaser__cta {
    margin-top: var(--sp-2xs); padding: var(--sp-2xs) var(--sp-md);
    border-radius: var(--radius-sm); background: var(--color-ridge-green);
    color: var(--color-summit-white); font-weight: 600; font-size: var(--fs-base);
  }
`);

// Signed-in behaviour: unchanged from before the account gate.
async function memberLiveView() {
  await viewContainer.renderSkeleton(
    `<div class="container">${skeletons.matchDetails()}</div>`,
  );

  try {
    const { data: match, error } = await supabase
      .from("matches")
      .select("slug")
      .eq("is_live", true)
      .eq("is_internal", true)
      .maybeSingle();

    if (error) throw error;

    if (match?.slug) {
      router.navigate(`/matches/${match.slug}`, { replace: true });
      return { cleanup: null };
    }

    await renderNoLiveMatch();
    return { cleanup: null };
  } catch (err) {
    console.error("[live-match] lookup failed:", err);
    await renderNoLiveMatch();
    return { cleanup: null };
  }
}

async function renderNoLiveMatch() {
  await viewContainer.render(`
    <div class="container section" style="text-align:center;">
      <h1 class="text-display-xl">No live match right now</h1>
      <p class="text-body-md" style="margin-top: var(--sp-sm); color: rgba(16,36,26,0.6);">
        Check back during the next matchday, or view upcoming fixtures below.
      </p>
      <a href="/fixtures" class="btn btn--primary" style="margin-top: var(--sp-md); display:inline-block;">
        View Fixtures
      </a>
    </div>
  `);
}

// Anonymous visitors only learn whether a match is live, nothing else.
async function fetchTeaser() {
  const { data, error } = await supabase.rpc("get_match_teaser");
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return row || null;
  }

  // get_match_teaser is not deployed yet: fall back to a bare live check.
  const { data: live } = await supabase
    .from("matches")
    .select("id")
    .eq("is_live", true)
    .eq("is_internal", true)
    .maybeSingle();
  return live ? { is_live: true, status: null, kickoff_at: null } : null;
}

async function renderLiveTeaser() {
  await viewContainer.renderSkeleton(
    `<div class="container">${skeletons.matchDetails()}</div>`,
  );

  let teaser = null;
  try {
    teaser = await fetchTeaser();
  } catch (err) {
    console.error("[live-match] teaser lookup failed:", err);
  }

  if (!teaser?.is_live) {
    await renderNoLiveMatch();
    return;
  }

  await viewContainer.render(`
    <div class="container section" style="text-align:center;">
      <button type="button" class="live-teaser" data-live-teaser>
        <span class="live-teaser__badge">${liveIcon({ size: 18 })}<span>Live now</span></span>
        <span class="live-teaser__title">A match is being played right now</span>
        <span class="live-teaser__cta">Log in to watch</span>
      </button>
    </div>
  `);

  document.querySelector("[data-live-teaser]")?.addEventListener("click", () => {
    openAccountRequiredModal({
      title: "Account required",
      message: "Log in or create an account to watch the live match.",
    });
  });
}

export const liveMatchView = withAccountGate(memberLiveView, {
  renderLocked: renderLiveTeaser,
});