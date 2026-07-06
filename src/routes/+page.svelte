<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import FeedingChart from '$lib/components/FeedingChart.svelte';
  import AlertBanner from '$lib/components/AlertBanner.svelte';
  import DevicePanel from '$lib/components/DevicePanel.svelte';
  import type { FeedingEvent, Alert, Device } from '$lib/types';

  let { data } = $props();
  let events = $state<FeedingEvent[]>([]);
  // Seed mutable state from load data; SSE updates these reactively
  let alerts = $state<Alert[]>([]);
  let device = $state<Device | null>(null);
  let eventSource: EventSource | null = null;
  let sseConnected = $state(false);

  $effect(() => {
    alerts = data.alerts;
  });

  $effect(() => {
    device = data.device;
  });

  const totalCats = $derived(data.cats.length);
  const todayFeedings = $derived(events.filter(e => e.timestamp.startsWith(new Date().toISOString().split('T')[0]) && e.outcome === 'dispensed').length);
  const activeAlerts = $derived(alerts.length);

  const recentEvents = $derived(
    [...events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  );

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function outcomeBadgeClass(outcome: string): string {
    if (outcome === 'dispensed') return 'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/40';
    if (outcome === 'skipped') return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    return 'bg-red-500/20 text-red-400 border border-red-500/40';
  }

  onMount(() => {
    // Load events for first cat if exists
    if (data.cats.length > 0) {
      fetch(`/api/v1/cats/${data.cats[0].catId}/events?limit=50`)
        .then(r => r.json())
        .then(j => { events = j.data?.events ?? []; });
    }

    // SSE connection
    eventSource = new EventSource('/api/v1/sse');
    eventSource.onopen = () => { sseConnected = true; };
    eventSource.onerror = () => { sseConnected = false; };

    eventSource.addEventListener('feeding_event', (e) => {
      const event = JSON.parse((e as MessageEvent).data) as FeedingEvent;
      events = [event, ...events].slice(0, 100);
    });
    eventSource.addEventListener('alert_triggered', (e) => {
      const alert = JSON.parse((e as MessageEvent).data) as Alert;
      alerts = [alert, ...alerts];
    });
    eventSource.addEventListener('alert_dismissed', (e) => {
      const { alertId } = JSON.parse((e as MessageEvent).data) as { alertId: string };
      alerts = alerts.filter(a => a.alertId !== alertId);
    });
    eventSource.addEventListener('device_status', (e) => {
      const update = JSON.parse((e as MessageEvent).data) as Partial<Device>;
      if (device) device = { ...device, ...update };
    });
  });

  onDestroy(() => eventSource?.close());

  async function dismissAlert(alertId: string) {
    await fetch(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
    alerts = alerts.filter(a => a.alertId !== alertId);
  }
</script>

<div class="flex flex-col gap-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Dashboard</h1>
      <p class="text-slate-500 text-sm mt-0.5">Real-time overview of your cats</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full {sseConnected ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]' : 'bg-slate-600'}"></span>
      <span class="text-xs text-slate-500">{sseConnected ? 'Live' : 'Connecting...'}</span>
    </div>
  </div>

  <!-- Alert banner -->
  {#if alerts.length > 0}
    <AlertBanner {alerts} onDismiss={dismissAlert} />
  {/if}

  <!-- Summary stats row -->
  <div class="grid grid-cols-3 gap-4">
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/30 rounded-2xl p-5">
      <p class="text-slate-500 text-xs uppercase tracking-wider mb-2">Total Cats</p>
      <p class="text-3xl font-bold text-white">{totalCats}</p>
      <p class="text-slate-500 text-xs mt-1">In household</p>
    </div>
    <div class="bg-[#1a1a2e] border border-[#06b6d4]/30 rounded-2xl p-5">
      <p class="text-slate-500 text-xs uppercase tracking-wider mb-2">Today's Feedings</p>
      <p class="text-3xl font-bold text-[#22d3ee]">{todayFeedings}</p>
      <p class="text-slate-500 text-xs mt-1">Dispensed today</p>
    </div>
    <div class="bg-[#1a1a2e] border border-[#f59e0b]/30 rounded-2xl p-5">
      <p class="text-slate-500 text-xs uppercase tracking-wider mb-2">Active Alerts</p>
      <p class="text-3xl font-bold text-amber-400">{activeAlerts}</p>
      <p class="text-slate-500 text-xs mt-1">Require attention</p>
    </div>
  </div>

  <!-- Two-column layout: chart + device -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left: chart (2/3 width) -->
    <div class="lg:col-span-2 flex flex-col gap-6">
      <!-- Feeding chart -->
      <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
        <h2 class="text-white font-semibold mb-4">Feeding Activity — Last 7 Days</h2>
        <FeedingChart {events} />
      </div>

      <!-- Recent feedings list -->
      <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
        <h2 class="text-white font-semibold mb-4">Recent Feedings</h2>
        {#if recentEvents.length === 0}
          <div class="flex flex-col items-center justify-center py-10 text-slate-600">
            <span class="text-4xl mb-3">🍽️</span>
            <p class="text-sm">No feeding events yet</p>
          </div>
        {:else}
          <div class="overflow-x-auto -mx-1">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/5">
                  <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Time</th>
                  <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Cat</th>
                  <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Outcome</th>
                  <th class="text-right text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Portion</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                {#each recentEvents as event (event.eventId)}
                  {@const cat = data.cats.find((c: { catId: string }) => c.catId === event.catId)}
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-2.5 px-1 text-slate-400 font-mono text-xs whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </td>
                    <td class="py-2.5 px-1 text-slate-300">
                      {cat?.name ?? '—'}
                    </td>
                    <td class="py-2.5 px-1">
                      <span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize {outcomeBadgeClass(event.outcome)}">
                        {event.outcome}
                      </span>
                    </td>
                    <td class="py-2.5 px-1 text-right text-slate-400 text-xs">
                      {event.portionDispensedGrams != null ? `${event.portionDispensedGrams}g` : '—'}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right: device panel (1/3 width) -->
    <div class="lg:col-span-1">
      {#if device}
        <DevicePanel
          deviceId={device.deviceId}
          status={device.status}
          foodReservoirPercent={device.foodReservoirPercent}
          currentFoodTypeLabel={device.currentFoodTypeLabel}
          lastDispenseAt={device.lastDispenseAt}
          cameraStatus={device.cameraStatus}
          firmwareVersion={device.firmwareVersion}
        />
      {:else}
        <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 h-48 text-slate-600">
          <span class="text-3xl">📡</span>
          <p class="text-sm">No device found</p>
        </div>
      {/if}
    </div>
  </div>
</div>
