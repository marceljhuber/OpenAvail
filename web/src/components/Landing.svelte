<script lang="ts">
  import { appConfig, login, loginDev } from "../lib/stores";
  import { renderGoogleButton } from "../lib/google";
  import { t } from "../lib/i18n";
  import ThemePicker from "./ThemePicker.svelte";
  import LanguagePicker from "./LanguagePicker.svelte";
  import Logo from "./Logo.svelte";

  let buttonEl = $state<HTMLDivElement>();
  let error = $state<string | null>(null);
  let busy = $state(false);
  let devName = $state("");
  let rendered = false;

  const invite = new URLSearchParams(window.location.search).get("invite") ?? undefined;

  async function onDevLogin(e: Event) {
    e.preventDefault();
    if (!devName.trim()) return;
    busy = true;
    error = null;
    try {
      await loginDev(devName.trim());
    } catch (err) {
      error = err instanceof Error ? err.message : $t("landing.signinError");
    } finally {
      busy = false;
    }
  }

  async function onCredential(credential: string) {
    busy = true;
    error = null;
    try {
      await login(credential, invite);
      // drop ?invite= from the URL after a successful join
      if (invite) history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      error = e instanceof Error ? e.message : $t("landing.signinError");
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

<div class="corner-picks">
  <LanguagePicker buttonClass="btn secondary theme-toggle badge" />
  <ThemePicker buttonClass="btn secondary theme-toggle" />
</div>

<main class="landing">
  <div class="card panel">
    <div class="brand"><Logo size={52} /></div>
    <p class="eyebrow">{$t("landing.eyebrow")}</p>
    <h1>{$t("app.title", { owner: $appConfig?.ownerName ?? "" })}</h1>
    <p class="lede">{$t("landing.lede")}</p>

    {#if invite}
      <p class="invite-note">{$t("landing.invited")}</p>
    {/if}

    <div class="signin" bind:this={buttonEl}></div>

    {#if busy}
      <p class="muted">{$t("landing.signingIn")}</p>
    {/if}
    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if !invite}
      <p class="locked">{$t("landing.private")}</p>
    {/if}

    {#if $appConfig?.devLogin}
      <form class="dev" onsubmit={onDevLogin}>
        <p class="dev-label">{$t("landing.devLabel")}</p>
        <div class="dev-row">
          <input placeholder={$t("landing.devName")} bind:value={devName} />
          <button class="btn" type="submit">{$t("landing.devContinue")}</button>
        </div>
      </form>
    {/if}
  </div>
</main>

<style>
  .landing {
    display: grid;
    place-items: center;
    min-height: 100vh;
    min-height: 100svh;
    padding: 24px;
  }
  .corner-picks {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: var(--z-sticky);
    display: flex;
    gap: 8px;
  }
  /* the buttons live inside the picker components, so these rules escape scope */
  .corner-picks :global(.theme-toggle) {
    min-width: var(--tap);
    padding: 0 10px;
    font-size: 15px;
    line-height: 1;
  }
  .corner-picks :global(.theme-toggle.badge) {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
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
  .dev {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px dashed var(--line);
  }
  .dev-label {
    margin: 0 0 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .dev-row {
    display: flex;
    gap: 8px;
  }
  .dev-row input {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 640px) {
    .landing {
      padding: 16px;
    }
    .card {
      padding: 26px 20px;
    }
  }
</style>
