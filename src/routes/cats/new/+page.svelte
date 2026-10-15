<script lang="ts">
  import { goto } from '$app/navigation';

  let name = $state('');
  let breed = $state('');
  let dateOfBirth = $state('');
  let currentWeightKg = $state('');
  let targetWeightKg = $state('');
  let weightGoal = $state<'weight_loss' | 'maintenance' | 'weight_gain'>('maintenance');
  let weightReminderInterval = $state(7);
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit() {
    if (!name.trim()) { error = 'Name is required'; return; }
    const kg = parseFloat(currentWeightKg);
    if (isNaN(kg) || kg <= 0) { error = 'Enter a valid current weight'; return; }
    loading = true; error = '';
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        currentWeightKg: kg,
        weightGoal,
        weightReminderInterval,
      };
      if (breed.trim()) body.breed = breed.trim();
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (targetWeightKg) body.targetWeightKg = parseFloat(targetWeightKg);

      const res = await fetch('/api/v1/cats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        goto(`/cats/${data.data.catId}`);
      } else {
        error = data.error?.message ?? 'Failed to create cat';
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
    <a href="/cats" class="inline-flex items-center gap-1.5 text-fg-subtle hover:text-fg-muted text-sm transition-colors mb-4">
      <span aria-hidden="true">←</span> All cats
    </a>
    <h1 class="text-2xl font-bold text-fg">Add a Cat</h1>
    <p class="text-fg-subtle text-sm mt-0.5">Set up a feeding profile for your cat</p>
  </div>

  <!-- Form card -->
  <div class="bg-surface border border-line rounded-2xl p-6 flex flex-col gap-4">
    {#if error}
      <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
        <p class="text-danger text-sm">{error}</p>
      </div>
    {/if}

    <div class="flex flex-col gap-1.5">
      <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-name">Name *</label>
      <input id="cat-name" type="text" bind:value={name} placeholder="e.g. Luna" class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors" />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-breed">Breed</label>
      <input id="cat-breed" type="text" bind:value={breed} placeholder="e.g. Scottish Fold" class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors" />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-dob">Date of Birth</label>
      <input id="cat-dob" type="date" bind:value={dateOfBirth} class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg outline-none transition-colors" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-weight">Current Weight (kg) *</label>
        <input id="cat-weight" type="number" step="0.01" min="0" bind:value={currentWeightKg} placeholder="e.g. 4.5" class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-target">Target Weight (kg)</label>
        <input id="cat-target" type="number" step="0.01" min="0" bind:value={targetWeightKg} placeholder="e.g. 4.0" class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors" />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="cat-goal">Weight Goal</label>
      <select id="cat-goal" bind:value={weightGoal} class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg outline-none transition-colors appearance-none cursor-pointer">
        <option value="maintenance">Maintenance</option>
        <option value="weight_loss">Weight Loss</option>
        <option value="weight_gain">Weight Gain</option>
      </select>
    </div>

    <div>
      <label for="weightReminderInterval" class="block text-sm font-medium text-fg-muted mb-1">
        Weight Reminder
      </label>
      <select id="weightReminderInterval" bind:value={weightReminderInterval}
        class="w-full bg-inset border border-line rounded-lg px-3 py-2 text-fg focus:outline-none focus:border-primary">
        <option value={3}>Every 3 days</option>
        <option value={7}>Every 7 days</option>
        <option value={14}>Every 14 days</option>
      </select>
    </div>

    <button
      class="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors mt-2"
      onclick={handleSubmit}
      disabled={loading}
    >
      {loading ? 'Creating...' : 'Create Cat'}
    </button>
  </div>
</div>
