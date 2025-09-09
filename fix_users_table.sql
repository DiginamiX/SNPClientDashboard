-- Fix the users table to work with manual UUID insertion
-- This script removes problematic foreign key constraints and ensures proper UUID generation

-- First, let's see what constraints exist
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- Drop the problematic foreign key constraint if it exists
-- (This is likely the users_id_fkey constraint causing issues)
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_id_fkey' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_id_fkey;
        RAISE NOTICE 'Dropped users_id_fkey constraint';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint: %', SQLERRM;
END $$;

-- Ensure the ID column has proper UUID default
-- (In case it wasn't set up correctly)
DO $$
BEGIN
    -- Set default for id column to generate random UUID
    ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
    RAISE NOTICE 'Set UUID default for users.id column';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not set UUID default: %', SQLERRM;
END $$;

-- Verify the table structure
SELECT column_name, column_default, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;