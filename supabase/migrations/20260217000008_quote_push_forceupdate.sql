-- 引用リポスト: postsにquote_post_idカラムを追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quote_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_quote_post_id ON posts(quote_post_id);

-- プッシュ通知: profilesにpush_tokenカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT '';

-- 強制アップデート: アプリ設定テーブル
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 初期設定: 最低バージョン
INSERT INTO app_config (key, value) VALUES ('min_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

-- RLS有効化
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- app_config: 誰でも閲覧可能、管理者のみ更新可能
CREATE POLICY "app_config_select" ON app_config FOR SELECT USING (true);
CREATE POLICY "app_config_update" ON app_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
