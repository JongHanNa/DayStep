#!/usr/bin/env node
/**
 * Todo Schema Migration Script
 * 
 * This script migrates existing todos from the old schema (single scheduled_time)
 * to the new schema (start_time, end_time, schedule_type, recurrence fields).
 * 
 * Usage:
 * - npm run migrate:todos:dry-run  (test migration without changes)
 * - npm run migrate:todos          (actual migration)
 * - npm run migrate:todos:drop-old (drop old scheduled_time column after migration)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!serviceKey && !anonKey)) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Use service role key if available, otherwise use anon key
const supabase = createClient(
  supabaseUrl,
  serviceKey || anonKey!
);

interface OldTodo {
  id: string;
  user_id: string;
  content: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  scheduled_time?: string | null;
  category?: string | null;
  description?: string | null;
  priority?: string | null;
  order_index?: number;
}

interface MigrationResult {
  id: string;
  success: boolean;
  error?: string;
  changes: {
    schedule_type: string;
    start_time?: string;
    end_time?: string;
    recurrence_pattern: string;
    recurrence_interval: number;
  };
}

async function createBackupTable(): Promise<void> {
  console.log('📦 Creating backup table...');
  
  const backupTableName = `todos_backup_${Date.now()}`;
  
  const { error } = await supabase.rpc('sql', {
    query: `
      CREATE TABLE ${backupTableName} AS 
      SELECT * FROM todos;
      
      COMMENT ON TABLE ${backupTableName} IS 
      'Backup table created before schema migration on ${new Date().toISOString()}';
    `
  });

  if (error) {
    // Try alternative approach for backup
    const { data: todos, error: fetchError } = await supabase
      .from('todos')
      .select('*');
      
    if (fetchError) throw fetchError;
    
    console.log(`📝 Created logical backup of ${todos?.length || 0} todos`);
    
    // Store backup data in a JSON file as fallback
    const fs = await import('fs');
    const path = await import('path');
    
    const backupPath = path.join(process.cwd(), 'scripts', `todos-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(todos, null, 2));
    
    console.log(`💾 Backup saved to: ${backupPath}`);
  } else {
    console.log(`✅ Database backup table created: ${backupTableName}`);
  }
}

async function fetchExistingTodos(): Promise<OldTodo[]> {
  console.log('🔍 Fetching existing todos...');
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch todos: ${error.message}`);
  }

  console.log(`📊 Found ${data?.length || 0} todos to migrate`);
  return data || [];
}

function determineScheduleType(todo: OldTodo): {
  schedule_type: string;
  start_time?: string;
  end_time?: string;
} {
  if (!todo.scheduled_time) {
    // No scheduled time = anytime
    return {
      schedule_type: 'anytime'
    };
  }

  const scheduledDate = new Date(todo.scheduled_time);
  
  // Check if it's a full day event (00:00:00 time)
  if (scheduledDate.getHours() === 0 && 
      scheduledDate.getMinutes() === 0 && 
      scheduledDate.getSeconds() === 0) {
    // All day event
    return {
      schedule_type: 'all_day',
      start_time: scheduledDate.toISOString()
    };
  } else {
    // Timed event - assume 1 hour duration
    const endTime = new Date(scheduledDate);
    endTime.setHours(endTime.getHours() + 1);
    
    return {
      schedule_type: 'timed',
      start_time: scheduledDate.toISOString(),
      end_time: endTime.toISOString()
    };
  }
}

async function migrateTodo(todo: OldTodo, isDryRun: boolean = false): Promise<MigrationResult> {
  const scheduleInfo = determineScheduleType(todo);
  
  const updates = {
    ...scheduleInfo,
    recurrence_pattern: 'none',
    recurrence_interval: 1
  };

  if (isDryRun) {
    return {
      id: todo.id,
      success: true,
      changes: updates
    };
  }

  try {
    const { error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (error) {
      return {
        id: todo.id,
        success: false,
        error: error.message,
        changes: updates
      };
    }

    return {
      id: todo.id,
      success: true,
      changes: updates
    };
  } catch (err) {
    return {
      id: todo.id,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      changes: updates
    };
  }
}

async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying migration...');
  
  const { data, error } = await supabase
    .from('todos')
    .select('id, content, schedule_type, start_time, end_time, recurrence_pattern, recurrence_interval')
    .limit(10);

  if (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }

  console.log('📋 Sample migrated todos:');
  data?.forEach((todo, index) => {
    console.log(`  ${index + 1}. ${todo.content}`);
    console.log(`     Schedule: ${todo.schedule_type}`);
    console.log(`     Start: ${todo.start_time || 'N/A'}`);
    console.log(`     End: ${todo.end_time || 'N/A'}`);
    console.log(`     Recurrence: ${todo.recurrence_pattern} (interval: ${todo.recurrence_interval})`);
    console.log('');
  });

  // Check for any todos without required fields
  const { data: incomplete, error: incompleteError } = await supabase
    .from('todos')
    .select('id, content')
    .or('schedule_type.is.null,recurrence_pattern.is.null,recurrence_interval.is.null')
    .limit(5);

  if (incompleteError) {
    console.warn('⚠️  Could not check for incomplete migrations');
  } else if (incomplete && incomplete.length > 0) {
    console.warn('⚠️  Found todos with incomplete migration:');
    incomplete.forEach(todo => {
      console.warn(`    - ${todo.content} (ID: ${todo.id})`);
    });
  } else {
    console.log('✅ All todos have required fields');
  }
}

async function dropOldColumn(): Promise<void> {
  console.log('🗑️  Dropping scheduled_time column...');
  
  const { error } = await supabase.rpc('sql', {
    query: 'ALTER TABLE todos DROP COLUMN IF EXISTS scheduled_time;'
  });

  if (error) {
    console.warn('⚠️  Could not drop scheduled_time column automatically.');
    console.warn('   You may need to drop it manually in Supabase dashboard:');
    console.warn('   ALTER TABLE todos DROP COLUMN scheduled_time;');
  } else {
    console.log('✅ Old scheduled_time column dropped successfully');
  }
}

async function runMigration(): Promise<void> {
  const isDryRun = process.env.DRY_RUN === 'true';
  const shouldDropOld = process.env.DROP_OLD_COLUMN === 'true';

  console.log('🚀 Starting Todo Schema Migration');
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'ACTUAL MIGRATION'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Create backup (skip for dry run)
    if (!isDryRun) {
      await createBackupTable();
    }

    // Step 2: Fetch existing todos
    const todos = await fetchExistingTodos();

    if (todos.length === 0) {
      console.log('ℹ️  No todos found to migrate');
      return;
    }

    // Step 3: Migrate each todo
    console.log(`🔄 ${isDryRun ? 'Simulating' : 'Processing'} migration...`);
    
    const results: MigrationResult[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < todos.length; i += batchSize) {
      const batch = todos.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(todos.length / batchSize)}...`);
      
      const batchResults = await Promise.all(
        batch.map(todo => migrateTodo(todo, isDryRun))
      );
      
      results.push(...batchResults);
    }

    // Step 4: Report results
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Migration Results:`);
    console.log(`  ✅ Successful: ${succeeded}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📈 Total: ${results.length}`);

    if (failed > 0) {
      console.log(`\n❌ Failed migrations:`);
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.id}: ${result.error}`);
      });
    }

    if (isDryRun) {
      console.log(`\n📋 Dry run completed. Changes that would be made:`);
      const sampleResults = results.slice(0, 5);
      sampleResults.forEach(result => {
        console.log(`  📝 ${result.id}:`);
        Object.entries(result.changes).forEach(([key, value]) => {
          console.log(`     ${key}: ${value || 'NULL'}`);
        });
      });
      
      if (results.length > 5) {
        console.log(`     ... and ${results.length - 5} more todos`);
      }
    } else {
      // Step 5: Verify migration
      await verifyMigration();

      // Step 6: Drop old column if requested
      if (shouldDropOld) {
        await dropOldColumn();
      }
    }

    console.log(`\n✅ Migration ${isDryRun ? 'simulation' : ''} completed successfully!`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('💡 Check your environment variables and database connection');
    
    if (!isDryRun) {
      console.error('🔄 Consider restoring from backup if needed');
    }
    
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runMigration();
}

export { runMigration, migrateTodo, determineScheduleType };