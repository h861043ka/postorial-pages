// ログイン画面（目のボタン付き・2FA対応）
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const { signIn, bannedMessage } = useAuth();

  const handleLogin = async () => {
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }
    if (!password.trim()) { setError("パスワードを入力してください"); return; }
    setLoading(true);
    setError("");
    try {
      // 通常のログイン
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // 2FAが必要かチェック
      if (data?.user) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factors?.all.find(f => f.status === "verified");

        if (verifiedFactor) {
          // 2FA必要
          setFactorId(verifiedFactor.id);
          setShow2FA(true);
          setLoading(false);
          return;
        }
      }

      // 2FA不要の場合、通常ログイン完了
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "ログインに失敗しました");
    } finally {
      if (!show2FA) {
        setLoading(false);
      }
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // チャレンジを作成
      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (!challenge) {
        throw new Error("認証に失敗しました");
      }

      // コードを検証
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: twoFactorCode,
      });

      if (error) throw error;

      // 2FA成功
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "確認コードが正しくありません");
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
        <Ionicons name="chatbubbles" size={56} color="#1d9bf0" style={styles.logo} />
        <Text style={styles.title}>Postorialにログイン</Text>

        {bannedMessage ? <Text style={styles.error}>{bannedMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!show2FA ? (
          <>
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

            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="パスワード"
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

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "ログイン中..." : "ログイン"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotLink}>パスワードを忘れた方</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.link}>
                アカウントをお持ちでない方は<Text style={styles.linkBold}>新規登録</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* 2FA確認コード入力 */}
            <View style={styles.twoFactorCard}>
              <Ionicons name="shield-checkmark" size={48} color="#1d9bf0" style={{ alignSelf: "center", marginBottom: 16 }} />
              <Text style={styles.twoFactorTitle}>2段階認証</Text>
              <Text style={styles.twoFactorDesc}>
                認証アプリに表示されている6桁のコードを入力してください
              </Text>

              <TextInput
                style={styles.twoFactorInput}
                placeholder="000000"
                placeholderTextColor="#8e8e93"
                keyboardType="number-pad"
                maxLength={6}
                value={twoFactorCode}
                onChangeText={(t) => { setTwoFactorCode(t); setError(""); }}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.button, (loading || twoFactorCode.length !== 6) && { opacity: 0.6 }]}
                onPress={handleVerify2FA}
                disabled={loading || twoFactorCode.length !== 6}
              >
                <Text style={styles.buttonText}>{loading ? "確認中..." : "確認"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setShow2FA(false);
                  setTwoFactorCode("");
                  setFactorId("");
                }}
              >
                <Text style={styles.backBtnText}>戻る</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { alignSelf: "center", marginBottom: 12 },
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
  button: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 24,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  forgotLink: { color: "#1d9bf0", textAlign: "center", fontSize: 14, marginBottom: 16 },
  link: { color: "#8e8e93", textAlign: "center", fontSize: 14 },
  linkBold: { color: "#1d9bf0", fontWeight: "bold" },

  // 2FA
  twoFactorCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 24,
  },
  twoFactorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#14171a",
    textAlign: "center",
    marginBottom: 8,
  },
  twoFactorDesc: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  twoFactorInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    fontWeight: "bold",
    color: "#14171a",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: {
    color: "#8e8e93",
    fontSize: 16,
  },
});
