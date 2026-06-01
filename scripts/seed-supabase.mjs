// One-time seed for the demo user + global template personas into Supabase.
// Run: node scripts/seed-supabase.mjs   (reads .env.local)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const { error: userErr } = await sb.from("users").upsert(
  {
    id: DEMO_USER_ID,
    email: "demo@uxkpi.local",
    full_name: "Anupam Sarkar",
    role: "admin",
    quota_analyses: 10,
    quota_used: 0,
  },
  { onConflict: "id" },
);
console.log("demo user:", userErr ? `ERROR ${userErr.message}` : "✓ upserted");

const templates = [
  { name: "Enterprise Analyst", occupation: "Data Analyst", tech_comfort: "high", behavioral_traits: ["Detail-oriented", "Power user"], goals: "Complete tasks quickly with minimal clicks", frustrations: "Hidden actions and unnecessary confirmation dialogs" },
  { name: "Field Technician", occupation: "Maintenance Technician", tech_comfort: "low", behavioral_traits: ["Impatient", "Accessibility needs"], goals: "Get in, log the job, get out", frustrations: "Tiny tap targets and dense forms on mobile" },
];

// Only seed templates if none exist yet (avoid duplicates on re-run).
const { count } = await sb.from("personas").select("*", { count: "exact", head: true }).eq("is_template", true);
if ((count ?? 0) === 0) {
  const { error } = await sb.from("personas").insert(
    templates.map((t) => ({
      user_id: DEMO_USER_ID,
      project_id: null,
      name: t.name,
      age_range: "30-45",
      gender: "unspecified",
      occupation: t.occupation,
      tech_comfort: t.tech_comfort,
      behavioral_traits: t.behavioral_traits,
      goals: t.goals,
      frustrations: t.frustrations,
      is_template: true,
      is_synthetic: true,
      generated_by_ai: false,
    })),
  );
  console.log("templates:", error ? `ERROR ${error.message}` : `✓ inserted ${templates.length}`);
} else {
  console.log(`templates: ✓ already present (${count})`);
}

console.log("\nSeed complete.");
