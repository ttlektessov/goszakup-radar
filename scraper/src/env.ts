// Loads .env for local runs. Imported FIRST (before any module that reads
// process.env, e.g. db.ts) so the vars exist by the time those modules
// evaluate. In CI the vars come from the environment, so a missing file is fine.
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file — fine */
}
