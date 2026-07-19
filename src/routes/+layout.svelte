<script lang="ts">
  import { page } from '$app/state';
  import { navigating } from '$app/stores';
  import PawLoader from '$lib/components/PawLoader.svelte';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import * as m from '$lib/paraglide/messages';
  import type { AlertType } from '$lib/types';
  import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';

  let { children, data } = $props();

  let langOpen = $state(false);
  let bellOpen = $state(false);

  const LOCALES: Array<{ code: typeof locales[number]; label: string }> = [
    { code: 'en', label: 'EN' },
    { code: 'it', label: 'IT' },
    { code: 'es', label: 'ES' }
  ];

  function currentLocaleLabel(): string {
    return getLocale().toUpperCase();
  }

  function selectLocale(code: typeof locales[number]) {
    setLocale(code);
    langOpen = false;
  }

  function avatarInitial(email: string | null): string {
    if (!email) return '?';
    return email[0].toUpperCase();
  }

  function alertTypeLabel(type: AlertType): string {
    switch (type) {
      case 'skip_meal':          return m.alert_type_skip_meal();
      case 'baseline_deviation': return m.alert_type_baseline_deviation();
      case 'weight_reminder':    return m.alert_type_weight_reminder();
      case 'low_food_level':     return m.alert_type_low_food();
      default:                   return type;
    }
  }

  function timeSinceShort(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return m.time_just_now();
    if (diffMins < 60) return m.time_ago_min({ n: diffMins });
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return m.time_ago_hour({ n: diffHrs });
    return m.time_ago_day({ n: Math.floor(diffHrs / 24) });
  }

  function closeAll() {
    langOpen = false;
    bellOpen = false;
  }

  const navLinks = $derived([
    { href: '/', label: m.nav_dashboard() },
    { href: '/cats', label: m.nav_my_cats() },
    { href: '/alerts', label: m.nav_alerts() },
    { href: '/settings', label: m.nav_settings() },
  ]);

  function isActive(href: string): boolean {
    const pathname = page.url.pathname;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const isAuthPage = $derived(
    page.url.pathname === '/login' || page.url.pathname === '/register'
  );


  async function logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthPage}
  <div class="min-h-screen bg-[#0F0F1A] text-[#F8FAFC]">
    {@render children()}
  </div>
{:else}
  <div class="flex h-screen text-[#F8FAFC] overflow-hidden" style="background:var(--color-bg)">

    <!-- ── Sidebar (desktop) ── -->
    <aside class="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[#2D2D4A]" style="background:var(--color-surface)">

      <!-- Logo -->
      <div class="px-5 h-[52px] flex items-center shrink-0 border-b border-[#2D2D4A]">
        <a href="/" class="flex items-center">
          <span class="text-[18px] font-bold text-[#F8FAFC]">Treats</span>
          <span class="text-[18px] font-bold text-[#7C3AED]">AI</span>
        </a>
      </div>

      <!-- Nav items -->
      <nav class="flex-1 py-3 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {#each navLinks as link (link.href)}
          {@const active = isActive(link.href)}
          <a
            href={link.href}
            class="flex items-center gap-2 rounded-[6px] text-[13px] transition-all duration-150 {active
              ? 'text-[#F8FAFC] bg-[rgba(124,58,237,0.12)]'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.04)]'}"
            style="padding: 10px 20px; {active ? 'border-left: 3px solid #7C3AED; padding-left: 17px;' : 'border-left: 3px solid transparent;'}"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              {#if link.href === '/'}
                <rect width="7" height="7" x="3" y="3" rx="1"/>
                <rect width="7" height="7" x="14" y="3" rx="1"/>
                <rect width="7" height="7" x="14" y="14" rx="1"/>
                <rect width="7" height="7" x="3" y="14" rx="1"/>
              {:else if link.href === '/cats'}
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              {:else if link.href === '/alerts'}
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              {:else if link.href === '/settings'}
                <line x1="4" y1="21" x2="4" y2="14"/>
                <line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/>
                <line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/>
                <line x1="9" y1="8" x2="15" y2="8"/>
                <line x1="17" y1="16" x2="23" y2="16"/>
              {/if}
            </svg>
            {link.label}
          </a>
        {/each}
      </nav>

      <!-- Logout at bottom -->
      <div class="px-3 py-3 shrink-0 border-t border-[#2D2D4A]">
        <button
          type="button"
          onclick={logout}
          class="w-full flex items-center gap-2 rounded-[6px] text-[13px] transition-all duration-150 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.06)] bg-transparent border-none cursor-pointer"
          style="padding: 10px 20px;"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {m.nav_logout()}
        </button>
      </div>
    </aside>

    <!-- ── Main content area ── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Topbar -->
      <div class="h-14 shrink-0 border-b border-[#2D2D4A] px-6 flex items-center justify-between">
        <!-- Left: empty slot reserved for future page title -->
        <div></div>

        <!-- Right: language switcher, notification bell, user info -->
        <div class="flex items-center gap-3">

          <!-- Language switcher dropdown -->
          <div class="relative">
            <button
              type="button"
              onclick={() => { langOpen = !langOpen; bellOpen = false; }}
              class="bg-[#1A1A2E] border rounded-lg px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors {langOpen ? 'border-[#7C3AED]' : 'border-[#2D2D4A] hover:border-[#7C3AED]'}"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label="Switch language"
            >
              <span class="text-[#F8FAFC] text-sm font-medium">{currentLocaleLabel()}</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                class="text-[#94A3B8] transition-transform duration-150 {langOpen ? 'rotate-180' : ''}"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {#if langOpen}
              <div
                role="listbox"
                aria-label="Select language"
                class="absolute right-0 top-full mt-1.5 w-28 rounded-[10px] border border-[#2D2D4A] overflow-hidden z-40"
                style="background:#1A1A2E; box-shadow: 0 8px 24px rgba(0,0,0,0.4)"
              >
                {#each LOCALES as locale}
                  {@const active = getLocale() === locale.code}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onclick={() => selectLocale(locale.code)}
                    class="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer
                      {active
                        ? 'text-[#A78BFA] bg-[rgba(124,58,237,0.12)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.04)]'}"
                  >
                    <span>{locale.label}</span>
                    {#if active}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Notification bell dropdown -->
          <div class="relative">
            <button
              type="button"
              onclick={() => { bellOpen = !bellOpen; langOpen = false; }}
              class="w-9 h-9 bg-[#1A1A2E] border rounded-lg flex items-center justify-center cursor-pointer transition-colors {bellOpen ? 'border-[#7C3AED]' : 'border-[#2D2D4A] hover:border-[#7C3AED]'}"
              aria-haspopup="dialog"
              aria-expanded={bellOpen}
              aria-label="Notifications"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#F8FAFC]" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </button>

            {#if data.alertCount > 0}
              <span
                class="absolute -top-1 -right-1 w-4 h-4 bg-[#F59E0B] rounded-full text-[#0F0F1A] text-[10px] font-bold flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                {data.alertCount > 9 ? '9+' : data.alertCount}
              </span>
            {/if}

            {#if bellOpen}
              <div
                role="dialog"
                aria-label="Notifications"
                class="absolute right-0 top-full mt-1.5 w-80 rounded-[12px] border border-[#2D2D4A] overflow-hidden z-40"
                style="background:#1A1A2E; box-shadow: 0 8px 32px rgba(0,0,0,0.5)"
              >
                <!-- Header -->
                <div class="flex items-center justify-between px-4 py-3 border-b border-[#2D2D4A]">
                  <span class="text-[13px] font-semibold text-[#F8FAFC]">{m.alerts_title()}</span>
                  {#if data.alertCount > 0}
                    <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      {data.alertCount}
                    </span>
                  {/if}
                </div>

                <!-- Alert list or empty state -->
                {#if data.alertPreview.length === 0}
                  <div class="flex flex-col items-center justify-center py-8 px-4 gap-2 text-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#2D2D4A]" aria-hidden="true">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                    <p class="text-[13px] font-medium text-[#F8FAFC]">{m.alert_empty_title()}</p>
                    <p class="text-[11px] text-[#94A3B8]">{m.alerts_all_good()}</p>
                  </div>
                {:else}
                  <ul>
                    {#each data.alertPreview as alert (alert.alertId)}
                      <li class="flex items-start gap-3 px-4 py-3 border-b border-[#2D2D4A] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                        <div class="flex-1 min-w-0">
                          <p class="text-[12px] font-medium text-[#F8FAFC] truncate">
                            {alertTypeLabel(alert.type)}
                            {#if alert.catName}
                              <span class="text-[#94A3B8] font-normal"> - {alert.catName}</span>
                            {/if}
                          </p>
                          <p class="text-[11px] text-[#94A3B8] mt-0.5">{timeSinceShort(alert.triggeredAt)}</p>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}

                <!-- Footer link -->
                <div class="px-4 py-2.5 border-t border-[#2D2D4A]">
                  <a
                    href="/alerts"
                    onclick={() => { bellOpen = false; }}
                    class="text-[12px] text-[#7C3AED] hover:text-[#A78BFA] transition-colors font-medium"
                  >
                    {m.alerts_title()} →
                  </a>
                </div>
              </div>
            {/if}
          </div>

          <!-- User avatar + info -->
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" aria-hidden="true">
              {avatarInitial(data.userEmail)}
            </div>
            <div class="hidden sm:flex flex-col">
              <span class="text-[#F8FAFC] text-sm font-medium leading-none truncate max-w-[140px]">
                {data.userEmail ?? ''}
              </span>
              <span class="text-[#94A3B8] text-xs leading-none mt-0.5">{m.user_role()}</span>
            </div>
          </div>

        </div>
      </div>
      <!-- Page content -->
      <div class="flex-1 overflow-y-auto px-6 py-6">
        {@render children()}
      </div>
    </div>

    <!-- ── Mobile bottom tab bar ── -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#2D2D4A] flex" style="background:var(--color-surface)">
      {#each navLinks as link (link.href)}
        {@const active = isActive(link.href)}
        <a
          href={link.href}
          class="flex-1 flex flex-col items-center gap-1 py-2 text-[10px] transition-colors {active ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {#if link.href === '/'}
              <rect width="7" height="7" x="3" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="3" rx="1"/>
              <rect width="7" height="7" x="14" y="14" rx="1"/>
              <rect width="7" height="7" x="3" y="14" rx="1"/>
            {:else if link.href === '/cats'}
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            {:else if link.href === '/alerts'}
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            {:else if link.href === '/settings'}
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            {/if}
          </svg>
          {link.label}
        </a>
      {/each}
    </nav>

  </div>
{/if}

{#if langOpen || bellOpen}
  <div
    style="position:fixed;inset:0;z-index:30"
    aria-hidden="true"
    onclick={closeAll}
  ></div>
{/if}

{#if $navigating}
  <div style="position:fixed;inset:0;background:rgba(15,15,26,0.85);z-index:50;display:flex;align-items:center;justify-content:center;">
    <PawLoader label="Loading..." variant="screen" />
  </div>
{/if}

<!-- Preserve locale link generation for paraglide -->
<div style="display:none">
  {#each ['en', 'it', 'es'] as locale (locale)}
    <a href="/{locale}">{locale}</a>
  {/each}
</div>
