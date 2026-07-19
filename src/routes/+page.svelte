<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import DashboardFeedingChart from '$lib/components/DashboardFeedingChart.svelte';
  import PawLoader from '$lib/components/PawLoader.svelte';
  import AlertBanner from '$lib/components/AlertBanner.svelte';
  import DevicePanel from '$lib/components/DevicePanel.svelte';
  import type { FeedingEvent, Alert, Device } from '$lib/types';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();
  let events = $state<FeedingEvent[]>([]);
  let loadingEvents = $state(data.cats.length > 0);
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

  let firstCatPhotoUrl = $state<string | null>(data.firstCatPhotoUrl ?? null);
  let dispensing = $state(false);

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

  async function loadDashboardData() {
    if (data.cats.length > 0) {
      const r = await fetch(`/api/v1/cats/${data.cats[0].catId}/events?limit=50`);
      const j = await r.json();
      events = j.data?.events ?? [];
    }
    loadingEvents = false;
  }

  async function manualDispense(catId: string) {
    dispensing = true;
    try {
      const res = await fetch('/api/v1/device/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catId, portionGrams: 80 })
      });
      const resData = await res.json();
      if (resData.success) {
        await loadDashboardData();
      }
    } finally {
      dispensing = false;
    }
  }

  onMount(() => {
    // Load events for first cat if exists
    loadDashboardData();

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

  // ── Derived stats for stat cards ──
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDispensed = $derived(events.filter(e => e.timestamp.startsWith(todayStr) && e.outcome === 'dispensed').length);
  const todaySkipped   = $derived(events.filter(e => e.timestamp.startsWith(todayStr) && e.outcome === 'skipped').length);
  const todayRejected  = $derived(events.filter(e => e.timestamp.startsWith(todayStr) && e.outcome === 'rejected').length);
  const todayMealTotal = $derived(todayDispensed + todaySkipped + todayRejected);
  const progressPct    = $derived(todayMealTotal > 0 ? Math.round((todayDispensed / todayMealTotal) * 100) : 0);
  const ringDash       = $derived(((progressPct / 100) * 97.4).toFixed(1));

  const lastFedEvent = $derived(
    events
      .filter(e => e.outcome === 'dispensed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null
  );
</script>

<!-- ── Scrollable content ── -->
<div class="flex-1 overflow-y-auto p-6 flex flex-col gap-5 pb-20 md:pb-6">

  <!-- ── Page header ── -->
  <div>
    <div class="flex items-center gap-2.5">
      <h1 class="text-[18px] font-bold text-[#F8FAFC]">{m.dashboard_title()}</h1>
      <span
        class="text-[11px] font-medium px-2 py-0.5 rounded-full"
        style="background:{sseConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:{sseConnected ? '#10B981' : '#EF4444'}"
      >{sseConnected ? m.dashboard_live() : m.dashboard_offline()}</span>
    </div>
    <p class="text-[12px] text-[#94A3B8] mt-0.5">{m.dashboard_subtitle()}</p>
  </div>

  <!-- ── Section 1: Stat cards ── -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

    <!-- Card 1: Today's meals (progress ring) -->
    <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-4 flex flex-col items-center gap-2">
      <p class="text-[11px] text-[#94A3B8] uppercase tracking-wide self-start">{m.stats_todays_meals()}</p>
      <div class="relative">
        <svg width="64" height="64" viewBox="0 0 36 36" class="-rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2D2D4A" stroke-width="3"/>
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="#7C3AED"
            stroke-width="3"
            stroke-dasharray="{ringDash} 97.4"
            stroke-linecap="round"
            class="transition-all duration-500"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-[13px] font-bold text-[#F8FAFC]">{todayDispensed}/{todayMealTotal || 0}</span>
        </div>
      </div>
      <p class="text-[11px] text-[#94A3B8]">{progressPct}% {m.dashboard_done()}</p>
    </div>

    <!-- Card 2: Dispensed -->
    <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-4 flex flex-col justify-between">
      <p class="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">{m.stats_dispensed()}</p>
      <p class="text-[32px] font-bold leading-none" style="color: #10B981">{todayDispensed}</p>
      <p class="text-[11px] text-[#94A3B8] mt-2">{m.dashboard_on_schedule()}</p>
    </div>

    <!-- Card 3: Skipped -->
    <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-4 flex flex-col justify-between">
      <p class="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">{m.stats_skipped()}</p>
      <p class="text-[32px] font-bold leading-none" style="color: #F59E0B">{todaySkipped}</p>
      <p class="text-[11px] text-[#94A3B8] mt-2">{todaySkipped > 0 ? m.dashboard_meals_missed() : m.dashboard_none_today()}</p>
    </div>

    <!-- Card 4: Rejected -->
    <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-4 flex flex-col justify-between">
      <p class="text-[11px] text-[#94A3B8] uppercase tracking-wide mb-2">{m.stats_rejected()}</p>
      <p class="text-[32px] font-bold leading-none text-[#94A3B8]">{todayRejected}</p>
      <p class="text-[11px] text-[#94A3B8] mt-2">{todayRejected === 0 ? m.dashboard_all_clear() : m.dashboard_needs_attention()}</p>
    </div>
  </div>

  <!-- ── Section 2: Alert banner ── -->
  {#if alerts.length > 0}
    <AlertBanner {alerts} onDismiss={dismissAlert} />
  {/if}

  <!-- ── Section 3: Middle row (cat status + device panel) ── -->
  <div class="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">

    <!-- Left: Cat status card -->
    {#if data.cats.length > 0}
      {@const cat = data.cats[0]}
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-5 flex flex-col gap-4">

        <!-- Cat header -->
        <div class="flex items-center gap-3">
          {#if firstCatPhotoUrl}
            <img
              src={firstCatPhotoUrl}
              alt={cat.name}
              style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #7C3AED;flex-shrink:0"
              onerror={() => { firstCatPhotoUrl = null; }}
            />
          {:else}
            <div
              class="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl shrink-0"
              style="background: linear-gradient(135deg, #7C3AED, #F59E0B)"
              aria-hidden="true"
            >🐱</div>
          {/if}
          <div class="min-w-0">
            <h2 class="text-[18px] font-bold text-[#F8FAFC] truncate">{cat.name}</h2>
            <span
              class="inline-block text-[11px] font-medium text-[#10B981] rounded-full px-2 py-0.5 mt-0.5"
              style="background: rgba(16,185,129,0.15)"
            >{m.settings_feeder_online()}</span>
          </div>
        </div>

        <!-- 2×2 stat grid -->
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-[8px]" style="background: #0F0F1A; padding: 10px 12px;">
            <p class="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-1">{m.dashboard_last_fed()}</p>
            <p class="text-[13px] font-medium text-[#F8FAFC] truncate">
              {lastFedEvent ? formatTime(lastFedEvent.timestamp) : '—'}
            </p>
          </div>
          <div class="rounded-[8px]" style="background: #0F0F1A; padding: 10px 12px;">
            <p class="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-1">{m.dashboard_next_feeding()}</p>
            <p class="text-[13px] font-medium text-[#F8FAFC]">—</p>
          </div>
          <div class="rounded-[8px]" style="background: #0F0F1A; padding: 10px 12px;">
            <p class="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-1">{m.dashboard_weight_goal()}</p>
            <p class="text-[13px] font-medium text-[#F8FAFC] capitalize">{cat.weightGoal.replace('_', ' ')}</p>
          </div>
          <div class="rounded-[8px]" style="background: #0F0F1A; padding: 10px 12px;">
            <p class="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-1">{m.dashboard_consumption()}</p>
            <p class="text-[13px] font-medium text-[#F8FAFC]">{cat.consumptionBaseline}% {m.dashboard_baseline()}</p>
          </div>
        </div>

        <!-- Manual Dispense -->
        <button
          type="button"
          disabled={dispensing}
          onclick={() => manualDispense(cat.catId)}
          class="w-full text-white font-semibold rounded-[8px] py-[10px] text-[13px] bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-auto"
        >
          {dispensing ? m.dashboard_dispensing() : m.dashboard_manual_dispense()}
        </button>
      </div>
    {:else}
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-5 flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <span class="text-3xl" aria-hidden="true">🐱</span>
        <p class="text-[13px]">{m.dashboard_no_cats()}</p>
        <a href="/cats/new" class="text-[13px] font-medium text-[#7C3AED] hover:text-[#8B5CF6] transition-colors">
          {m.dashboard_add_cat()} →
        </a>
      </div>
    {/if}

    <!-- Right: Device panel -->
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
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-5 flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
        <span class="text-3xl" aria-hidden="true">📡</span>
        <p class="text-[13px]">{m.dashboard_no_device()}</p>
      </div>
    {/if}
  </div>

  <!-- ── Section 4: 7-day chart ── -->
  <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-5">
    <!-- Header + custom legend -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h2 class="text-[14px] font-semibold text-[#F8FAFC]">{m.dashboard_7day_history()}</h2>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#10B981] shrink-0"></span>{m.stats_dispensed()}
        </span>
        <span class="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#F59E0B] shrink-0"></span>{m.stats_skipped()}
        </span>
        <span class="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#EF4444] shrink-0"></span>{m.stats_rejected()}
        </span>
      </div>
    </div>
    {#if loadingEvents}
      <PawLoader size={24} />
    {:else if browser}
      <DashboardFeedingChart {events} />
    {/if}
  </div>

</div>
