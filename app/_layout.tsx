// ルートレイアウト（Stack + 認証リダイレクト + 強制アップデートチェック）
import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { getMinVersion } from "../lib/api";
import ForceUpdateScreen from "../components/ForceUpdateScreen";

const hdrStyle = { backgroundColor: "#fff" };
const hdrTint = "#000";

// 現在のアプリバージョン（app.jsonから取得）
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

// セマンティックバージョン比較: v1 < v2 なら -1, v1 > v2 なら 1, 等しければ 0
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 強制アップデート用の状態
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [minVersion, setMinVersion] = useState("1.0.0");
  const [versionCheckDone, setVersionCheckDone] = useState(false);

  // アプリ起動時にバージョンチェック
  useEffect(() => {
    async function checkVersion() {
      try {
        const min = await getMinVersion();
        setMinVersion(min);
        // 現在のバージョンが最低バージョンより古い場合はアップデートが必要
        if (compareVersions(APP_VERSION, min) < 0) {
          setNeedsUpdate(true);
        }
      } catch (e) {
        // バージョン取得に失敗した場合はスキップ（アプリを使えなくしない）
        console.warn("バージョンチェックに失敗しました:", e);
      } finally {
        setVersionCheckDone(true);
      }
    }

    // 10秒のタイムアウト（速度優先）
    const timeout = setTimeout(() => {
      console.warn("バージョンチェックがタイムアウトしました（10秒）");
      setVersionCheckDone(true);
    }, 10000);

    checkVersion().finally(() => clearTimeout(timeout));
  }, []);

  // 認証リダイレクト
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const isPublicPage = segments[0] === "terms" || segments[0] === "privacy-policy" || segments[0] === "reset-password";
    if (!user && !inAuthGroup && !isPublicPage) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  // ローディング中（認証チェック or バージョンチェック）
  if (isLoading || !versionCheckDone) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1d9bf0" />
      </View>
    );
  }

  // 強制アップデートが必要な場合
  if (needsUpdate) {
    return <ForceUpdateScreen currentVersion={APP_VERSION} minVersion={minVersion} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" }, headerBackTitle: "戻る" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="admin" options={{ headerShown: true, headerTitle: "管理パネル", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: true, headerTitle: "投稿", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="settings" options={{ headerShown: true, headerTitle: "設定", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: true, headerTitle: "プロフィール編集", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false, presentation: "modal" }} />
        <Stack.Screen name="reply/[id]" options={{ headerShown: true, headerTitle: "返信", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false, presentation: "modal" }} />
        <Stack.Screen name="change-password" options={{ headerShown: true, headerTitle: "パスワード変更", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="change-email" options={{ headerShown: true, headerTitle: "メールアドレス変更", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, headerTitle: "パスワードリセット", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: true, headerTitle: "プライバシーポリシー", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="terms" options={{ headerShown: true, headerTitle: "利用規約", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: true, headerTitle: "プロフィール", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="messages" options={{ headerShown: true, headerTitle: "メッセージ", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="bookmarks" options={{ headerShown: true, headerTitle: "ブックマーク", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, headerTitle: "チャット", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="follow-list" options={{ headerShown: true, headerTitle: "フォロー", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false }} />
        <Stack.Screen name="quote/[id]" options={{ headerShown: true, headerTitle: "引用リポスト", headerStyle: hdrStyle, headerTintColor: hdrTint, headerShadowVisible: false, presentation: "modal" }} />
        <Stack.Screen name="two-factor-auth" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});
