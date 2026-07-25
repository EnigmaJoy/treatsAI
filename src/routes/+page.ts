export async function load({ fetch }) {
  try {
    const [catsRes, alertsRes, deviceRes] = await Promise.all([
      fetch('/api/v1/cats'),
      fetch('/api/v1/alerts?status=active&limit=5'),
      fetch('/api/v1/device')
    ]);
    const cats = catsRes.ok ? (await catsRes.json()).data?.cats ?? [] : [];
    const alerts = alertsRes.ok ? (await alertsRes.json()).data?.alerts ?? [] : [];
    const device = deviceRes.ok ? (await deviceRes.json()).data ?? null : null;

    return { cats, alerts, device };
  } catch (err) {
    console.error('[dashboard load] error:', err);
    return { cats: [], alerts: [], device: null };
  }
}
