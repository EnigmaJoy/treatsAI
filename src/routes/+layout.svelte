<script lang="ts">
  import { page } from '$app/state';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  let mobileMenuOpen = $state(false);

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/cats', label: 'Cats' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string): boolean {
    const pathname = page.url.pathname;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-[#0f0f1a] text-white">
  <!-- Top navigation bar -->
  <nav class="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-[#7c3aed]/20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-14">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-2 text-white font-bold text-lg hover:opacity-90 transition-opacity">
          <span class="text-xl">🐾</span>
          <span class="bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">
            TreatsAI
          </span>
        </a>

        <!-- Desktop nav links -->
        <div class="hidden sm:flex items-center gap-1">
          {#each navLinks as link (link.href)}
            <a
              href={link.href}
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                {isActive(link.href)
                  ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}"
            >
              {link.label}
            </a>
          {/each}
        </div>

        <!-- Mobile hamburger button -->
        <button
          class="sm:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
          onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span class="block w-5 h-0.5 bg-slate-300 transition-all duration-200
            {mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}"></span>
          <span class="block w-5 h-0.5 bg-slate-300 transition-all duration-200
            {mobileMenuOpen ? 'opacity-0' : ''}"></span>
          <span class="block w-5 h-0.5 bg-slate-300 transition-all duration-200
            {mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}"></span>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    {#if mobileMenuOpen}
      <div class="sm:hidden border-t border-[#7c3aed]/20 bg-[#0f0f1a]/95">
        <div class="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-1">
          {#each navLinks as link (link.href)}
            <a
              href={link.href}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                {isActive(link.href)
                  ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}"
              onclick={() => (mobileMenuOpen = false)}
            >
              {link.label}
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </nav>

  <!-- Main content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {@render children()}
  </main>
</div>

<!-- Preserve locale link generation for paraglide -->
<div style="display:none">
  {#each ['en', 'it', 'es'] as locale (locale)}
    <a href="/{locale}">{locale}</a>
  {/each}
</div>
