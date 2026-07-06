<script lang="ts">
  interface Props {
    portionGrams: number;
    suggestedPortionGrams?: number;
    size?: 'sm' | 'md' | 'lg';
  }

  let { portionGrams, suggestedPortionGrams, size = 'md' }: Props = $props();

  const sizeClass = $derived(
    size === 'sm' ? 'text-xs px-2 py-0.5' :
    size === 'lg' ? 'text-base px-4 py-1.5' :
    'text-sm px-3 py-1'
  );

  const colorClass = $derived.by(() => {
    if (!suggestedPortionGrams) {
      return 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40';
    }
    const diff = Math.abs(portionGrams - suggestedPortionGrams) / suggestedPortionGrams;
    if (diff > 0.10) {
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    }
    return 'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/40';
  });

  const showWarning = $derived(
    suggestedPortionGrams !== undefined &&
    Math.abs(portionGrams - suggestedPortionGrams) / suggestedPortionGrams > 0.10
  );
</script>

<span class="inline-flex items-center gap-1 font-medium rounded-full {sizeClass} {colorClass} transition-colors duration-200">
  {#if showWarning}
    <span class="leading-none" aria-hidden="true">⚠</span>
    <span class="sr-only">Warning: portion deviates from suggestion</span>
  {/if}
  {portionGrams}g
</span>
