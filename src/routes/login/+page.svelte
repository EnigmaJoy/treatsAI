<script lang="ts">
  import { goto } from '$app/navigation';
  import * as m from '$lib/paraglide/messages';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let loginError: string | null = $state(null);
  let loading = $state(false);

  let emailError = $state('');
  let passwordError = $state('');
  let otpError = $state('');
  let otpLoading = $state(false);

  async function handleLogin() {
    emailError = '';
    passwordError = '';
    loginError = null;

    let hasFieldError = false;
    if (!email.trim()) {
      emailError = m.error_email_required();
      hasFieldError = true;
    }
    if (!password) {
      passwordError = m.error_password_required();
      hasFieldError = true;
    }
    if (hasFieldError) return;

    loading = true;
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.twoFactorRequired) {
          showOtp = true;
        } else {
          window.location.href = '/';
        }
      } else if (res.status === 202) {
        showOtp = true;
      } else if (res.status === 401) {
        loginError = 'Incorrect email or password. Please try again.';
      } else if (res.status === 404) {
        loginError = 'No account found with this email.';
      } else if (res.status === 423) {
        loginError = 'Too many failed attempts. Please try again in 15 minutes.';
      } else if (res.status === 500) {
        loginError = 'Something went wrong. Please try again.';
      } else {
        loginError = data.error?.message ?? 'Login failed. Please try again.';
      }
    } catch {
      loginError = 'Connection error. Please check your internet and try again.';
    } finally {
      loading = false;
    }
  }

  async function handleOtpSubmit() {
    otpError = '';
    const code = otpValues.join('');
    if (code.length < 6) {
      otpError = 'Please enter the 6-digit code';
      return;
    }

    otpLoading = true;
    try {
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (data.success) {
        goto('/');
      } else if (res.status === 410) {
        otpError = m.error_otp_expired();
      } else {
        otpError = m.error_otp_invalid();
      }
    } catch {
      otpError = m.error_connection();
    } finally {
      otpLoading = false;
    }
  }

  async function handleResendCode() {
    otpError = '';
    try {
      await fetch('/api/v1/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch {
      otpError = m.error_connection();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  let showPassword = $state(false);
  let showOtp = $state(false);
  let otpValues = $state(['', '', '', '', '', '']);
  let otpInputs: HTMLInputElement[] = [];

  function handleOtpInput(index: number, e: Event) {
    otpError = '';
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

<!-- Full viewport two-column layout, no scroll -->
<div style="display:flex; height:100vh; overflow:hidden; background:#0F0F1A;">

  <!-- ═══════════════════════════════════════
       LEFT PANEL - cat photo + feature cards
  ════════════════════════════════════════ -->
  <div class="hidden lg:block" style="flex:1; position:relative; overflow:hidden;">

    <!-- Background image -->
    <div style="
      position:absolute; inset:0;
      background-image: url('https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&auto=format');
      background-size:cover;
      background-position:center;
    "></div>

    <!-- Dark gradient overlay -->
    <div style="
      position:absolute; inset:0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(15,15,26,0.85));
    "></div>

    <!-- Top row: logo left, badge center -->
    <div style="position:absolute; top:0; left:0; right:0; z-index:10; padding:28px 32px; display:flex; align-items:center;">
      <!-- Logo -->
      <div style="display:flex; align-items:center; gap:8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>
          <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
        </svg>
        <span style="font-size:22px; font-weight:700; line-height:1; color:white;">Treats<span style="color:#7C3AED;">AI</span></span>
      </div>
      <!-- Feeder badge - centered absolutely so it doesn't depend on logo width -->
      <div style="
        position:absolute; left:50%; transform:translateX(-50%);
        display:flex; align-items:center; gap:6px;
        border:1px solid rgba(255,255,255,0.3);
        backdrop-filter:blur(8px);
        background:rgba(255,255,255,0.1);
        border-radius:9999px;
        padding:6px 16px;
      ">
        <span style="width:7px; height:7px; border-radius:50%; background:#22C55E; flex-shrink:0;"></span>
        <span style="font-size:13px; color:white;">Feeder online</span>
      </div>
    </div>

    <!-- Bottom content: tag + tagline + feature cards -->
    <div style="position:absolute; bottom:0; left:0; right:0; z-index:10; padding:32px;">
      <!-- Tag pill -->
      <div style="
        display:inline-flex; align-items:center;
        background:rgba(124,58,237,0.3);
        border:1px solid #7C3AED;
        color:#7C3AED;
        border-radius:9999px;
        padding:4px 12px;
        font-size:12px;
        margin-bottom:12px;
      ">
        Smart Food, Zero Judgment
      </div>

      <!-- Tagline -->
      <h2 style="font-size:42px; font-weight:800; color:white; line-height:1.15; margin:0 0 24px;">
        Every whisker fed,<br>perfectly measured.
      </h2>

      <!-- Feature cards 2x2 grid -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:32px;">

        <!-- Card 1: AI recognition -->
        <div style="
          background:rgba(0,0,0,0.4); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          padding:12px; display:flex; align-items:flex-start; gap:12px;
        ">
          <div style="width:32px; height:32px; flex-shrink:0; background:rgba(124,58,237,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <p style="color:white; font-size:13px; font-weight:600; line-height:1.3; margin:0 0 2px;">AI-powered cat recognition</p>
            <p style="color:#D1D5DB; font-size:11px; line-height:1.4; margin:0;">Your feeder knows exactly who's eating.</p>
          </div>
        </div>

        <!-- Card 2: Smart portions -->
        <div style="
          background:rgba(0,0,0,0.4); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          padding:12px; display:flex; align-items:flex-start; gap:12px;
        ">
          <div style="width:32px; height:32px; flex-shrink:0; background:rgba(124,58,237,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 16L12 12 8 16"/><path d="M12 12V21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          </div>
          <div>
            <p style="color:white; font-size:13px; font-weight:600; line-height:1.3; margin:0 0 2px;">Smart portion adjustment</p>
            <p style="color:#D1D5DB; font-size:11px; line-height:1.4; margin:0;">Portions adapt to weight goals automatically.</p>
          </div>
        </div>

        <!-- Card 3: Alerts -->
        <div style="
          background:rgba(0,0,0,0.4); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          padding:12px; display:flex; align-items:flex-start; gap:12px;
        ">
          <div style="width:32px; height:32px; flex-shrink:0; background:rgba(124,58,237,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div>
            <p style="color:white; font-size:13px; font-weight:600; line-height:1.3; margin:0 0 2px;">Real-time health alerts</p>
            <p style="color:#D1D5DB; font-size:11px; line-height:1.4; margin:0;">Know instantly when your cat skips a meal.</p>
          </div>
        </div>

        <!-- Card 4: Families -->
        <div style="
          background:rgba(0,0,0,0.4); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          padding:12px; display:flex; align-items:flex-start; gap:12px;
        ">
          <div style="width:32px; height:32px; flex-shrink:0; background:rgba(124,58,237,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <p style="color:white; font-size:13px; font-weight:600; line-height:1.3; margin:0 0 2px;">Built for families</p>
            <p style="color:#D1D5DB; font-size:11px; line-height:1.4; margin:0;">Share access with your whole household.</p>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       RIGHT PANEL - login form
  ════════════════════════════════════════ -->
  <div
    class="w-full lg:w-[460px]"
    style="flex-shrink:0; background:#0F0F1A; display:flex; flex-direction:column; justify-content:center; overflow-y:auto; padding:48px 40px;"
  >

    <!-- Sign in / Create account tabs -->
    <div style="background:#1A1A2E; border-radius:12px; padding:4px; display:flex; margin-bottom:32px;">
      <a
        href="/login"
        style="flex:1; text-align:center; padding:8px 0; border-radius:8px; font-size:13px; font-weight:600; background:#7C3AED; color:white; text-decoration:none; display:block;"
      >Sign in</a>
      <a
        href="/register"
        style="flex:1; text-align:center; padding:8px 0; font-size:13px; color:#94A3B8; text-decoration:none; display:block; transition:color 0.15s;"
        class="hover:text-white"
      >Create account</a>
    </div>

    <!-- Heading -->
    <h1 style="font-size:28px; font-weight:700; color:white; margin:0 0 4px;">Welcome back</h1>
    <p style="font-size:13px; color:#94A3B8; margin:0 0 32px;">Sign in to your TreatsAI account to check on your cats.</p>

    <!-- -
         Main login form
    - -->
    {#if !showOtp}

      <!-- Email -->
      <div style="margin-bottom:16px;">
        <label for="email" style="display:block; font-size:11px; color:#94A3B8; margin-bottom:6px;">Email address</label>
        <div style="position:relative;">
          <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94A3B8; display:flex; pointer-events:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </span>
          <input
            id="email"
            type="email"
            autocomplete="email"
            bind:value={email}
            onkeydown={handleKeydown}
            oninput={() => { emailError = ''; loginError = null; }}
            placeholder="you@example.com"
            class="w-full outline-none placeholder-[#4B5563] transition-colors"
            style="background:#1A1A2E; border:1px solid {emailError ? '#EF4444' : '#2D2D4A'}; border-radius:12px; padding:12px 16px 12px 40px; color:#F8FAFC; font-size:13px;"
            onfocus={(e) => { if (!emailError) (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'; }}
            onblur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = emailError ? '#EF4444' : '#2D2D4A'; }}
          />
        </div>
        {#if emailError}
          <p style="color:#EF4444; font-size:11px; margin:4px 0 0;">{emailError}</p>
        {/if}
      </div>

      <!-- Password -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label for="password" style="font-size:11px; color:#94A3B8;">Password</label>
          <a href="/forgot-password" style="font-size:11px; color:#7C3AED; text-decoration:none;" class="hover:text-[#8B5CF6] transition-colors">Forgot password?</a>
        </div>
        <div style="position:relative;">
          <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94A3B8; display:flex; pointer-events:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="current-password"
            bind:value={password}
            onkeydown={handleKeydown}
            oninput={() => { passwordError = ''; loginError = null; }}
            placeholder="••••••••"
            class="w-full outline-none placeholder-[#4B5563] transition-colors"
            style="background:#1A1A2E; border:1px solid {passwordError ? '#EF4444' : '#2D2D4A'}; border-radius:12px; padding:12px 40px 12px 40px; color:#F8FAFC; font-size:13px;"
            onfocus={(e) => { if (!passwordError) (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'; }}
            onblur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = passwordError ? '#EF4444' : '#2D2D4A'; }}
          />
          <button
            type="button"
            style="position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#94A3B8; background:none; border:none; cursor:pointer; display:flex; padding:0;"
            onclick={() => (showPassword = !showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {#if showPassword}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {/if}
          </button>
        </div>
        {#if passwordError}
          <p style="color:#EF4444; font-size:11px; margin:4px 0 0;">{passwordError}</p>
        {/if}
      </div>

      <!-- Remember me -->
      <div style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:24px;">
        <input
          type="checkbox"
          id="rememberMe"
          bind:checked={rememberMe}
          class="accent-[#7C3AED]"
          style="width:16px; height:16px; cursor:pointer; flex-shrink:0;"
        />
        <label for="rememberMe" style="font-size:13px; color:#94A3B8; cursor:pointer; user-select:none;">Keep me signed in</label>
      </div>

      {#if loginError}
        <div class="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <span class="text-[#EF4444] text-sm">{loginError}</span>
        </div>
      {/if}

      <!-- Sign in button -->
      <button
        type="button"
        class="w-full flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-60"
        style="background:#7C3AED; border-radius:12px; padding:14px 20px; font-size:13px; color:white; border:none; cursor:pointer;"
        onclick={handleLogin}
        disabled={loading}
        onmouseenter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#8B5CF6'; }}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
      >
        {loading ? 'Signing in...' : 'Sign in'}
        {#if !loading}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        {/if}
      </button>

    {/if}

    <!-- -
         2FA / OTP section
    - -->
    {#if showOtp}
      <!-- Divider -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <div style="flex:1; height:1px; background:#2D2D4A;"></div>
        <span style="font-size:11px; color:#94A3B8; white-space:nowrap;">2FA verification</span>
        <div style="flex:1; height:1px; background:#2D2D4A;"></div>
      </div>

      <!-- OTP box -->
      <div style="background:#1A1A2E; border:1px solid #2D2D4A; border-radius:12px; padding:20px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style="font-size:14px; font-weight:600; color:#F8FAFC;">Check your email</span>
        </div>
        <p style="font-size:12px; color:#94A3B8; margin:0 0 20px;">
          We sent a 6-digit code to <span style="color:#F8FAFC;">{email || 'your email'}</span>
        </p>

        <!-- OTP error -->
        {#if otpError}
          <div style="
            display:flex; align-items:center; gap:8px;
            background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);
            border-radius:8px; padding:10px 14px;
            font-size:12px; color:#F87171; margin-bottom:16px;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {otpError}
          </div>
        {/if}

        <!-- 6 digit inputs -->
        <div style="display:flex; gap:8px; justify-content:center; margin-bottom:16px;" onpaste={handleOtpPaste}>
          {#each otpValues as _, i}
            <input
              bind:this={otpInputs[i]}
              type="text"
              inputmode="numeric"
              maxlength="1"
              value={otpValues[i]}
              oninput={(e) => handleOtpInput(i, e)}
              onkeydown={(e) => handleOtpKeydown(i, e)}
              class="text-center outline-none font-bold transition-colors"
              style="
                width:44px; height:52px; border-radius:8px;
                background:#0F0F1A;
                border:1px solid {otpValues[i] ? '#7C3AED' : '#2D2D4A'};
                color:#F8FAFC; font-size:22px;
              "
              onfocus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = '#7C3AED'}
              onblur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = otpValues[i] ? '#7C3AED' : '#2D2D4A'}
              aria-label="OTP digit {i + 1}"
            />
          {/each}
        </div>

        <!-- Resend -->
        <p style="font-size:12px; color:#94A3B8; text-align:center; margin:0 0 16px;">
          Didn't receive it?
          <button
            type="button"
            style="color:#7C3AED; background:none; border:none; cursor:pointer; font-size:12px; padding:0;"
            class="hover:text-[#8B5CF6] transition-colors"
            onclick={handleResendCode}
          >Resend code</button>
        </p>

        <!-- Verify button -->
        <button
          type="button"
          class="w-full font-semibold transition-colors disabled:opacity-60"
          style="background:#7C3AED; border-radius:12px; padding:12px; font-size:13px; color:white; border:none; cursor:pointer;"
          onclick={handleOtpSubmit}
          disabled={otpLoading || otpValues.join('').length < 6}
          onmouseenter={(e) => { if (!otpLoading) (e.currentTarget as HTMLElement).style.background = '#8B5CF6'; }}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = '#7C3AED'}
        >
          {otpLoading ? 'Verifying...' : 'Verify code'}
        </button>
      </div>

      <!-- Back to sign in -->
      <button
        type="button"
        class="w-full text-center hover:text-white transition-colors"
        style="font-size:13px; color:#94A3B8; background:none; border:none; cursor:pointer;"
        onclick={() => { showOtp = false; otpError = ''; otpValues = ['','','','','','']; }}
      >
        Back to sign in
      </button>
    {/if}

    <!-- Security note -->
    <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-top:24px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span style="font-size:11px; color:#94A3B8;">Secured with 2FA - Email OTP</span>
    </div>

  </div>

</div>
