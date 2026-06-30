<script lang="ts">
  import { appConfig, login } from "../lib/stores";
  import { renderGoogleButton } from "../lib/google";

  let buttonEl = $state<HTMLDivElement>();
  let error = $state<string | null>(null);
  let busy = $state(false);
  let rendered = false;

  const invite = new URLSearchParams(window.location.search).get("invite") ?? undefined;

  async function onCredential(credential: string) {
    busy = true;
    error = null;
    try {
      await login(credential, invite);
      // drop ?invite= from the URL after a successful join
      if (invite) history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      error = e instanceof Error ? e.message : "Sign-in failed.";
    } finally {
      busy = false;
    }
  }

  $effect(() => {
    const cfg = $appConfig;
    if (cfg && buttonEl && !rendered) {
      rendered = true;
      renderGoogleButton(buttonEl, cfg.googleClientId, onCredential);
    }
  });
</script>

<main class="landing">
  <div class="card panel">
    <div class="brand"><span class="mark">OA</span></div>
    <p class="eyebrow">Group availability</p>
    <h1>{$appConfig?.ownerName ?? ""}'s OpenAvail</h1>
    <p class="lede">
      Sign in to vote on the days you’re free and find when everyone can meet.
    </p>

    {#if invite}
      <p class="invite-note">You’ve been invited — sign in with Google to join.</p>
    {/if}

    <div class="signin" bind:this={buttonEl}></div>

    {#if busy}
      <p class="muted">Signing you in…</p>
    {/if}
    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if !invite}
      <p class="locked">This board is private. Ask the owner for an invite link to join.</p>
    {/if}
  </div>
</main>

<style>
  .landing {
    display: grid;
    place-items: center;
    min-height: 100vh;
    padding: 24px;
  }
  .card {
    width: min(440px, 100%);
    padding: 36px;
    text-align: center;
  }
  .brand {
    display: flex;
    justify-content: center;
    margin-bottom: 18px;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 16px;
    color: white;
    background: #17201d;
    font-weight: 800;
  }
  .eyebrow {
    justify-self: center;
  }
  h1 {
    font-size: clamp(28px, 5vw, 40px);
    margin-bottom: 10px;
  }
  .lede {
    color: var(--muted);
    line-height: 1.55;
    margin: 0 0 22px;
  }
  .signin {
    display: flex;
    justify-content: center;
    min-height: 44px;
  }
  .invite-note {
    color: var(--yes-ink);
    background: var(--yes-soft);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 16px;
  }
  .muted {
    color: var(--muted);
  }
  .error {
    color: var(--no-ink);
    font-weight: 700;
  }
  .locked {
    margin-top: 18px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
