#!/usr/bin/env node
/**
 * KisanIQ — Automated Mandi Synchronization Script
 * Ingests daily market arrival bulletins from the Government of India AGMARKNET API (data.gov.in)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if not already set
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { mandiService } from '../server/services/mandiService.js';
import { runMigrations } from '../server/db/index.js';

async function main() {
  console.log('====================================================');
  console.log('🌾 KisanIQ Mandi Price Synchronization');
  console.log('====================================================');
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    // 1. Run migrations to ensure schema tables exist
    console.log('[1/2] Ensuring database tables are up to date...');
    await runMigrations();

    // 2. Execute sync with official AGMARKNET resource
    console.log('[2/2] Connecting to data.gov.in AGMARKNET feed...');
    const result = await mandiService.syncFromGovApi({
      limit: 100,
    });

    console.log('----------------------------------------------------');
    console.log(`Status:          ${result.status.toUpperCase()}`);
    console.log(`Source:          ${result.source}`);
    console.log(`Records Fetched: ${result.fetchedCount}`);
    console.log(`Records Added:   ${result.insertedCount}`);
    console.log(`Records Updated: ${result.updatedCount}`);
    console.log(`Records Skipped: ${result.rejectedCount}`);
    console.log(`Completed at:    ${result.completedAt}`);
    console.log('----------------------------------------------------');

    if (result.status === 'failed') {
      console.warn(`[WARNING] Synchronization reported error: ${result.errorMessage}`);
      // If API key is missing in local dev, provide helpful instructions without hard erroring
      if (result.errorMessage?.includes('DATA_GOV_IN_API_KEY')) {
        console.log('ℹ️  To sync live daily prices, set DATA_GOV_IN_API_KEY in server/.env');
        console.log('   Register for free at https://data.gov.in');
        process.exit(0);
      }
      process.exit(1);
    }

    console.log('✅ Mandi synchronization completed successfully.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Mandi synchronization encountered unhandled error:', error);
    process.exit(1);
  }
}

main();
