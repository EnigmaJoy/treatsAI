<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Cat, Device } from '$lib/types';

  let { data } = $props();

  let device = $state<Device | null>(null);

  // Feeder settings form state
  let currentFoodTypeLabel = $state<string>('');
  let foodReservoirPercent = $state<number>(0);

  $effect(() => {
    device = data.device ?? null;
    currentFoodTypeLabel = data.device?.currentFoodTypeLabel ?? '';
    foodReservoirPercent = data.device?.foodReservoirPercent ?? 0;
  });
  let feederSaving = $state(false);
  let feederToast = $state<string | null>(null);

  // Manual dispense state
  let cats = $state<Cat[]>([]);
  let selectedCatId = $state<string>('');
  let portionGrams = $state<number>(30);
  let dispensing = $state(false);
  let dispenseToast = $state<string | null>(null);

  // Fetch cats on mount
  onMount(async () => {
    const res = await fetch('/api/v1/cats');
    if (res.ok) {
      cats = (await res.json()).data?.cats ?? [];
      if (cats.length > 0) selectedCatId = cats[0].catId;
    }
  });

  function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showToast(setter: (v: string | null) => void, message: string) {
    setter(message);
    setTimeout(() => setter(null), 3000);
  }

  async function saveFeederSettings() {
    feederSaving = true;
    try {
      const res = await fetch('/api/v1/device', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFoodTypeLabel, foodReservoirPercent })
      });
      if (res.ok) {
        showToast(v => { feederToast = v; }, 'Feeder settings saved');
      } else {
        showToast(v => { feederToast = v; }, 'Failed to save settings');
      }
    } finally {
      feederSaving = false;
    }
  }

  async function dispenseNow() {
    if (!selectedCatId) return;
    dispensing = true;
    try {
      const res = await fetch('/api/v1/device/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catId: selectedCatId, portionGrams })
      });
      if (res.ok) {
        showToast(v => { dispenseToast = v; }, 'Dispensed successfully');
      } else {
        showToast(v => { dispenseToast = v; }, 'Dispense failed');
      }
    } finally {
      dispensing = false;
    }
  }

  async function signOut() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<div class="flex flex-col gap-8">
  <!-- Page header -->
  <div>
    <h1 class="text-2xl font-bold text-white">Settings</h1>
    <p class="text-slate-500 text-sm mt-0.5">Account and household settings</p>
  </div>

  <!-- Feeder Settings -->
  <section class="flex flex-col gap-4">
    <h2 class="text-white font-semibold text-base flex items-center gap-2">
      <span class="text-lg">🍽️</span>
      Feeder Settings
    </h2>
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5 flex flex-col gap-5">
      <!-- Food type label -->
      <div class="flex flex-col gap-1.5">
        <label for="food-type-label" class="text-slate-400 text-sm font-medium">Food Type Label</label>
        <input
          id="food-type-label"
          type="text"
          bind:value={currentFoodTypeLabel}
          placeholder="e.g. Royal Canin Indoor Adult"
          class="w-full bg-[#0f0f1a] border border-[#7c3aed]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#7c3aed]/60 transition-colors"
        />
      </div>

      <!-- Food reservoir -->
      <div class="flex flex-col gap-1.5">
        <label for="reservoir-level" class="text-slate-400 text-sm font-medium">
          Food Reservoir Level
          <span class="text-slate-600 font-normal ml-1">({foodReservoirPercent}%)</span>
        </label>
        <input
          id="reservoir-level"
          type="number"
          bind:value={foodReservoirPercent}
          min="0"
          max="100"
          class="w-full bg-[#0f0f1a] border border-[#7c3aed]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#7c3aed]/60 transition-colors"
        />
        <div class="h-2 bg-[#0f0f1a] rounded-full overflow-hidden border border-white/5">
          <div
            class="h-full rounded-full transition-all duration-300"
            style="width: {Math.min(100, Math.max(0, foodReservoirPercent))}%; background-color: {foodReservoirPercent > 50 ? '#06b6d4' : foodReservoirPercent > 20 ? '#f59e0b' : '#ef4444'};"
          ></div>
        </div>
      </div>

      <!-- Save button + toast -->
      <div class="flex items-center gap-3">
        <button
          onclick={saveFeederSettings}
          disabled={feederSaving}
          class="px-4 py-2 rounded-xl text-sm font-medium bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors duration-150"
        >
          {feederSaving ? 'Saving…' : 'Save'}
        </button>
        {#if feederToast}
          <span class="text-sm text-emerald-400 transition-opacity">{feederToast}</span>
        {/if}
      </div>
    </div>
  </section>

  <!-- Device Status -->
  <section class="flex flex-col gap-4">
    <h2 class="text-white font-semibold text-base flex items-center gap-2">
      <span class="text-lg">📡</span>
      Device Status
    </h2>
    {#if device}
      <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Online / Offline -->
          <div class="flex flex-col gap-1">
            <span class="text-slate-500 text-xs uppercase tracking-wider">Status</span>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0
                {device.status === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]'
                  : 'bg-red-500'}">
              </span>
              <span class="text-white text-sm font-medium capitalize">{device.status}</span>
            </div>
          </div>
          <!-- Device ID -->
          <div class="flex flex-col gap-1">
            <span class="text-slate-500 text-xs uppercase tracking-wider">Device ID</span>
            <span class="text-white text-sm font-mono truncate">{device.deviceId}</span>
          </div>
          <!-- Firmware -->
          <div class="flex flex-col gap-1">
            <span class="text-slate-500 text-xs uppercase tracking-wider">Firmware Version</span>
            <span class="text-white text-sm font-mono">{device.firmwareVersion}</span>
          </div>
          <!-- Camera status -->
          <div class="flex flex-col gap-1">
            <span class="text-slate-500 text-xs uppercase tracking-wider">Camera</span>
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full
                {device.cameraStatus === 'active' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}">
              </span>
              <span class="text-white text-sm capitalize">{device.cameraStatus}</span>
            </div>
          </div>
          <!-- Last dispense -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <span class="text-slate-500 text-xs uppercase tracking-wider">Last Dispense</span>
            <span class="text-white text-sm">{formatDateTime(device.lastDispenseAt)}</span>
          </div>
        </div>
      </div>
    {:else}
      <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 h-36 text-slate-600">
        <span class="text-3xl">📡</span>
        <p class="text-sm">No device connected</p>
      </div>
    {/if}
  </section>

  <!-- Manual Dispense -->
  <section class="flex flex-col gap-4">
    <h2 class="text-white font-semibold text-base flex items-center gap-2">
      <span class="text-lg">🪣</span>
      Manual Dispense
    </h2>
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5 flex flex-col gap-5">
      <!-- Cat selector -->
      <div class="flex flex-col gap-1.5">
        <label for="cat-select" class="text-slate-400 text-sm font-medium">Cat</label>
        {#if cats.length === 0}
          <p class="text-slate-600 text-sm">No cats found. Add a cat first.</p>
        {:else}
          <select
            id="cat-select"
            bind:value={selectedCatId}
            class="w-full bg-[#0f0f1a] border border-[#7c3aed]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#7c3aed]/60 transition-colors appearance-none"
          >
            {#each cats as cat (cat.catId)}
              <option value={cat.catId}>{cat.name}</option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Portion size -->
      <div class="flex flex-col gap-1.5">
        <label for="portion-grams" class="text-slate-400 text-sm font-medium">
          Portion Size
          <span class="text-slate-600 font-normal ml-1">(grams)</span>
        </label>
        <input
          id="portion-grams"
          type="number"
          bind:value={portionGrams}
          min="1"
          max="500"
          class="w-full bg-[#0f0f1a] border border-[#7c3aed]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#7c3aed]/60 transition-colors"
        />
      </div>

      <!-- Dispense button + toast -->
      <div class="flex items-center gap-3">
        <button
          onclick={dispenseNow}
          disabled={dispensing || cats.length === 0 || !selectedCatId}
          class="px-4 py-2 rounded-xl text-sm font-medium bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors duration-150"
        >
          {dispensing ? 'Dispensing…' : 'Dispense Now'}
        </button>
        {#if dispenseToast}
          <span class="text-sm text-emerald-400 transition-opacity">{dispenseToast}</span>
        {/if}
      </div>
    </div>
  </section>

  <!-- Account -->
  <section class="flex flex-col gap-4">
    <h2 class="text-white font-semibold text-base flex items-center gap-2">
      <span class="text-lg">👤</span>
      Account
    </h2>
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
      <p class="text-slate-500 text-sm mb-4">Sign out of your TreatsAI account on this device.</p>
      <button
        onclick={signOut}
        class="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors duration-150"
      >
        Sign out
      </button>
    </div>
  </section>
</div>
