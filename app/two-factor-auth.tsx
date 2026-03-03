// 2段階認証（2FA）設定画面
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";

export default function TwoFactorAuthScreen() {
  const [loading, setLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  // 2FAステータスを確認
  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Supabase MFA APIで確認
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = factors?.all.some(f => f.status === "verified");
      setIs2FAEnabled(!!hasVerifiedFactor);
    } catch (error) {
      console.error("2FA status check error:", error);
    }
  };

  // 2FAセットアップを開始
  const handleStartSetup = async () => {
    setLoading(true);
    try {
      // MFAファクターを登録（TOTP）
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Postorial 2FA",
      });

      if (error) throw error;

      if (data) {
        setQrCodeUri(data.totp.qr_code);
        setSecret(data.totp.secret);
        setShowSetup(true);
      }
    } catch (error: any) {
      Alert.alert("エラー", error.message || "2FAの設定を開始できませんでした");
    } finally {
      setLoading(false);
    }
  };

  // 確認コードを検証して2FAを有効化
  const handleVerifyAndEnable = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      Alert.alert("エラー", "6桁のコードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverifiedFactor = factors?.all.find(f => f.status === "unverified");

      if (!unverifiedFactor) {
        throw new Error("設定中のファクターが見つかりません");
      }

      // チャレンジを作成
      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: unverifiedFactor.id,
      });

      if (!challenge) {
        throw new Error("チャレンジの作成に失敗しました");
      }

      // コードを検証
      const { error } = await supabase.auth.mfa.verify({
        factorId: unverifiedFactor.id,
        challengeId: challenge.id,
        code: verifyCode,
      });

      if (error) throw error;

      Alert.alert("成功", "2段階認証が有効化されました", [
        {
          text: "OK",
          onPress: () => {
            setIs2FAEnabled(true);
            setShowSetup(false);
            setVerifyCode("");
            setQrCodeUri("");
            setSecret("");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("エラー", error.message || "確認コードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  // 2FAを無効化
  const handleDisable = async () => {
    const confirmDisable = Platform.OS === "web"
      ? window.confirm("2段階認証を無効化しますか？\nアカウントのセキュリティが低下します。")
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            "2段階認証を無効化",
            "本当に無効化しますか？\nアカウントのセキュリティが低下します。",
            [
              { text: "キャンセル", style: "cancel", onPress: () => resolve(false) },
              { text: "無効化", style: "destructive", onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDisable) return;

    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.all.find(f => f.status === "verified");

      if (verifiedFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
        if (error) throw error;
      }

      Alert.alert("完了", "2段階認証を無効化しました");
      setIs2FAEnabled(false);
    } catch (error: any) {
      Alert.alert("エラー", error.message || "無効化に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#14171a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>2段階認証</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {!showSetup ? (
          <>
            {/* 2FAステータス表示 */}
            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name={is2FAEnabled ? "shield-checkmark" : "shield-outline"}
                  size={48}
                  color={is2FAEnabled ? "#00ba7c" : "#8e8e93"}
                />
              </View>
              <Text style={styles.statusTitle}>
                {is2FAEnabled ? "2段階認証が有効です" : "2段階認証が無効です"}
              </Text>
              <Text style={styles.statusDesc}>
                {is2FAEnabled
                  ? "アカウントは2段階認証で保護されています"
                  : "2段階認証を有効にして、アカウントのセキュリティを強化しましょう"}
              </Text>
            </View>

            {/* 説明 */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>2段階認証とは？</Text>
              <Text style={styles.infoText}>
                パスワードに加えて、認証アプリで生成される6桁のコードを入力することで、不正アクセスを防ぎます。
              </Text>
              <Text style={styles.infoText}>
                認証アプリ（Google Authenticator、Microsoft Authenticatorなど）が必要です。
              </Text>
            </View>

            {/* アクションボタン */}
            {!is2FAEnabled ? (
              <TouchableOpacity
                style={styles.enableBtn}
                onPress={handleStartSetup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.enableBtnText}>2段階認証を有効化</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.disableBtn}
                onPress={handleDisable}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-outline" size={20} color="#fff" />
                    <Text style={styles.disableBtnText}>2段階認証を無効化</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* セットアップ画面 */}
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>認証アプリでQRコードをスキャン</Text>
              <Text style={styles.setupDesc}>
                Google AuthenticatorやMicrosoft Authenticatorなどの認証アプリを開き、以下のQRコードをスキャンしてください。
              </Text>

              {/* QRコード */}
              {qrCodeUri ? (
                <View style={styles.qrCodeContainer}>
                  <QRCode value={qrCodeUri} size={200} />
                </View>
              ) : null}

              {/* シークレットキー */}
              {secret ? (
                <View style={styles.secretContainer}>
                  <Text style={styles.secretLabel}>手動入力用シークレットキー:</Text>
                  <Text style={styles.secretText}>{secret}</Text>
                  <Text style={styles.secretNote}>
                    QRコードをスキャンできない場合は、このキーを手動で入力してください
                  </Text>
                </View>
              ) : null}

              {/* 確認コード入力 */}
              <View style={styles.verifyContainer}>
                <Text style={styles.verifyLabel}>6桁の確認コードを入力</Text>
                <TextInput
                  style={styles.verifyInput}
                  placeholder="000000"
                  placeholderTextColor="#8e8e93"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerifyAndEnable}
                disabled={loading || verifyCode.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyBtnText}>確認して有効化</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowSetup(false);
                  setVerifyCode("");
                  setQrCodeUri("");
                  setSecret("");
                }}
              >
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#14171a" },
  content: { flex: 1, padding: 16 },

  // ステータスカード
  statusCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  statusIcon: { marginBottom: 16 },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#14171a",
    marginBottom: 8,
    textAlign: "center",
  },
  statusDesc: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 20,
  },

  // 情報カード
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#14171a",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#8e8e93",
    lineHeight: 20,
    marginBottom: 8,
  },

  // ボタン
  enableBtn: {
    backgroundColor: "#00ba7c",
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  enableBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disableBtn: {
    backgroundColor: "#f4212e",
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disableBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // セットアップカード
  setupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#14171a",
    marginBottom: 8,
    textAlign: "center",
  },
  setupDesc: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  // QRコード
  qrCodeContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },

  // シークレットキー
  secretContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  secretLabel: {
    fontSize: 12,
    color: "#8e8e93",
    marginBottom: 8,
  },
  secretText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#14171a",
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  secretNote: {
    fontSize: 11,
    color: "#8e8e93",
    lineHeight: 16,
  },

  // 確認コード入力
  verifyContainer: { marginBottom: 24 },
  verifyLabel: {
    fontSize: 14,
    color: "#14171a",
    fontWeight: "600",
    marginBottom: 8,
  },
  verifyInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    fontWeight: "bold",
    color: "#14171a",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // 確認ボタン
  verifyBtn: {
    backgroundColor: "#1d9bf0",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: { color: "#8e8e93", fontSize: 16 },
});
