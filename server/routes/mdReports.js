const router = require("express").Router();
const MdReport = require("../models/MdReport");

// GET /api/md-reports
router.get("/", async (_req, res) => {
  try {
    const entries = await MdReport.find().sort({ timestamp: 1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/md-reports
router.post("/", async (req, res) => {
  try {
    const entry = await MdReport.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/md-reports/:id — update any fields (category, completion, etc.)
router.put("/:id", async (req, res) => {
  try {
    const entry = await MdReport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/md-reports/:id
router.delete("/:id", async (req, res) => {
  try {
    const entry = await MdReport.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
