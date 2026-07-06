<script lang="ts">
  import type { WeightGoal } from '$lib/types';

  interface Props {
    catId: string;
    name: string;
    currentWeightKg: number;
    weightGoal: WeightGoal;
    consumptionBaseline: number;
    breed?: string;
    onClick?: () => void;
  }

  let { catId: _catId, name, currentWeightKg, weightGoal, consumptionBaseline, breed, onClick }: Props = $props();

  const goalLabel = $derived(
    weightGoal === 'weight_loss' ? 'Weight Loss' :
    weightGoal === 'weight_gain' ? 'Weight Gain' : 'Maintenance'
  );

  const goalClass = $derived(
    weightGoal === 'weight_loss' ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40' :
    weightGoal === 'weight_gain' ? 'bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/40' :
    'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/40'
  );

  const cardBase = 'bg-[#1a1a2e] border border-[#7c3aed]/30 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 text-left w-full';
  const cardHover = 'hover:border-[#7c3aed]/70 hover:shadow-lg hover:shadow-[#7c3aed]/20';
</script>

{#snippet cardContent()}
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div class="text-4xl select-none">🐱</div>
    <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/40">
      {currentWeightKg.toFixed(2)} kg
    </span>
  </div>

  <!-- Name & Breed -->
  <div>
    <h3 class="text-white font-semibold text-lg leading-tight">{name}</h3>
    {#if breed}
      <p class="text-[#9ca3af] text-sm mt-0.5">{breed}</p>
    {/if}
  </div>

  <!-- Badges -->
  <div class="flex flex-wrap gap-2">
    <span class="text-xs font-medium px-2.5 py-1 rounded-full {goalClass}">
      {goalLabel}
    </span>
    <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-[#1e1e3a] text-[#9ca3af] border border-[#ffffff]/10">
      {consumptionBaseline} g/day
    </span>
  </div>
{/snippet}

{#if onClick}
  <button class="{cardBase} {cardHover}" onclick={onClick}>
    {@render cardContent()}
  </button>
{:else}
  <div class={cardBase}>
    {@render cardContent()}
  </div>
{/if}
