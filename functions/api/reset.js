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
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ error: "D1 binding DB is not configured" }, { status: 500 });
    }

    await ensureSchema(context.env.DB);

    const body = await context.request.json();
    const { tripId, resetBy, confirmText } = body;

    if (!tripId || !resetBy) {
      return Response.json({ error: "missing required fields" }, { status: 400 });
    }

    if (confirmText !== "초기화합니다") {
      return Response.json({ error: "confirmText must be 초기화합니다" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await context.env.DB.prepare(
      `INSERT INTO resets
       (trip_id, reset_at, reset_by, reason)
       VALUES (?, ?, ?, ?)`
    ).bind(tripId, now, resetBy, "manual reset").run();

    await context.env.DB.prepare(
      `DELETE FROM stamps WHERE trip_id = ?`
    ).bind(tripId).run();

    return Response.json({ ok: true, resetAt: now });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
