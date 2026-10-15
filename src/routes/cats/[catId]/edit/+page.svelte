<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Cat, WeightGoal } from '$lib/types';
  import * as m from '$lib/paraglide/messages';

  let { data } = $props();

  const cat = data.cat as Cat | null;
  const catId = data.catId as string;

  let name = $state(cat?.name ?? '');
  let breed = $state(cat?.breed ?? '');
  let dateOfBirth = $state(cat?.dateOfBirth ?? '');
  let currentWeightKg = $state(cat?.currentWeightKg?.toString() ?? '');
  let targetWeightKg = $state(cat?.targetWeightKg?.toString() ?? '');
  let weightGoal = $state<WeightGoal>(cat?.weightGoal ?? 'maintenance');
  let consumptionBaseline = $state(cat?.consumptionBaseline ?? 95);
  let weightReminderInterval = $state<3 | 7 | 14>(cat?.weightReminderInterval ?? 7);

  let loading = $state(false);
  let error   = $state('');

  // Profile photo state
  let profilePhotoUrl = $state<string | null>((data.cat as any)?.profilePhotoUrl ?? null);
  let pendingProfileKey = $state<string | undefined>(cat?.profilePhotoKey ?? cat?.photoS3Keys?.[0]);
  let photoPickerOpen = $state(false);
  let photoUrls = $state<Array<{ key: string; url: string }>>((data.cat as any)?.photoUrls ?? []);
  let uniquePhotoUrls = $derived((() => {
    const seenKeys = new Set<string>();
    const result: Array<{ key: string; url: string }> = [];
    for (const photo of photoUrls) {
      if (photo.url && photo.key && !seenKeys.has(photo.key)) {
        seenKeys.add(photo.key);
        result.push(photo);
      }
    }
    return result;
  })());
  let photoUploading = $state(false);
  let photoSaving = $state(false);
  let photoError = $state('');

  async function saveProfilePhoto() {
    if (!pendingProfileKey) return;
    photoSaving = true;
    photoError = '';
    try {
      const res = await fetch(`/api/v1/cats/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhotoKey: pendingProfileKey })
      });
      const resJson = await res.json();
      if (resJson.success) {
        const found = photoUrls.find(p => p.key === pendingProfileKey);
        if (found) profilePhotoUrl = found.url;
        photoPickerOpen = false;
      } else {
        photoError = resJson.error?.message ?? 'Failed to update profile photo';
      }
    } catch {
      photoError = 'Network error. Please try again.';
    } finally {
      photoSaving = false;
    }
  }

  async function handleNewPhotoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      photoError = 'Only JPEG, PNG, or WebP files are allowed';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      photoError = 'File must be no larger than 15MB';
      return;
    }

    photoUploading = true;
    photoError = '';
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/v1/cats/${catId}/photo`, {
        method: 'POST',
        body: formData
      });
      const resJson = await res.json();
      if (resJson.success) {
        const { s3Key, url } = resJson.data;
        photoUrls = [...photoUrls, { key: s3Key, url }];
        pendingProfileKey = s3Key;
      } else {
        photoError = resJson.error?.message ?? 'Upload failed';
      }
    } catch {
      photoError = 'Upload failed. Please try again.';
    } finally {
      photoUploading = false;
      input.value = '';
    }
  }

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
      class="inline-flex items-center gap-1.5 text-fg-subtle hover:text-fg-muted text-sm transition-colors mb-4"
    >
      <span aria-hidden="true">←</span> {m.cat_back_to_profile()}
    </a>
    <h1 class="text-2xl font-bold text-fg">{m.cat_edit_title()}</h1>
    {#if cat}
      <p class="text-fg-subtle text-sm mt-0.5">{m.cat_editing({ name: cat.name })}</p>
    {/if}
  </div>

  {#if !cat}
    <div class="bg-surface border border-line rounded-2xl p-8 text-center">
      <p class="text-fg-muted">{m.cat_not_found()}</p>
      <a href="/cats" class="text-primary-soft hover:underline text-sm mt-2 inline-block">{m.cat_back_to_cats()}</a>
    </div>
  {:else}
    <!-- Form card -->
    <div class="bg-surface border border-line rounded-2xl p-6 flex flex-col gap-5">

      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p class="text-danger text-sm">{error}</p>
        </div>
      {/if}

      <!-- Profile photo -->
      <div class="flex flex-col gap-3">
        <p class="text-fg-muted text-xs font-medium uppercase tracking-wider">Profile photo</p>
        <div class="flex items-center gap-4">
          {#if profilePhotoUrl}
            <img
              src={profilePhotoUrl}
              alt={cat.name}
              class="w-20 h-20 rounded-full object-cover border-2 border-primary shrink-0"
              onerror={() => { profilePhotoUrl = null; }}
            />
          {:else}
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center text-3xl shrink-0 select-none"
              style="background: linear-gradient(135deg, var(--theme-primary), var(--theme-warning));"
              aria-hidden="true"
            >🐱</div>
          {/if}
          <button
            type="button"
            onclick={() => { photoPickerOpen = !photoPickerOpen; photoError = ''; if (photoPickerOpen) { console.log('[photo picker] opened, photoUrls:', photoUrls); } }}
            class="text-sm font-medium text-primary-soft hover:text-fg transition-colors"
          >
            {photoPickerOpen ? 'Close picker' : 'Change photo'}
          </button>
        </div>

        {#if photoPickerOpen}
          <div class="bg-inset border border-line rounded-xl p-4 flex flex-col gap-4">
            {#if photoError}
              <p class="text-danger text-sm">{photoError}</p>
            {/if}

            {#if uniquePhotoUrls.length > 0}
              <div>
                <p class="text-fg-subtle text-xs mb-3">Choose from uploaded photos</p>
                <div class="flex flex-wrap gap-2">
                  {#each uniquePhotoUrls as photo (photo.key)}
                    <button
                      type="button"
                      onclick={() => (pendingProfileKey = photo.key)}
                      class="w-[60px] h-[60px] rounded-lg overflow-hidden border-2 transition-all shrink-0"
                      style="border-color:{pendingProfileKey === photo.key ? 'var(--theme-primary)' : 'var(--theme-border)'}"
                    >
                      <!-- svelte-ignore a11y_img_redundant_alt -->
                      <img
                        src={photo.url}
                        alt="Cat photo"
                        class="w-full h-full object-cover rounded-lg"
                        onerror={(e) => {
                          const target = e.currentTarget;
                          target.closest('button').style.display = 'none';
                        }}
                      />
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <div>
              <p class="text-fg-subtle text-xs mb-2">Upload a new photo</p>
              <label
                class="cursor-pointer inline-flex items-center gap-2 bg-surface border border-line hover:border-line-strong text-fg-muted text-sm px-3 py-2 rounded-lg transition-colors {photoUploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
              >
                {photoUploading ? 'Uploading...' : 'Choose file'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  disabled={photoUploading}
                  onchange={handleNewPhotoUpload}
                />
              </label>
              <p class="text-fg-subtle text-xs mt-1">JPEG, PNG, WebP - max 15MB</p>
            </div>

            <div class="flex gap-2 pt-1 border-t border-line-subtle">
              <button
                type="button"
                onclick={() => { photoPickerOpen = false; photoError = ''; }}
                class="flex-1 text-center bg-transparent border border-line hover:border-line-strong text-fg-muted hover:text-fg font-medium py-2 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onclick={saveProfilePhoto}
                disabled={!pendingProfileKey || photoSaving}
                class="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium py-2 rounded-xl transition-colors text-sm"
              >
                {photoSaving ? 'Saving...' : 'Save profile photo'}
              </button>
            </div>
          </div>
        {/if}
      </div>

      <div class="h-px bg-hover"></div>

      <!-- Name -->
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-name">
          {m.cat_field_name()}<span class="text-danger ml-0.5">*</span>
        </label>
        <input
          id="edit-name"
          type="text"
          bind:value={name}
          placeholder="e.g. Luna"
          class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors"
        />
      </div>

      <!-- Breed -->
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-breed">
          {m.cat_field_breed()}
          <span class="normal-case font-normal text-fg-subtle ml-1">{m.common_optional()}</span>
        </label>
        <input
          id="edit-breed"
          type="text"
          bind:value={breed}
          placeholder="e.g. Maine Coon"
          class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors"
        />
      </div>

      <!-- Date of birth -->
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-dob">
          {m.cat_field_dob()}
          <span class="normal-case font-normal text-fg-subtle ml-1">{m.common_optional()}</span>
        </label>
        <input
          id="edit-dob"
          type="date"
          bind:value={dateOfBirth}
          class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg outline-none transition-colors"
          style="color-scheme: dark;"
        />
      </div>

      <!-- Current weight + Target weight -->
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-weight">
            {m.cat_field_current_weight()}<span class="text-danger ml-0.5">*</span>
          </label>
          <input
            id="edit-weight"
            type="number"
            step="0.01"
            min="0.1"
            bind:value={currentWeightKg}
            placeholder="e.g. 4.5"
            class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-target">
            {m.cat_field_target_weight()}
            <span class="normal-case font-normal text-fg-subtle ml-1">{m.common_optional()}</span>
          </label>
          <input
            id="edit-target"
            type="number"
            step="0.01"
            min="0.1"
            bind:value={targetWeightKg}
            placeholder="e.g. 4.0"
            class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-fg-subtle outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Weight goal -->
      <div class="flex flex-col gap-2">
        <p class="text-fg-muted text-xs font-medium uppercase tracking-wider">{m.cat_field_weight_goal()}</p>
        <div class="grid grid-cols-3 gap-2">
          {#each [
            { value: 'weight_loss' as WeightGoal,  label: m.cat_goal_weight_loss() },
            { value: 'maintenance' as WeightGoal,  label: m.cat_goal_maintenance() },
            { value: 'weight_gain' as WeightGoal,  label: m.cat_goal_weight_gain() }
          ] as opt}
            <button
              type="button"
              onclick={() => (weightGoal = opt.value)}
              class="py-2.5 rounded-xl text-sm font-medium border transition-all duration-150"
              style="{weightGoal === opt.value
                ? 'border-color:var(--theme-primary);background:color-mix(in srgb, var(--theme-primary) 15%, transparent);color:var(--theme-primary-soft);'
                : 'border-color:var(--theme-border);background:var(--theme-inset);color:var(--theme-text-muted);'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Consumption baseline slider -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-fg-muted text-xs font-medium uppercase tracking-wider">{m.cat_field_consumption()}</p>
          <span class="text-sm font-bold" style="color:var(--theme-primary)">{consumptionBaseline}%</span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          step="1"
          bind:value={consumptionBaseline}
          class="w-full accent-primary cursor-pointer"
        />
        <div class="flex justify-between">
          <span class="text-[10px] text-fg-subtle">{m.cat_picky_eater()}</span>
          <span class="text-[10px] text-fg-subtle">{m.cat_always_finishes()}</span>
        </div>
        <p class="text-[11px] text-fg-subtle leading-relaxed">
          {m.cat_baseline_desc()}
        </p>
      </div>

      <!-- Weight reminder interval -->
      <div class="flex flex-col gap-1.5">
        <label class="text-fg-muted text-xs font-medium uppercase tracking-wider" for="edit-reminder">
          {m.cat_field_reminder()}
        </label>
        <select
          id="edit-reminder"
          bind:value={weightReminderInterval}
          class="bg-inset border border-line focus:border-primary/60 rounded-xl px-4 py-2.5 text-sm text-fg outline-none transition-colors cursor-pointer appearance-none"
        >
          <option value={3}>{m.cat_reminder_3()}</option>
          <option value={7}>{m.cat_reminder_7()}</option>
          <option value={14}>{m.cat_reminder_14()}</option>
        </select>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-1">
        <a
          href="/cats/{catId}"
          class="flex-1 text-center bg-transparent border border-line hover:border-line-strong text-fg-muted hover:text-fg font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          {m.common_cancel()}
        </a>
        <button
          type="button"
          onclick={handleSubmit}
          disabled={loading}
          class="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? m.common_saving() : m.settings_save_changes()}
        </button>
      </div>

    </div>
  {/if}

</div>
