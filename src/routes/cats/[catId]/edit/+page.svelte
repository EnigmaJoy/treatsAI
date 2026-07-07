<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Cat, WeightGoal } from '$lib/types';

  let { data } = $props();

  const cat = data.cat as Cat | null;
  const catId = data.catId as string;

  let name                  = $state(cat?.name ?? '');
  let breed                 = $state(cat?.breed ?? '');
  let dateOfBirth           = $state(cat?.dateOfBirth ?? '');
  let currentWeightKg       = $state(cat?.currentWeightKg?.toString() ?? '');
  let targetWeightKg        = $state(cat?.targetWeightKg?.toString() ?? '');
  let weightGoal            = $state<WeightGoal>(cat?.weightGoal ?? 'maintenance');
  let consumptionBaseline   = $state(cat?.consumptionBaseline ?? 95);
  let weightReminderInterval = $state<3 | 7 | 14>(cat?.weightReminderInterval ?? 7);

  let loading = $state(false);
  let error   = $state('');

  async function handleSubmit() {
    if (!name.trim()) { error = 'Name is required'; return; }
    const kg = parseFloat(currentWeightKg);
    if (isNaN(kg) || kg <= 0) { error = 'Enter a valid current weight'; return; }

    loading = true;
    error = '';

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        breed: breed.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        currentWeightKg: kg,
        targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
        weightGoal,
        consumptionBaseline,
        weightReminderInterval
      };

      const res = await fetch(`/api/v1/cats/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (json.success) {
        goto(`/cats/${catId}`);
      } else {
        error = json.error?.message ?? 'Failed to save changes';
      }
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-lg mx-auto flex flex-col gap-6">

  <!-- Header -->
  <div>
    <a
      href="/cats/{catId}"
      class="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-4"
    >
      <span aria-hidden="true">←</span> Back to profile
    </a>
    <h1 class="text-2xl font-bold text-white">Edit Cat Profile</h1>
    {#if cat}
      <p class="text-slate-500 text-sm mt-0.5">Updating {cat.name}</p>
    {/if}
  </div>

  {#if !cat}
    <div class="bg-[#1a1a2e] border border-[#2D2D4A] rounded-2xl p-8 text-center">
      <p class="text-slate-400">Cat not found.</p>
      <a href="/cats" class="text-[#a78bfa] hover:underline text-sm mt-2 inline-block">Back to cats</a>
    </div>
  {:else}
    <!-- Form card -->
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/30 rounded-2xl p-6 flex flex-col gap-5">

      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p class="text-red-400 text-sm">{error}</p>
        </div>
      {/if}

      <!-- Name -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-name">
          Name<span class="text-red-400 ml-0.5">*</span>
        </label>
        <input
          id="edit-name"
          type="text"
          bind:value={name}
          placeholder="e.g. Luna"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <!-- Breed -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-breed">
          Breed
          <span class="normal-case font-normal text-slate-600 ml-1">optional</span>
        </label>
        <input
          id="edit-breed"
          type="text"
          bind:value={breed}
          placeholder="e.g. Maine Coon"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <!-- Date of birth -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-dob">
          Date of Birth
          <span class="normal-case font-normal text-slate-600 ml-1">optional</span>
        </label>
        <input
          id="edit-dob"
          type="date"
          bind:value={dateOfBirth}
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
          style="color-scheme: dark;"
        />
      </div>

      <!-- Current weight + Target weight -->
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-weight">
            Current Weight (kg)<span class="text-red-400 ml-0.5">*</span>
          </label>
          <input
            id="edit-weight"
            type="number"
            step="0.01"
            min="0.1"
            bind:value={currentWeightKg}
            placeholder="e.g. 4.5"
            class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-target">
            Target Weight (kg)
            <span class="normal-case font-normal text-slate-600 ml-1">optional</span>
          </label>
          <input
            id="edit-target"
            type="number"
            step="0.01"
            min="0.1"
            bind:value={targetWeightKg}
            placeholder="e.g. 4.0"
            class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Weight goal -->
      <div class="flex flex-col gap-2">
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wider">Weight Goal</p>
        <div class="grid grid-cols-3 gap-2">
          {#each [
            { value: 'weight_loss' as WeightGoal,  label: 'Weight Loss' },
            { value: 'maintenance' as WeightGoal,  label: 'Maintenance' },
            { value: 'weight_gain' as WeightGoal,  label: 'Weight Gain' }
          ] as opt}
            <button
              type="button"
              onclick={() => (weightGoal = opt.value)}
              class="py-2.5 rounded-xl text-sm font-medium border transition-all duration-150"
              style="{weightGoal === opt.value
                ? 'border-color:#7C3AED;background:rgba(124,58,237,0.15);color:#a78bfa;'
                : 'border-color:rgba(255,255,255,0.08);background:#0f0f1a;color:#94A3B8;'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Consumption baseline slider -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-slate-400 text-xs font-medium uppercase tracking-wider">Consumption Baseline</p>
          <span class="text-sm font-bold" style="color:#7C3AED">{consumptionBaseline}%</span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          step="1"
          bind:value={consumptionBaseline}
          class="w-full accent-[#7C3AED] cursor-pointer"
        />
        <div class="flex justify-between">
          <span class="text-[10px] text-slate-600">Picky eater (50%)</span>
          <span class="text-[10px] text-slate-600">Always finishes (100%)</span>
        </div>
        <p class="text-[11px] text-slate-500 leading-relaxed">
          Alerts fire when eating drops significantly below this baseline.
        </p>
      </div>

      <!-- Weight reminder interval -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="edit-reminder">
          Weight Reminder
        </label>
        <select
          id="edit-reminder"
          bind:value={weightReminderInterval}
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors cursor-pointer appearance-none"
        >
          <option value={3}>Every 3 days</option>
          <option value={7}>Every 7 days</option>
          <option value={14}>Every 14 days</option>
        </select>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-1">
        <a
          href="/cats/{catId}"
          class="flex-1 text-center bg-transparent border border-white/10 hover:border-white/20 text-slate-400 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          Cancel
        </a>
        <button
          type="button"
          onclick={handleSubmit}
          disabled={loading}
          class="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

    </div>
  {/if}

</div>
