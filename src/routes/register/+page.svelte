<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { Language, WeightGoal } from '$lib/types';

  // ── Existing account state (preserved exactly) ──
  let email          = $state('');
  let password       = $state('');
  let confirmPassword = $state('');
  let language       = $state<Language>('en');
  let error          = $state('');
  let loading        = $state(false);

  // ── Wizard navigation ──
  let currentStep = $state(1);

  // ── Visual-only UI state ──
  let showPassword        = $state(false);
  let showConfirmPassword = $state(false);

  // ── Step 2: Cat details ──
  let catName               = $state('');
  let catBreed              = $state('');
  let catDob                = $state('');
  let catCurrentWeight      = $state('');
  let catTargetWeight       = $state('');
  let catWeightGoal         = $state<WeightGoal>('maintenance');
  let catConsumptionBaseline = $state(95);
  let catMicrochip          = $state('');
  let catReminderInterval   = $state<3 | 7 | 14>(7);

  // ── Step 3: Schedule ──
  interface FeedingSlot { id: number; time: string; portionGrams: number }
  let slotCounter = 3;
  let feedingSlots = $state<FeedingSlot[]>([
    { id: 0, time: '08:00', portionGrams: 80 },
    { id: 1, time: '14:00', portionGrams: 80 },
    { id: 2, time: '18:00', portionGrams: 80 },
  ]);
  let foodTypeLabel = $state('');

  // ── Derived ──
  const suggestedPortion = $derived.by(() => {
    const w = parseFloat(catCurrentWeight) || 4;
    const mult = catWeightGoal === 'weight_loss' ? 40 : catWeightGoal === 'weight_gain' ? 60 : 50;
    const slots = feedingSlots.length || 1;
    return Math.max(10, Math.round(w * mult / slots / 5) * 5);
  });
  const totalDaily     = $derived(feedingSlots.reduce((s, slot) => s + (slot.portionGrams || 0), 0));
  const avgPortionMeal = $derived(feedingSlots.length > 0 ? Math.round(totalDaily / feedingSlots.length) : 0);

  // ── Slot helpers ──
  function addSlot() {
    feedingSlots = [...feedingSlots, { id: slotCounter++, time: '12:00', portionGrams: suggestedPortion }];
  }
  function removeSlot(id: number) {
    if (feedingSlots.length > 1) feedingSlots = feedingSlots.filter(s => s.id !== id);
  }
  function updateSlotTime(id: number, val: string) {
    feedingSlots = feedingSlots.map(s => s.id === id ? { ...s, time: val } : s);
  }
  function updateSlotPortion(id: number, val: number) {
    feedingSlots = feedingSlots.map(s => s.id === id ? { ...s, portionGrams: val } : s);
  }

  // Clear any existing session so a stale cookie doesn't interfere with registration
  onMount(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
  });

  // ── Step navigation ──
  function goToNext() {
    error = '';
    if (currentStep === 1) {
      if (!email.trim())          { error = 'Email is required'; return; }
      if (password.length < 8)    { error = 'Password must be at least 8 characters'; return; }
      if (password !== confirmPassword) { error = 'Passwords do not match'; return; }
    } else if (currentStep === 2) {
      if (!catName.trim())        { error = 'Cat name is required'; return; }
      const w = parseFloat(catCurrentWeight);
      if (!w || w < 0.5 || w > 20) { error = 'Please enter a valid weight (0.5 – 20 kg)'; return; }
    } else if (currentStep === 3) {
      if (uploadedPhotos.length < 3) { error = 'Please upload at least 3 photos'; return; }
    }
    currentStep++;
  }

  function goToPrev() { error = ''; currentStep--; }

  // ── Finish: single register call with full onboarding payload, then login ──
  async function handleFinish() {
    loading = true; error = '';
    try {
      // 1. Register with cat and schedule included - creates everything atomically
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          language,
          cat: {
            name: catName.trim(),
            breed: catBreed.trim() || undefined,
            dateOfBirth: catDob || undefined,
            currentWeightKg: parseFloat(catCurrentWeight),
            targetWeightKg: catTargetWeight ? parseFloat(catTargetWeight) : undefined,
            weightGoal: catWeightGoal,
            consumptionBaseline: catConsumptionBaseline,
            microchipNumber: catMicrochip.trim() || undefined,
            weightReminderInterval: catReminderInterval
          },
          schedule: {
            feedingTimes: feedingSlots.map(s => ({ time: s.time, portionGrams: s.portionGrams })),
            foodType: foodTypeLabel.trim() || undefined
          }
        })
      });
      const data = await res.json();
      if (!data.success) { error = data.error?.message ?? 'Registration failed'; return; }

      const catId: string | undefined = data.data.catId;

      // 2. Auto-login to establish session cookie
      const loginRes = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: false })
      });
      const loginData = await loginRes.json();
      if (!loginData.success) { goto('/login'); return; }

      // 3. Upload photos if any (requires session from step 2)
      if (uploadedPhotos.length > 0 && catId) {
        const formData = new FormData();
        for (const file of uploadedPhotos) {
          formData.append('photos', file);
        }
        await fetch(`/api/v1/cats/${catId}/photos`, {
          method: 'POST',
          body: formData
        });
      }

      goto('/');
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (currentStep < 4) goToNext();
      else handleFinish();
    }
  }

  // ── Step 3: Photos ──
  let uploadedPhotos = $state<File[]>([]);
  let photoFileInput: HTMLInputElement;

  const visiblePhotoSlots = $derived(Math.min(10, Math.max(uploadedPhotos.length + 2, 5)));
  const photoGridSlots    = $derived(Array.from({ length: visiblePhotoSlots }, (_, i) => i));

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const newFiles = Array.from(input.files).filter(f =>
      (f.type === 'image/jpeg' || f.type === 'image/png') && f.size <= 15 * 1024 * 1024
    );
    uploadedPhotos = [...uploadedPhotos, ...newFiles].slice(0, 10);
    input.value = '';
  }

  const stepLabels = ['Account', 'Your cat', 'Photos', 'Schedule'];
