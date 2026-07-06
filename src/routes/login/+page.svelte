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

  // ── Visual-only UI state ──
  let showPassword = $state(false);
  let showOtp = $state(false);
  let otpValues = $state(['', '', '', '', '', '']);
  let otpInputs: HTMLInputElement[] = [];

  function handleOtpInput(index: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    otpValues[index] = val;
    if (val && index < 5) otpInputs[index + 1]?.focus();
  }

  function handleOtpKeydown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputs[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    if (!pasted) return;
    e.preventDefault();
    for (let i = 0; i < 6; i++) otpValues[i] = pasted[i] ?? '';
    otpInputs[Math.min(pasted.length, 5)]?.focus();
  }
</script>

<div class="flex min-h-screen overflow-hidden">

  <!-- ═══════════════════════════════════════
       LEFT PANEL — branding & feature list
  ════════════════════════════════════════ -->
  <div class="hidden lg:flex flex-1 relative flex-col items-center justify-center px-12"
    style="background: #0F0F1A;">
    <!-- Gradient overlays -->
    <div class="absolute inset-0 pointer-events-none" style="background:
      radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.25), transparent 70%),
      radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.12), transparent 60%);">
    </div>

    <div class="relative z-10 max-w-[400px] w-full text-center">
      <!-- Logo -->
      <div class="mb-4">
        <span style="font-size:28px; font-weight:800; color:#F8FAFC;">Treats</span><span style="font-size:28px; font-weight:800; color:#7C3AED;">AI</span>
      </div>
      <!-- Tagline -->
      <p class="mb-12" style="font-size:16px; color:#94A3B8;">Smart Food, Zero Judgment &#x1F43E;</p>

      <!-- Feature list -->
      <div class="flex flex-col gap-4 text-left">

        <div class="flex items-start gap-3">
          <div class="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-base" style="background: rgba(124,58,237,0.15);">👁️</div>
          <div>
            <p style="font-size:14px; font-weight:500; color:#F8FAFC;">AI-powered cat recognition</p>
            <p style="font-size:12px; color:#94A3B8;">Your feeder knows exactly who's eating</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-base" style="background: rgba(124,58,237,0.15);">⚖️</div>
          <div>
            <p style="font-size:14px; font-weight:500; color:#F8FAFC;">Smart portion adjustment</p>
            <p style="font-size:12px; color:#94A3B8;">Portions adapt to weight goals automatically</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-base" style="background: rgba(124,58,237,0.15);">🔔</div>
          <div>
            <p style="font-size:14px; font-weight:500; color:#F8FAFC;">Real-time health alerts</p>
            <p style="font-size:12px; color:#94A3B8;">Know instantly when your cat skips a meal</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] text-base" style="background: rgba(124,58,237,0.15);">🤝</div>
          <div>
            <p style="font-size:14px; font-weight:500; color:#F8FAFC;">Built for families</p>
            <p style="font-size:12px; color:#94A3B8;">Share access with your whole household</p>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       RIGHT PANEL — login form
  ════════════════════════════════════════ -->
  <div class="flex flex-col justify-center w-full lg:w-[460px] shrink-0 overflow-y-auto"
    style="background: #1A1A2E; border-left: 1px solid #2D2D4A;">

    <div class="w-full px-10 py-12 max-w-[460px] mx-auto lg:mx-0">

      <!-- Tabs -->
      <div class="flex rounded-[8px] p-1 mb-8" style="background: #0F0F1A;">
        <a
          href="/login"
          class="flex-1 text-center py-2 rounded-[6px] text-[13px] font-semibold transition-all duration-150"
          style="background: #1A1A2E; border: 1px solid #2D2D4A; color: #F8FAFC;"
        >Sign in</a>
        <a
          href="/register"
          class="flex-1 text-center py-2 rounded-[6px] text-[13px] transition-all duration-150"
          style="color: #94A3B8;"
        >Create account</a>
      </div>

      <!-- Form heading -->
      <h1 style="font-size:22px; font-weight:700; color:#F8FAFC;" class="mb-1">Welcome back</h1>
      <p style="font-size:13px; color:#94A3B8;" class="mb-7">Sign in to your TreatsAI account</p>

      <!-- Error -->
      {#if error}
        <div class="mb-5 flex items-center gap-2 rounded-[8px] px-4 py-3 text-[13px]"
          style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #F87171;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      {/if}

      <!-- ── Main form (hidden when OTP active) ── -->
      {#if !showOtp}
        <div class="flex flex-col gap-5">

          <!-- Email -->
          <div>
            <label for="email" style="font-size:12px; color:#94A3B8; display:block; margin-bottom:6px;">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autocomplete="email"
              bind:value={email}
              onkeydown={handleKeydown}
              placeholder="you@example.com"
              class="w-full outline-none transition-colors placeholder-[#4B5563]"
              style="background:#0F0F1A; border:1px solid #2D2D4A; border-radius:8px; padding:11px 14px; color:#F8FAFC; font-size:14px;"
              onfocus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
              onblur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#2D2D4A'}
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" style="font-size:12px; color:#94A3B8; display:block; margin-bottom:6px;">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autocomplete="current-password"
                bind:value={password}
                onkeydown={handleKeydown}
                placeholder="••••••••"
                class="w-full outline-none transition-colors placeholder-[#4B5563] pr-10"
                style="background:#0F0F1A; border:1px solid #2D2D4A; border-radius:8px; padding:11px 14px; color:#F8FAFC; font-size:14px;"
                onfocus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
                onblur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#2D2D4A'}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style="color: #94A3B8;"
                onclick={() => (showPassword = !showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {#if showPassword}
                  <!-- Eye-off icon -->
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                {:else}
                  <!-- Eye icon -->
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                {/if}
              </button>
            </div>
          </div>

          <!-- Remember me + forgot password -->
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                bind:checked={rememberMe}
                class="w-4 h-4 rounded accent-[#7C3AED]"
                style="border: 1px solid #2D2D4A; background: #0F0F1A;"
              />
              <span style="font-size:13px; color:#94A3B8;">Remember me</span>
            </label>
            <a href="/forgot-password" style="font-size:13px; color:#7C3AED;" class="hover:text-[#8B5CF6] transition-colors">
              Forgot password?
            </a>
          </div>

          <!-- Submit -->
          <button
            class="w-full text-white font-bold transition-colors disabled:opacity-60"
            style="background:#7C3AED; border-radius:8px; padding:12px; font-size:14px;"
            onclick={handleLogin}
            disabled={loading}
            onmouseenter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#8B5CF6'; }}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

        </div>
      {/if}

      <!-- ── 2FA / OTP section ── -->
      {#if showOtp}
        <!-- Divider -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px" style="background: #2D2D4A;"></div>
          <span style="font-size:11px; color:#94A3B8; white-space:nowrap;">2FA verification</span>
          <div class="flex-1 h-px" style="background: #2D2D4A;"></div>
        </div>

        <!-- OTP box -->
        <div class="rounded-[10px] p-5 mb-5" style="background:#0F0F1A; border:1px solid #2D2D4A;">
          <!-- Title -->
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style="font-size:14px; font-weight:600; color:#F8FAFC;">Check your email</span>
          </div>
          <p class="mb-5" style="font-size:12px; color:#94A3B8;">
            We sent a 6-digit code to <span style="color:#F8FAFC;">{email || 'your email'}</span>
          </p>

          <!-- 6 OTP inputs -->
          <div class="flex gap-2 justify-center mb-4" onpaste={handleOtpPaste}>
            {#each otpValues as _, i}
              <input
                bind:this={otpInputs[i]}
                type="text"
                inputmode="numeric"
                maxlength="1"
                value={otpValues[i]}
                oninput={(e) => handleOtpInput(i, e)}
                onkeydown={(e) => handleOtpKeydown(i, e)}
                class="text-center outline-none transition-colors font-bold"
                style="
                  width:44px; height:52px;
                  border-radius:8px;
                  background:#1A1A2E;
                  border:1px solid {otpValues[i] ? '#7C3AED' : '#2D2D4A'};
                  color:#F8FAFC;
                  font-size:22px;
                "
                onfocus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
                onblur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = otpValues[i] ? '#7C3AED' : '#2D2D4A'}
                aria-label="OTP digit {i + 1}"
              />
            {/each}
          </div>

          <!-- Resend -->
          <p style="font-size:12px; color:#94A3B8; text-align:center;">
            Didn't receive it?
            <button type="button" style="color:#7C3AED; background:none; border:none; cursor:pointer; font-size:12px;" class="hover:text-[#8B5CF6] transition-colors">
              Resend code
            </button>
          </p>
        </div>
      {/if}

      <!-- Security note -->
      <div class="flex items-center justify-center gap-1.5 mt-6">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span style="font-size:11px; color:#94A3B8;">Secured with 2FA · Email OTP</span>
      </div>

    </div>
  </div>

</div>
