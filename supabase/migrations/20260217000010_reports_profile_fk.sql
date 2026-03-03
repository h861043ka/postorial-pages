-- reports.reporter_id → profiles.id の直接FK追加（PostgRESTリレーション解決用）
ALTER TABLE reports ADD CONSTRAINT reports_reporter_profile_fkey
  FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
