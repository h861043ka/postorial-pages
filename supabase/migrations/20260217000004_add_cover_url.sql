-- プロフィールにカバー画像URLカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text DEFAULT '';
