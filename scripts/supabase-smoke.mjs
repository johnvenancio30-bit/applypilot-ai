import { readFileSync } from "node:fs";

function readLocalEnv() {
  const env = {};

  try {
    const text = readFileSync(".env.local", "utf8");

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);

      if (match) {
        env[match[1].trim()] = match[2];
      }
    }
  } catch {
    return env;
  }

  return env;
}

const localEnv = readLocalEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("FAIL\tSupabase env\tNEXT_PUBLIC_SUPABASE_URL or public key is missing");
  process.exit(1);
}

const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/application_records?select=id&limit=1`;
const response = await fetch(endpoint, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
});

const body = await response.text();

if (!response.ok) {
  console.error(`FAIL\tapplication_records reachable\tstatus=${response.status}; body=${body.slice(0, 180)}`);
  process.exit(1);
}

console.log(`PASS\tSupabase env\turl configured`);
console.log(`PASS\tapplication_records reachable\tstatus=${response.status}`);
