/**
 * Supabase Migration Runner
 * Run with: node scripts/run-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MIGRATION_FILE = process.argv[2] || 'supabase/migrations/004_deduplication_support.sql';

async function runMigration() {
  console.log('\n=== Supabase Migration Runner ===\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not configured in .env.local');
    console.error('Please set your actual Supabase project URL\n');
    process.exit(1);
  }

  if (!supabaseKey || supabaseKey === 'your-service-role-key') {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not configured in .env.local');
    console.error('Please set your actual Supabase service role key\n');
    process.exit(1);
  }

  // Read migration file
  const migrationPath = path.join(process.cwd(), MIGRATION_FILE);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found: ${migrationPath}\n`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`📄 Migration file: ${MIGRATION_FILE}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log('');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('⏳ Running migration...\n');

    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.trim().startsWith('--')) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement });

        if (error) {
          // If exec_sql doesn't exist, try direct query
          if (error.message.includes('exec_sql')) {
            console.warn('⚠️  Warning: exec_sql function not found');
            console.warn('   You need to run this migration manually in Supabase Dashboard\n');
            console.log('📋 SQL to execute:');
            console.log('─'.repeat(80));
            console.log(sql);
            console.log('─'.repeat(80));
            console.log('\nSteps:');
            console.log('1. Go to Supabase Dashboard > SQL Editor');
            console.log('2. Paste the SQL above');
            console.log('3. Click "Run"\n');
            process.exit(0);
          }

          throw error;
        }

        successCount++;
      } catch (err) {
        console.error(`❌ Error in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      console.log(`\n✅ Migration completed successfully!`);
      console.log(`   Executed ${successCount} statements\n`);
    } else {
      console.log(`\n⚠️  Migration completed with errors`);
      console.log(`   Success: ${successCount}, Errors: ${errorCount}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📋 Please run this SQL manually in Supabase Dashboard:');
    console.error('─'.repeat(80));
    console.error(sql);
    console.error('─'.repeat(80));
    console.error('\nSteps:');
    console.error('1. Go to Supabase Dashboard > SQL Editor');
    console.error('2. Paste the SQL above');
    console.error('3. Click "Run"\n');
    process.exit(1);
  }
}

runMigration();
