// 新規登録画面（目のボタン付き）
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }
    if (password.length < 6) { setError("パスワードは6文字以上にしてください"); return; }
    if (!agreed) { setError("利用規約とプライバシーポリシーに同意してください"); return; }
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), displayName.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Ionicons name="chatbubbles" size={48} color="#1d9bf0" style={styles.logo} />
        <Text style={styles.title}>アカウントを作成</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="表示名"
          placeholderTextColor="#8e8e93"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#8e8e93"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="パスワード（6文字以上）"
            placeholderTextColor="#8e8e93"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        {/* パスワード強度 */}
        {password.length > 0 ? (
          <View style={styles.strengthRow}>
            <View style={[styles.strengthBar, { backgroundColor: password.length >= 6 ? (password.length >= 10 ? "#00ba7c" : "#ffd400") : "#f4212e" }]} />
            <Text style={styles.strengthText}>
              {password.length < 6 ? "弱い（6文字以上必要）" : password.length < 10 ? "普通" : "強い"}
            </Text>
          </View>
        ) : null}

        {/* 利用規約・プライバシーポリシー同意 */}
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={styles.agreeText}>
            <Text
              style={styles.agreeLink}
              onPress={() => router.push("/terms")}
            >利用規約</Text>
            と
            <Text
              style={styles.agreeLink}
              onPress={() => router.push("/privacy-policy")}
            >プライバシーポリシー</Text>
            に同意する
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (loading || !agreed) && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={loading || !agreed}
        >
          <Text style={styles.buttonText}>
            {loading ? "作成中..." : "アカウント作成"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            すでにアカウントをお持ちの方は<Text style={styles.linkBold}>ログイン</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { alignSelf: "center", marginBottom: 16 },
  title: {
    color: "#14171a", fontSize: 28, fontWeight: "bold",
    textAlign: "center", marginBottom: 32,
  },
  error: { color: "#f4212e", textAlign: "center", marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, padding: 14, color: "#14171a", fontSize: 16, marginBottom: 12,
  },
  passwordRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, marginBottom: 12,
  },
  passwordInput: { flex: 1, padding: 14, color: "#14171a", fontSize: 16 },
  eyeBtn: { padding: 14 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  strengthBar: { width: 60, height: 4, borderRadius: 2 },
  strengthText: { color: "#8e8e93", fontSize: 12 },
  button: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 24,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  agreeRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: "#e0e0e0",
    justifyContent: "center", alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1d9bf0", borderColor: "#1d9bf0",
  },
  agreeText: { flex: 1, color: "#8e8e93", fontSize: 13, lineHeight: 18 },
  agreeLink: { color: "#1d9bf0", fontWeight: "600" },
  link: { color: "#8e8e93", textAlign: "center", fontSize: 14 },
  linkBold: { color: "#1d9bf0", fontWeight: "bold" },
});
