// api/check.js
// GET /api/check?userId=123&productId=PRODUCT_A
//
// ⚠️  SECURITY NOTE:
// Endpoint ini PUBLIC — tidak ada secret key yang perlu dikirim dari client.
// Keamanannya bukan dari "menyembunyikan endpoint", tapi dari logika:
//   1. UserId didapat dari server-side (LocalPlayer.UserId di server script)
//   2. productId sudah hardcode di ModuleScript (tidak bisa diubah buyer)
//   3. Buyer tidak bisa "memalsukan" UserId orang lain karena Roblox tidak
//      mengizinkan klien mengubah UserId player lain
//   4. Yang paling penting: kita hanya MEMBACA data (true/false), bukan
//      endpoint yang bisa memodifikasi/menghapus data

const { checkOwnership } = require("../lib/db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, productId } = req.query;

    if (!userId || !productId) {
      return res.status(400).json({ owns: false });
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({ owns: false });
    }

    const owns = await checkOwnership(numericUserId, productId);

    // Sengaja hanya return boolean, tidak ada info tambahan
    return res.status(200).json({ owns });

  } catch (err) {
    console.error("[check] Error:", err);
    // Jika server error, lebih aman return false daripada crash
    return res.status(200).json({ owns: false });
  }
};