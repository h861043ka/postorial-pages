// ブックマーク一覧画面
import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import PostCard from "../components/PostCard";
import { getBookmarkedPosts, toggleLike, toggleReaction, removeBookmark } from "../lib/api";

export default function BookmarksScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const data = await getBookmarkedPosts(50);
      setPosts(data);
    } catch (e) {
      console.error("ブックマーク取得エラー:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookmarks();
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
    try {
      await toggleLike(postId);
    } catch (e) {
      console.error("いいねエラー:", e);
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const existing = p.reactions?.find((r: any) => r.emoji === emoji);
        let newReactions;
        if (existing?.isReacted) {
          newReactions = p.reactions
            .map((r: any) => (r.emoji === emoji ? { ...r, count: r.count - 1, isReacted: false } : r))
            .filter((r: any) => r.count > 0);
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
    try {
      await toggleReaction(postId, emoji);
    } catch (e) {
      console.error("リアクションエラー:", e);
    }
  };

  const handleBookmark = async (postId: string) => {
    // ブックマーク削除
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await removeBookmark(postId);
    } catch (e) {
      console.error("ブックマーク削除エラー:", e);
      loadBookmarks(); // エラー時は再読み込み
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
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onReply={() => router.push(`/reply/${item.id}`)}
            onRepost={() => {}}
            onReaction={handleReaction}
            onAvatarPress={(userId) => router.push(`/user/${userId}`)}
            onReport={() => {}}
            onDelete={() => {}}
            onBookmark={handleBookmark}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>ブックマークした投稿はありません</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyText: { color: "#8e8e93", fontSize: 15 },
});
