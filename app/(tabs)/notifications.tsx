// 通知画面 - タップで投稿に遷移
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchNotifications, markNotificationsRead } from "../../lib/api";

type NotifType = "like" | "follow" | "reply" | "repost" | "message";

function getNotificationIcon(type: NotifType) {
  switch (type) {
    case "like": return { name: "heart" as const, color: "#f91880" };
    case "follow": return { name: "person-add" as const, color: "#1d9bf0" };
    case "reply": return { name: "chatbubble" as const, color: "#1d9bf0" };
    case "repost": return { name: "repeat" as const, color: "#00ba7c" };
    case "message": return { name: "mail" as const, color: "#1d9bf0" };
  }
}

function getNotificationText(type: NotifType) {
  switch (type) {
    case "like": return "があなたの投稿にいいねしました";
    case "follow": return "があなたをフォローしました";
    case "reply": return "があなたの投稿に返信しました";
    case "repost": return "があなたの投稿をリポストしました";
    case "message": return "からメッセージが届きました";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      await markNotificationsRead();
    } catch (e) {
      console.error("通知取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = (item: any) => {
    if (item.type === "message" && item.conversation_id) {
      router.push(`/chat/${item.conversation_id}`);
    } else if (item.type === "follow" && item.from_user_id) {
      router.push(`/user/${item.from_user_id}`);
    } else if (item.post_id) {
      router.push(`/post/${item.post_id}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = getNotificationIcon(item.type);
    const text = getNotificationText(item.type);
    const displayName = item.from_user?.display_name || "ユーザー";
    const initials = displayName.slice(0, 1).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.unread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon.name} size={24} color={icon.color} style={styles.icon} />
        <View style={styles.itemContent}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.notifText}>
              <Text style={styles.bold}>{displayName}</Text>{text}
            </Text>
            <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
          </View>
          {(item.post_id || item.conversation_id || item.type === "follow") ? (
            <Ionicons name="chevron-forward" size={16} color="#8e8e93" style={{ marginLeft: 4 }} />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>通知</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d9bf0" />
        }
        ListEmptyComponent={<Text style={styles.empty}>通知はまだありません</Text>}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  headerTitle: { color: "#14171a", fontSize: 20, fontWeight: "bold" },
  item: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  unread: { backgroundColor: "#f0f8ff" },
  icon: { marginRight: 12, marginTop: 4 },
  itemContent: { flexDirection: "row", flex: 1, alignItems: "flex-start" },
  avatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1d9bf0", justifyContent: "center",
    alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  textContainer: { flex: 1 },
  notifText: { color: "#14171a", fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: "bold" },
  time: { color: "#8e8e93", fontSize: 13, marginTop: 4 },
  empty: { color: "#8e8e93", textAlign: "center", marginTop: 60, fontSize: 15 },
});
