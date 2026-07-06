<script lang="ts">
  import type { WeightGoal } from '$lib/types';

  interface Props {
    currentWeightKg: number;
    targetWeightKg?: number;
    weightGoal: WeightGoal;
  }

  let { currentWeightKg, targetWeightKg, weightGoal }: Props = $props();

  const goalLabel = $derived(
    weightGoal === 'weight_loss' ? 'Weight Loss' :
    weightGoal === 'weight_gain' ? 'Weight Gain' : 'Maintenance'
  );

  // Compute progress percentage and color
  const progress = $derived.by(() => {
    if (!targetWeightKg) return 100;
    const diff = Math.abs(currentWeightKg - targetWeightKg);
    const pctOff = diff / targetWeightKg;
    if (weightGoal === 'maintenance') {
      // Show how close to target: 0% off = 100% full bar
      return Math.max(0, Math.min(100, (1 - pctOff * 10) * 100));
    }
    // For loss/gain: clamp current toward target
    if (weightGoal === 'weight_loss') {
      // Assume an arbitrary start: target is the goal, more progress = closer to target
      // Show % remaining to lose: if current <= target already done
      if (currentWeightKg <= targetWeightKg) return 100;
      // We don't know start; treat current vs target as 0-to-target scale
      // Visualise it inversely: show progress as target/current ratio
      return Math.min(100, (targetWeightKg / currentWeightKg) * 100);
    }
    // weight_gain: current / target
    return Math.min(100, (currentWeightKg / targetWeightKg) * 100);
  });

  const barColor = $derived.by(() => {
    if (!targetWeightKg) return '#7c3aed';
    const diff = Math.abs(currentWeightKg - targetWeightKg);
    const pctOff = diff / targetWeightKg;
    if (pctOff < 0.05) return '#22c55e';     // within 5% — green
    if (pctOff < 0.15) return '#f59e0b';     // within 15% — amber
    return '#ef4444';                          // far off — red
  });

  const statusLabel = $derived.by(() => {
    if (!targetWeightKg) return 'No target set';
    const diff = Math.abs(currentWeightKg - targetWeightKg);
    const pctOff = diff / targetWeightKg;
    if (weightGoal === 'maintenance') {
      if (pctOff < 0.05) return 'On track';
      if (pctOff < 0.15) return 'Slight variance';
      return 'Off track';
    }
    if (weightGoal === 'weight_loss') {
      if (currentWeightKg <= targetWeightKg) return 'Goal reached!';
      return `${(currentWeightKg - targetWeightKg).toFixed(2)} kg to go`;
    }
    // weight_gain
    if (currentWeightKg >= targetWeightKg) return 'Goal reached!';
    return `${(targetWeightKg - currentWeightKg).toFixed(2)} kg to go`;
  });
</script>

<div class="flex flex-col gap-2">
  <!-- Labels row -->
  <div class="flex items-center justify-between text-sm">
    <div class="flex items-center gap-2">
      <span class="text-white font-medium">{currentWeightKg.toFixed(2)} kg</span>
      <span class="text-xs px-2 py-0.5 rounded-full bg-[#1e1e3a] text-[#9ca3af] border border-[#ffffff]/10">
        {goalLabel}
      </span>
    </div>
    {#if targetWeightKg}
      <span class="text-[#9ca3af] text-xs">Target: {targetWeightKg.toFixed(2)} kg</span>
    {/if}
  </div>

  <!-- Progress track -->
  <div class="h-3 bg-[#0f0f1a] rounded-full overflow-hidden border border-[#ffffff]/5">
    <div
      class="h-full rounded-full transition-all duration-500 ease-out"
      style="width: {progress}%; background-color: {barColor};"
    ></div>
  </div>

  <!-- Status -->
  <p class="text-xs" style="color: {barColor};">{statusLabel}</p>
</div>
