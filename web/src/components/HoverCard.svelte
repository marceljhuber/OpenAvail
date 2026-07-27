<script lang="ts">
  // Trigger + floating card. Opens on hover (with a short delay and a linger on
  // leave so you can move the pointer into it), on focus, and on click — the
  // last of which is the only way in on touch devices, where there is no hover.
  import type { Snippet } from "svelte";
  import { onDestroy } from "svelte";
  import { floating, type Align } from "../lib/popover";

  let {
    trigger,
    content,
    align = "start",
    gap = 6,
    openDelay = 90,
    closeDelay = 180,
    disabled = false,
    role = "tooltip",
    label,
    cardClass = "",
  }: {
    trigger: Snippet;
    /** receives a `close` callback, for menu items that dismiss on pick */
    content: Snippet<[() => void]>;
    align?: Align;
    gap?: number;
    openDelay?: number;
    closeDelay?: number;
    disabled?: boolean;
    role?: "tooltip" | "menu";
    label?: string;
    cardClass?: string;
  } = $props();

  let anchorEl = $state<HTMLElement | null>(null);
  let cardEl = $state<HTMLElement | null>(null);
  let open = $state(false);

  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function clearTimers() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
  }

  function show() {
    if (disabled) return;
    clearTimers();
    openTimer = setTimeout(() => (open = true), openDelay);
  }

  function hide() {
    clearTimers();
    closeTimer = setTimeout(() => (open = false), closeDelay);
  }

  /** Dismiss deliberately (Escape, outside click, menu pick). The card is
   * portaled to <body>, so if focus is inside it we must hand focus back to the
   * trigger by hand — otherwise it lands on <body> and tabbing restarts at the
   * top of the page. */
  function close() {
    clearTimers();
    const inCard = cardEl?.contains(document.activeElement);
    open = false;
    if (inCard) {
      const back = anchorEl?.querySelector<HTMLElement>(
        'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      back?.focus({ preventScroll: true });
    }
  }

  function toggle() {
    if (disabled) return;
    clearTimers();
    open = !open;
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (!open) return;
    const target = e.target as Node;
    if (anchorEl?.contains(target) || cardEl?.contains(target)) return;
    close();
  }

  /** mouseenter/mouseleave don't fire on a `display: contents` wrapper, so use
   * the bubbling pair and ignore moves between the trigger's own children. */
  function onLeave(e: MouseEvent, region: HTMLElement | null) {
    const to = e.relatedTarget as Node | null;
    if (to && region?.contains(to)) return;
    hide();
  }

  // a disabled trigger must not leave a stale card on screen
  $effect(() => {
    if (disabled && open) close();
  });

  onDestroy(clearTimers);
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={(e) => e.key === "Escape" && open && close()}
/>

<!-- focusin/focusout (not focus/blur) because they bubble up from the real
     trigger inside this display:contents wrapper -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
  class="hc-anchor"
  bind:this={anchorEl}
  onmouseover={show}
  onmouseout={(e) => onLeave(e, anchorEl)}
  onfocusin={show}
  onfocusout={hide}
  onclick={toggle}
  role="presentation"
>
  {@render trigger()}
</div>

{#if open && !disabled}
  <!-- svelte-ignore a11y_mouse_events_have_key_events -->
  <div
    bind:this={cardEl}
    class="hc-card {cardClass}"
    class:menu={role === "menu"}
    {role}
    aria-label={label}
    onmouseover={clearTimers}
    onmouseout={(e) => onLeave(e, cardEl)}
    onfocusin={clearTimers}
    onfocusout={hide}
    use:floating={{ anchor: anchorEl, align, gap, onDismiss: close }}
  >
    {@render content(close)}
  </div>
{/if}

<style>
  .hc-anchor {
    display: contents;
  }

  /* :global because the card is portaled to <body>, outside this component's
     scoped-style subtree */
  :global(.hc-card) {
    z-index: var(--z-pop);
    /* size to the content, not to the anchor — this is what stopped names
       from being cut off */
    width: max-content;
    max-width: min(300px, calc(100vw - 24px));
    max-height: min(320px, 70vh);
    overflow: auto;
    overscroll-behavior: contain;
    padding: 7px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: var(--shadow);
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  :global(.hc-card.menu) {
    padding: 6px;
  }
</style>
