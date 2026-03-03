-- 管理者フラグをprofilesに追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- BANテーブル
CREATE TABLE IF NOT EXISTS banned_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason TEXT DEFAULT '',
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);

-- reportsテーブルにステータス追加（未処理/対応済み/却下）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- RLS
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- banned_users: 管理者のみ読み書き可能
CREATE POLICY "banned_users_admin_select" ON banned_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "banned_users_admin_insert" ON banned_users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "banned_users_admin_delete" ON banned_users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- banned_users: 自分がBANされているか確認用（全ユーザー）
CREATE POLICY "banned_users_self_check" ON banned_users
  FOR SELECT USING (auth.uid() = user_id);

-- reports: 管理者は全通報を閲覧・更新可能
CREATE POLICY "reports_admin_select" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "reports_admin_update" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- posts: 管理者は全投稿を削除可能
CREATE POLICY "posts_admin_delete" ON posts
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
