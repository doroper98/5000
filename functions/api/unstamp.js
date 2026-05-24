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
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }

    await ensureSchema(context.env.DB);

    const body = await context.request.json();
    const { tripId, stepId } = body;

    if (!tripId || !stepId) {
      return Response.json({ error: "missing required fields" }, { status: 400 });
    }

    await context.env.DB.prepare(
      `DELETE FROM stamps WHERE trip_id = ? AND step_id = ?`
    ).bind(tripId, stepId).run();

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
