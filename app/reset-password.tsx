// パスワード変更画面（リセットリンクからアクセス）
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError("新しいパスワードを入力してください");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "パスワードの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#00ba7c" style={styles.logo} />
          <Text style={styles.title}>パスワードを変更しました</Text>
          <Text style={styles.description}>
            新しいパスワードでログインできます。
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.buttonText}>ログイン画面へ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Ionicons name="lock-closed-outline" size={56} color="#1d9bf0" style={styles.logo} />
        <Text style={styles.title}>新しいパスワードを設定</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="新しいパスワード"
            placeholderTextColor="#8e8e93"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="パスワードを確認"
          placeholderTextColor="#8e8e93"
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "更新中..." : "パスワードを変更"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { alignSelf: "center", marginBottom: 12 },
  title: {
    color: "#14171a", fontSize: 24, fontWeight: "bold",
    textAlign: "center", marginBottom: 24,
  },
  description: {
    color: "#8e8e93", fontSize: 14, textAlign: "center",
    lineHeight: 20, marginBottom: 24,
  },
  error: { color: "#f4212e", textAlign: "center", marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, padding: 14, color: "#14171a", fontSize: 16, marginBottom: 16,
  },
  passwordRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, marginBottom: 12,
  },
  passwordInput: { flex: 1, padding: 14, color: "#14171a", fontSize: 16 },
  eyeBtn: { padding: 14 },
  button: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
