// ブロック・ミュートユーザー一覧画面
import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getBlockedUsers, getMutedUsers, unblockUser, unmuteUser } from "../lib/api";

type TabType = "blocked" | "muted";

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  blockedAt?: string;
  mutedAt?: string;
}

export default function BlockedMutedUsersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("blocked");
  const [blockedUsers, setBlockedUsers] = useState<UserItem[]>([]);
  const [mutedUsers, setMutedUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [blocked, muted] = await Promise.all([
        getBlockedUsers(),
        getMutedUsers(),
      ]);
      setBlockedUsers(blocked);
      setMutedUsers(muted);
    } catch (e) {
      console.error("ユーザー一覧取得エラー:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUnblock = async (userId: string) => {
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert("完了", "ブロックを解除しました");
    } catch (e: any) {
      Alert.alert("エラー", e.message || "ブロック解除に失敗しました");
    }
  };

  const handleUnmute = async (userId: string) => {
    try {
      await unmuteUser(userId);
      setMutedUsers((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert("完了", "ミュートを解除しました");
    } catch (e: any) {
      Alert.alert("エラー", e.message || "ミュート解除に失敗しました");
    }
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isBlocked = activeTab === "blocked";
    const initials = item.displayName.slice(0, 1).toUpperCase();

    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/user/${item.id}`)}
          activeOpacity={0.7}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>{item.displayName}</Text>
            <Text style={styles.username}>@{item.username}</Text>
            {item.bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, isBlocked ? styles.unblockBtn : styles.unmuteBtn]}
          onPress={() => isBlocked ? handleUnblock(item.id) : handleUnmute(item.id)}
        >
          <Text style={styles.actionBtnText}>
            {isBlocked ? "ブロック解除" : "ミュート解除"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const currentData = activeTab === "blocked" ? blockedUsers : mutedUsers;

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#14171a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ブロック・ミュート</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "blocked" && styles.tabActive]}
          onPress={() => setActiveTab("blocked")}
        >
          <Text style={[styles.tabText, activeTab === "blocked" && styles.tabTextActive]}>
            ブロック
          </Text>
          {blockedUsers.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{blockedUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "muted" && styles.tabActive]}
          onPress={() => setActiveTab("muted")}
        >
          <Text style={[styles.tabText, activeTab === "muted" && styles.tabTextActive]}>
            ミュート
          </Text>
          {mutedUsers.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{mutedUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ユーザーリスト */}
      {loading ? (
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={activeTab === "blocked" ? "ban-outline" : "volume-mute-outline"}
                size={48}
                color="#c0c0c0"
              />
              <Text style={styles.emptyText}>
                {activeTab === "blocked"
                  ? "ブロックしているユーザーはいません"
                  : "ミュートしているユーザーはいません"}
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#1d9bf0",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8e8e93",
  },
  tabTextActive: {
    color: "#14171a",
  },
  badge: {
    backgroundColor: "#1d9bf0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1d9bf0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#14171a",
  },
  username: {
    fontSize: 14,
    color: "#8e8e93",
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: "#14171a",
    lineHeight: 18,
  },
  actionBtn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  unblockBtn: {
    backgroundColor: "#f4212e",
  },
  unmuteBtn: {
    backgroundColor: "#8e8e93",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: "#8e8e93",
    fontSize: 15,
    marginTop: 12,
  },
});
