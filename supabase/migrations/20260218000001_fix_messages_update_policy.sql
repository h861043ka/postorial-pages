-- messages UPDATEポリシーを修正
-- 問題: 会話参加者なら誰のメッセージでも内容を編集できてしまう
-- 修正: 受信者（送信者以外）のみがUPDATE可能（既読マーク用）

DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  -- 送信者以外（受信者）のみがUPDATE可能（既読マーク用）
  auth.uid() != sender_id
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);
