<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  } from 'chart.js';
  import type { FeedingOutcome } from '$lib/types';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface FeedingEventInput {
    timestamp: string;
    outcome: FeedingOutcome;
    portionDispensedGrams?: number;
  }

  interface Props {
    events: FeedingEventInput[];
  }

  let { events }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function processData(evts: FeedingEventInput[]) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const labels = days.map((dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return DAY_LABELS[d.getDay()];
    });

    const dispensed = new Array(7).fill(0);
    const skipped = new Array(7).fill(0);
    const rejected = new Array(7).fill(0);

    for (const evt of evts) {
      const dateStr = evt.timestamp.split('T')[0];
      const idx = days.indexOf(dateStr);
      if (idx === -1) continue;
      const grams = evt.portionDispensedGrams ?? 0;
      if (evt.outcome === 'dispensed') dispensed[idx] += grams;
      else if (evt.outcome === 'skipped') skipped[idx] += grams;
      else if (evt.outcome === 'rejected') rejected[idx] += grams;
    }

    return { labels, dispensed, skipped, rejected };
  }

  onMount(() => {
    const { labels, dispensed, skipped, rejected } = processData(events);

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Dispensed',
            data: dispensed,
            backgroundColor: 'rgba(6, 182, 212, 0.75)',
            borderColor: 'rgba(6, 182, 212, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Skipped',
            data: skipped,
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Rejected',
            data: rejected,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#9ca3af',
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleColor: '#e5e7eb',
            bodyColor: '#9ca3af',
            borderColor: '#7c3aed',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y}g`,
            },
          },
        },
        scales: {
          x: {
            stacked: false,
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            border: { color: 'rgba(255,255,255,0.1)' },
          },
          y: {
            stacked: false,
            ticks: {
              color: '#9ca3af',
              callback: (val) => `${val}g`,
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
            border: { color: 'rgba(255,255,255,0.1)' },
          },
        },
      },
    });

    return () => {
      chart?.destroy();
    };
  });
</script>

<div class="w-full h-64 bg-[#1a1a2e] rounded-2xl p-4 border border-[#7c3aed]/20">
  <canvas bind:this={canvas}></canvas>
</div>
