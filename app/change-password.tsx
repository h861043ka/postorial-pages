// パスワード変更画面（目のボタン付き）
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function ChangePasswordScreen() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!currentPw) { setError("現在のパスワードを入力してください"); return; }
    if (newPw.length < 6) { setError("新しいパスワードは6文字以上にしてください"); return; }
    if (newPw !== confirmPw) { setError("新しいパスワードが一致しません"); return; }
    if (currentPw === newPw) { setError("新しいパスワードは現在のパスワードと異なるものにしてください"); return; }

    setSaving(true);
    try {
      // 現在のパスワードを検証するためにサインイン
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("ユーザー情報が取得できません");

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: currentPw,
      });
      if (signInErr) { setError("現在のパスワードが正しくありません"); setSaving(false); return; }

      // パスワード更新
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      Alert.alert("完了", "パスワードが変更されました", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e.message || "パスワード変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>現在のパスワード</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={currentPw}
          onChangeText={(t) => { setCurrentPw(t); setError(""); }}
          secureTextEntry={!showCurrent}
          placeholder="現在のパスワード"
          placeholderTextColor="#8e8e93"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)}>
          <Ionicons name={showCurrent ? "eye-off" : "eye"} size={22} color="#8e8e93" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>新しいパスワード</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newPw}
          onChangeText={(t) => { setNewPw(t); setError(""); }}
          secureTextEntry={!showNew}
          placeholder="6文字以上"
          placeholderTextColor="#8e8e93"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
          <Ionicons name={showNew ? "eye-off" : "eye"} size={22} color="#8e8e93" />
        </TouchableOpacity>
      </View>

      {/* パスワード強度インジケーター */}
      {newPw.length > 0 ? (
        <View style={styles.strengthRow}>
          <View style={[styles.strengthBar, { backgroundColor: newPw.length >= 6 ? (newPw.length >= 10 ? "#00ba7c" : "#ffd400") : "#f4212e" }]} />
          <Text style={styles.strengthText}>
            {newPw.length < 6 ? "弱い" : newPw.length < 10 ? "普通" : "強い"}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>新しいパスワード（確認）</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={confirmPw}
          onChangeText={(t) => { setConfirmPw(t); setError(""); }}
          secureTextEntry={!showConfirm}
          placeholder="もう一度入力"
          placeholderTextColor="#8e8e93"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
          <Ionicons name={showConfirm ? "eye-off" : "eye"} size={22} color="#8e8e93" />
        </TouchableOpacity>
      </View>

      {confirmPw.length > 0 && newPw !== confirmPw ? (
        <Text style={styles.mismatch}>パスワードが一致しません</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>パスワードを変更</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  error: { color: "#f4212e", fontSize: 14, marginBottom: 12, textAlign: "center" },
  label: { color: "#8e8e93", fontSize: 13, marginBottom: 6, marginTop: 16 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8,
  },
  input: { flex: 1, padding: 14, color: "#14171a", fontSize: 16 },
  eyeBtn: { padding: 14 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  strengthBar: { width: 60, height: 4, borderRadius: 2 },
  strengthText: { color: "#8e8e93", fontSize: 12 },
  mismatch: { color: "#f4212e", fontSize: 12, marginTop: 4 },
  saveBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginTop: 32,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
