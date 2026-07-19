import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getAuthenticatedUser } from '$lib/server/auth';

// Only these UI routes require an authenticated session.
// API routes (/api/*) are excluded: each route handler calls getAuthenticatedUser itself
// and returns a structured 401 JSON response rather than an HTML redirect.
// Static assets (/_app/*, /favicon.*) and auth pages (/login, /register) are also excluded.
const PROTECTED_UI_ROUTES = ['/', '/cats', '/alerts', '/settings'];

function isProtectedUiRoute(pathname: string): boolean {
    return PROTECTED_UI_ROUTES.some((route) => {
        if (route === '/') return pathname === '/';
        return pathname === route || pathname.startsWith(route + '/');
    });
}

const handleAuth: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;

    // Pass through everything that is not a protected UI page without touching auth.
    // This covers: /api/*, /_app/*, /login, /register, static files, etc.
    if (!isProtectedUiRoute(pathname)) {
        // Redirect direct GET navigation to the logout URL to the dashboard.
        // Logout is POST-only; typing it in the address bar is always a mistake.
        if (pathname === '/api/v1/auth/logout' && event.request.method === 'GET') {
            throw redirect(302, '/');
        }
        return resolve(event);
    }

    let user = null;
    try {
        user = await getAuthenticatedUser(event.request);
    } catch (err) {
        console.error('[handleAuth] getAuthenticatedUser threw:', err);
    }
    if (!user) {
        throw redirect(302, '/login');
    }

    return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
    paraglideMiddleware(event.request, ({ request, locale }) => {
        event.request = request;
        return resolve(event, {
            transformPageChunk: ({ html }) =>
                html
                    .replace('%paraglide.lang%', locale)
                    .replace('%paraglide.dir%', getTextDirection(locale))
        });
    });

export const handle: Handle = sequence(handleAuth, handleParaglide);

export const handleError: HandleServerError = ({ error, event }) => {
    console.error('[handleError] unhandled error on', event.url.pathname, error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { message, stack };
};
