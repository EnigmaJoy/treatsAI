export type Theme = 'dark' | 'light' | 'system';

export const THEME_KEY = 'treatsai-theme';
export const DEFAULT_THEME: Theme = 'dark';

// Keep in sync with the inline script in src/app.html, which applies the theme before first paint
// and follows OS changes while 'system' is selected.
function resolve(theme: Theme): 'dark' | 'light' {
    if (theme !== 'system') return theme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', resolve(theme));
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // storage unavailable - theme still applies for this page view
    }
}

export function getSavedTheme(): Theme {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    } catch {
        // fall through to default
    }
    return DEFAULT_THEME;
}
