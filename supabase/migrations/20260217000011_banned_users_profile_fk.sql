-- banned_users.user_id / banned_by → profiles.id の直接FK追加（PostgRESTリレーション解決用）
ALTER TABLE banned_users ADD CONSTRAINT banned_users_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE banned_users ADD CONSTRAINT banned_users_banned_by_profile_fkey
  FOREIGN KEY (banned_by) REFERENCES profiles(id) ON DELETE SET NULL;
