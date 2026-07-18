// ============================================================
// ZARAH'S STORE — SUPABASE CLIENT INITIALIZATION
// ============================================================

const SUPABASE_URL = "https://hlodwqvkvudhfzbophwg.supabase.co";
const SUPABASE_KEY = "sb_publishable_3bGNgxiMRd36SHLIzJZCaw_6Ld32cb5";

// Ensure supabase client is initialized globally
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("Supabase Client successfully initialized.");
} else {
  console.error("Supabase CDN library not loaded yet.");
}
