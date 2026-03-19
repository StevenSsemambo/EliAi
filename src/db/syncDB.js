import db from './schema.js'

// Supabase sync removed — app uses local IndexedDB storage only.
// This stub keeps the Settings page sync button working without
// loading the 250KB @supabase/supabase-js bundle.
export const syncDB = {
  async syncAll(studentId) {
    // No remote sync configured — data lives locally on device
    return { synced: 0, error: null }
  }
}
