require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const usersRouter = require("./routes/users");
const plansRouter = require("./routes/plans");
const reportsRouter = require("./routes/reports");
const mdReportsRouter = require("./routes/mdReports");
const uploadRouter = require("./routes/upload");
const workingPersonsRouter = require("./routes/workingPersons");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" })); // large base64 file uploads

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users", usersRouter);
app.use("/api/plans", plansRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/md-reports", mdReportsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/working-persons", workingPersonsRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Boot ──────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅  API server running on http://localhost:${PORT}`);
  });
});
