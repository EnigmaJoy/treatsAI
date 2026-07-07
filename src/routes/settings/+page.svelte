<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Cat, Device } from '$lib/types';
  import { setLocale, getLocale } from '$lib/paraglide/runtime';
  import * as m from '$lib/paraglide/messages';
  import { applyPalette, getSavedPalette } from '$lib/palette';

  let { data } = $props();

  let device = $state<Device | null>(null);

  // Feeder settings form state
  let currentFoodTypeLabel = $state<string>('');
  let foodReservoirPercent = $state<number>(0);

  $effect(() => {
    device = data.device ?? null;
    currentFoodTypeLabel = data.device?.currentFoodTypeLabel ?? '';
    foodReservoirPercent = data.device?.foodReservoirPercent ?? 0;
  });
  let feederSaving = $state(false);
  let feederToast = $state<string | null>(null);

  // Manual dispense state
  let cats = $state<Cat[]>([]);
  let selectedCatId = $state<string>('');
  let portionGrams = $state<number>(30);
  let dispensing = $state(false);
  let dispenseToast = $state<string | null>(null);

  // Fetch cats on mount + restore saved preferences
  onMount(async () => {
    const res = await fetch('/api/v1/cats');
    if (res.ok) {
      cats = (await res.json()).data?.cats ?? [];
      if (cats.length > 0) selectedCatId = cats[0].catId;
    }

    // Restore saved palette and sync the selection highlight
    const savedPalette = getSavedPalette();
    selectedPalette = savedPalette;
    applyPalette(savedPalette);

    // Sync language button to current Paraglide locale
    try {
      const locale = getLocale();
      if (locale === 'en' || locale === 'it' || locale === 'es') {
        selectedLanguage = locale;
      }
    } catch {
      // keep default
    }
  });

  function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showToast(setter: (v: string | null) => void, message: string) {
    setter(message);
    setTimeout(() => setter(null), 3000);
  }

  async function saveFeederSettings() {
    feederSaving = true;
    try {
      const res = await fetch('/api/v1/device', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFoodTypeLabel, foodReservoirPercent })
      });
      if (res.ok) {
        showToast(v => { feederToast = v; }, 'Feeder settings saved');
      } else {
        showToast(v => { feederToast = v; }, 'Failed to save settings');
      }
    } finally {
      feederSaving = false;
    }
  }

  async function dispenseNow() {
    if (!selectedCatId) return;
    dispensing = true;
    try {
      const res = await fetch('/api/v1/device/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catId: selectedCatId, portionGrams })
      });
      if (res.ok) {
        showToast(v => { dispenseToast = v; }, 'Dispensed successfully');
      } else {
        showToast(v => { dispenseToast = v; }, 'Dispense failed');
      }
    } finally {
      dispensing = false;
    }
  }

  async function signOut() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    goto('/login');
  }

  // ── Visual-only UI state ──
  type Section = 'appearance' | 'feeder' | 'notifications' | 'household' | 'security' | 'account';
  let activeSection = $state<Section>('appearance');

  let selectedTheme = $state<'dark' | 'light' | 'system'>('dark');
  let selectedLanguage = $state<'en' | 'it' | 'es'>('en');
  let selectedPalette = $state('midnight-paws');

  // ── Language switching ──
  function switchLanguage(lang: 'en' | 'it' | 'es') {
    selectedLanguage = lang;
    setLocale(lang, { reload: false });
    localStorage.setItem('treatsai-language', lang);
    // Force a real browser navigation so the PARAGLIDE_LOCALE cookie
    // is sent to the server and paraglideMiddleware can re-detect the locale.
    // SvelteKit's goto() is client-side only and never triggers a fresh HTTP request.
    window.location.href = window.location.href;
  }

  const navItems: { id: Section; label: string; active: boolean }[] = [
    { id: 'appearance',    label: m.settings_appearance(),   active: true },
    { id: 'feeder',        label: m.settings_feeder(),        active: true },
    { id: 'notifications', label: 'Notifications', active: false },
    { id: 'household',     label: 'Household',     active: false },
    { id: 'security',      label: 'Security',      active: false },
    { id: 'account',       label: 'Account',       active: false },
  ];

  const palettes = [
    { id: 'midnight-paws', name: 'Midnight Paws',  vibe: 'Elegant, cosmic',  swatches: ['#0F0F1A','#7C3AED','#F59E0B'] },
    { id: 'ocean-whisker', name: 'Ocean Whisker',  vibe: 'Calm, coastal',    swatches: ['#0A1628','#0EA5E9','#06B6D4'] },
    { id: 'forest-purr',   name: 'Forest Purr',    vibe: 'Natural, earthy',  swatches: ['#0A1A0F','#059669','#84CC16'] },
    { id: 'sakura-meow',   name: 'Sakura Meow',    vibe: 'Soft, romantic',   swatches: ['#1A0A14','#EC4899','#F43F5E'] },
    { id: 'golden-tabby',  name: 'Golden Tabby',   vibe: 'Warm, sunny',      swatches: ['#1A1200','#D97706','#FBBF24'] },
    { id: 'arctic-fox',    name: 'Arctic Fox',     vibe: 'Clean, minimal',   swatches: ['#0F172A','#64748B','#38BDF8'] },
  ];

  async function simulateRefill() {
    foodReservoirPercent = 100;
    await saveFeederSettings();
  }
