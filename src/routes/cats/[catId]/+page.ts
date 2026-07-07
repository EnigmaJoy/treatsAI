export async function load({ fetch, params }) {
  const [catRes, weightRes, eventsRes] = await Promise.all([
    fetch(`/api/v1/cats/${params.catId}`),
    fetch(`/api/v1/cats/${params.catId}/weight`),
    fetch(`/api/v1/cats/${params.catId}/events?limit=20`)
  ]);

  const cat = catRes.ok ? (await catRes.json()).data : null;

  // Fetch pre-signed photo URL only if the cat has photos
  let photoUrl: string | null = null;
  if (cat?.photoS3Keys?.length > 0) {
    const photoRes = await fetch(`/api/v1/cats/${params.catId}/photo`);
    if (photoRes.ok) {
      const photoData = await photoRes.json();
      photoUrl = photoData.data?.url ?? null;
    }
  }

  return {
    cat,
    photoUrl,
    weight: weightRes.ok ? (await weightRes.json()).data : null,
    events: eventsRes.ok ? (await eventsRes.json()).data?.events ?? [] : []
  };
}
