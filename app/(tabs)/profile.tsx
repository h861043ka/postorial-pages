// プロフィール画面 - 設定・返信・リアクション対応
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import PostCard from "../../components/PostCard";
import ImageViewer from "../../components/ImageViewer";
import { getUserPosts, getUserReposts, getProfile, toggleLike, toggleRepost, toggleReaction, deletePost, getPost } from "../../lib/api";

export default function ProfileScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "reposts" | "likes">("posts");
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myReposts, setMyReposts] = useState<any[]>([]);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState("");
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [pinnedPost, setPinnedPost] = useState<any | null>(null);

  const initials = profile?.displayName?.slice(0, 1).toUpperCase() || "?";

  const openImageViewer = (uri: string) => {
    setViewerImageUri(uri);
    setShowViewer(true);
  };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [profileData, postsData, repostsData] = await Promise.all([
        getProfile(user.id), getUserPosts(user.id), getUserReposts(user.id),
      ]);
      if (profileData) {
        setProfile({
          ...user,
          displayName: profileData.display_name,
          username: profileData.username,
          bio: profileData.bio,
          avatar: profileData.avatar_url || "",
          cover: profileData.cover_url || "",
          followersCount: profileData.followers_count,
          followingCount: profileData.following_count,
          pinnedPostId: profileData.pinned_post_id || null,
        });
        const pid = profileData.pinned_post_id || null;
        setPinnedPostId(pid);
        if (pid) {
          try {
            const pinnedData = await getPost(pid);
            setPinnedPost(toPost(pinnedData));
          } catch {
            setPinnedPost(null);
          }
        } else {
          setPinnedPost(null);
        }
      }
      setMyPosts(postsData.map(toPost));
      setMyReposts(repostsData.map(toPost));
    } catch (e) {
      console.error("プロフィール取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleLike = async (postId: string) => {
    setMyPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p
    ));
    try { await toggleLike(postId); } catch { await load(); }
  };

  const handleRepost = async (postId: string) => {
    setMyPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, isReposted: !p.isReposted, repostsCount: p.isReposted ? p.repostsCount - 1 : p.repostsCount + 1 } : p
    ));
    try { await toggleRepost(postId); } catch { await load(); }
  };

  const handleReport = (postId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    setMyReposts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDelete = async (postId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    setMyReposts((prev) => prev.filter((p) => p.id !== postId));
    if (pinnedPostId === postId) {
      setPinnedPostId(null);
      setPinnedPost(null);
    }
  };

  const handlePin = () => {
    load();
  };

  const handleReaction = async (postId: string, emoji: string) => {
    setMyPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const existing = p.reactions?.find((r: any) => r.emoji === emoji);
      let newReactions;
      if (existing?.isReacted) {
        newReactions = p.reactions.map((r: any) => r.emoji === emoji ? { ...r, count: r.count - 1, isReacted: false } : r).filter((r: any) => r.count > 0);
      } else if (existing) {
        newReactions = p.reactions.map((r: any) => r.emoji === emoji ? { ...r, count: r.count + 1, isReacted: true } : r);
      } else {
        newReactions = [...(p.reactions || []), { emoji, count: 1, isReacted: true }];
      }
      return { ...p, reactions: newReactions };
    }));
    try { await toggleReaction(postId, emoji); } catch { await load(); }
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d9bf0" />}
      >
        {/* バナー */}
        {profile?.cover ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(profile.cover!)}>
            <Image source={{ uri: profile.cover }} style={styles.banner} />
          </TouchableOpacity>
        ) : (
          <View style={styles.banner} />
        )}

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            {profile?.avatar ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(profile.avatar!)}>
                <View style={styles.avatar}>
                  <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/edit-profile")}>
                <Text style={styles.editBtnText}>プロフィール編集</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/settings")}>
                <Ionicons name="settings-outline" size={20} color="#14171a" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.displayName}>{profile?.displayName}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.stats}>
            <TouchableOpacity style={styles.stat} onPress={() => user && router.push(`/follow-list?userId=${user.id}&tab=following`)}>
              <Text style={styles.statNum}>{profile?.followingCount || 0}</Text>
              <Text style={styles.statLabel}> フォロー中</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={() => user && router.push(`/follow-list?userId=${user.id}&tab=followers`)}>
              <Text style={styles.statNum}>{profile?.followersCount || 0}</Text>
              <Text style={styles.statLabel}> フォロワー</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.activeTab]}
            onPress={() => setActiveTab("posts")}
          >
            <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>投稿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "reposts" && styles.activeTab]}
            onPress={() => setActiveTab("reposts")}
          >
            <Text style={[styles.tabText, activeTab === "reposts" && styles.activeTabText]}>リポスト</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "likes" && styles.activeTab]}
            onPress={() => setActiveTab("likes")}
          >
            <Text style={[styles.tabText, activeTab === "likes" && styles.activeTabText]}>いいね</Text>
          </TouchableOpacity>
        </View>

        {/* 固定投稿 */}
        {pinnedPost && activeTab === "posts" ? (
          <View>
            <View style={styles.pinnedHeader}>
              <Ionicons name="pin" size={14} color="#8e8e93" />
              <Text style={styles.pinnedText}>固定された投稿</Text>
            </View>
            <PostCard
              post={pinnedPost}
              onLike={handleLike}
              onReply={(id) => router.push(`/reply/${id}`)}
              onRepost={handleRepost}
              onReaction={handleReaction}
              onPress={(id) => router.push(`/post/${id}`)}
              onAvatarPress={(userId) => router.push(`/user/${userId}`)}
              onReport={handleReport}
              onDelete={handleDelete}
              onPin={handlePin}
              isPinned={true}
            />
          </View>
        ) : null}

        {(() => {
          const displayPosts = activeTab === "reposts" ? myReposts : myPosts;
          const emptyText = activeTab === "posts" ? "まだ投稿がありません" : activeTab === "reposts" ? "まだリポストがありません" : "まだいいねがありません";
          return displayPosts.length === 0 ? (
            <Text style={styles.empty}>{emptyText}</Text>
          ) : (
            displayPosts.map((p, i) => (
              <PostCard
                key={`${activeTab}_${p.id}_${i}`} post={p}
                onLike={handleLike}
                onReply={(id) => router.push(`/reply/${id}`)}
                onRepost={handleRepost}
                onReaction={handleReaction}
                onPress={(id) => router.push(`/post/${id}`)}
                onAvatarPress={(userId) => router.push(`/user/${userId}`)}
                onReport={handleReport}
                onDelete={handleDelete}
                onPin={handlePin}
                isPinned={pinnedPostId === p.id}
              />
            ))
          );
        })()}
      </ScrollView>

      {/* 画像ビューアー */}
      <ImageViewer
        visible={showViewer}
        imageUri={viewerImageUri}
        onClose={() => setShowViewer(false)}
      />
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
    repostUser: raw.repostUser || undefined,
    repostedAt: raw.repostedAt || undefined,
    quotePost: raw.quotePost || undefined,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  banner: { height: 120, backgroundColor: "#1d9bf0" },
  profileSection: {
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  avatarRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", marginTop: -30, marginBottom: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#1d9bf0", justifyContent: "center",
    alignItems: "center", borderWidth: 3, borderColor: "#fff", overflow: "hidden",
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  headerBtns: { flexDirection: "row", gap: 8 },
  editBtn: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  editBtnText: { color: "#14171a", fontWeight: "bold", fontSize: 14 },
  settingsBtn: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 20,
    width: 36, height: 36, justifyContent: "center", alignItems: "center",
  },
  displayName: { color: "#14171a", fontSize: 20, fontWeight: "bold" },
  username: { color: "#8e8e93", fontSize: 15, marginBottom: 8 },
  bio: { color: "#14171a", fontSize: 15, lineHeight: 21, marginBottom: 12 },
  stats: { flexDirection: "row", gap: 16, marginBottom: 4 },
  stat: { flexDirection: "row" },
  statNum: { color: "#14171a", fontWeight: "bold", fontSize: 14 },
  statLabel: { color: "#8e8e93", fontSize: 14 },
  tabs: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#1d9bf0" },
  tabText: { color: "#8e8e93", fontWeight: "600", fontSize: 15 },
  activeTabText: { color: "#14171a" },
  empty: { color: "#8e8e93", textAlign: "center", marginTop: 40, fontSize: 15 },
  pinnedHeader: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 56, paddingTop: 8, paddingBottom: 4,
  },
  pinnedText: { color: "#8e8e93", fontSize: 13, fontWeight: "600" },
});
