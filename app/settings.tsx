// 設定画面 - 全機能実装版
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import { deleteAccount, getMinVersion, updateMinVersion } from "../lib/api";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [email, setEmail] = useState("");
  const [currentMinVersion, setCurrentMinVersion] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u?.email) setEmail(u.email);
    });
    // 管理者用: 現在の最低バージョンを取得
    getMinVersion().then(setCurrentMinVersion).catch(() => {});
  }, []);

  // 最低バージョン設定（管理者用）
  const handleSetMinVersion = () => {
    if (Platform.OS === "ios") {
      // iOSはAlert.promptが使える
      Alert.prompt(
        "最低バージョン設定",
        `現在の最低バージョン: ${currentMinVersion}\n\n新しい最低バージョンを入力してください（例: 1.2.0）`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "更新",
            onPress: async (value?: string) => {
              if (!value || !/^\d+\.\d+\.\d+$/.test(value.trim())) {
                Alert.alert("エラー", "バージョンはX.Y.Z形式で入力してください");
                return;
              }
              try {
                await updateMinVersion(value.trim());
                setCurrentMinVersion(value.trim());
                Alert.alert("完了", `最低バージョンを ${value.trim()} に更新しました`);
              } catch (e: any) {
                Alert.alert("エラー", e.message || "更新に失敗しました");
              }
            },
          },
        ],
        "plain-text",
        currentMinVersion
      );
    } else {
      // Android/WebではwindowのpromptまたはAlert
      const value = typeof window !== "undefined"
        ? window.prompt(`最低バージョン設定\n現在: ${currentMinVersion}\n\n新しいバージョンを入力（例: 1.2.0）`, currentMinVersion)
        : null;
      if (value === null) return;
      if (!/^\d+\.\d+\.\d+$/.test(value.trim())) {
        Alert.alert("エラー", "バージョンはX.Y.Z形式で入力してください");
        return;
      }
      updateMinVersion(value.trim())
        .then(() => {
          setCurrentMinVersion(value.trim());
          Alert.alert("完了", `最低バージョンを ${value.trim()} に更新しました`);
        })
        .catch((e: any) => {
          Alert.alert("エラー", e.message || "更新に失敗しました");
        });
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("ログアウトしますか？")) {
        await signOut();
        router.replace("/(auth)/login");
      }
    } else {
      Alert.alert("ログアウト", "ログアウトしますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ログアウト",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/login");
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = async () => {
    if (Platform.OS === "web") {
      if (!window.confirm("本当にアカウントを削除しますか？\n\n全ての投稿、いいね、フォロー情報、DM、通報、ブロック情報が完全に削除されます。この操作は取り消せません。")) return;
      if (!window.confirm("最終確認：本当に削除してよろしいですか？")) return;
      try {
        await deleteAccount();
        router.replace("/(auth)/login");
      } catch (e: any) {
        window.alert(e.message || "削除に失敗しました");
      }
    } else {
      Alert.alert(
        "アカウント削除",
        "本当にアカウントを削除しますか？\n\n全ての投稿、いいね、フォロー情報、DM、通報、ブロック情報が完全に削除されます。この操作は取り消せません。",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除する",
            style: "destructive",
            onPress: () => {
              Alert.alert("最終確認", "本当に削除してよろしいですか？", [
                { text: "やめる", style: "cancel" },
                {
                  text: "完全に削除",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/(auth)/login");
                    } catch (e: any) {
                      Alert.alert("エラー", e.message || "削除に失敗しました");
                    }
                  },
                },
              ]);
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* アカウント */}
      <Text style={styles.sectionTitle}>アカウント</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/edit-profile")}>
        <View style={styles.menuLeft}>
          <Ionicons name="person-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>プロフィール編集</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/change-password")}>
        <View style={styles.menuLeft}>
          <Ionicons name="lock-closed-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>パスワード変更</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/change-email")}>
        <View style={styles.menuLeft}>
          <Ionicons name="mail-outline" size={22} color="#14171a" />
          <View>
            <Text style={styles.menuText}>メールアドレス変更</Text>
            <Text style={styles.menuSub}>{email}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/two-factor-auth")}>
        <View style={styles.menuLeft}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#14171a" />
          <View>
            <Text style={styles.menuText}>2段階認証（2FA）</Text>
            <Text style={styles.menuSub}>アカウントのセキュリティを強化</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      {/* アプリ設定 */}
      <Text style={styles.sectionTitle}>アプリ設定</Text>

      <View style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="notifications-outline" size={22} color="#14171a" />
          <View>
            <Text style={styles.menuText}>通知</Text>
            <Text style={styles.menuSub}>
              {settings.notificationsEnabled ? "通知を受け取る" : "通知OFF"}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.notificationsEnabled}
          onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
          trackColor={{ false: "#e0e0e0", true: "#1d9bf0" }}
          thumbColor="#fff"
        />
      </View>

      {/* その他 */}
      <Text style={styles.sectionTitle}>その他</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/bookmarks")}>
        <View style={styles.menuLeft}>
          <Ionicons name="bookmark-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>ブックマーク</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/blocked-muted-users")}>
        <View style={styles.menuLeft}>
          <Ionicons name="ban-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>ブロック・ミュート</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/privacy-policy")}>
        <View style={styles.menuLeft}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>プライバシーポリシー</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/terms")}>
        <View style={styles.menuLeft}>
          <Ionicons name="document-text-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>利用規約</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      <View style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Ionicons name="information-circle-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>バージョン</Text>
        </View>
        <Text style={styles.versionText}>1.0.4</Text>
      </View>

      <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
        <View style={styles.menuLeft}>
          <Ionicons name="log-out-outline" size={22} color="#14171a" />
          <Text style={styles.menuText}>ログアウト</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
      </TouchableOpacity>

      {/* 管理者セクション（管理者のみ表示） */}
      {user?.isAdmin ? (
        <>
          <Text style={styles.sectionTitle}>管理者</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/admin")}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield" size={22} color="#f4212e" />
              <Text style={styles.menuText}>管理パネル</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleSetMinVersion}>
            <View style={styles.menuLeft}>
              <Ionicons name="cloud-download-outline" size={22} color="#f4212e" />
              <View>
                <Text style={styles.menuText}>最低バージョン設定</Text>
                <Text style={styles.menuSub}>
                  {currentMinVersion ? `現在: v${currentMinVersion}` : "読み込み中..."}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>
        </>
      ) : null}

      {/* 危険ゾーン */}
      <Text style={styles.sectionTitle}>危険な操作</Text>

      <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={22} color="#f4212e" />
        <View>
          <Text style={styles.dangerText}>アカウントを削除</Text>
          <Text style={styles.dangerSub}>全てのデータが完全に削除されます</Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionTitle: {
    color: "#8e8e93", fontSize: 13, fontWeight: "600",
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  menuText: { color: "#14171a", fontSize: 16 },
  menuSub: { color: "#8e8e93", fontSize: 13, marginTop: 2 },
  versionText: { color: "#8e8e93", fontSize: 14 },
  dangerItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  dangerText: { color: "#f4212e", fontSize: 16 },
  dangerSub: { color: "#8e8e93", fontSize: 12, marginTop: 2 },
});
