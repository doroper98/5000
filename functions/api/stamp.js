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

  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stamps_trip_id ON stamps(trip_id)`).run();
  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stamps_trip_step ON stamps(trip_id, step_id)`).run();
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }

    await ensureSchema(context.env.DB);

    const body = await context.request.json();
    const { tripId, stepId, stepLabel, stampedAt, stampedBy, note } = body;

    if (!tripId || !stepId || !stepLabel || !stampedAt || !stampedBy) {
      return Response.json({ error: "missing required fields" }, { status: 400 });
    }

    await context.env.DB.prepare(
      `INSERT INTO stamps
       (trip_id, step_id, step_label, stamped_at, stamped_by, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      tripId,
      stepId,
      stepLabel,
      stampedAt,
      stampedBy,
      note || null
    ).run();

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
