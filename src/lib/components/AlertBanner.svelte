<script lang="ts">
  import type { AlertType } from '$lib/types';

  interface AlertItem {
    alertId: string;
    type: AlertType;
    catName?: string;
    triggeredAt: string;
  }

  interface Props {
    alerts: AlertItem[];
    onDismiss?: (alertId: string) => void;
  }

  let { alerts, onDismiss }: Props = $props();

  const mostRecent = $derived(
    alerts.length > 0
      ? [...alerts].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())[0]
      : null
  );

  function getMessage(alert: AlertItem): string {
    const cat = alert.catName ?? 'Your cat';
    switch (alert.type) {
      case 'skip_meal': return `${cat} missed their meal`;
      case 'baseline_deviation': return `${cat}'s eating habits have changed`;
      case 'weight_reminder': return `Time to weigh ${cat}`;
      case 'low_food_level': return 'Food reservoir is running low';
      default: return 'Alert';
    }
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

{#if mostRecent}
  <div
    class="flex items-start gap-3 bg-amber-500/10 border border-amber-500/50 rounded-xl px-4 py-3
      animate-[slideDown_0.25s_ease-out]"
    role="alert"
  >
    <span class="text-xl mt-0.5 shrink-0" aria-hidden="true">⚠️</span>
    <div class="flex-1 min-w-0">
      <p class="text-amber-200 font-medium text-sm leading-snug">{getMessage(mostRecent)}</p>
      <p class="text-amber-400/60 text-xs mt-0.5">{formatTime(mostRecent.triggeredAt)}</p>
    </div>
    {#if onDismiss}
      <button
        class="shrink-0 text-amber-400/70 hover:text-amber-300 transition-colors text-lg leading-none p-0.5 rounded"
        onclick={() => onDismiss!(mostRecent!.alertId)}
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    {/if}
  </div>
{/if}

<style>
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
