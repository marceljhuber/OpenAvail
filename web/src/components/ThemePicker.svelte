<script lang="ts">
  import { PALETTES, setTheme, theme, type Theme } from "../lib/stores";
  import { t } from "../lib/i18n";
  import HoverCard from "./HoverCard.svelte";

  let { buttonClass = "btn secondary icon" }: { buttonClass?: string } = $props();

  const choices: Theme[] = ["auto", ...PALETTES.map((p) => p.name)];
  const swatchFor = (choice: Theme) =>
    PALETTES.find((p) => p.name === choice)?.swatch ?? "var(--chip)";
</script>

<HoverCard align="end" role="menu" label={$t("topbar.theme")} cardClass="pick-menu">
  {#snippet trigger()}
    <button
      class={buttonClass}
      aria-haspopup="menu"
      title={$t("topbar.theme")}
      aria-label={$t("topbar.theme")}
    >
      ◐
    </button>
  {/snippet}
  {#snippet content(close)}
    {#each choices as choice (choice)}
      <button
        class="pick-item"
        class:on={$theme === choice}
        role="menuitemradio"
        aria-checked={$theme === choice}
        onclick={() => {
          setTheme(choice);
          close();
        }}
      >
        <span
          class="swatch"
          class:auto={choice === "auto"}
          style="background: {swatchFor(choice)}"
        ></span>
        {$t(`theme.${choice}`)}
      </button>
    {/each}
  {/snippet}
</HoverCard>
