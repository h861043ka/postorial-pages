-- 投稿にメディアと位置情報カラムを追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT '';

-- リアクション（スタンプ）テーブル
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "リアクションは誰でも閲覧可能"
  ON reactions FOR SELECT USING (true);
CREATE POLICY "ログインユーザーはリアクション可能"
  ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分のリアクションのみ削除可能"
  ON reactions FOR DELETE USING (auth.uid() = user_id);
