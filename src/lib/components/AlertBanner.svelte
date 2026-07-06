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
    onDispense?: () => void;
  }

  let { alerts, onDismiss, onDispense }: Props = $props();

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

  function timeElapsed(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
</script>

{#if mostRecent}
  <div
    role="alert"
    class="flex items-center gap-3 rounded-[10px] animate-[slideDown_0.25s_ease-out]"
    style="background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); padding: 12px 16px;"
  >
    <!-- Warning icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>

    <!-- Text -->
    <div class="flex-1 min-w-0">
      <span class="text-[13px] font-medium text-[#F8FAFC]">{getMessage(mostRecent)}</span>
      <span class="text-[12px] text-[#94A3B8] ml-2">{timeElapsed(mostRecent.triggeredAt)}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0">
      {#if onDismiss}
        <button
          class="text-[12px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-3 py-1.5 rounded-[6px] hover:bg-[rgba(255,255,255,0.06)]"
          onclick={() => onDismiss!(mostRecent!.alertId)}
        >
          Dismiss
        </button>
      {/if}
      {#if onDispense}
        <button
          class="text-[12px] font-semibold rounded-[6px] px-3 py-1.5 transition-colors"
          style="background: rgba(245,158,11,0.2); color: #F59E0B; border: 1px solid rgba(245,158,11,0.4);"
          onclick={onDispense}
        >
          Dispense now
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
