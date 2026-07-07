import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getAuthenticatedUser } from '$lib/server/auth';

// Routes that require a valid session
const PROTECTED_ROUTES = ['/', '/cats', '/alerts', '/settings'];

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some((route) => {
        if (route === '/') return pathname === '/';
        return pathname === route || pathname.startsWith(route + '/');
    });
}

const handleAuth: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;

    // Redirect direct GET navigation to the logout URL back to the dashboard.
    // Logout is POST-only; arriving here via the address bar is always a mistake.
    if (pathname === '/api/v1/auth/logout' && event.request.method === 'GET') {
        throw redirect(302, '/');
    }

    if (isProtectedRoute(pathname)) {
        const user = await getAuthenticatedUser(event.request);
        if (!user) {
            throw redirect(302, '/login');
        }
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
