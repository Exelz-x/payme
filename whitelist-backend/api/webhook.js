// api/webhook.js
// POST /api/webhook
// Dipanggil otomatis oleh Payhip setiap ada pembelian baru
// Setup di Payhip: Settings → Integrations → Webhooks → tambahkan URL ini

const crypto = require("crypto");
const { registerLicense } = require("../lib/db");

// Map dari Payhip Product ID ke internal productId kamu
// Cari Payhip Product ID di: Payhip Dashboard → klik produk → lihat URL (angka di URL)
const PAYHIP_PRODUCT_MAP = {
  "payhip_prod_abc123": "PRODUCT_A",   // Ganti dengan Product ID Payhip asli kamu
  "payhip_prod_def456": "PRODUCT_B",
  "payhip_prod_ghi789": "PRODUCT_C",
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // ─── Verifikasi signature dari Payhip ──────────────────────────────────
    // Ini memastikan request benar-benar dari Payhip, bukan dari orang random
    const signature = req.headers["x-payhip-signature"];
    const webhookSecret = process.env.PAYHIP_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const body = JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSig) {
        console.warn("[webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    // ─── Parse data dari Payhip ────────────────────────────────────────────
    const { type, data } = req.body;

    // Kita hanya proses event "payment_completed"
    if (type !== "payment_completed") {
      return res.status(200).json({ received: true });
    }

    const payhipProductId = data?.product_id;
    const licenseKey      = data?.license_key;

    if (!payhipProductId || !licenseKey) {
      console.warn("[webhook] Missing product_id or license_key", data);
      return res.status(400).json({ error: "Missing fields" });
    }

    // Cari productId internal
    const productId = PAYHIP_PRODUCT_MAP[payhipProductId];
    if (!productId) {
      console.warn("[webhook] Unknown Payhip product:", payhipProductId);
      return res.status(200).json({ received: true, note: "Product not mapped" });
    }

    // Daftarkan license key ke database
    const result = await registerLicense(licenseKey, productId);
    console.log(`[webhook] License registered: ${licenseKey} → ${productId}`, result);

    return res.status(200).json({ received: true, result });

  } catch (err) {
    console.error("[webhook] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};