-- プロフィール固定投稿: pinned_post_idカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
