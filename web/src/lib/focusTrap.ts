// Keyboard focus management for modal dialogs.
//
// DayModal and AdminPanel both declare `aria-modal="true"`, which promises that
// nothing outside the dialog is reachable — but nothing enforced it: focus
// stayed on whatever opened the dialog, Tab walked straight into the page
// behind, and closing left focus on <body>. This action makes the promise true.

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, focusable descendants, in DOM order. Queried fresh on every Tab so
 * conditional content (the event editor, comment rows) is picked up. */
function focusables(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  );
}

export function focusTrap(node: HTMLElement) {
  const returnTo = document.activeElement as HTMLElement | null;

  // Focus the first control rather than the dialog itself where possible, so a
  // screen reader lands on something actionable.
  const first = focusables(node)[0];
  (first ?? node).focus({ preventScroll: true });

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const items = focusables(node);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const edge = e.shiftKey ? items[0] : items[items.length - 1];
    // Wrap at the ends. `contains` also catches focus that escaped to <body>.
    if (document.activeElement === edge || !node.contains(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus({ preventScroll: true });
    }
  }

  node.addEventListener("keydown", onKeydown);

  return {
    destroy() {
      node.removeEventListener("keydown", onKeydown);
      // Give the trigger its focus back — otherwise closing drops the caret on
      // <body> and keyboard users restart from the top of the page.
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    },
  };
}
