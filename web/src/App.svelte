<script lang="ts">
  import { onMount } from "svelte";
  import { initApp, loading, session } from "./lib/stores";
  import Landing from "./components/Landing.svelte";
  import Workspace from "./components/Workspace.svelte";

  onMount(() => {
    initApp();
  });
</script>

{#if $loading}
  <div class="boot">
    <span class="mark">OA</span>
    <p>Loading…</p>
  </div>
{:else if $session}
  <Workspace />
{:else}
  <Landing />
{/if}

<style>
  .boot {
    display: grid;
    place-items: center;
    gap: 12px;
    min-height: 100vh;
    color: var(--muted);
  }
  .mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    color: white;
    background: #17201d;
    font-weight: 800;
  }
</style>
