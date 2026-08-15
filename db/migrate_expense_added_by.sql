-- Add Paid By vs Added By tracking to existing D1 databases
ALTER TABLE expenses ADD COLUMN added_by_type TEXT DEFAULT 'member';
ALTER TABLE expenses ADD COLUMN added_by_id INTEGER;
