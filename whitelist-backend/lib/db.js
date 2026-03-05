// lib/db.js
// Database helper menggunakan Supabase
//
// ─── SCHEMA SQL (jalankan di Supabase → SQL Editor) ────────────────────────
//
//  CREATE TABLE licenses (
//    id           BIGSERIAL PRIMARY KEY,
//    license_key  TEXT NOT NULL UNIQUE,
//    product_id   TEXT NOT NULL,
//    activated    BOOLEAN NOT NULL DEFAULT FALSE,
//    user_id      TEXT,
//    activated_at TIMESTAMPTZ,
//    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
//  );
//
//  CREATE TABLE user_products (
//    id         BIGSERIAL PRIMARY KEY,
//    user_id    TEXT NOT NULL,
//    product_id TEXT NOT NULL,
//    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//    UNIQUE(user_id, product_id)
//  );
//
//  -- Index supaya query lebih cepat
//  CREATE INDEX idx_licenses_key      ON licenses(license_key);
//  CREATE INDEX idx_user_products_uid ON user_products(user_id);
//
// ───────────────────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // pakai service_role key, BUKAN anon key
);

// ─── Ambil data license ─────────────────────────────────────────────────────

async function getLicense(licenseKey) {
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", licenseKey)
    .single();

  if (error || !data) return null;
  return data;
}

// ─── Aktivasi license key ───────────────────────────────────────────────────

async function activateLicense(licenseKey, userId, productId) {
  const license = await getLicense(licenseKey);

  if (!license)                          return { success: false, reason: "INVALID_KEY" };
  if (license.activated)                 return { success: false, reason: "ALREADY_USED" };
  if (license.product_id !== productId)  return { success: false, reason: "WRONG_PRODUCT" };

  // Tandai license sudah digunakan
  const { error: updateError } = await supabase
    .from("licenses")
    .update({
      activated:    true,
      user_id:      String(userId),
      activated_at: new Date().toISOString(),
    })
    .eq("license_key", licenseKey);

  if (updateError) {
    console.error("[db] activateLicense update error:", updateError);
    return { success: false, reason: "SERVER_ERROR" };
  }

  // Tambahkan ke tabel user_products
  const { error: upsertError } = await supabase
    .from("user_products")
    .upsert(
      { user_id: String(userId), product_id: productId },
      { onConflict: "user_id,product_id" }
    );

  if (upsertError) {
    console.error("[db] upsert error:", upsertError);
    return { success: false, reason: "SERVER_ERROR" };
  }

  return { success: true, productId: license.product_id };
}

// ─── Cek apakah user punya produk ──────────────────────────────────────────

async function checkOwnership(userId, productId) {
  const { data, error } = await supabase
    .from("user_products")
    .select("id")
    .eq("user_id", String(userId))
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("[db] checkOwnership error:", error);
    return false;
  }
  return data !== null;
}

// ─── Daftarkan license key baru ─────────────────────────────────────────────

async function registerLicense(licenseKey, productId) {
  const existing = await getLicense(licenseKey);
  if (existing) return { success: false, reason: "KEY_EXISTS" };

  const { error } = await supabase
    .from("licenses")
    .insert({ license_key: licenseKey, product_id: productId });

  if (error) {
    console.error("[db] registerLicense error:", error);
    return { success: false, reason: "SERVER_ERROR" };
  }

  return { success: true };
}

module.exports = { getLicense, activateLicense, checkOwnership, registerLicense };