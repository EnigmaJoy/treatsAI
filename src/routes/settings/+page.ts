export async function load({ fetch }) {
  const res = await fetch('/api/v1/device');
  const device = res.ok ? (await res.json()).data : null;
  return { device };
}
