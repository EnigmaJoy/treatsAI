<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { DeviceStatus, CameraStatus } from '$lib/types';

  interface Props {
    deviceId: string;
    status: DeviceStatus;
    foodReservoirPercent: number;
    currentFoodTypeLabel?: string;
    lastDispenseAt?: string;
    cameraStatus: CameraStatus;
    firmwareVersion: string;
  }

  let {
    deviceId: _deviceId,
    status,
    foodReservoirPercent,
    currentFoodTypeLabel,
    lastDispenseAt,
    cameraStatus,
    firmwareVersion,
  }: Props = $props();

  // Random cat position for mock camera feed
  let catX = $state(50);
  let catY = $state(50);
  let scanAngle = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    intervalId = setInterval(() => {
      catX = 10 + Math.random() * 80;
      catY = 15 + Math.random() * 70;
      scanAngle = (scanAngle + 3) % 360;
    }, 2000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  const reservoirColor = $derived(
    foodReservoirPercent > 50 ? '#06b6d4' :
    foodReservoirPercent > 20 ? '#f59e0b' : '#ef4444'
  );

  function formatDispenseTime(iso?: string): string {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5 flex flex-col gap-4">
  <!-- Header: status -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0 {status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]' : 'bg-red-500'}"
      ></span>
      <span class="text-white font-semibold">Dispenser</span>
    </div>
    <span class="text-xs px-2.5 py-1 rounded-full border
      {status === 'online'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-red-500/10 text-red-400 border-red-500/30'}">
      {status === 'online' ? 'Online' : 'Offline'}
    </span>
  </div>

  <!-- Mock camera feed -->
  <div class="relative bg-[#0f0f1a] rounded-xl overflow-hidden h-36 border border-[#ffffff]/5">
    <!-- Scanning overlay -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background: linear-gradient(
        {scanAngle}deg,
        transparent 40%,
        rgba(6,182,212,0.06) 50%,
        transparent 60%
      ); transition: background 0.5s ease;"
    ></div>
    <!-- Corner brackets -->
    <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#06b6d4]/50 rounded-tl"></div>
    <div class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#06b6d4]/50 rounded-tr"></div>
    <div class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#06b6d4]/50 rounded-bl"></div>
    <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#06b6d4]/50 rounded-br"></div>
    <!-- Cat emoji wandering -->
    <span
      class="absolute text-2xl transition-all duration-[1800ms] ease-in-out select-none"
      style="left: {catX}%; top: {catY}%; transform: translate(-50%, -50%);"
    >🐱</span>
    <!-- Camera label -->
    <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full {cameraStatus === 'active' ? 'bg-red-500 animate-pulse' : 'bg-[#4b5563]'}"></span>
      <span class="text-[10px] text-[#6b7280] font-mono uppercase tracking-wide">
        {cameraStatus === 'active' ? 'Live' : 'Idle'}
      </span>
    </div>
  </div>

  <!-- Food reservoir -->
  <div class="flex flex-col gap-1.5">
    <div class="flex justify-between items-center text-sm">
      <span class="text-[#9ca3af]">Food Reservoir</span>
      <span class="font-semibold" style="color: {reservoirColor};">{foodReservoirPercent}%</span>
    </div>
    <div class="h-2.5 bg-[#0f0f1a] rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={foodReservoirPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Food reservoir level">
      <div
        class="h-full rounded-full transition-all duration-500"
        style="width: {foodReservoirPercent}%; background-color: {reservoirColor};"
      ></div>
    </div>
  </div>

  <!-- Meta info -->
  <div class="grid grid-cols-2 gap-2 text-xs text-[#9ca3af]">
    {#if currentFoodTypeLabel}
      <div class="flex flex-col gap-0.5">
        <span class="text-[#6b7280] uppercase tracking-wide text-[10px]">Food Type</span>
        <span class="text-white">{currentFoodTypeLabel}</span>
      </div>
    {/if}
    <div class="flex flex-col gap-0.5">
      <span class="text-[#6b7280] uppercase tracking-wide text-[10px]">Last Dispense</span>
      <span class="text-white">{formatDispenseTime(lastDispenseAt)}</span>
    </div>
    <div class="flex flex-col gap-0.5">
      <span class="text-[#6b7280] uppercase tracking-wide text-[10px]">Firmware</span>
      <span class="text-white font-mono">{firmwareVersion}</span>
    </div>
  </div>
</div>