</script>

<!-- ═══════════════════════════════════════════════════════
     PAGE WRAPPER
════════════════════════════════════════════════════════ -->
<div class="min-h-screen bg-[#0F0F1A] flex flex-col items-center py-10 px-4">

  <!-- Logo -->
  <div class="mb-8 mt-2">
    <span style="font-size:20px;font-weight:700;color:#F8FAFC;">Treats</span><span style="font-size:20px;font-weight:700;color:#7C3AED;">AI</span>
  </div>

  <!-- ── Progress bar ── -->
  <div class="mb-8 flex items-center">
    {#each [1, 2, 3, 4] as stepNum, i}
      <!-- Step circle + label -->
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all duration-200"
          style="background:{currentStep >= stepNum ? '#7C3AED' : '#2D2D4A'};{currentStep === stepNum ? 'box-shadow:0 0 0 4px rgba(124,58,237,0.2)' : ''}"
        >
          {#if currentStep > stepNum}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          {:else}
            <span style="color:{currentStep >= stepNum ? 'white' : '#94A3B8'}">{stepNum}</span>
          {/if}
        </div>
        <span class="text-[11px] mt-1.5 whitespace-nowrap" style="color:{currentStep >= stepNum ? '#F8FAFC' : '#94A3B8'}">
          {stepLabels[i]}
        </span>
      </div>
      <!-- Connector line -->
      {#if i < 3}
        <div class="w-[60px] h-0.5 mb-5 transition-colors duration-200"
          style="background:{currentStep > stepNum ? '#7C3AED' : '#2D2D4A'}"></div>
      {/if}
    {/each}
  </div>

  <!-- ── Card ── -->
  <div class="w-full max-w-[560px] bg-[#1A1A2E] border border-[#2D2D4A] rounded-2xl p-8">

    <!-- Error banner -->
    {#if error}
      <div class="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]"
        style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#F87171;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {error}
      </div>
    {/if}

    <!-- ════════════════════ STEP 1 ════════════════════ -->
    {#if currentStep === 1}
      <h2 style="font-size:20px;font-weight:700;color:#F8FAFC;" class="mb-1">Create your account</h2>
      <p style="font-size:13px;color:#94A3B8;" class="mb-6">Set up your TreatsAI account to get started</p>

      <div class="flex flex-col gap-5">

        <!-- Email -->
        <div>
          <label for="reg-email" class="text-xs text-[#94A3B8] mb-1.5 block">
            Email address<span class="text-[#EF4444] ml-0.5">*</span>
          </label>
          <input
            id="reg-email" type="email" autocomplete="email"
            bind:value={email} onkeydown={handleKeydown}
            placeholder="you@example.com"
            class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="reg-password" class="text-xs text-[#94A3B8] mb-1.5 block">
            Password<span class="text-[#EF4444] ml-0.5">*</span>
          </label>
          <div class="relative">
            <input
              id="reg-password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
              bind:value={password} onkeydown={handleKeydown}
              placeholder="Min. 8 characters"
              class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 pr-10 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
            />
            <button type="button" onclick={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {#if showPassword}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              {:else}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Confirm password -->
        <div>
          <label for="reg-confirm" class="text-xs text-[#94A3B8] mb-1.5 block">
            Confirm password<span class="text-[#EF4444] ml-0.5">*</span>
          </label>
          <div class="relative">
            <input
              id="reg-confirm" type={showConfirmPassword ? 'text' : 'password'} autocomplete="new-password"
              bind:value={confirmPassword} onkeydown={handleKeydown}
              placeholder="Repeat your password"
              class="w-full bg-[#0F0F1A] border rounded-lg px-3 py-2.5 pr-10 text-[#F8FAFC] text-sm outline-none transition-colors placeholder-[#4B5563] {confirmPassword && confirmPassword !== password ? 'border-[#EF4444]' : 'border-[#2D2D4A] focus:border-[#7C3AED]'}"
            />
            <button type="button" onclick={() => (showConfirmPassword = !showConfirmPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
              {#if showConfirmPassword}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              {:else}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              {/if}
            </button>
          </div>
          {#if confirmPassword && confirmPassword !== password}
            <p class="text-[11px] text-[#EF4444] mt-1">Passwords do not match</p>
          {/if}
        </div>

        <!-- Language -->
        <div>
          <p class="text-xs text-[#94A3B8] mb-1.5">Language</p>
          <div class="flex gap-2">
            {#each (['en', 'it', 'es'] as const) as lang}
              <button
                type="button"
                onclick={() => (language = lang)}
                class="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150"
                style="{language === lang
                  ? 'border-color:#7C3AED;background:rgba(124,58,237,0.1);color:#7C3AED;'
                  : 'border-color:#2D2D4A;background:#0F0F1A;color:#94A3B8;'}"
              >
                {lang.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>

      </div>
    {/if}

    <!-- ════════════════════ STEP 2 ════════════════════ -->
    {#if currentStep === 2}
      <h2 style="font-size:20px;font-weight:700;color:#F8FAFC;" class="mb-1">Tell us about your cat</h2>
      <p style="font-size:13px;color:#94A3B8;" class="mb-6">This helps TreatsAI personalise portions and track health</p>

      <div class="flex flex-col gap-5">

        <!-- Name + Breed (2-col) -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="cat-name" class="text-xs text-[#94A3B8] mb-1.5 block">
              Cat name<span class="text-[#EF4444] ml-0.5">*</span>
            </label>
            <input
              id="cat-name" type="text" autocomplete="off"
              bind:value={catName} onkeydown={handleKeydown}
              placeholder="e.g. Luna"
              class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
            />
          </div>
          <div>
            <label for="cat-breed" class="text-xs text-[#94A3B8] mb-1.5 block flex items-center gap-1">
              Breed
              <span class="bg-[#2D2D4A] rounded text-[10px] text-[#94A3B8] px-1.5 py-0.5">optional</span>
            </label>
            <input
              id="cat-breed" type="text" autocomplete="off"
              bind:value={catBreed}
              placeholder="e.g. Maine Coon"
              class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
            />
          </div>
        </div>

        <!-- Date of birth -->
        <div>
          <label for="cat-dob" class="text-xs text-[#94A3B8] mb-1.5 block flex items-center gap-1">
            Date of birth
            <span class="bg-[#2D2D4A] rounded text-[10px] text-[#94A3B8] px-1.5 py-0.5">optional</span>
          </label>
          <input
            id="cat-dob" type="date"
            bind:value={catDob}
            class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors"
            style="color-scheme:dark;"
          />
          <p class="text-[11px] text-[#94A3B8] mt-1">Used to track age-related needs</p>
        </div>

        <!-- Current weight + Target weight (2-col) -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="cat-weight" class="text-xs text-[#94A3B8] mb-1.5 block">
              Current weight (kg)<span class="text-[#EF4444] ml-0.5">*</span>
            </label>
            <input
              id="cat-weight" type="number" min="0.5" max="20" step="0.1"
              bind:value={catCurrentWeight} onkeydown={handleKeydown}
              placeholder="e.g. 4.2"
              class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
            />
          </div>
          <div>
            <label for="cat-target" class="text-xs text-[#94A3B8] mb-1.5 block flex items-center gap-1">
              Target weight (kg)
              <span class="bg-[#2D2D4A] rounded text-[10px] text-[#94A3B8] px-1.5 py-0.5">optional</span>
            </label>
            <input
              id="cat-target" type="number" min="0.5" max="20" step="0.1"
              bind:value={catTargetWeight}
              placeholder="e.g. 4.0"
              class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
            />
          </div>
        </div>

        <!-- Weight goal (3-option grid) -->
        <div>
          <p class="text-xs text-[#94A3B8] mb-2">Weight goal</p>
          <div class="grid grid-cols-3 gap-2">
            {#each [
              { value: 'weight_loss' as WeightGoal,  label: 'Weight loss',  sub: 'Reduce portion over time' },
              { value: 'maintenance' as WeightGoal,  label: 'Maintenance',  sub: 'Keep current weight stable' },
              { value: 'weight_gain' as WeightGoal,  label: 'Weight gain',  sub: 'Increase portion over time' },
            ] as opt}
              <button
                type="button"
                onclick={() => (catWeightGoal = opt.value)}
                class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-150 text-center"
                style="{catWeightGoal === opt.value
                  ? 'border-color:#7C3AED;background:rgba(124,58,237,0.1);'
                  : 'border-color:#2D2D4A;background:#0F0F1A;'}"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{catWeightGoal === opt.value ? '#7C3AED' : '#94A3B8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  {#if opt.value === 'weight_loss'}
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                    <polyline points="17 18 23 18 23 12"/>
                  {:else if opt.value === 'maintenance'}
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  {:else}
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  {/if}
                </svg>
                <span class="text-[12px] font-medium" style="color:{catWeightGoal === opt.value ? '#F8FAFC' : '#94A3B8'}">{opt.label}</span>
                <span class="text-[10px]" style="color:#94A3B8;line-height:1.3">{opt.sub}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Consumption baseline slider -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-[#94A3B8]">How much does your cat normally eat?</p>
            <span class="text-sm font-bold" style="color:#7C3AED">{catConsumptionBaseline}%</span>
          </div>
          <input
            type="range" min="50" max="100" step="1"
            bind:value={catConsumptionBaseline}
            class="w-full accent-[#7C3AED] cursor-pointer"
          />
          <div class="flex justify-between mt-1">
            <span class="text-[10px] text-[#94A3B8]">Picky eater (50%)</span>
            <span class="text-[10px] text-[#94A3B8]">Always finishes (100%)</span>
          </div>
          <p class="text-[11px] text-[#94A3B8] mt-2 leading-relaxed">
            This becomes your cat's consumption baseline. Alerts fire when eating drops significantly below this.
          </p>
        </div>

        <!-- Microchip (optional) -->
        <div>
          <label for="cat-chip" class="text-xs text-[#94A3B8] mb-1.5 flex items-center gap-1">
            Microchip number
            <span class="bg-[#2D2D4A] rounded text-[10px] text-[#94A3B8] px-1.5 py-0.5">optional</span>
            <span class="bg-[rgba(245,158,11,0.15)] rounded text-[10px] text-[#F59E0B] px-1.5 py-0.5">post-MVP</span>
          </label>
          <input
            id="cat-chip" type="text"
            bind:value={catMicrochip}
            placeholder="15-digit ISO 11784/11785 number"
            class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
          />
          <p class="text-[11px] text-[#94A3B8] mt-1">Secondary identity verification alongside camera recognition</p>
        </div>

        <!-- Weight reminder interval -->
        <div>
          <label for="cat-reminder" class="text-xs text-[#94A3B8] mb-1.5 block">Weight reminder</label>
          <select
            id="cat-reminder"
            bind:value={catReminderInterval}
            class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors cursor-pointer"
          >
            <option value={3}>Every 3 days</option>
            <option value={7}>Every 7 days</option>
            <option value={14}>Every 14 days</option>
          </select>
        </div>

      </div>
    {/if}

    <!-- ════════════════════ STEP 3 ════════════════════ -->
    {#if currentStep === 3}
      <h2 style="font-size:20px;font-weight:700;color:#F8FAFC;" class="mb-1">Train face recognition</h2>
      <p style="font-size:13px;color:#94A3B8;" class="mb-5">
        Upload 3 to 10 clear photos of your cat's face. These train the AI to recognize your cat at the feeder.
      </p>

      <!-- Tip box -->
      <div class="rounded-xl p-3 mb-4" style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);">
        <div class="flex items-center gap-2 mb-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
          </svg>
          <p class="text-[13px] font-semibold" style="color:#7C3AED;">Photo tips for best results</p>
        </div>
        <p class="text-[12px] text-[#94A3B8] leading-relaxed">
          Good lighting, front-facing, one cat per photo. JPEG or PNG only (max 15MB each). iPhone users: convert HEIC to JPEG before uploading.
        </p>
      </div>

      <!-- Upload area -->
      <button
        type="button"
        onclick={() => photoFileInput.click()}
        class="w-full border-2 border-dashed border-[#2D2D4A] hover:border-[#7C3AED] rounded-xl p-8 text-center cursor-pointer mb-4 transition-colors bg-transparent"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2D2D4A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3" aria-hidden="true">
          <polyline points="16 16 12 12 8 16"/>
          <line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        <p class="text-[13px] font-semibold text-[#F8FAFC] mb-1">Drop photos here or click to browse</p>
        <p class="text-sm text-[#94A3B8]">JPEG, PNG only · max 15MB per photo</p>
      </button>
      <input
        bind:this={photoFileInput}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        class="hidden"
        onchange={handleFileSelect}
      />

      <!-- Photo grid -->
      <div class="grid grid-cols-5 gap-2 mb-3">
        {#each photoGridSlots as idx (idx)}
          {#if idx < uploadedPhotos.length}
            <div class="aspect-square rounded-lg bg-[#0F0F1A] border border-[#7C3AED] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
          {:else}
            <div class="aspect-square rounded-lg bg-[#0F0F1A] border border-[#2D2D4A] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Photo count -->
      <p class="text-[12px] mb-4" style="color:{uploadedPhotos.length >= 3 ? '#7C3AED' : '#F59E0B'}">
        {uploadedPhotos.length} of 10 photos uploaded · minimum 3 required
      </p>

      <!-- Rekognition training status -->
      <div class="rounded-xl p-3 bg-[#0F0F1A]">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[12px] text-[#94A3B8]">Rekognition training</span>
          {#if uploadedPhotos.length >= 3}
            <span class="text-[12px] font-medium" style="color:#10B981;">Ready</span>
          {:else}
            <span class="text-[12px] font-medium" style="color:#F59E0B;">
              Needs {3 - uploadedPhotos.length} more {3 - uploadedPhotos.length === 1 ? 'photo' : 'photos'}
            </span>
          {/if}
        </div>
        <div class="w-full rounded-full h-1.5 mb-2" style="background:#2D2D4A;">
          <div
            class="h-1.5 rounded-full transition-all duration-300"
            style="width:{uploadedPhotos.length >= 3 ? 100 : Math.round(uploadedPhotos.length / 3 * 100)}%;background:{uploadedPhotos.length >= 3 ? '#10B981' : '#F59E0B'};"
          ></div>
        </div>
        <p class="text-[11px] text-[#94A3B8]">
          {uploadedPhotos.length} face embedding{uploadedPhotos.length !== 1 ? 's' : ''} indexed in AWS Rekognition
        </p>
      </div>
    {/if}

    <!-- ════════════════════ STEP 4 ════════════════════ -->
    {#if currentStep === 4}
      <h2 style="font-size:20px;font-weight:700;color:#F8FAFC;" class="mb-1">
        Set up {catName || 'your cat'}'s feeding schedule
      </h2>
      <p style="font-size:13px;color:#94A3B8;" class="mb-5">
        Configure when and how much to dispense each day
      </p>

      <!-- AI suggestion box -->
      <div class="rounded-[10px] p-[14px] mb-5" style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);">
        <div class="flex items-start gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0" aria-hidden="true">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
          </svg>
          <div>
            <p class="text-[13px] font-medium text-[#F8FAFC]">
              Based on {catName || 'your cat'}'s weight and goal, we suggest
              <span style="color:#7C3AED;font-weight:700;">{suggestedPortion}g per meal</span>
              across {feedingSlots.length} daily feedings.
            </p>
            <p class="text-[11px] text-[#94A3B8] mt-1">
              You can override any portion below. Suggestions update when you log new weight.
            </p>
          </div>
        </div>
      </div>

      <!-- Feeding time slots -->
      <div class="flex flex-col gap-2 mb-3">
        {#each feedingSlots as slot (slot.id)}
          <div class="flex items-end gap-3 rounded-[10px] p-4" style="background:#0F0F1A;border:1px solid #2D2D4A;">
            <!-- Time -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-[#94A3B8]" for="slot-time-{slot.id}">Time</label>
              <input
                id="slot-time-{slot.id}"
                type="time"
                value={slot.time}
                oninput={(e) => updateSlotTime(slot.id, (e.target as HTMLInputElement).value)}
                class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-lg px-3 py-2 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors"
                style="color-scheme:dark;width:110px;"
              />
            </div>

            <!-- Divider -->
            <div class="w-px self-stretch" style="background:#2D2D4A;margin-bottom:0;"></div>

            <!-- Portion -->
            <div class="flex flex-col gap-1 flex-1">
              <div class="flex items-center gap-2">
                <label class="text-[10px] text-[#94A3B8]" for="slot-portion-{slot.id}">Portion (g)</label>
                {#if slot.portionGrams === suggestedPortion}
                  <span class="text-[10px] px-1.5 py-0.5 rounded" style="background:rgba(124,58,237,0.15);color:#7C3AED;">Suggested</span>
                {/if}
              </div>
              <input
                id="slot-portion-{slot.id}"
                type="number" min="10" max="500" step="5"
                value={slot.portionGrams}
                oninput={(e) => updateSlotPortion(slot.id, parseInt((e.target as HTMLInputElement).value) || 0)}
                class="w-full bg-[#1A1A2E] border border-[#2D2D4A] rounded-lg px-3 py-2 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>

            <!-- Remove button -->
            <button
              type="button"
              onclick={() => removeSlot(slot.id)}
              disabled={feedingSlots.length <= 1}
              class="text-[#94A3B8] hover:text-[#EF4444] transition-colors disabled:opacity-30 disabled:cursor-not-allowed pb-2"
              aria-label="Remove feeding slot"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        {/each}
      </div>

      <!-- Add feeding time -->
      <button
        type="button"
        onclick={addSlot}
        class="w-full rounded-[10px] py-3 text-sm text-[#94A3B8] transition-all duration-150 hover:text-[#7C3AED] hover:border-[#7C3AED] mb-5"
        style="border:1px dashed #2D2D4A;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#7C3AED'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#2D2D4A'}
      >
        + Add feeding time
      </button>

      <!-- Food type (optional) -->
      <div class="mb-5">
        <label for="food-type" class="text-xs text-[#94A3B8] mb-1.5 flex items-center gap-1">
          Food type
          <span class="bg-[#2D2D4A] rounded text-[10px] text-[#94A3B8] px-1.5 py-0.5">optional</span>
        </label>
        <input
          id="food-type" type="text"
          bind:value={foodTypeLabel}
          placeholder="e.g. Whiskas Tuna, Royal Canin Indoor"
          class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
        />
      </div>

      <!-- Daily summary -->
      <div class="rounded-[10px] p-4" style="background:#0F0F1A;">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[12px] text-[#94A3B8]">Feeding times</span>
          <span class="text-[13px] font-medium text-[#F8FAFC]">{feedingSlots.length} per day</span>
        </div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] text-[#94A3B8]">Avg. portion per meal</span>
          <span class="text-[13px] font-medium text-[#F8FAFC]">{avgPortionMeal}g</span>
        </div>
        <div class="h-px mb-3" style="background:#2D2D4A;"></div>
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-[#94A3B8]">Total daily food</span>
          <span class="text-[14px] font-bold" style="color:#7C3AED;">{totalDaily}g / day</span>
        </div>
      </div>
    {/if}

    <!-- ── Card footer ── -->
    <div class="mt-6 pt-5 border-t border-[#2D2D4A] flex items-center justify-between">

      <!-- Back or spacer -->
      {#if currentStep > 1}
        <button type="button" onclick={goToPrev}
          class="bg-transparent border border-[#2D2D4A] text-[#94A3B8] rounded-lg px-4 py-2 text-sm hover:text-[#F8FAFC] hover:border-[#94A3B8] transition-colors">
          ← Back
        </button>
      {:else}
        <div></div>
      {/if}

      <!-- Step counter -->
      <span class="text-[12px] text-[#94A3B8]">Step {currentStep} of 4</span>

      <!-- Next or Finish -->
      {#if currentStep === 1}
        <button type="button" onclick={goToNext}
          class="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white rounded-lg px-6 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors">
          Next – Your cat <span aria-hidden="true">→</span>
        </button>
      {:else if currentStep === 2}
        <button type="button" onclick={goToNext}
          class="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white rounded-lg px-6 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors">
          Next – Photos <span aria-hidden="true">→</span>
        </button>
      {:else if currentStep === 3}
        <button type="button" onclick={goToNext}
          disabled={uploadedPhotos.length < 3}
          class="bg-[#7C3AED] hover:bg-[#8B5CF6] text-white rounded-lg px-6 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Next – Schedule <span aria-hidden="true">→</span>
        </button>
      {:else}
        <button type="button" onclick={handleFinish} disabled={loading}
          class="bg-[#10B981] hover:bg-[#34D399] text-white rounded-lg px-6 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60">
          {loading ? 'Setting up…' : 'Finish setup'} {#if !loading}<span aria-hidden="true">✓</span>{/if}
        </button>
      {/if}

    </div>
  </div>

  <!-- Sign in link -->
  <p class="text-center text-[#94A3B8] text-sm mt-6 mb-4">
    Already have an account?
    <a href="/login" class="text-[#7C3AED] hover:text-[#8B5CF6] transition-colors font-medium">Sign in</a>
  </p>

</div>
