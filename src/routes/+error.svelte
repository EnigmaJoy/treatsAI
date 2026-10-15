<script lang="ts">
  import { page } from '$app/state';
</script>

<div style="padding: 2rem; font-family: monospace;">
  <h1 style="color: var(--theme-danger); font-size: 1.25rem; margin-bottom: 1rem;">
    {page.status} - {page.error?.message}
  </h1>
  <pre style="background: var(--theme-surface); color: var(--theme-text-muted); padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.7rem; white-space: pre-wrap;">{JSON.stringify(page.error, null, 2)}</pre>
</div>
