<script lang="ts">
  // Inline so it inherits the active palette — a calendar page with a tick,
  // which is exactly what the board is.
  let { size = 34, title = "OpenAvail" }: { size?: number; title?: string } = $props();
</script>

<svg
  class="logo"
  width={size}
  height={size}
  viewBox="0 0 32 32"
  role="img"
  aria-label={title}
  fill="none"
>
  <!-- hangers -->
  <rect x="9" y="2" width="3" height="7" rx="1.5" fill="var(--ink)" opacity="0.55" />
  <rect x="20" y="2" width="3" height="7" rx="1.5" fill="var(--ink)" opacity="0.55" />
  <!-- page -->
  <rect
    x="3"
    y="6"
    width="26"
    height="23"
    rx="7"
    fill="var(--surface)"
    stroke="var(--line)"
    stroke-width="1.2"
  />
  <!-- header band -->
  <path d="M3 13 A7 7 0 0 1 10 6 L22 6 A7 7 0 0 1 29 13 Z" fill="var(--yes)" />
  <!-- the tick -->
  <path
    d="M10.5 21 L14.5 25 L22 16.5"
    stroke="var(--yes)"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .logo {
    display: block;
    flex: 0 0 auto;
  }
</style>
