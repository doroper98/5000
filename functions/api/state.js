async function ensureSchema(DB) {
  await DB.prepare(`CREATE TABLE IF NOT EXISTS stamps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    step_label TEXT NOT NULL,
    stamped_at TEXT NOT NULL,
    stamped_by TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await DB.prepare(`CREATE TABLE IF NOT EXISTS resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    reset_at TEXT NOT NULL,
    reset_by TEXT NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stamps_trip_id ON stamps(trip_id)`).run();
  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stamps_trip_step ON stamps(trip_id, step_id)`).run();
}

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }

    await ensureSchema(context.env.DB);

    const url = new URL(context.request.url);
    const tripId = url.searchParams.get("trip");

    if (!tripId) {
      return Response.json({ error: "trip is required" }, { status: 400 });
    }

    const stamps = await context.env.DB.prepare(
      `SELECT step_id, step_label, stamped_at, stamped_by, note, created_at
       FROM stamps
       WHERE trip_id = ?
       ORDER BY created_at ASC, id ASC`
    ).bind(tripId).all();

    const resets = await context.env.DB.prepare(
      `SELECT reset_at, reset_by, reason, created_at
       FROM resets
       WHERE trip_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 10`
    ).bind(tripId).all();

    return Response.json({
      ok: true,
      tripId,
      stamps: stamps.results || [],
      resets: resets.results || [],
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
