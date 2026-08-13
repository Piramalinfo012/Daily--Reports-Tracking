const router = require("express").Router();

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_UPLOAD_URL;

/**
 * POST /api/upload
 * Proxies a base64 file payload to Google Apps Script for Drive upload.
 * This keeps the Apps Script URL server-side only (not exposed to the browser).
 */
router.post("/", async (req, res) => {
  try {
    if (!APPS_SCRIPT_URL) {
      return res.status(500).json({ error: "APPS_SCRIPT_UPLOAD_URL is not configured in server/.env" });
    }
    const { base64Data, fileName, mimeType, folderId } = req.body;
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: "base64Data and fileName are required" });
    }

    const body = new URLSearchParams({ action: "uploadFile", base64Data, fileName, mimeType, folderId });
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body });
    if (!response.ok) throw new Error(`Apps Script responded with ${response.status}`);
    const json = await response.json();
    if (!json.success) throw new Error(json.error || "Upload failed");
    res.json({ fileUrl: json.fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
