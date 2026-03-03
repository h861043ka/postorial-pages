// フォローリスト画面（フォロワー / フォロー中 切り替え）
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { getFollowers, getFollowing } from "../lib/api";

type Tab = "followers" | "following";

export default function FollowListScreen() {
  const { userId, tab } = useLocalSearchParams<{ userId: string; tab: string }>();
  const [activeTab, setActiveTab] = useState<Tab>((tab as Tab) || "followers");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = activeTab === "followers"
        ? await getFollowers(userId)
        : await getFollowing(userId);
      setUsers(data);
    } catch (e) {
      console.error("フォローリスト取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => router.push(`/user/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>
            {(item.display_name || item.username || "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.displayName} numberOfLines={1}>
          {item.display_name || item.username}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={[styles.tabText, activeTab === "followers" && styles.activeTabText]}>
            フォロワー
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.activeTabText]}>
            フォロー中
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {activeTab === "followers" ? "フォロワーはいません" : "フォロー中のユーザーはいません"}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#1d9bf0",
  },
  tabText: {
    color: "#8e8e93",
    fontSize: 15,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#14171a",
  },
  userItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0e0e0",
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1d9bf0",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: "#14171a",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  username: {
    color: "#8e8e93",
    fontSize: 14,
  },
  empty: {
    color: "#8e8e93",
    textAlign: "center",
    marginTop: 60,
    fontSize: 15,
  },
});
