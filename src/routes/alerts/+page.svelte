<script lang="ts">
  import type { Alert, AlertType } from '$lib/types';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  let activeAlerts = $state<Alert[]>([]);
  let acknowledgedAlerts = $state<Alert[]>([]);

  $effect(() => {
    activeAlerts = data.active;
    acknowledgedAlerts = data.acknowledged;
  });
  let activeTab = $state<'active' | 'history'>('active');

  const alertCount = $derived(activeAlerts.length);

  function alertIcon(type: AlertType): string {
    switch (type) {
      case 'skip_meal': return '⚠️';
      case 'baseline_deviation': return '📊';
      case 'weight_reminder': return '⚖️';
      case 'low_food_level': return '🪣';
      default: return '🔔';
    }
  }

  function alertTypeLabel(type: AlertType): string {
    switch (type) {
      case 'skip_meal': return 'Skipped Meal';
      case 'baseline_deviation': return 'Baseline Deviation';
      case 'weight_reminder': return 'Weight Reminder';
      case 'low_food_level': return 'Low Food Level';
      default: return type;
    }
  }

  function timeSince(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

<div class="flex flex-col gap-6">
  <!-- Page header -->
  <div class="flex items-center gap-3">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-white">{m.alerts_title()}</h1>
        {#if alertCount > 0}
          <span class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            {alertCount}
          </span>
        {/if}
      </div>
      <p class="text-slate-500 text-sm mt-0.5">Notifications and system alerts</p>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-xl p-1 w-fit">
    <button
      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
        {activeTab === 'active'
          ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40'
          : 'text-slate-400 hover:text-white hover:bg-white/5'}"
      onclick={() => (activeTab = 'active')}
    >
      Active
      {#if alertCount > 0}
        <span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-400">
          {alertCount}
        </span>
      {/if}
    </button>
    <button
      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
        {activeTab === 'history'
          ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40'
          : 'text-slate-400 hover:text-white hover:bg-white/5'}"
      onclick={() => (activeTab = 'history')}
    >
      History
    </button>
  </div>

  <!-- Active tab -->
  {#if activeTab === 'active'}
    {#if activeAlerts.length === 0}
      <div class="flex flex-col items-center justify-center py-24 text-center gap-4">
        <span class="text-5xl">✅</span>
        <div>
          <h2 class="text-white font-semibold text-lg">{m.alerts_none()}</h2>
          <p class="text-slate-500 text-sm mt-1">{m.alerts_all_good()}</p>
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each activeAlerts as alert (alert.alertId)}
          <div class="bg-[#1a1a2e] border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
              {alertIcon(alert.type)}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{alertTypeLabel(alert.type)}</span>
                {#if alert.catName}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30">
                    {alert.catName}
                  </span>
                {/if}
              </div>
              <p class="text-slate-500 text-xs mt-0.5">{timeSince(alert.triggeredAt)}</p>
            </div>

            <!-- Acknowledge button -->
            <button
              class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7c3aed]/20 hover:bg-[#7c3aed]/40 text-[#a78bfa] border border-[#7c3aed]/40 transition-colors duration-150"
              onclick={() => acknowledge(alert.alertId)}
            >
              Acknowledge
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- History tab -->
  {#if activeTab === 'history'}
    {#if acknowledgedAlerts.length === 0}
      <div class="flex flex-col items-center justify-center py-24 text-center gap-4">
        <span class="text-5xl">✅</span>
        <div>
          <h2 class="text-white font-semibold text-lg">No alert history</h2>
          <p class="text-slate-500 text-sm mt-1">Acknowledged alerts will appear here</p>
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each acknowledgedAlerts as alert (alert.alertId)}
          <div class="bg-[#1a1a2e] border border-white/5 rounded-2xl p-4 flex items-center gap-4 opacity-60">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xl shrink-0">
              {alertIcon(alert.type)}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-slate-300 font-medium">{alertTypeLabel(alert.type)}</span>
                {#if alert.catName}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                    {alert.catName}
                  </span>
                {/if}
              </div>
              <p class="text-slate-600 text-xs mt-0.5">
                Triggered {timeSince(alert.triggeredAt)}
                {#if alert.acknowledgedAt}
                  · Acknowledged {formatDateTime(alert.acknowledgedAt)}
                {/if}
              </p>
            </div>

            <!-- Acknowledged badge -->
            <span class="shrink-0 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Acknowledged
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
