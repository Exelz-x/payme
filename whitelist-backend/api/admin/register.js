// api/admin/register.js
// POST /api/admin/register
// Body: { adminKey, licenseKey, productId }
// Digunakan manual jika Payhip webhook tidak terkonfigurasi / gagal

const { registerLicense } = require("../../lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Cek admin key — set di Vercel Environment Variables sebagai ADMIN_SECRET_KEY
    const { adminKey, licenseKey, productId } = req.body;
    const correctKey = process.env.ADMIN_SECRET_KEY;

    if (!correctKey || adminKey !== correctKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!licenseKey || !productId) {
      return res.status(400).json({ error: "Missing licenseKey or productId" });
    }

    const result = await registerLicense(licenseKey, productId);
    return res.status(200).json(result);

  } catch (err) {
    console.error("[admin/register] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};