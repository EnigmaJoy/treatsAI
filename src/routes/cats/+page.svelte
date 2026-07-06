<script lang="ts">
  import { goto } from '$app/navigation';
  import CatCard from '$lib/components/CatCard.svelte';
  import type { Cat } from '$lib/types';

  let { data } = $props();
  const cats: Cat[] = $derived(data.cats);
</script>

<div class="flex flex-col gap-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Cats</h1>
      <p class="text-slate-500 text-sm mt-0.5">Manage your cats and feeding profiles</p>
    </div>
    <a
      href="/cats/new"
      class="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-150"
    >
      <span aria-hidden="true">+</span>
      Add Cat
    </a>
  </div>

  {#if cats.length === 0}
    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center py-24 text-center gap-4">
      <span class="text-6xl">🐱</span>
      <div>
        <h2 class="text-white font-semibold text-lg">No cats yet</h2>
        <p class="text-slate-500 text-sm mt-1">Add your first one to get started</p>
      </div>
      <a
        href="/cats/new"
        class="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors duration-150 mt-2"
      >
        <span aria-hidden="true">+</span>
        Add your first cat
      </a>
    </div>
  {:else}
    <!-- Cat grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each cats as cat (cat.catId)}
        <CatCard
          catId={cat.catId}
          name={cat.name}
          currentWeightKg={cat.currentWeightKg}
          weightGoal={cat.weightGoal}
          consumptionBaseline={cat.consumptionBaseline}
          breed={cat.breed}
          onClick={() => goto(`/cats/${cat.catId}`)}
        />
      {/each}
    </div>
  {/if}
</div>
