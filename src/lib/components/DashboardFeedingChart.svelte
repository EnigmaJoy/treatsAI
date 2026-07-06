<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
  } from 'chart.js';
  import type { FeedingOutcome } from '$lib/types';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

  interface FeedingEventInput {
    timestamp: string;
    outcome: FeedingOutcome;
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
      if (evt.outcome === 'dispensed') dispensed[idx] += 1;
      else if (evt.outcome === 'skipped') skipped[idx] += 1;
      else if (evt.outcome === 'rejected') rejected[idx] += 1;
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
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: 'rgba(16, 185, 129, 1)',
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
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A1A2E',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#2D2D4A',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} meal${ctx.parsed.y !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94A3B8', font: { size: 11 } },
            grid: { color: '#2D2D4A' },
            border: { color: '#2D2D4A' },
          },
          y: {
            min: 0,
            ticks: {
              color: '#94A3B8',
              stepSize: 1,
              font: { size: 11 },
              callback: (val) => (Number.isInteger(Number(val)) ? val : ''),
            },
            grid: { color: '#2D2D4A' },
            border: { color: '#2D2D4A' },
            title: {
              display: true,
              text: 'Meals',
              color: '#94A3B8',
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => {
      chart?.destroy();
    };
  });
</script>

<div class="w-full h-56">
  <canvas bind:this={canvas}></canvas>
</div>
