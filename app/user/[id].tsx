// 他ユーザーのプロフィール画面（ライトモード）
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Image, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import PostCard from "../../components/PostCard";
import ImageViewer from "../../components/ImageViewer";
import {
  getProfile, getUserPosts, isFollowing, toggleFollow,
  getOrCreateConversation, toggleLike, toggleRepost, toggleReaction,
  isBlocked, toggleBlock, isMuted, muteUser, unmuteUser, adminDeleteUser,
} from "../../lib/api";

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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  // 画像ビューアーの状態
  const [showViewer, setShowViewer] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState("");

  // 自分のプロフィールの場合はリダイレクト
  useEffect(() => {
    if (user && id === user.id) {
      router.replace("/(tabs)/profile");
    }
  }, [user, id]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [profileData, postsData, followStatus, blockStatus, muteStatus] = await Promise.all([
        getProfile(id),
        getUserPosts(id),
        isFollowing(id),
        isBlocked(id),
        isMuted(id),
      ]);
      setProfile(profileData);
      setPosts(postsData.map(toPost));
      setFollowing(followStatus);
      setBlocked(blockStatus);
      setMuted(muteStatus);
    } catch (e) {
      console.error("プロフィール取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggleFollow = async () => {
    if (!id) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(id);
      setFollowing(result);
      // フォロワー数を更新
      setProfile((prev: any) => prev ? {
        ...prev,
        followers_count: result
          ? (prev.followers_count || 0) + 1
          : Math.max((prev.followers_count || 0) - 1, 0),
      } : prev);
    } catch (e) {
      console.error("フォロー切り替えエラー:", e);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!id) return;
    const action = blocked ? "ブロック解除" : "ブロック";
    Alert.alert(
      `${action}の確認`,
      blocked
        ? `${profile?.display_name || "このユーザー"}のブロックを解除しますか？`
        : `${profile?.display_name || "このユーザー"}をブロックしますか？\n\nブロックすると、このユーザーの投稿がタイムラインに表示されなくなります。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: action,
          style: blocked ? "default" : "destructive",
          onPress: async () => {
            setBlockLoading(true);
            try {
              const result = await toggleBlock(id);
              setBlocked(result);
            } catch (e) {
              console.error("ブロック切り替えエラー:", e);
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleMute = async () => {
    if (!id) return;
    setMuteLoading(true);
    try {
      if (muted) {
        await unmuteUser(id);
        setMuted(false);
      } else {
        await muteUser(id);
        setMuted(true);
      }
    } catch (e) {
      console.error("ミュート切り替えエラー:", e);
    } finally {
      setMuteLoading(false);
    }
  };

  const handleDM = async () => {
    if (!id) return;
    setDmLoading(true);
    try {
      const conversationId = await getOrCreateConversation(id);
      router.push(`/chat/${conversationId}`);
    } catch (e) {
      console.error("DM開始エラー:", e);
    } finally {
      setDmLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p
    ));
    try { await toggleLike(postId); } catch { await load(); }
  };

  const handleRepost = async (postId: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, isReposted: !p.isReposted, repostsCount: p.isReposted ? p.repostsCount - 1 : p.repostsCount + 1 } : p
    ));
    try { await toggleRepost(postId); } catch { await load(); }
  };

  const handleReport = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleReaction = async (postId: string, emoji: string) => {
    setPosts((prev) => prev.map((p) => {
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

  const handleAdminDeleteUser = () => {
    if (!id || !profile) return;
    Alert.alert(
      "アカウント削除（管理者）",
      `${profile.display_name || "このユーザー"}のアカウントと全投稿を削除しますか？\n\nこの操作は取り消せません。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する", style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteUser(id);
              Alert.alert("完了", "アカウントを削除しました");
              router.back();
            } catch (e: any) {
              Alert.alert("エラー", e.message || "削除に失敗しました");
            }
          },
        },
      ]
    );
  };

  const openImageViewer = (uri: string) => {
    setViewerImageUri(uri);
    setShowViewer(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>ユーザーが見つかりません</Text>
      </SafeAreaView>
    );
  }

  const initials = (profile.display_name || "?").slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d9bf0" />}
      >
        {/* バナー */}
        {profile.cover_url ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(profile.cover_url)}>
            <Image source={{ uri: profile.cover_url }} style={styles.banner} />
          </TouchableOpacity>
        ) : (
          <View style={styles.banner} />
        )}

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            {/* アバター */}
            {profile.avatar_url ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(profile.avatar_url)}>
                <View style={styles.avatar}>
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            {/* ブロック・DM・フォロー・管理者ボタン */}
            <View style={styles.headerBtns}>
              {user?.isAdmin ? (
                <TouchableOpacity
                  style={[styles.iconBtn, styles.iconBtnDanger]}
                  onPress={handleAdminDeleteUser}
                >
                  <Ionicons name="trash-outline" size={20} color="#f4212e" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.iconBtn, blocked && styles.iconBtnDanger]}
                onPress={handleToggleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? (
                  <ActivityIndicator size="small" color={blocked ? "#f4212e" : "#14171a"} />
                ) : (
                  <Ionicons
                    name={blocked ? "ban" : "ban-outline"}
                    size={20}
                    color={blocked ? "#f4212e" : "#14171a"}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, muted && { backgroundColor: "#8e8e93" }]}
                onPress={handleToggleMute}
                disabled={muteLoading}
              >
                {muteLoading ? (
                  <ActivityIndicator size="small" color={muted ? "#fff" : "#14171a"} />
                ) : (
                  <Ionicons
                    name={muted ? "volume-mute" : "volume-mute-outline"}
                    size={20}
                    color={muted ? "#fff" : "#14171a"}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleDM}
                disabled={dmLoading}
              >
                {dmLoading ? (
                  <ActivityIndicator size="small" color="#14171a" />
                ) : (
                  <Ionicons name="mail-outline" size={20} color="#14171a" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.followBtn, following && styles.followingBtn]}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={following ? "#14171a" : "#fff"} />
                ) : (
                  <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                    {following ? "フォロー中" : "フォロー"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.stats}>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statNum}>{profile.following_count || 0}</Text>
              <Text style={styles.statLabel}> フォロー中</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statNum}>{profile.followers_count || 0}</Text>
              <Text style={styles.statLabel}> フォロワー</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 投稿セクション */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>投稿</Text>
        </View>

        {posts.length === 0 ? (
          <Text style={styles.empty}>まだ投稿がありません</Text>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id} post={p}
              onLike={handleLike}
              onReply={(pid) => router.push(`/reply/${pid}`)}
              onRepost={handleRepost}
              onReaction={handleReaction}
              onPress={(pid) => router.push(`/post/${pid}`)}
              onAvatarPress={(userId) => router.push(`/user/${userId}`)}
              onReport={handleReport}
              onDelete={handleDelete}
            />
          ))
        )}
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
  iconBtn: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 20,
    width: 36, height: 36, justifyContent: "center", alignItems: "center",
  },
  iconBtnDanger: {
    borderColor: "#f4212e", backgroundColor: "rgba(244,33,46,0.08)",
  },
  followBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8,
    minWidth: 90, alignItems: "center",
  },
  followingBtn: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0",
  },
  followBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  followingBtnText: { color: "#14171a" },
  displayName: { color: "#14171a", fontSize: 20, fontWeight: "bold" },
  username: { color: "#8e8e93", fontSize: 15, marginBottom: 8 },
  bio: { color: "#14171a", fontSize: 15, lineHeight: 21, marginBottom: 12 },
  stats: { flexDirection: "row", gap: 16, marginBottom: 4 },
  stat: { flexDirection: "row" },
  statNum: { color: "#14171a", fontWeight: "bold", fontSize: 14 },
  statLabel: { color: "#8e8e93", fontSize: 14 },
  sectionHeader: {
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  sectionTitle: { color: "#14171a", fontSize: 18, fontWeight: "bold" },
  empty: { color: "#8e8e93", textAlign: "center", marginTop: 40, fontSize: 15 },
});
