import type { Chart } from 'chart.js';

// Chart.js draws on a canvas, so it can't use the CSS theme utilities.
// These helpers read the current --theme-* values and re-apply them when the theme or palette changes.

function themeVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(`--theme-${name}`).trim();
}

// Mutates the chart's neutral colours (tooltip, legend, axes) to match the current theme.
// Dataset colours are status colours and stay as configured.
export function applyChartTheme(chart: Chart): void {
    const text = themeVar('text');
    const muted = themeVar('text-muted');
    const border = themeVar('border');
    const opts = chart.options;

    if (opts.plugins?.tooltip) {
        Object.assign(opts.plugins.tooltip, {
            backgroundColor: themeVar('surface'),
            titleColor: text,
            bodyColor: muted,
            borderColor: border
        });
    }
    if (opts.plugins?.legend?.labels) {
        opts.plugins.legend.labels.color = muted;
    }
    for (const scale of Object.values(opts.scales ?? {})) {
        if (!scale) continue;
        if (scale.ticks) scale.ticks.color = muted;
        if (scale.grid) scale.grid.color = border;
        if ('border' in scale && scale.border) scale.border.color = border;
        if ('title' in scale && scale.title) scale.title.color = muted;
    }
}

// Calls applyChartTheme now and again whenever data-theme or the palette (inline style) changes on <html>.
// Returns a cleanup function.
export function followTheme(chart: Chart): () => void {
    applyChartTheme(chart);
    chart.update('none');
    const observer = new MutationObserver(() => {
        applyChartTheme(chart);
        chart.update('none');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    return () => observer.disconnect();
}
