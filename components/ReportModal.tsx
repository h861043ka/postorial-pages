// 通報モーダルコンポーネント（テキスト入力式）
import React, { useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { reportPost } from "../lib/api";

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onReported?: (postId: string) => void;
}

export default function ReportModal({ visible, postId, onClose, onReported }: Props) {
  const [sending, setSending] = useState(false);
  const [reason, setReason] = useState("");

  const handleReport = async () => {
    if (!reason.trim()) {
      Alert.alert("エラー", "通報理由を入力してください");
      return;
    }
    setSending(true);
    try {
      await reportPost(postId, reason.trim());
      setReason("");
      onClose();
      onReported?.(postId);
      Alert.alert("通報完了", "ご報告ありがとうございます。内容を確認いたします。");
    } catch (e: any) {
      Alert.alert("エラー", e.message || "通報に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.title}>通報する</Text>
            <Text style={styles.subtitle}>通報理由を入力してください</Text>

            <TextInput
              style={styles.textInput}
              placeholder="通報理由を詳しく記入..."
              placeholderTextColor="#8e8e93"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>

            {sending ? (
              <ActivityIndicator size="large" color="#1d9bf0" style={{ marginVertical: 16 }} />
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, !reason.trim() && styles.submitBtnDisabled]}
                onPress={handleReport}
                disabled={!reason.trim()}
              >
                <Text style={styles.submitText}>通報する</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 34, paddingHorizontal: 16,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#e0e0e0", alignSelf: "center", marginTop: 10, marginBottom: 16,
  },
  title: {
    fontSize: 17, fontWeight: "bold", color: "#14171a",
    textAlign: "center", marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: "#8e8e93",
    textAlign: "center", marginBottom: 16,
  },
  textInput: {
    backgroundColor: "#f5f5f5", borderRadius: 12, padding: 14,
    fontSize: 15, color: "#14171a", minHeight: 100,
    textAlignVertical: "top", borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  charCount: {
    color: "#8e8e93", fontSize: 12, textAlign: "right",
    marginTop: 4, marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#f4212e", borderRadius: 24, paddingVertical: 14,
    alignItems: "center", marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelBtn: {
    paddingVertical: 14, alignItems: "center",
  },
  cancelText: { fontSize: 16, color: "#8e8e93" },
});