</script>

<!-- ════════════════════════════════════════════════ -->
<div class="flex gap-6 min-h-full">

  <!-- ── Left sub-nav ── -->
  <aside class="w-[180px] shrink-0">
    <nav class="flex flex-col gap-0.5">
      {#each navItems as item}
        <button
          type="button"
          onclick={() => (activeSection = item.id)}
          class="flex items-center gap-2 rounded-[8px] text-sm text-left w-full transition-all duration-150
            {activeSection === item.id
              ? 'bg-[rgba(124,58,237,0.12)] text-[#F8FAFC] font-semibold'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.04)]'}"
          style="padding: 9px 12px;"
        >
          {item.label}
          {#if !item.active && activeSection !== item.id}
            <span class="ml-auto text-[9px] text-[#94A3B8] bg-[#2D2D4A] rounded px-1 py-0.5 shrink-0">Soon</span>
          {/if}
        </button>
      {/each}
    </nav>
  </aside>

  <!-- ── Right content ── -->
  <div class="flex-1 flex flex-col gap-5 min-w-0">

    <!-- ══ APPEARANCE ══ -->
    {#if activeSection === 'appearance'}
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-xl p-6 flex flex-col gap-6">
        <!-- Header -->
        <div>
          <h2 class="text-[16px] font-bold text-[#F8FAFC] mb-0.5">{m.settings_appearance()}</h2>
          <p class="text-[13px] text-[#94A3B8]">Personalise how TreatsAI looks</p>
        </div>

        <!-- Theme row -->
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-[13px] font-medium text-[#F8FAFC]">{m.settings_theme()}</p>
            <p class="text-[12px] text-[#94A3B8] mt-0.5">Switch between dark and light mode</p>
          </div>
          <select
            bind:value={selectedTheme}
            class="bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors cursor-pointer shrink-0"
            style="min-width:130px;"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <!-- Divider -->
        <div class="h-px bg-[#2D2D4A]"></div>

        <!-- Language row -->
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-[13px] font-medium text-[#F8FAFC]">{m.settings_language()}</p>
            <p class="text-[12px] text-[#94A3B8] mt-0.5">Choose your preferred language</p>
          </div>
          <div class="flex gap-1.5 shrink-0">
            {#each (['en', 'it', 'es'] as const) as lang}
              <button
                type="button"
                onclick={() => switchLanguage(lang)}
                class="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-150"
                style="{selectedLanguage === lang
                  ? 'border-color:#7C3AED;background:rgba(124,58,237,0.1);color:#7C3AED;'
                  : 'border-color:#2D2D4A;background:#0F0F1A;color:#94A3B8;'}"
              >
                {lang.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>

        <!-- Divider -->
        <div class="h-px bg-[#2D2D4A]"></div>

        <!-- Colour palette -->
        <div>
          <p class="text-[13px] font-medium text-[#F8FAFC] mb-0.5">{m.settings_palette()}</p>
          <p class="text-[12px] text-[#94A3B8] mb-4">Choose a palette that matches your household's personality</p>

          <div class="grid grid-cols-3 gap-3">
            {#each palettes as palette}
              {@const selected = selectedPalette === palette.id}
              <button
                type="button"
                onclick={() => { selectedPalette = palette.id; applyPalette(palette.id); }}
                class="relative text-left rounded-xl p-3 border-2 transition-all duration-150 hover:border-[#7C3AED]"
                style="border-color:{selected ? '#7C3AED' : '#2D2D4A'}; background:{selected ? 'rgba(124,58,237,0.06)' : 'transparent'};"
              >
                <!-- Checkmark -->
                {#if selected}
                  <div class="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#7C3AED] flex items-center justify-center">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                {/if}
                <!-- Swatches -->
                <div class="flex gap-1.5 mb-2.5">
                  {#each palette.swatches as color}
                    <div class="w-5 h-5 rounded-full shrink-0" style="background:{color};"></div>
                  {/each}
                </div>
                <p class="text-[12px] font-semibold text-[#F8FAFC] leading-tight">{palette.name}</p>
                <p class="text-[11px] text-[#94A3B8] mt-0.5">{palette.vibe}</p>
              </button>
            {/each}
          </div>
        </div>
      </div>

    <!-- ══ FEEDER ══ -->
    {:else if activeSection === 'feeder'}
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-xl p-6 flex flex-col gap-5">
        <!-- Header -->
        <div>
          <h2 class="text-[16px] font-bold text-[#F8FAFC] mb-0.5">{m.settings_feeder_title()}</h2>
          <p class="text-[13px] text-[#94A3B8]">{m.settings_feeder_subtitle()}</p>
        </div>

        <!-- Online status row -->
        <div class="flex items-center gap-3 rounded-lg px-4 py-3" style="background:#0F0F1A;border:1px solid #2D2D4A;">
          <span class="w-2 h-2 rounded-full shrink-0
            {device?.status === 'online'
              ? 'bg-[#10B981] shadow-[0_0_6px_2px_rgba(16,185,129,0.4)]'
              : 'bg-[#EF4444]'}">
          </span>
          <div>
            <p class="text-[13px] font-medium text-[#F8FAFC]">
              {device?.status === 'online' ? m.settings_feeder_online() : 'Feeder offline'}
            </p>
            <p class="text-[11px] text-[#94A3B8]">
              Firmware v{device?.firmwareVersion ?? '—'}
            </p>
          </div>
        </div>

        <!-- Food reservoir bar -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label for="reservoir-level" class="text-[13px] font-medium text-[#F8FAFC]">{m.settings_food_reservoir()}</label>
            <span class="text-[13px] font-bold" style="color:#7C3AED;">{foodReservoirPercent}%</span>
          </div>
          <div class="h-2 rounded-full overflow-hidden" style="background:#0F0F1A;">
            <div
              class="h-full rounded-full transition-all duration-500"
              style="width:{Math.min(100, Math.max(0, foodReservoirPercent))}%;background:#7C3AED;"
            ></div>
          </div>
        </div>

        <!-- Food type input -->
        <div>
          <label for="food-type-label" class="text-[12px] text-[#94A3B8] mb-1.5 block">{m.settings_food_type()}</label>
          <input
            id="food-type-label"
            type="text"
            bind:value={currentFoodTypeLabel}
            placeholder="e.g. Royal Canin Indoor Adult"
            class="w-full bg-[#0F0F1A] border border-[#2D2D4A] rounded-lg px-3 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#7C3AED] transition-colors placeholder-[#4B5563]"
          />
        </div>

        <!-- Buttons row -->
        <div class="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onclick={saveFeederSettings}
            disabled={feederSaving}
            class="bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
          >
            {feederSaving ? 'Saving…' : m.settings_save_changes()}
          </button>
          <button
            type="button"
            onclick={simulateRefill}
            disabled={feederSaving}
            class="bg-transparent border border-[#2D2D4A] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#94A3B8] rounded-lg px-5 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {m.settings_simulate_refill()}
          </button>
          {#if feederToast}
            <span class="text-[12px] text-[#10B981]">{feederToast}</span>
          {/if}
        </div>
      </div>

    <!-- ══ COMING SOON ══ -->
    {:else}
      <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center">
        <div class="w-10 h-10 rounded-full bg-[rgba(124,58,237,0.12)] flex items-center justify-center mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="text-[14px] font-semibold text-[#F8FAFC]">Coming soon</p>
        <p class="text-[12px] text-[#94A3B8]">This section is under construction for the hackathon.</p>
      </div>
    {/if}

    <!-- ══ DANGER ZONE ══ -->
    <div class="bg-[#1A1A2E] border border-[#2D2D4A] rounded-xl p-6">
      <h2 class="text-[16px] font-bold text-[#F8FAFC] mb-4">{m.settings_danger_zone()}</h2>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-[13px] font-medium text-[#F8FAFC]">{m.settings_delete_account()}</p>
          <p class="text-[12px] text-[#94A3B8] mt-0.5">{m.settings_delete_account_desc()}</p>
        </div>
        <button
          type="button"
          onclick={signOut}
          class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
          style="border:1px solid rgba(239,68,68,0.4);"
        >
          {m.settings_delete_account()}
        </button>
      </div>
    </div>

    <!-- ══ VERSION FOOTER ══ -->
    <p class="text-xs text-[#94A3B8] text-center mt-2 pb-2">
      TreatsAI v1.0.0 · Hack the Kitty · Cat World Domination Day 2026
    </p>

  </div><!-- end right content -->
</div>
