<script lang="ts">
  import FeedingChart from '$lib/components/FeedingChart.svelte';
  import WeightProgressBar from '$lib/components/WeightProgressBar.svelte';
  import PortionBadge from '$lib/components/PortionBadge.svelte';
  import type { Cat, FeedingEvent, WeightEntry } from '$lib/types';

  let { data } = $props();

  const cat = $derived<Cat | null>(data.cat);
  let photoUrl = $state<string | null>(data.photoUrl ?? null);
  const weight = $derived<{ entries?: WeightEntry[] } | null>(data.weight);
  const events = $derived<FeedingEvent[]>(data.events);

  let showWeightForm = $state(false);
  let weightInput = $state('');
  let weightNotes = $state('');
  let weightLoading = $state(false);
  let weightError = $state('');
  let weightSuccess = $state(false);

  const recentEvents = $derived(
    [...events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  );

  const weightHistory = $derived(
    (weight?.entries ?? [])
      .slice()
      .sort((a: WeightEntry, b: WeightEntry) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
      .slice(0, 5)
  );

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function calcAge(dateOfBirth?: string): string {
    if (!dateOfBirth) return '';
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
  }

  function outcomeBadgeClass(outcome: string): string {
    if (outcome === 'dispensed') return 'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/40';
    if (outcome === 'skipped') return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    return 'bg-red-500/20 text-red-400 border border-red-500/40';
  }

  async function logWeight() {
    if (!cat) return;
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) { weightError = 'Enter a valid weight in kg'; return; }
    weightLoading = true; weightError = '';
    try {
      const res = await fetch(`/api/v1/cats/${cat.catId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: kg, notes: weightNotes || undefined })
      });
      const body = await res.json();
      if (body.success) {
        weightSuccess = true;
        weightInput = '';
        weightNotes = '';
        setTimeout(() => {
          weightSuccess = false;
          showWeightForm = false;
        }, 1800);
      } else {
        weightError = body.error?.message ?? 'Failed to log weight';
      }
    } catch {
      weightError = 'Network error. Please try again.';
    } finally {
      weightLoading = false;
    }
  }
</script>

{#if !cat}
  <div class="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <span class="text-5xl">🐾</span>
    <p class="text-slate-400">Cat not found.</p>
    <a href="/cats" class="text-[#a78bfa] hover:underline text-sm">← Back to cats</a>
  </div>
{:else}
  <div class="flex flex-col gap-6">
    <!-- Back link + header -->
    <div>
      <a href="/cats" class="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-4">
        <span aria-hidden="true">←</span>
        All cats
      </a>
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          {#if photoUrl}
            <img
              src={photoUrl}
              alt={cat.name}
              style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #7C3AED"
              onerror={() => { photoUrl = null; }}
            />
          {:else}
            <div class="text-5xl">🐱</div>
          {/if}
          <div>
            <h1 class="text-2xl font-bold text-white">{cat.name}</h1>
            <p class="text-slate-400 text-sm mt-0.5">
              {#if cat.breed}{cat.breed}{/if}
              {#if cat.breed && cat.dateOfBirth} · {/if}
              {#if cat.dateOfBirth}{calcAge(cat.dateOfBirth)} old{/if}
            </p>
            {#if cat.microchipNumber}
              <p class="text-slate-600 text-xs mt-1 font-mono">Chip: {cat.microchipNumber}</p>
            {/if}
          </div>
        </div>
        <a
          href="/cats/{cat.catId}/edit"
          class="shrink-0 text-sm text-slate-400 border border-white/10 hover:border-[#7c3aed]/50 hover:text-[#a78bfa] px-3 py-1.5 rounded-lg transition-colors"
        >
          Edit
        </a>
      </div>
    </div>

    <!-- Two column: weight section + events -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: weight -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        <!-- Weight card -->
        <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-white font-semibold">Weight</h2>
            <button
              class="text-xs bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40 hover:bg-[#7c3aed]/30 px-3 py-1 rounded-lg transition-colors"
              onclick={() => (showWeightForm = !showWeightForm)}
            >
              {showWeightForm ? 'Cancel' : 'Log Weight'}
            </button>
          </div>

          <WeightProgressBar
            currentWeightKg={cat.currentWeightKg}
            targetWeightKg={cat.targetWeightKg}
            weightGoal={cat.weightGoal}
          />

          <!-- Log weight form -->
          {#if showWeightForm}
            <div class="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
              <div>
                <label class="block text-xs text-slate-500 mb-1" for="weight-input">Weight (kg)</label>
                <input
                  id="weight-input"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={weightInput}
                  placeholder="e.g. 4.25"
                  class="w-full bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1" for="weight-notes">Notes (optional)</label>
                <input
                  id="weight-notes"
                  type="text"
                  bind:value={weightNotes}
                  placeholder="e.g. After morning meal"
                  class="w-full bg-[#0f0f1a] border border-white/10 focus:border-[#7c3aed]/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>
              {#if weightError}
                <p class="text-red-400 text-xs">{weightError}</p>
              {/if}
              {#if weightSuccess}
                <p class="text-emerald-400 text-xs">Weight logged!</p>
              {/if}
              <button
                class="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                onclick={logWeight}
                disabled={weightLoading}
              >
                {weightLoading ? 'Saving...' : 'Save Weight'}
              </button>
            </div>
          {/if}
        </div>

        <!-- Weight history -->
        {#if weightHistory.length > 0}
          <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
            <h2 class="text-white font-semibold mb-3">Weight History</h2>
            <div class="flex flex-col gap-2">
              {#each weightHistory as entry (entry.weightEntryId)}
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-400 text-xs">{formatDate(entry.loggedAt)}</span>
                  <span class="text-white font-medium">{entry.weightKg.toFixed(2)} kg</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Right: feeding activity + recent events -->
      <div class="lg:col-span-2 flex flex-col gap-6">
        <!-- Feeding chart -->
        <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
          <h2 class="text-white font-semibold mb-4">Feeding Activity — Last 7 Days</h2>
          <FeedingChart {events} />
        </div>

        <!-- Recent events -->
        <div class="bg-[#1a1a2e] border border-[#7c3aed]/20 rounded-2xl p-5">
          <h2 class="text-white font-semibold mb-4">Recent Events</h2>
          {#if recentEvents.length === 0}
            <div class="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
              <span class="text-3xl">🍽️</span>
              <p class="text-sm">No feeding events yet</p>
            </div>
          {:else}
            <div class="overflow-x-auto -mx-1">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-white/5">
                    <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Time</th>
                    <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Outcome</th>
                    <th class="text-left text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Portion</th>
                    <th class="text-right text-slate-500 text-xs uppercase tracking-wider pb-2 px-1">Consumed</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  {#each recentEvents as event (event.eventId)}
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="py-2.5 px-1 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {formatTime(event.timestamp)}
                      </td>
                      <td class="py-2.5 px-1">
                        <span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize {outcomeBadgeClass(event.outcome)}">
                          {event.outcome}
                        </span>
                      </td>
                      <td class="py-2.5 px-1">
                        {#if event.portionDispensedGrams != null}
                          <PortionBadge
                            portionGrams={event.portionDispensedGrams}
                            suggestedPortionGrams={cat.suggestedPortionGrams}
                            size="sm"
                          />
                        {:else}
                          <span class="text-slate-600 text-xs">—</span>
                        {/if}
                      </td>
                      <td class="py-2.5 px-1 text-right text-slate-400 text-xs">
                        {event.consumptionPercent != null ? `${event.consumptionPercent}%` : '—'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
