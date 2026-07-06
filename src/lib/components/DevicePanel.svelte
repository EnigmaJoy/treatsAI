<script lang="ts">
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

<div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-[12px] p-5 flex flex-col gap-4 h-full">

  <!-- Title -->
  <p class="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-widest">Feeder device</p>

  <!-- Camera feed -->
  <div class="relative rounded-[10px] overflow-hidden border border-[#2D2D4A]"
    style="background: #0A0A14; height: 110px;">
    <!-- Paw emoji centered, very faint -->
    <div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span class="text-[36px] opacity-20 select-none">🐾</span>
    </div>
    <!-- Camera active label top-right -->
    <div class="absolute top-2 right-2.5 flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full {cameraStatus === 'active' ? 'bg-[#10B981] animate-pulse' : 'bg-[#2D2D4A]'}"></span>
      <span class="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">
        {cameraStatus === 'active' ? 'Camera active' : 'Camera idle'}
      </span>
    </div>
    <!-- Status badge bottom-left -->
    <div class="absolute bottom-2 left-2.5 flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full {status === 'online' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}"></span>
      <span class="text-[10px] text-[#94A3B8]">{status === 'online' ? 'Online' : 'Offline'}</span>
    </div>
  </div>

  <!-- Food level bar -->
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-[12px] text-[#94A3B8]">Food level</span>
      <span class="text-[12px] font-semibold text-[#7C3AED]">{foodReservoirPercent}%</span>
    </div>
    <div
      class="h-[6px] rounded-[20px] overflow-hidden"
      style="background: #0F0F1A;"
      role="progressbar"
      aria-valuenow={foodReservoirPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Food reservoir level"
    >
      <div
        class="h-full rounded-[20px] transition-all duration-500"
        style="width: {foodReservoirPercent}%; background: #7C3AED;"
      ></div>
    </div>
  </div>

  <!-- Food type + last dispense -->
  <div class="flex flex-col gap-2">
    {#if currentFoodTypeLabel}
      <div class="flex items-center justify-between">
        <span class="text-[12px] text-[#94A3B8]">Food type</span>
        <span class="text-[12px] font-medium text-[#F8FAFC]">{currentFoodTypeLabel}</span>
      </div>
    {/if}
    <div class="flex items-center justify-between">
      <span class="text-[12px] text-[#94A3B8]">Last dispense</span>
      <span class="text-[12px] font-medium text-[#F8FAFC]">{formatDispenseTime(lastDispenseAt)}</span>
    </div>
    <div class="flex items-center justify-between">
      <span class="text-[12px] text-[#94A3B8]">Firmware</span>
      <span class="text-[12px] font-mono text-[#F8FAFC]">{firmwareVersion}</span>
    </div>
  </div>

</div>
