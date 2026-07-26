<script lang="ts">
  import { onMount } from "svelte";
  import { initApp, loading, session } from "./lib/stores";
  import Landing from "./components/Landing.svelte";
  import Logo from "./components/Logo.svelte";
  import Workspace from "./components/Workspace.svelte";

  onMount(() => {
    initApp();
  });
</script>

{#if $loading}
  <div class="boot">
    <Logo size={44} />
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
    min-height: 100svh;
    color: var(--muted);
  }
</style>
