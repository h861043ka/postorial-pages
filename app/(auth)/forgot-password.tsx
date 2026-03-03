// パスワードリセット画面
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: "https://raven-five-nu.vercel.app/reset-password",
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="mail-outline" size={56} color="#1d9bf0" style={styles.logo} />
          <Text style={styles.title}>メールを送信しました</Text>
          <Text style={styles.description}>
            {email.trim()} にパスワードリセット用のリンクを送信しました。{"\n\n"}
            メールに記載されたリンクをクリックして、新しいパスワードを設定してください。
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>ログイン画面に戻る</Text>
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
        <Ionicons name="key-outline" size={56} color="#1d9bf0" style={styles.logo} />
        <Text style={styles.title}>パスワードをリセット</Text>
        <Text style={styles.description}>
          登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#8e8e93"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "送信中..." : "リセットメールを送信"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>ログイン画面に戻る</Text>
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
    textAlign: "center", marginBottom: 16,
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
  button: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { color: "#1d9bf0", textAlign: "center", fontSize: 14 },
});
