// 投稿詳細画面（スレッド表示・返信一覧付き）
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Share, Linking, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPost, getReplies, getParentChain, toggleLike, toggleRepost, toggleReaction } from "../../lib/api";
import PostCard from "../../components/PostCard";
import ImageViewer from "../../components/ImageViewer";
import { Post, Reaction } from "../../types";

// APIレスポンスをPost型に変換する
function toPost(raw: any): Post {
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
    replyTo: raw.reply_to || undefined,
    quotePost: raw.quotePost ? raw.quotePost : undefined,
  };
}

// 日時フォーマット
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// アバターサイズ定数（スレッドラインの位置計算に使用）
const AVATAR_SIZE = 48;
const PARENT_AVATAR_SIZE = 36;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [parentChain, setParentChain] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageAspect, setImageAspect] = useState<number>(16 / 9);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [postData, repliesData] = await Promise.all([
        getPost(id), getReplies(id),
      ]);
      const currentPost = toPost(postData);
      setPost(currentPost);
      setReplies(repliesData.map(toPost));

      // 親チェーンを取得（reply_toがある場合のみ）
      if (currentPost.replyTo) {
        try {
          const chain = await getParentChain(id);
          // 親チェーンの最後の要素は自分自身なので除外
          const parents = chain.slice(0, -1).map(toPost);
          setParentChain(parents);
        } catch (e) {
          console.error("親チェーン取得エラー:", e);
          setParentChain([]);
        }
      } else {
        setParentChain([]);
      }
    } catch (e) {
      console.error("投稿取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // いいね切り替え
  const handleLike = async (postId: string) => {
    const update = (list: Post[]) =>
      list.map((p) => p.id === postId
        ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
        : p);
    if (post?.id === postId) {
      setPost((p) => p ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p);
    }
    setReplies(update);
    try { await toggleLike(postId); } catch { await load(); }
  };

  // リポスト切り替え
  const handleRepost = async (postId: string) => {
    if (post?.id === postId) {
      setPost((p) => p ? { ...p, isReposted: !p.isReposted, repostsCount: p.isReposted ? p.repostsCount - 1 : p.repostsCount + 1 } : p);
    }
    try { await toggleRepost(postId); } catch { await load(); }
  };

  // リアクション切り替え
  const handleReaction = async (postId: string, emoji: string) => {
    const updateReactions = (p: Post): Post => {
      if (p.id !== postId) return p;
      const existing = p.reactions?.find((r) => r.emoji === emoji);
      let newReactions: Reaction[];
      if (existing?.isReacted) {
        newReactions = (p.reactions || []).map((r) =>
          r.emoji === emoji ? { ...r, count: r.count - 1, isReacted: false } : r
        ).filter((r) => r.count > 0);
      } else if (existing) {
        newReactions = (p.reactions || []).map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, isReacted: true } : r
        );
      } else {
        newReactions = [...(p.reactions || []), { emoji, count: 1, isReacted: true }];
      }
      return { ...p, reactions: newReactions };
    };
    if (post?.id === postId) setPost((p) => p ? updateReactions(p) : p);
    setReplies((prev) => prev.map(updateReactions));
    try { await toggleReaction(postId, emoji); } catch { await load(); }
  };

  // 通報時にリストから除外
  const handleReport = (postId: string) => {
    setReplies((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDeletePost = (postId: string) => {
    if (postId === post?.id) {
      router.back();
    } else {
      setReplies((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // 返信画面へ遷移
  const handleReply = (postId: string) => {
    router.push(`/reply/${postId}`);
  };

  // 共有
  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.user.displayName}: ${post.content}`,
        title: "Postorialの投稿",
      });
    } catch {}
  };

  // ローディング表示
  if (loading || !post) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      </View>
    );
  }

  const initials = post.user.displayName.slice(0, 1).toUpperCase();

  // 地図を開く
  const openMap = () => {
    if (!post.locationLat || !post.locationLng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${post.locationLat},${post.locationLng}`,
      android: `geo:${post.locationLat},${post.locationLng}?q=${post.locationLat},${post.locationLng}`,
      default: `https://www.google.com/maps?q=${post.locationLat},${post.locationLng}`,
    });
    Linking.openURL(url);
  };

  // 親チェーンの各投稿をコンパクト表示するコンポーネント
  const renderParentPost = (parentPost: Post, index: number) => {
    const parentInitials = parentPost.user.displayName.slice(0, 1).toUpperCase();
    const isLast = index === parentChain.length - 1;

    return (
      <TouchableOpacity
        key={parentPost.id}
        style={styles.parentPostContainer}
        onPress={() => router.push(`/post/${parentPost.id}`)}
        activeOpacity={0.7}
      >
        {/* アバター列（アバター + 下方向のスレッドライン） */}
        <View style={styles.parentAvatarColumn}>
          <View style={styles.parentAvatar}>
            {parentPost.user.avatar ? (
              <Image source={{ uri: parentPost.user.avatar }} style={styles.parentAvatarImg} />
            ) : (
              <Text style={styles.parentAvatarText}>{parentInitials}</Text>
            )}
          </View>
          {/* アバターの下から次の投稿まで縦線を引く（常に表示、最後の親からメイン投稿にも繋がる） */}
          <View style={styles.threadLine} />
        </View>

        {/* テキスト列 */}
        <View style={styles.parentContentColumn}>
          <View style={styles.parentHeader}>
            <Text style={styles.parentDisplayName} numberOfLines={1}>{parentPost.user.displayName}</Text>
            <Text style={styles.parentUsername} numberOfLines={1}> @{parentPost.user.username}</Text>
          </View>
          <Text style={styles.parentBody} numberOfLines={3}>{parentPost.content}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* 親チェーン表示（スレッドの先祖投稿） */}
            {parentChain.length > 0 ? (
              <View style={styles.parentChainContainer}>
                {parentChain.map((p, i) => renderParentPost(p, i))}
              </View>
            ) : null}

            {/* メイン投稿詳細 */}
            <View style={styles.postDetail}>
              {/* 親チェーンがある場合、メイン投稿のアバターの上にスレッドラインの接続部分を表示 */}
              <View style={styles.userRow}>
                <View style={styles.mainAvatarColumn}>
                  {/* 親チェーンからの接続線（アバターの上側） */}
                  {parentChain.length > 0 ? (
                    <View style={styles.threadLineTop} />
                  ) : null}
                  <TouchableOpacity style={styles.avatar} onPress={() => router.push(`/user/${post.user.id}`)}>
                    {post.user.avatar ? (
                      <Image source={{ uri: post.user.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{initials}</Text>
                    )}
                  </TouchableOpacity>
                  {/* 返信がある場合、メイン投稿のアバターから下に線を引く */}
                  {replies.length > 0 ? (
                    <View style={styles.threadLineBottom} />
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => router.push(`/user/${post.user.id}`)}>
                  <Text style={styles.displayName}>{post.user.displayName}</Text>
                  <Text style={styles.username}>@{post.user.username}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.contentText}>{post.content}</Text>

              {/* 画像（タップで拡大表示） */}
              {post.imageUrl ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setShowImageViewer(true)}>
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={[styles.postImage, { aspectRatio: imageAspect }]}
                    resizeMode="cover"
                    onLoad={(e: any) => {
                      const src = e.nativeEvent.source ?? e.nativeEvent.target;
                      const w = src?.width ?? src?.naturalWidth;
                      const h = src?.height ?? src?.naturalHeight;
                      if (w && h) setImageAspect(w / h);
                    }}
                  />
                </TouchableOpacity>
              ) : null}

              {/* ファイル */}
              {post.fileUrl && post.fileName ? (
                <TouchableOpacity style={styles.fileAttachment} onPress={() => Linking.openURL(post.fileUrl!)}>
                  <Ionicons name="document-outline" size={20} color="#1d9bf0" />
                  <Text style={styles.fileName} numberOfLines={1}>{post.fileName}</Text>
                </TouchableOpacity>
              ) : null}

              {/* 位置情報 */}
              {post.locationName ? (
                <TouchableOpacity style={styles.locationTag} onPress={openMap}>
                  <Ionicons name="location" size={14} color="#1d9bf0" />
                  <Text style={styles.locationText}>{post.locationName}</Text>
                </TouchableOpacity>
              ) : null}

              {/* リアクション */}
              {post.reactions && post.reactions.length > 0 ? (
                <View style={styles.reactionsRow}>
                  {post.reactions.map((r) => (
                    <TouchableOpacity
                      key={r.emoji}
                      style={[styles.reactionBadge, r.isReacted && styles.reactionActive]}
                      onPress={() => handleReaction(post.id, r.emoji)}
                    >
                      <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
                      <Text style={[styles.reactionCount, r.isReacted && { color: "#1d9bf0" }]}>{r.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Text style={styles.dateText}>{formatDate(post.createdAt)}</Text>

              {/* 統計 */}
              <View style={styles.statsRow}>
                <Text style={styles.statNum}>{post.repliesCount}</Text>
                <Text style={styles.statLabel}> 返信</Text>
                <Text style={styles.statNum}>  {post.repostsCount}</Text>
                <Text style={styles.statLabel}> リポスト</Text>
                <Text style={styles.statNum}>  {post.likesCount}</Text>
                <Text style={styles.statLabel}> いいね</Text>
              </View>

              {/* アクションバー */}
              <View style={styles.actionsBar}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleReply(post.id)}>
                  <Ionicons name="chatbubble-outline" size={22} color="#8e8e93" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleRepost(post.id)}>
                  <Ionicons name="repeat-outline" size={22} color={post.isReposted ? "#00ba7c" : "#8e8e93"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id)}>
                  <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={22} color={post.isLiked ? "#f91880" : "#8e8e93"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={22} color="#8e8e93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 返信セクションヘッダー */}
            {replies.length > 0 ? (
              <View style={styles.repliesHeader}>
                <Text style={styles.repliesTitle}>返信</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onReply={handleReply}
            onRepost={handleRepost}
            onReaction={handleReaction}
            onPress={(pid) => router.push(`/post/${pid}`)}
            onAvatarPress={(userId) => router.push(`/user/${userId}`)}
            onReport={handleReport}
            onDelete={handleDeletePost}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyReplies}>まだ返信がありません</Text>
        }
        showsVerticalScrollIndicator={false}
      />

      {post.imageUrl ? <ImageViewer visible={showImageViewer} imageUri={post.imageUrl} onClose={() => setShowImageViewer(false)} /> : null}

      {/* 返信ボタン（フローティング） */}
      <TouchableOpacity
        style={styles.replyFab}
        onPress={() => handleReply(post.id)}
      >
        <Ionicons name="chatbubble" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // ========== 親チェーン（スレッド表示） ==========
  parentChainContainer: {
    backgroundColor: "#fff",
    paddingTop: 12,
  },
  parentPostContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    // 各親投稿のコンパクト表示
  },
  parentAvatarColumn: {
    width: PARENT_AVATAR_SIZE,
    alignItems: "center",
    marginRight: 12,
  },
  parentAvatar: {
    width: PARENT_AVATAR_SIZE,
    height: PARENT_AVATAR_SIZE,
    borderRadius: PARENT_AVATAR_SIZE / 2,
    backgroundColor: "#1d9bf0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  parentAvatarImg: {
    width: PARENT_AVATAR_SIZE,
    height: PARENT_AVATAR_SIZE,
    borderRadius: PARENT_AVATAR_SIZE / 2,
  },
  parentAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  // アバターの下から次の投稿まで伸びる縦線
  threadLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#e0e0e0",
    minHeight: 12,
  },
  parentContentColumn: {
    flex: 1,
    paddingBottom: 12,
  },
  parentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  parentDisplayName: {
    color: "#14171a",
    fontSize: 14,
    fontWeight: "bold",
  },
  parentUsername: {
    color: "#8e8e93",
    fontSize: 13,
    flexShrink: 1,
  },
  parentBody: {
    color: "#14171a",
    fontSize: 14,
    lineHeight: 20,
  },

  // ========== メイン投稿のアバター列 ==========
  mainAvatarColumn: {
    alignItems: "center",
    marginRight: 12,
  },
  // 親チェーンからメイン投稿のアバターへの接続線（アバターの上側）
  threadLineTop: {
    width: 2,
    height: 12,
    backgroundColor: "#e0e0e0",
  },
  // メイン投稿のアバターから返信への接続線（アバターの下側）
  threadLineBottom: {
    width: 2,
    height: 12,
    backgroundColor: "#e0e0e0",
    marginTop: 4,
  },

  // ========== 投稿詳細 ==========
  postDetail: {
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: "#1d9bf0",
    justifyContent: "center", alignItems: "center", overflow: "hidden",
  },
  avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  displayName: { color: "#14171a", fontSize: 16, fontWeight: "bold" },
  username: { color: "#8e8e93", fontSize: 14 },
  contentText: { color: "#14171a", fontSize: 18, lineHeight: 26, marginBottom: 12 },
  postImage: { width: "100%", borderRadius: 12, marginBottom: 12, backgroundColor: "#f5f5f5" },
  fileAttachment: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  fileName: { flex: 1, color: "#14171a", fontSize: 14 },
  locationTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  locationText: { color: "#1d9bf0", fontSize: 14 },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  reactionBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f5f5f5", borderRadius: 14,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#e0e0e0",
  },
  reactionActive: { borderColor: "#1d9bf0", backgroundColor: "rgba(29,155,240,0.1)" },
  reactionCount: { color: "#8e8e93", fontSize: 12 },
  dateText: { color: "#8e8e93", fontSize: 14, marginBottom: 12 },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: "#e0e0e0",
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  statNum: { color: "#14171a", fontWeight: "bold", fontSize: 14 },
  statLabel: { color: "#8e8e93", fontSize: 14 },
  actionsBar: {
    flexDirection: "row", justifyContent: "space-around",
    paddingVertical: 12,
  },
  actionBtn: { padding: 8 },
  repliesHeader: {
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  repliesTitle: { color: "#14171a", fontSize: 18, fontWeight: "bold" },
  emptyReplies: { color: "#8e8e93", textAlign: "center", marginTop: 40, fontSize: 15 },
  replyFab: {
    position: "absolute", bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#1d9bf0", justifyContent: "center", alignItems: "center",
    elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
});
