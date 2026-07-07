export const PALETTE_KEY = 'treatsai-palette';
export const DEFAULT_PALETTE = 'midnight-paws';

const paletteDefs: Record<string, { bg: string; surface: string; border: string; primary: string; accent: string }> = {
    'midnight-paws': { bg: '#0F0F1A', surface: '#1A1A2E', border: '#2D2D4A', primary: '#7C3AED', accent: '#F59E0B' },
    'ocean-whisker': { bg: '#0A1628', surface: '#0F2040', border: '#1A3A5C', primary: '#0EA5E9', accent: '#06B6D4' },
    'forest-purr':   { bg: '#0A1A0F', surface: '#0F2A18', border: '#1A3A24', primary: '#059669', accent: '#84CC16' },
    'sakura-meow':   { bg: '#1A0A14', surface: '#2A1020', border: '#3A1A2E', primary: '#EC4899', accent: '#F43F5E' },
    'golden-tabby':  { bg: '#1A1200', surface: '#2A1E00', border: '#3A2E00', primary: '#D97706', accent: '#FBBF24' },
    'arctic-fox':    { bg: '#0F172A', surface: '#1E2A3A', border: '#2A3A4A', primary: '#64748B', accent: '#38BDF8' },
};

export function applyPalette(name: string): void {
    const p = paletteDefs[name];
    if (!p) return;
    const root = document.documentElement;
    root.style.setProperty('--color-bg',     p.bg);
    root.style.setProperty('--color-surface', p.surface);
    root.style.setProperty('--color-border',  p.border);
    root.style.setProperty('--color-primary', p.primary);
    root.style.setProperty('--color-accent',  p.accent);
    localStorage.setItem(PALETTE_KEY, name);
}

export function getSavedPalette(): string {
    return localStorage.getItem(PALETTE_KEY) ?? DEFAULT_PALETTE;
}
