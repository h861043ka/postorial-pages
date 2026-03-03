// ホーム（タイムライン）画面 - タブ切り替え対応版
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PostCard from "../../components/PostCard";
import { fetchTimeline, fetchFollowingTimeline, toggleLike, toggleRepost, toggleReaction, addBookmark, removeBookmark } from "../../lib/api";

type TabType = "all" | "following";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    try {
      const data = activeTab === "all" ? await fetchTimeline() : await fetchFollowingTimeline();
      setPosts(data.map(toPost));
    } catch (e) {
      console.error("タイムライン取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadPosts();
  }, [loadPosts]);

  const onRefresh = useCallback(async () => {
    if (Platform.OS === "web") {
      // Web版: ページをリロードして確実にリフレッシュ
      window.location.reload();
      return;
    }
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);

  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
    try { await toggleLike(postId); } catch { await loadPosts(); }
  };

  const handleRepost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isReposted: !p.isReposted, repostsCount: p.isReposted ? p.repostsCount - 1 : p.repostsCount + 1 }
          : p
      )
    );
    try { await toggleRepost(postId); } catch { await loadPosts(); }
  };

  const handleReport = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleReply = useCallback((id: string) => router.push(`/reply/${id}`), []);
  const handlePress = useCallback((id: string) => router.push(`/post/${id}`), []);
  const handleAvatarPress = useCallback((userId: string) => router.push(`/user/${userId}`), []);

  const handleReaction = async (postId: string, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const existing = p.reactions?.find((r: any) => r.emoji === emoji);
        let newReactions;
        if (existing?.isReacted) {
          newReactions = p.reactions.map((r: any) =>
            r.emoji === emoji ? { ...r, count: r.count - 1, isReacted: false } : r
          ).filter((r: any) => r.count > 0);
        } else if (existing) {
          newReactions = p.reactions.map((r: any) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, isReacted: true } : r
          );
        } else {
          newReactions = [...(p.reactions || []), { emoji, count: 1, isReacted: true }];
        }
        return { ...p, reactions: newReactions };
      })
    );
    try { await toggleReaction(postId, emoji); } catch { await loadPosts(); }
  };

  const handleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
    try {
      const post = posts.find((p) => p.id === postId);
      if (post?.isBookmarked) {
        await removeBookmark(postId);
      } else {
        await addBookmark(postId);
      }
    } catch {
      await loadPosts();
    }
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
        <Text style={styles.headerTitle}>ホーム</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/messages")} style={{ marginRight: 16 }}>
            <Ionicons name="mail-outline" size={22} color="#14171a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="sparkles-outline" size={22} color="#14171a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* タブバー */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.tabActive]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
            おすすめ
          </Text>
          {activeTab === "all" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.tabActive]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.tabTextActive]}>
            フォロー中
          </Text>
          {activeTab === "following" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item, index) => item.repostUser ? `repost_${item.repostUser.id}_${item.id}_${index}` : item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onReply={handleReply}
            onRepost={handleRepost}
            onReaction={handleReaction}
            onPress={handlePress}
            onAvatarPress={handleAvatarPress}
            onReport={handleReport}
            onDelete={handleDelete}
            onBookmark={handleBookmark}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d9bf0" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {activeTab === "all"
              ? "まだ投稿がありません。最初の投稿をしてみましょう！"
              : "フォロー中のユーザーの投稿がありません。\nユーザーをフォローしてみましょう！"}
          </Text>
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
      />
    </SafeAreaView>
  );
}

// Supabaseレスポンスを内部Post型に変換
function toPost(raw: any) {
  return {
    id: raw.id,
    userId: raw.user_id,
    user: {
      id: raw.user?.id || "",
      username: raw.user?.username || "",
      displayName: raw.user?.display_name || "",
      avatar: raw.user?.avatar_url || "",
      bio: raw.user?.bio || "",
      followersCount: raw.user?.followers_count || 0,
      followingCount: raw.user?.following_count || 0,
      createdAt: raw.user?.created_at || "",
    },
    content: raw.content,
    imageUrl: raw.image_url || "",
    images: raw.images || [],
    fileUrl: raw.file_url || "",
    fileName: raw.file_name || "",
    locationLat: raw.location_lat,
    locationLng: raw.location_lng,
    locationName: raw.location_name || "",
    likesCount: raw.likes_count,
    repliesCount: raw.replies_count,
    repostsCount: raw.reposts_count,
    isLiked: raw.isLiked || false,
    isReposted: raw.isReposted || false,
    isBookmarked: raw.isBookmarked || false,
    reactions: raw.reactions || [],
    createdAt: raw.created_at,
    repostUser: raw.repostUser || undefined,
    repostedAt: raw.repostedAt || undefined,
    quotePost: raw.quotePost || undefined,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  headerTitle: { color: "#14171a", fontSize: 20, fontWeight: "bold" },
  headerIcons: { flexDirection: "row", alignItems: "center" },

  // タブバー
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#8e8e93",
  },
  tabTextActive: {
    color: "#14171a",
    fontWeight: "bold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "100%",
    backgroundColor: "#1d9bf0",
    borderRadius: 1.5,
  },

  empty: { color: "#8e8e93", textAlign: "center", marginTop: 60, fontSize: 15 },
});
