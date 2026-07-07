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

    // Fetch photo URL for the first cat if it has photos
    let firstCatPhotoUrl: string | null = null;
    const firstCat = cats[0];
    if (firstCat?.photoS3Keys?.length > 0) {
      const photoRes = await fetch(`/api/v1/cats/${firstCat.catId}/photo`);
      if (photoRes.ok) {
        const photoData = await photoRes.json();
        firstCatPhotoUrl = photoData.data?.url ?? null;
      }
    }

    return { cats, alerts, device, firstCatPhotoUrl };
  } catch {
    return { cats: [], alerts: [], device: null, firstCatPhotoUrl: null };
  }
}
