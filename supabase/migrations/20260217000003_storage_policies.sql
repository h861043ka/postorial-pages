-- Storageポリシー
CREATE POLICY "メディアは誰でも閲覧可能"
  ON storage.objects FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "ログインユーザーはアップロード可能"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "自分のファイルのみ削除可能"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]
  );
