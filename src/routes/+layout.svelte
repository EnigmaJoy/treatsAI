<script lang="ts">
  import { page } from '$app/state';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/cats', label: 'My Cats' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string): boolean {
    const pathname = page.url.pathname;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const isAuthPage = $derived(
    page.url.pathname === '/login' || page.url.pathname === '/register'
  );
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthPage}
  <div class="min-h-screen bg-[#0F0F1A] text-[#F8FAFC]">
    {@render children()}
  </div>
{:else}
  <div class="flex h-screen bg-[#0F0F1A] text-[#F8FAFC] overflow-hidden">

    <!-- ── Sidebar (desktop) ── -->
    <aside class="hidden md:flex flex-col w-[220px] shrink-0 bg-[#1A1A2E] border-r border-[#2D2D4A]">

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
        <a
          href="/api/v1/auth/logout"
          class="flex items-center gap-2 rounded-[6px] text-[13px] transition-all duration-150 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.06)]"
          style="padding: 10px 20px;"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </a>
      </div>
    </aside>

    <!-- ── Main content area ── -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      {@render children()}
    </div>

    <!-- ── Mobile bottom tab bar ── -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A2E] border-t border-[#2D2D4A] flex">
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

<!-- Preserve locale link generation for paraglide -->
<div style="display:none">
  {#each ['en', 'it', 'es'] as locale (locale)}
    <a href="/{locale}">{locale}</a>
  {/each}
</div>
