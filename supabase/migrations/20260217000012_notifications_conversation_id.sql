-- notifications テーブルに conversation_id カラムを追加（DM通知用）
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
