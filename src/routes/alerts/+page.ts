export async function load({ fetch }) {
  const [activeRes, acknowledgedRes] = await Promise.all([
    fetch('/api/v1/alerts?status=active&limit=20'),
    fetch('/api/v1/alerts?status=acknowledged&limit=20')
  ]);
  return {
    active: activeRes.ok ? (await activeRes.json()).data?.alerts ?? [] : [],
    acknowledged: acknowledgedRes.ok ? (await acknowledgedRes.json()).data?.alerts ?? [] : []
  };
}
