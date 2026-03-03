// 検索画面 - ユーザー検索 + 投稿検索 + トレンドハッシュタグ
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import PostCard from "../../components/PostCard";
import { searchPosts, searchUsers, toggleLike, toggleReaction, getTrendingHashtags } from "../../lib/api";

type Tab = "posts" | "users";

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [trendTags, setTrendTags] = useState<{ tag: string; count: number }[]>([]);

  // トレンドハッシュタグを取得
  useEffect(() => {
    getTrendingHashtags(10).then(setTrendTags).catch(() => {});
  }, []);

  // URLパラメータ q でのハッシュタグ検索
  useEffect(() => {
    if (q && q !== query) {
      handleSearch(q);
    }
  }, [q]);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setIsSearching(false);
      setResults([]);
      setUserResults([]);
      return;
    }
    setIsSearching(true);
    setSearching(true);
    try {
      const [postData, userData] = await Promise.all([
        searchPosts(text.trim()),
        searchUsers(text.trim()),
      ]);
      setResults(postData.map(toPost));
      setUserResults(userData);
    } catch (e) {
      console.error("検索エラー:", e);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleLike = async (postId: string) => {
    setResults((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
    try { await toggleLike(postId); } catch {}
  };

  const handleReport = (postId: string) => {
    setResults((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDelete = (postId: string) => {
    setResults((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleReaction = async (postId: string, emoji: string) => {
    setResults((prev) =>
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
    try { await toggleReaction(postId, emoji); } catch {}
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const initials = (item.display_name || "?").slice(0, 1).toUpperCase();
    return (
      <View style={styles.userItem}>
        <View style={styles.userAvatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.userAvatarImg} />
          ) : (
            <Text style={styles.userAvatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userDisplayName}>{item.display_name}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
          {item.bio ? <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#8e8e93" />
        <TextInput
          style={styles.searchInput}
          placeholder="検索"
          placeholderTextColor="#8e8e93"
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color="#8e8e93" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isSearching ? (
        <>
          {/* タブ切り替え */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === "posts" && styles.tabActive]}
              onPress={() => setTab("posts")}
            >
              <Text style={[styles.tabText, tab === "posts" && styles.tabTextActive]}>投稿</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "users" && styles.tabActive]}
              onPress={() => setTab("users")}
            >
              <Text style={[styles.tabText, tab === "users" && styles.tabTextActive]}>
                ユーザー {userResults.length > 0 ? `(${userResults.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {searching ? (
            <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
          ) : tab === "posts" ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  onLike={handleLike}
                  onReply={() => {}}
                  onRepost={() => {}}
                  onReaction={handleReaction}
                  onAvatarPress={(userId) => router.push(`/user/${userId}`)}
                  onReport={handleReport}
                  onDelete={handleDelete}
                />
              )}
              ListEmptyComponent={<Text style={styles.empty}>投稿が見つかりません</Text>}
            />
          ) : (
            <FlatList
              data={userResults}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              ListEmptyComponent={<Text style={styles.empty}>ユーザーが見つかりません</Text>}
            />
          )}
        </>
      ) : (
        <View>
          <Text style={styles.sectionTitle}>トレンド</Text>
          {trendTags.length > 0 ? (
            trendTags.map((item, i) => (
              <TouchableOpacity
                key={i} style={styles.trendItem}
                onPress={() => handleSearch(item.tag)}
              >
                <View>
                  <Text style={styles.trendCategory}>{item.count}件の投稿</Text>
                  <Text style={styles.trendTag}>{item.tag}</Text>
                </View>
                <Ionicons name="trending-up" size={18} color="#1d9bf0" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.trendEmpty}>ハッシュタグ付きの投稿が増えるとトレンドが表示されます</Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function toPost(raw: any) {
  return {
    id: raw.id, userId: raw.user_id,
    user: {
      id: raw.user?.id || "", username: raw.user?.username || "",
      displayName: raw.user?.display_name || "", avatar: raw.user?.avatar_url || "",
      bio: raw.user?.bio || "", followersCount: raw.user?.followers_count || 0,
      followingCount: raw.user?.following_count || 0, createdAt: raw.user?.created_at || "",
    },
    content: raw.content, likesCount: raw.likes_count,
    repliesCount: raw.replies_count, repostsCount: raw.reposts_count,
    imageUrl: raw.image_url || "", images: raw.images || [],
    fileUrl: raw.file_url || "",
    fileName: raw.file_name || "",
    locationLat: raw.location_lat, locationLng: raw.location_lng,
    locationName: raw.location_name || "",
    isLiked: raw.isLiked || false, isReposted: raw.isReposted || false,
    isBookmarked: raw.isBookmarked || false,
    reactions: raw.reactions || [],
    createdAt: raw.created_at,
    quotePost: raw.quotePost || undefined,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5",
    borderRadius: 20, marginHorizontal: 16, marginVertical: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#14171a", fontSize: 15, marginLeft: 8 },
  // タブ
  tabs: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1, alignItems: "center", paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2, borderBottomColor: "#1d9bf0",
  },
  tabText: { color: "#8e8e93", fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: "#14171a" },
  // ユーザーカード
  userItem: {
    flexDirection: "row", padding: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#1d9bf0",
    justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden",
  },
  userAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  userAvatarText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  userInfo: { flex: 1, justifyContent: "center" },
  userDisplayName: { color: "#14171a", fontSize: 16, fontWeight: "bold" },
  userUsername: { color: "#8e8e93", fontSize: 14, marginTop: 1 },
  userBio: { color: "#8e8e93", fontSize: 13, marginTop: 4 },
  // その他
  sectionTitle: {
    color: "#14171a", fontSize: 20, fontWeight: "bold",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  trendItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  trendCategory: { color: "#8e8e93", fontSize: 13 },
  trendTag: { color: "#14171a", fontSize: 15, fontWeight: "bold", marginVertical: 2 },
  empty: { color: "#8e8e93", textAlign: "center", marginTop: 40, fontSize: 15 },
  trendEmpty: { color: "#8e8e93", fontSize: 14, paddingHorizontal: 16, paddingVertical: 20, textAlign: "center" },
});
