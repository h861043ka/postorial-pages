// メールアドレス変更画面
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function ChangeEmailScreen() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCurrentEmail(user.email);
    });
  }, []);

  const handleSave = async () => {
    setError("");
    if (!newEmail.trim()) { setError("新しいメールアドレスを入力してください"); return; }
    if (!newEmail.includes("@")) { setError("有効なメールアドレスを入力してください"); return; }
    if (newEmail === currentEmail) { setError("現在のメールアドレスと異なるものにしてください"); return; }
    if (!password) { setError("パスワードを入力してください"); return; }

    setSaving(true);
    try {
      // パスワード検証
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: currentEmail, password,
      });
      if (signInErr) { setError("パスワードが正しくありません"); setSaving(false); return; }

      // メールアドレス更新
      const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (updateErr) throw updateErr;

      Alert.alert(
        "確認メール送信",
        `${newEmail} に確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      setError(e.message || "メールアドレス変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>現在のメールアドレス</Text>
      <View style={styles.currentEmailBox}>
        <Ionicons name="mail" size={18} color="#8e8e93" />
        <Text style={styles.currentEmailText}>{currentEmail}</Text>
      </View>

      <Text style={styles.label}>新しいメールアドレス</Text>
      <TextInput
        style={styles.textInput}
        value={newEmail}
        onChangeText={(t) => { setNewEmail(t); setError(""); }}
        placeholder="新しいメールアドレス"
        placeholderTextColor="#8e8e93"
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />

      <Text style={styles.label}>パスワード（確認用）</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          secureTextEntry={!showPassword}
          placeholder="現在のパスワード"
          placeholderTextColor="#8e8e93"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#8e8e93" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>メールアドレスを変更</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  error: { color: "#f4212e", fontSize: 14, marginBottom: 12, textAlign: "center" },
  label: { color: "#8e8e93", fontSize: 13, marginBottom: 6, marginTop: 16 },
  currentEmailBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#f5f5f5", borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  currentEmailText: { color: "#8e8e93", fontSize: 16 },
  textInput: {
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, padding: 14, color: "#14171a", fontSize: 16,
  },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8,
  },
  input: { flex: 1, padding: 14, color: "#14171a", fontSize: 16 },
  eyeBtn: { padding: 14 },
  saveBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginTop: 32,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
