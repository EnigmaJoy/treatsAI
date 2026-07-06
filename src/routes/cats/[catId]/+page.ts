export async function load({ fetch, params }) {
  const [catRes, weightRes, eventsRes] = await Promise.all([
    fetch(`/api/v1/cats/${params.catId}`),
    fetch(`/api/v1/cats/${params.catId}/weight`),
    fetch(`/api/v1/cats/${params.catId}/events?limit=20`)
  ]);
  return {
    cat: catRes.ok ? (await catRes.json()).data : null,
    weight: weightRes.ok ? (await weightRes.json()).data : null,
    events: eventsRes.ok ? (await eventsRes.json()).data?.events ?? [] : []
  };
}
