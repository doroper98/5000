async function ensureSchema(DB) {
  await DB.prepare(`CREATE TABLE IF NOT EXISTS trip_modes (
    trip_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL
  )`).run();
}

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }
    await ensureSchema(context.env.DB);
    const url = new URL(context.request.url);
    const tripId = url.searchParams.get("trip");
    if (!tripId) return Response.json({ error: "trip is required" }, { status: 400 });
    const row = await context.env.DB.prepare(
      `SELECT trip_id, mode, updated_by, updated_at FROM trip_modes WHERE trip_id = ?`
    ).bind(tripId).first();
    return Response.json({ ok: true, tripId, mode: row?.mode || "best", updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }
    await ensureSchema(context.env.DB);
    const body = await context.request.json();
    const { tripId, mode, updatedBy } = body;
    if (!tripId || !mode) return Response.json({ error: "missing required fields" }, { status: 400 });
    if (!["best", "altA", "altB"].includes(mode)) return Response.json({ error: "invalid mode" }, { status: 400 });
    const now = new Date().toISOString();
    await context.env.DB.prepare(
      `INSERT INTO trip_modes (trip_id, mode, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(trip_id) DO UPDATE SET
         mode = excluded.mode,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(tripId, mode, updatedBy || null, now).run();
    return Response.json({ ok: true, tripId, mode, updatedBy: updatedBy || null, updatedAt: now });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
