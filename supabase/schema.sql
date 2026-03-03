-- ==========================================
-- SNSアプリ データベーススキーマ
-- Supabase SQL Editorで実行してください
-- ==========================================

-- プロフィールテーブル（auth.usersと連携）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 投稿テーブル
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  likes_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  reposts_count INT DEFAULT 0,
  reply_to UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- いいねテーブル
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- リポストテーブル
CREATE TABLE reposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- フォローテーブル
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 通知テーブル
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'follow', 'reply', 'repost')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- RLS（Row Level Security）有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: プロフィール
CREATE POLICY "プロフィールは誰でも閲覧可能"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "自分のプロフィールのみ更新可能"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "自分のプロフィールのみ作成可能"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLSポリシー: 投稿
CREATE POLICY "投稿は誰でも閲覧可能"
  ON posts FOR SELECT USING (true);
CREATE POLICY "ログインユーザーは投稿可能"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分の投稿のみ削除可能"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: いいね
CREATE POLICY "いいねは誰でも閲覧可能"
  ON likes FOR SELECT USING (true);
CREATE POLICY "ログインユーザーはいいね可能"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分のいいねのみ削除可能"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: リポスト
CREATE POLICY "リポストは誰でも閲覧可能"
  ON reposts FOR SELECT USING (true);
CREATE POLICY "ログインユーザーはリポスト可能"
  ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分のリポストのみ削除可能"
  ON reposts FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: フォロー
CREATE POLICY "フォローは誰でも閲覧可能"
  ON follows FOR SELECT USING (true);
CREATE POLICY "ログインユーザーはフォロー可能"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "自分のフォローのみ解除可能"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- RLSポリシー: 通知
CREATE POLICY "自分の通知のみ閲覧可能"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ログインユーザーは通知作成可能"
  ON notifications FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "自分の通知のみ更新可能"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- いいね時にカウントを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- リポスト時にカウントを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_reposts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reposts_count = reposts_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_repost_change
  AFTER INSERT OR DELETE ON reposts
  FOR EACH ROW EXECUTE FUNCTION update_reposts_count();

-- フォロー時にカウントを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- 新規ユーザー登録時にプロフィールを自動作成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
