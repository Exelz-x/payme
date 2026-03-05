// api/activate.js
// POST /api/activate
// Body: { licenseKey, userId, productId }
// Dipanggil dari Roblox Verification Map saat player menekan tombol Aktivasi

const { activateLicense } = require("../lib/db");

// Produk yang terdaftar — tambahkan produk baru di sini
// Format: "PRODUCT_ID" : { name, badgeId }
const PRODUCTS = {
  "FIREWORKS_V2": { name: "Fireworks Show Bundles 2.393 Shots V2",    badgeId: 636438583652372 },
  // Tambahkan produkmu di sini...
};

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { licenseKey, userId, productId } = req.body;

    // Validasi input dasar
    if (!licenseKey || !userId || !productId) {
      return res.status(400).json({ success: false, reason: "MISSING_FIELDS" });
    }

    // Cek productId valid
    if (!PRODUCTS[productId]) {
      return res.status(400).json({ success: false, reason: "INVALID_PRODUCT" });
    }

    // Sanitasi: pastikan userId adalah angka (Roblox UserId)
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({ success: false, reason: "INVALID_USER" });
    }

    const result = await activateLicense(licenseKey, numericUserId, productId);

    if (!result.success) {
      return res.status(200).json({ success: false, reason: result.reason });
    }

    const product = PRODUCTS[productId];
    return res.status(200).json({
      success: true,
      productName: product.name,
      badgeId: product.badgeId,
    });

  } catch (err) {
    console.error("[activate] Error:", err);
    return res.status(500).json({ success: false, reason: "SERVER_ERROR" });
  }

};

