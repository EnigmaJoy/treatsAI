<script lang="ts">
  import type { WeightGoal } from '$lib/types';
  import type { Cat } from '$lib/types';

  interface Props {
    catId: string;
    name: string;
    currentWeightKg: number;
    weightGoal: WeightGoal;
    consumptionBaseline: number;
    breed?: string;
    profilePhotoUrl?: string | null;
    onClick?: () => void;
    data?: Cat | null;
  }

  let { catId: _catId, name, currentWeightKg, weightGoal, consumptionBaseline, breed, profilePhotoUrl, onClick, data }: Props = $props();

  const weightKg = $derived(data?.currentWeightKg ?? currentWeightKg);

  const goalLabel = $derived(
    weightGoal === 'weight_loss' ? 'Weight Loss' :
    weightGoal === 'weight_gain' ? 'Weight Gain' : 'Maintenance'
  );

  const goalClass = $derived(
    weightGoal === 'weight_loss' ? 'bg-primary/20 text-primary-soft border border-primary/40' :
    weightGoal === 'weight_gain' ? 'bg-[#f59e0b]/20 text-warning border border-[#f59e0b]/40' :
    'bg-[#06b6d4]/20 text-info border border-[#06b6d4]/40'
  );

  const cardBase = 'bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 text-left w-full';
  const cardHover = 'hover:border-primary/70 hover:shadow-lg hover:shadow-primary/20';
</script>

{#snippet cardContent()}
  <!-- Header -->
  <div class="flex items-start justify-between">
    {#if profilePhotoUrl}
      <img
        src={profilePhotoUrl}
        alt={name}
        class="w-12 h-12 rounded-full object-cover border-2 border-primary shrink-0"
      />
    {:else}
      <div
        class="w-12 h-12 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl shrink-0"
        aria-hidden="true"
      >🐱</div>
    {/if}
    <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f59e0b]/20 text-warning border border-[#f59e0b]/40">
      {weightKg.toFixed(2)} kg
    </span>
  </div>

  <!-- Name & Breed -->
  <div>
    <h3 class="text-fg font-semibold text-lg leading-tight">{name}</h3>
    {#if breed}
      <p class="text-fg-muted text-sm mt-0.5">{breed}</p>
    {/if}
  </div>

  <!-- Badges -->
  <div class="flex flex-wrap gap-2">
    <span class="text-xs font-medium px-2.5 py-1 rounded-full {goalClass}">
      {goalLabel}
    </span>
    <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-inset text-fg-muted border border-line">
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
