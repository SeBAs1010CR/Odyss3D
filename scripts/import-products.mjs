/**
 * Importa las imágenes de /public/images/products/ como productos del catálogo
 * (categoría Llaveros, precio ₡500). Idempotente: no duplica los que ya existan.
 *
 * Uso:
 *   node scripts/import-products.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const file = new URL("../.env.local", import.meta.url);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[1].startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PRODUCTS_DIR = new URL("../public/images/products/", import.meta.url);
if (!existsSync(PRODUCTS_DIR)) {
  console.error("No existe public/images/products/.");
  process.exit(1);
}

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

/** "One-Piece-1.png" -> "One Piece 1"; "NFC-personal.png" -> "NFC Personal". */
function humanize(file) {
  const base = file.replace(IMAGE_EXT, "");
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) =>
      part === part.toUpperCase() && part.length > 1
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ")
    .trim();
}

const files = readdirSync(PRODUCTS_DIR)
  .filter((f) => IMAGE_EXT.test(f))
  .sort();

console.log(`Imágenes encontradas: ${files.length}`);

const { data: existing, error: listError } = await supabase
  .from("products")
  .select("name");

if (listError) {
  console.error("No se pudo leer el catálogo:", listError.message);
  process.exit(1);
}

const existingNames = new Set((existing ?? []).map((p) => p.name));
let created = 0;
let skipped = 0;

for (const file of files) {
  const name = humanize(file);
  const image = `/images/products/${file}`;

  if (existingNames.has(name)) {
    console.log(`↷ Ya existe — ${name}`);
    skipped++;
    continue;
  }

  const { error } = await supabase.from("products").insert({
    name,
    category: "Llaveros",
    description: null,
    image,
    print_minutes: null,
    grams: null,
    production_cost: null,
    sale_price: 500,
    is_active: true,
  });

  if (error) {
    console.error(`✘ ${name}: ${error.message}`);
    continue;
  }
  console.log(`✔ ${name} — ₡500`);
  created++;
}

console.log(`\nListo: ${created} creados, ${skipped} omitidos (ya existían).`);