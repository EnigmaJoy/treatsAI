<script lang="ts">
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function handleLogin() {
    loading = true; error = '';
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });
      const data = await res.json();
      if (data.success) {
        goto('/');
      } else {
        error = data.error?.message ?? 'Login failed';
      }
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }
</script>

<div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="text-4xl mb-3">🐾</div>
      <h1 class="text-2xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">
        TreatsAI
      </h1>
      <p class="text-slate-500 text-sm mt-1">Sign in to your account</p>
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
          autocomplete="current-password"
          bind:value={password}
          onkeydown={handleKeydown}
          placeholder="••••••••"
          class="bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <!-- Remember me -->
      <label class="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          bind:checked={rememberMe}
          class="w-4 h-4 rounded border border-white/20 bg-[#0f0f1a] accent-[#7c3aed]"
        />
        <span class="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Remember me</span>
      </label>

      <!-- Sign in button -->
      <button
        class="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors mt-1"
        onclick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </div>

    <!-- Register link -->
    <p class="text-center text-slate-500 text-sm mt-5">
      Don't have an account?
      <a href="/register" class="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors font-medium">
        Create one
      </a>
    </p>
  </div>
</div>
