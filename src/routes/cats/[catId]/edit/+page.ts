export async function load({ fetch, params }) {
    const res = await fetch(`/api/v1/cats/${params.catId}`);
    return {
        cat: res.ok ? (await res.json()).data : null,
        catId: params.catId
    };
}
