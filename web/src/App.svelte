<script lang="ts">
  // Full application shell is assembled in later steps (landing, workspace,
  // calendar, timeline, filters, admin). This scaffold renders a placeholder
  // so the dev server boots.
</script>

<main class="boot">
  <div class="brand"><span class="mark">OA</span> OpenAvail</div>
  <p>Scaffold ready — views are wired up in the following steps.</p>
</main>

<style>
  .boot {
    display: grid;
    place-items: center;
    gap: 12px;
    min-height: 100vh;
    text-align: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 24px;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 13px;
    color: white;
    background: #17201d;
    font-size: 13px;
  }
  p {
    color: var(--muted);
  }
</style>
