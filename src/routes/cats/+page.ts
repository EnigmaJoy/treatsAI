export async function load({ fetch }) {
  const res = await fetch('/api/v1/cats');
  const cats = res.ok ? (await res.json()).data?.cats ?? [] : [];
  return { cats };
}
