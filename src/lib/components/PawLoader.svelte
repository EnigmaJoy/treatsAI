<script lang="ts">
  interface Props {
    label?: string;
    variant?: 'inline' | 'screen';
    size?: number;
  }

  let {
    label = 'Loading...',
    variant = 'inline',
    size = 28,
  }: Props = $props();

  const paws = [0, 1, 2, 3, 4];
</script>

<div
  role="status"
  aria-live="polite"
  aria-label={label}
  class={variant === 'screen' ? 'loader-screen' : 'loader-inline'}
>
  <div class="paw-row">
    {#each paws as i}
      <span
        class="paw-item"
        style="
          --rot: {i % 2 === 0 ? '-8deg' : '8deg'};
          --lift: {i % 2 === 0 ? '-4px' : '4px'};
          animation-delay: {i * 0.18}s;
          width: {size}px;
          height: {size}px;
        "
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="#7C3AED"
          style="filter: drop-shadow(0 0 8px rgba(124,58,237,0.6))"
          aria-hidden="true"
        >
          <path d="M12 13.2c-2.6 0-4.7 1.9-4.7 4.2 0 1.7 1.4 2.6 3 2.6.7 0 1.2-.2 1.7-.2s1 .2 1.7.2c1.6 0 3-.9 3-2.6 0-2.3-2.1-4.2-4.7-4.2Z" />
          <ellipse cx="6.6" cy="10.6" rx="1.7" ry="2.2" />
          <ellipse cx="17.4" cy="10.6" rx="1.7" ry="2.2" />
          <ellipse cx="9.7" cy="7.3" rx="1.6" ry="2.1" />
          <ellipse cx="14.3" cy="7.3" rx="1.6" ry="2.1" />
        </svg>
      </span>
    {/each}
  </div>
  {#if label}
    <span class="paw-label">{label}</span>
  {/if}
</div>

<style>
  @keyframes pawWalk {
    0%   { opacity: 0.2; transform: translateY(var(--lift, -4px)) rotate(var(--rot, -8deg)); }
    30%  { opacity: 1;   transform: translateY(0) rotate(var(--rot, -8deg)); }
    70%  { opacity: 1;   transform: translateY(0) rotate(var(--rot, -8deg)); }
    100% { opacity: 0.2; transform: translateY(var(--lift, 4px)) rotate(var(--rot, -8deg)); }
  }

  .loader-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .loader-inline {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem 1rem;
  }

  .paw-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .paw-item {
    display: inline-flex;
    animation: pawWalk 1.1s ease-in-out infinite;
  }

  .paw-label {
    font-size: 0.75rem;
    color: #94A3B8;
    letter-spacing: 0.05em;
  }
</style>
