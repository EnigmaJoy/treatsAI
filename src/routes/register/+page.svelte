<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Language } from '$lib/types';

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let language = $state<Language>('en');
  let error = $state('');
  let loading = $state(false);

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  async function handleRegister() {
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    loading = true; error = '';
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, language })
      });
      const data = await res.json();
      if (data.success) {
        // Auto-login after register
        const loginRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe: false })
        });
        const loginData = await loginRes.json();
        if (loginData.success) {
          goto('/cats/new');
        } else {
          // Registration succeeded but login failed — redirect to login
          goto('/login');
        }
      } else {
        error = data.error?.message ?? 'Registration failed';
      }
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleRegister();
  }
</script>

<div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="text-4xl mb-3">🐾</div>
      <h1 class="text-2xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">
        TreatsAI
      </h1>
      <p class="text-slate-500 text-sm mt-1">Create your account</p>
    </div>

    <!-- Card -->
    <div class="bg-[#1a1a2e] border border-[#7c3aed]/30 rounded-2xl p-6 flex flex-col gap-4">
      <!-- Error message -->
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p class="text-red-400 text-sm">{error}</p>
        </div>
      {/if}

      <!-- Email field -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autocomplete="email"
          bind:value={email}
          onkeydown={handleKeydown}
          placeholder="you@example.com"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <!-- Password field -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autocomplete="new-password"
          bind:value={password}
          onkeydown={handleKeydown}
          placeholder="Min. 8 characters"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <!-- Confirm password -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="confirm-password">
          Confirm Password
        </label>
        <input
          id="confirm-password"
          type="password"
          autocomplete="new-password"
          bind:value={confirmPassword}
          onkeydown={handleKeydown}
          placeholder="••••••••"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors
            {confirmPassword && confirmPassword !== password ? 'border-red-500/50' : ''}"
        />
        {#if confirmPassword && confirmPassword !== password}
          <p class="text-red-400 text-xs">Passwords do not match</p>
        {/if}
      </div>

      <!-- Language selector -->
      <div class="flex flex-col gap-1.5">
        <label class="text-slate-400 text-xs font-medium uppercase tracking-wider" for="language">
          Language
        </label>
        <select
          id="language"
          bind:value={language}
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors appearance-none cursor-pointer"
        >
          {#each languages as lang (lang.value)}
            <option value={lang.value}>{lang.flag} {lang.label}</option>
          {/each}
        </select>
      </div>

      <!-- Create account button -->
      <button
        class="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors mt-1"
        onclick={handleRegister}
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </div>

    <!-- Login link -->
    <p class="text-center text-slate-500 text-sm mt-5">
      Already have an account?
      <a href="/login" class="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors font-medium">
        Sign in
      </a>
    </p>
  </div>
</div>
