/**
 * Crea las cuentas iniciales del panel administrativo (cami / sebas).
 *
 * Requiere variables de entorno en .env.local:
 *   SUPABASE_URL              (o NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_INITIAL_PASSWORD
 *
 * Uso:
 *   node scripts/create-admins.mjs
 *
 * Estas claves solo se usan aquí (desarrollo) y en API routes del servidor.
 * NUNCA van al frontend.
 */
import { readFileSync, existsSync } from "node:fs";
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

const URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = env.ADMIN_INITIAL_PASSWORD;

if (!URL || !SERVICE_ROLE) {
  console.error("Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!PASSWORD) {
  console.error("Falta ADMIN_INITIAL_PASSWORD.");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { email: "cami@odyss3d.com", name: "Cami" },
  { email: "sebas@odyss3d.com", name: "Sebas" },
];

for (const { email, name } of ADMINS) {
  const { data: existing } = await supabase.auth.admin.getUserByEmail(email);

  if (existing?.user) {
    await supabase.auth.admin.updateUserById(existing.user.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    console.log(`✔ ${email} ya existía — contraseña actualizada (${name}).`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) {
      console.error(`✘ ${email}: ${error.message}`);
      continue;
    }
    console.log(`✔ ${email} creado (${name}, uid ${data.user.id}).`);
  }
}

console.log(`\nUsuarios listos. Credenciales: cami@odyss3d.com / sebas@odyss3d.com`);