<script lang="ts">
  // Extracted from the topbar so the signed-out landing page can offer it too —
  // otherwise a German visitor has no way to switch before signing in.
  import { t, locale, setLocale, LOCALES } from "../lib/i18n";
  import HoverCard from "./HoverCard.svelte";

  let { buttonClass = "btn secondary icon badge" }: { buttonClass?: string } = $props();
</script>

<HoverCard align="end" role="menu" label={$t("lang.choose")} cardClass="pick-menu">
  {#snippet trigger()}
    <button
      class={buttonClass}
      aria-haspopup="menu"
      title={$t("lang.choose")}
      aria-label={$t("lang.choose")}
    >
      {LOCALES.find((l) => l.code === $locale)?.short}
    </button>
  {/snippet}
  {#snippet content(close)}
    {#each LOCALES as l (l.code)}
      <button
        class="pick-item"
        class:on={$locale === l.code}
        role="menuitemradio"
        aria-checked={$locale === l.code}
        onclick={() => {
          setLocale(l.code);
          close();
        }}
      >
        <span class="short">{l.short}</span>
        {l.label}
      </button>
    {/each}
  {/snippet}
</HoverCard>
