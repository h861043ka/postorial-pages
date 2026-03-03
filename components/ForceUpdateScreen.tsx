// 強制アップデート画面 - バージョンが古い場合にフルスクリーンで表示
import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  currentVersion: string;
  minVersion: string;
}

// ストアURLを開く（iOS: App Store, Android: Play Store, Web: リロード）
function handleUpdate() {
  if (Platform.OS === "web") {
    // Webの場合はページをリロード
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return;
  }

  // 申請後にApple App IDを設定してください（例: id1234567890）
  const storeUrl = Platform.select({
    ios: "https://apps.apple.com/app/postorial/id000000000",
    android: "https://play.google.com/store/apps/details?id=com.postorial.app",
  });

  if (storeUrl) {
    Linking.openURL(storeUrl);
  }
}

export default function ForceUpdateScreen({ currentVersion, minVersion }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* アイコン */}
        <Ionicons name="cloud-download-outline" size={80} color="#1d9bf0" />

        {/* タイトル */}
        <Text style={styles.title}>アップデートが必要です</Text>

        {/* 説明文 */}
        <Text style={styles.description}>
          {"新しいバージョンが利用可能です。\nアプリを最新版にアップデートしてください。"}
        </Text>

        {/* バージョン情報 */}
        <Text style={styles.versionInfo}>
          現在: v{currentVersion} → 必要: v{minVersion}
        </Text>

        {/* アップデートボタン */}
        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>アップデートする</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#14171a",
    marginTop: 24,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#657786",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  versionInfo: {
    fontSize: 13,
    color: "#8e8e93",
    marginTop: 16,
  },
  button: {
    backgroundColor: "#1d9bf0",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 32,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
