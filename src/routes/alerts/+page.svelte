<script lang="ts">
  import type { Alert, AlertType } from '$lib/types';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  let loading = $state(true);
  let activeAlerts = $state<Alert[]>([]);
  let acknowledgedAlerts = $state<Alert[]>([]);
  let activeTab = $state<'active' | 'history'>('active');

  $effect(() => {
    activeAlerts = data.active;
    acknowledgedAlerts = data.acknowledged;
    loading = false;
  });

  const alertCount = $derived(activeAlerts.length);

  function typeBadgeStyle(type: AlertType): { bg: string; text: string; border: string } {
    switch (type) {
      case 'skip_meal':           return { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B', border: 'rgba(245,158,11,0.35)' };
      case 'baseline_deviation':  return { bg: 'rgba(249,115,22,0.15)',  text: '#FB923C', border: 'rgba(249,115,22,0.35)' };
      case 'weight_reminder':     return { bg: 'rgba(139,92,246,0.15)',  text: '#A78BFA', border: 'rgba(139,92,246,0.35)' };
      case 'low_food_level':      return { bg: 'rgba(239,68,68,0.15)',   text: '#F87171', border: 'rgba(239,68,68,0.35)'  };
      default:                    return { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', border: 'rgba(148,163,184,0.35)' };
    }
  }

  function alertTypeLabel(type: AlertType): string {
    switch (type) {
      case 'skip_meal':          return 'Skipped Meal';
      case 'baseline_deviation': return 'Baseline Deviation';
      case 'weight_reminder':    return 'Weight Reminder';
      case 'low_food_level':     return 'Low Food Level';
      default:                   return type;
    }
  }

  function timeSince(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  async function acknowledge(alertId: string) {
    const res = await fetch(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
    if (res.ok) {
      const alert = activeAlerts.find(a => a.alertId === alertId);
      if (alert) {
        activeAlerts = activeAlerts.filter(a => a.alertId !== alertId);
        acknowledgedAlerts = [
          { ...alert, status: 'acknowledged', acknowledgedAt: new Date().toISOString() },
          ...acknowledgedAlerts
        ];
      }
    }
  }
</script>

<div class="flex flex-col gap-5">

  <!-- Page header -->
  <div>
    <div class="flex items-center gap-2.5">
      <h1 class="text-[18px] font-bold text-[#F8FAFC]">{m.alerts_title()}</h1>
      {#if alertCount > 0}
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
          {alertCount}
        </span>
      {/if}
    </div>
    <p class="text-[12px] text-[#94A3B8] mt-0.5">Notifications and system alerts</p>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 p-1 rounded-[10px] w-fit" style="background:var(--color-surface); border:1px solid #2D2D4A">
    <button
      type="button"
      class="px-4 py-1.5 rounded-[7px] text-[13px] font-medium transition-all duration-150
        {activeTab === 'active'
          ? 'bg-[rgba(124,58,237,0.18)] text-[#A78BFA] border border-[rgba(124,58,237,0.4)]'
          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'}"
      onclick={() => (activeTab = 'active')}
    >
      {m.alert_tab_active()}
      {#if alertCount > 0}
        <span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-400">
          {alertCount}
        </span>
      {/if}
    </button>
    <button
      type="button"
      class="px-4 py-1.5 rounded-[7px] text-[13px] font-medium transition-all duration-150
        {activeTab === 'history'
          ? 'bg-[rgba(124,58,237,0.18)] text-[#A78BFA] border border-[rgba(124,58,237,0.4)]'
          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'}"
      onclick={() => (activeTab = 'history')}
    >
      {m.alert_tab_history()}
    </button>
  </div>

  <!-- Table card -->
  <div class="rounded-[12px] border border-[#2D2D4A] overflow-hidden" style="background:var(--color-surface)">

    {#if loading}
      <!-- Skeleton -->
      <table class="w-full text-[13px]">
        <thead>
          <tr class="border-b border-[#2D2D4A]">
            {#each [m.alert_col_type(), m.alert_col_cat(), m.alert_col_triggered(), m.alert_col_status(), m.alert_col_action()] as col}
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{col}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each [1,2,3] as _}
            <tr class="border-b border-[#2D2D4A] last:border-0">
              <td class="px-4 py-3"><div class="h-5 w-28 rounded bg-[#2D2D4A] animate-pulse"></div></td>
              <td class="px-4 py-3"><div class="h-4 w-16 rounded bg-[#2D2D4A] animate-pulse"></div></td>
              <td class="px-4 py-3"><div class="h-4 w-12 rounded bg-[#2D2D4A] animate-pulse"></div></td>
              <td class="px-4 py-3"><div class="h-5 w-20 rounded bg-[#2D2D4A] animate-pulse"></div></td>
              <td class="px-4 py-3"><div class="h-7 w-16 rounded bg-[#2D2D4A] animate-pulse"></div></td>
            </tr>
          {/each}
        </tbody>
      </table>

    {:else}

      {@const rows = activeTab === 'active' ? activeAlerts : acknowledgedAlerts}

      {#if rows.length === 0}
        <!-- Empty state -->
        <div class="flex flex-col items-center justify-center py-20 px-6 text-center gap-2">
          <p class="text-[15px] font-semibold text-[#F8FAFC]">{m.alert_empty_title()}</p>
          <p class="text-[13px] text-[#94A3B8] max-w-xs">{m.alert_empty_desc()}</p>
        </div>

      {:else}
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-[#2D2D4A]">
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{m.alert_col_type()}</th>
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{m.alert_col_cat()}</th>
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{m.alert_col_triggered()}</th>
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{m.alert_col_status()}</th>
              <th class="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide px-4 py-3">{m.alert_col_action()}</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as alert (alert.alertId)}
              {@const badge = typeBadgeStyle(alert.type)}
              <tr class="border-b border-[#2D2D4A] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">

                <!-- Type badge -->
                <td class="px-4 py-3">
                  <span
                    class="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style="background:{badge.bg}; color:{badge.text}; border:1px solid {badge.border}"
                  >
                    {alertTypeLabel(alert.type)}
                  </span>
                </td>

                <!-- Cat -->
                <td class="px-4 py-3 text-[#F8FAFC]">
                  {alert.catName ?? '—'}
                </td>

                <!-- Triggered -->
                <td class="px-4 py-3 text-[#94A3B8]">
                  {timeSince(alert.triggeredAt)}
                </td>

                <!-- Status -->
                <td class="px-4 py-3">
                  {#if alert.status === 'acknowledged'}
                    <span class="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {m.alert_acknowledged()}
                    </span>
                  {:else}
                    <span class="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {m.alert_active()}
                    </span>
                  {/if}
                </td>

                <!-- Action -->
                <td class="px-4 py-3">
                  {#if alert.status !== 'acknowledged'}
                    <button
                      type="button"
                      class="text-[12px] font-medium px-3 py-1.5 rounded-[6px] border border-[#2D2D4A] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.08)] transition-all duration-150"
                      onclick={() => acknowledge(alert.alertId)}
                    >
                      {m.alert_dismiss()}
                    </button>
                  {:else}
                    <span class="text-[#2D2D4A] text-[12px]">—</span>
                  {/if}
                </td>

              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

    {/if}
  </div>

</div>
