// 投稿カードコンポーネント（ライトモード版・引用リポスト対応・メニュー分岐・動画対応）
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Share, Linking, Platform, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { useAuth } from "../contexts/AuthContext";
import { deletePost, pinPost, unpinPost, adminDeletePost } from "../lib/api";
import { Post, Reaction, QuotePost } from "../types";
import EmojiPicker from "./EmojiPicker";
import ReportModal from "./ReportModal";
import ImageViewer from "./ImageViewer";

interface Props {
  post: Post;
  onLike: (postId: string) => void;
  onReply: (postId: string) => void;
  onRepost: (postId: string) => void;
  onReaction?: (postId: string, emoji: string) => void;
  onPress?: (postId: string) => void;
  onAvatarPress?: (userId: string) => void;
  onReport?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPin?: () => void;
  isPinned?: boolean;
  onBookmark?: (postId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

// 引用カードコンポーネント
function QuoteCard({ quotePost, onPress }: { quotePost: QuotePost; onPress?: (postId: string) => void }) {
  const quoteImages = quotePost.images && quotePost.images.length > 0 ? quotePost.images : (quotePost.imageUrl ? [quotePost.imageUrl] : []);

  return (
    <TouchableOpacity
      style={styles.quoteCard}
      onPress={() => onPress?.(quotePost.id)}
      activeOpacity={0.7}
    >
      <View style={styles.quoteHeader}>
        {quotePost.user.avatar ? (
          <Image source={{ uri: quotePost.user.avatar }} style={styles.quoteAvatar} />
        ) : (
          <View style={styles.quoteAvatarFallback}>
            <Text style={styles.quoteAvatarText}>
              {quotePost.user.displayName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.quoteDisplayName}>{quotePost.user.displayName}</Text>
        <Text style={styles.quoteUsername}>@{quotePost.user.username}</Text>
        <Text style={styles.quoteDot}>·</Text>
        <Text style={styles.quoteTime}>{timeAgo(quotePost.createdAt)}</Text>
      </View>
      {quotePost.content ? (
        <Text style={styles.quoteBody} numberOfLines={3}>
          {quotePost.content}
        </Text>
      ) : null}
      {quoteImages.length > 0 ? (
        <View style={styles.quoteImagesContainer}>
          {quoteImages.slice(0, 2).map((imgUrl, index) => (
            <Image
              key={index}
              source={{ uri: imgUrl }}
              style={[styles.quoteImage, quoteImages.length > 1 && styles.quoteImageSmall]}
              resizeMode="cover"
            />
          ))}
          {quoteImages.length > 2 ? (
            <View style={styles.quoteMoreOverlay}>
              <Text style={styles.quoteMoreText}>+{quoteImages.length - 2}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {quotePost.videoUrl ? (
        <View style={styles.quoteVideoContainer}>
          <Video
            source={{ uri: quotePost.videoUrl }}
            style={styles.quoteVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ハッシュタグ付きテキストをレンダリング
function HashtagText({ text, style }: { text: string; style: any }) {
  const router = useRouter();
  const parts = text.split(/(#[^\s#]+)/g);
  if (parts.length === 1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /^#[^\s#]+$/.test(part) ? (
          <Text
            key={i}
            style={{ color: "#1d9bf0" }}
            onPress={() => router.push({ pathname: "/(tabs)/search", params: { q: part } } as any)}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

function PostCard({ post, onLike, onReply, onRepost, onReaction, onPress, onAvatarPress, onReport, onDelete, onPin, isPinned, onBookmark }: Props) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isOwnPost = currentUser?.id === post.user.id;
  const isAdmin = currentUser?.isAdmin || false;
  const [showEmoji, setShowEmoji] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [imgRatio, setImgRatio] = useState(16 / 9);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const initials = post.user.displayName.slice(0, 1).toUpperCase();

  // 複数画像対応 - images配列があればそれを使用、なければimageUrlを配列化
  const displayImages = post.images && post.images.length > 0 ? post.images : (post.imageUrl ? [post.imageUrl] : []);

  const handleShare = async () => {
    try {
      const postUrl = `https://raven-five-nu.vercel.app/post/${post.id}`;
      const message = `${post.user.displayName}の投稿:\n\n${post.content}\n\n${postUrl}`;
      await Share.share({ message, url: postUrl, title: "Postorialの投稿をシェア" });
    } catch {}
  };

  const openMap = () => {
    if (!post.locationLat || !post.locationLng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${post.locationLat},${post.locationLng}`,
      android: `geo:${post.locationLat},${post.locationLng}?q=${post.locationLat},${post.locationLng}`,
      default: `https://www.google.com/maps?q=${post.locationLat},${post.locationLng}`,
    });
    Linking.openURL(url);
  };

  // 投稿削除（自分の投稿 or 管理者）
  const handleDeletePost = () => {
    setShowPostMenu(false);
    const doDelete = async () => {
      try {
        if (isOwnPost) {
          await deletePost(post.id);
        } else {
          await adminDeletePost(post.id);
        }
        onDelete?.(post.id);
      } catch (e: any) {
        Alert.alert("エラー", e.message || "削除に失敗しました");
      }
    };
    setTimeout(() => {
      if (Platform.OS === "web") {
        const ok = (typeof window !== "undefined") && window.confirm("この投稿を削除しますか？この操作は取り消せません。");
        if (ok) doDelete();
      } else {
        Alert.alert("投稿の削除", "この投稿を削除しますか？この操作は取り消せません。", [
          { text: "キャンセル", style: "cancel" },
          { text: "削除", style: "destructive", onPress: doDelete },
        ]);
      }
    }, 100);
  };

  // プロフィールに固定/解除
  const handlePinPost = () => {
    setShowPostMenu(false);
    const doPin = async () => {
      try {
        if (isPinned) {
          await unpinPost();
        } else {
          await pinPost(post.id);
        }
        onPin?.();
      } catch (e: any) {
        Alert.alert("エラー", e.message || "操作に失敗しました");
      }
    };
    setTimeout(() => doPin(), 100);
  };

  // リポストボタン押下時の処理
  const handleRepostPress = () => {
    setShowRepostMenu(true);
  };

  // リポストメニュー: リポスト
  const handleRepost = () => {
    setShowRepostMenu(false);
    onRepost(post.id);
  };

  // リポストメニュー: 引用リポスト
  const handleQuoteRepost = () => {
    setShowRepostMenu(false);
    router.push(`/quote/${post.id}`);
  };

  return (
    <View style={styles.outerContainer}>
      {/* リポスト表示 */}
      {post.repostUser ? (
        <TouchableOpacity
          style={styles.repostHeader}
          onPress={() => onAvatarPress?.(post.repostUser!.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat-outline" size={14} color="#00ba7c" />
          <Text style={styles.repostHeaderText}>
            {post.repostUser.displayName || post.repostUser.username}がリポストしました
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(post.id)}
        activeOpacity={0.7}
      >
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => onAvatarPress?.(post.user.id)}
        activeOpacity={onAvatarPress ? 0.7 : 1}
      >
        {post.user.avatar ? (
          <Image source={{ uri: post.user.avatar }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.displayName}>{post.user.displayName}</Text>
            <Text style={styles.username}>@{post.user.username}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowPostMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        {post.content ? <HashtagText text={post.content} style={styles.body} /> : null}

        {/* 画像 - グリッド表示（タップで拡大表示） */}
        {displayImages.length > 0 ? (
          <View style={styles.imagesGrid}>
            {displayImages.map((imgUrl, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedImageIndex(index);
                  setShowImageViewer(true);
                }}
                style={[
                  styles.imageGridItem,
                  displayImages.length === 1 && styles.imageGridSingle,
                  displayImages.length === 2 && styles.imageGridHalf,
                  displayImages.length >= 3 && styles.imageGridQuarter,
                ]}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* 動画 */}
        {post.videoUrl ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: post.videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
        ) : null}

        {/* 引用リポスト表示 */}
        {post.quotePost ? (
          <QuoteCard quotePost={post.quotePost} onPress={onPress} />
        ) : null}

        {post.fileUrl && post.fileName ? (
          <TouchableOpacity style={styles.fileAttachment} onPress={() => Linking.openURL(post.fileUrl!)}>
            <Ionicons name="document-outline" size={20} color="#1d9bf0" />
            <Text style={styles.fileName} numberOfLines={1}>{post.fileName}</Text>
            <Ionicons name="download-outline" size={18} color="#8e8e93" />
          </TouchableOpacity>
        ) : null}

        {post.locationName ? (
          <TouchableOpacity style={styles.locationTag} onPress={openMap}>
            <Ionicons name="location" size={14} color="#1d9bf0" />
            <Text style={styles.locationText}>{post.locationName}</Text>
          </TouchableOpacity>
        ) : null}

        {post.reactions && post.reactions.length > 0 ? (
          <View style={styles.reactionsRow}>
            {post.reactions.map((r: Reaction) => (
              <TouchableOpacity
                key={r.emoji}
                style={[styles.reactionBadge, r.isReacted && styles.reactionBadgeActive]}
                onPress={() => onReaction?.(post.id, r.emoji)}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionCount, r.isReacted && styles.reactionCountActive]}>{r.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onReply(post.id)}>
            <Ionicons name="chatbubble-outline" size={18} color="#8e8e93" />
            <Text style={styles.actionCount}>{post.repliesCount || ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRepostPress}>
            <Ionicons name="repeat-outline" size={18} color={post.isReposted ? "#00ba7c" : "#8e8e93"} />
            <Text style={[styles.actionCount, post.isReposted && { color: "#00ba7c" }]}>{post.repostsCount || ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
            <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={18} color={post.isLiked ? "#f91880" : "#8e8e93"} />
            <Text style={[styles.actionCount, post.isLiked && { color: "#f91880" }]}>{post.likesCount || ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowEmoji(true)}>
            <Ionicons name="happy-outline" size={18} color="#8e8e93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#8e8e93" />
          </TouchableOpacity>
          {onBookmark && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onBookmark(post.id)}>
              <Ionicons name={post.isBookmarked ? "bookmark" : "bookmark-outline"} size={18} color={post.isBookmarked ? "#1d9bf0" : "#8e8e93"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <EmojiPicker visible={showEmoji} onClose={() => setShowEmoji(false)} onSelect={(emoji) => onReaction?.(post.id, emoji)} />
      <ReportModal visible={showReport} postId={post.id} onClose={() => setShowReport(false)} onReported={onReport} />
      {displayImages.length > 0 ? (
        <ImageViewer
          visible={showImageViewer}
          imageUri={displayImages}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      ) : null}

      {/* リポストメニューモーダル */}
      <Modal
        visible={showRepostMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepostMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowRepostMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleRepost}>
              <Ionicons name="repeat-outline" size={20} color="#14171a" />
              <Text style={styles.menuItemText}>リポスト</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleQuoteRepost}>
              <Ionicons name="create-outline" size={20} color="#14171a" />
              <Text style={styles.menuItemText}>引用リポスト</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 投稿メニューモーダル（自分/他人で分岐） */}
      <Modal
        visible={showPostMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowPostMenu(false)}
        >
          <View style={styles.menuContainer}>
            {isOwnPost ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleDeletePost}>
                  <Ionicons name="trash-outline" size={20} color="#f4212e" />
                  <Text style={[styles.menuItemText, { color: "#f4212e" }]}>投稿を削除</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handlePinPost}>
                  <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color="#14171a" />
                  <Text style={styles.menuItemText}>{isPinned ? "固定を解除" : "プロフィールに固定"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowPostMenu(false); setShowReport(true); }}>
                  <Ionicons name="flag-outline" size={20} color="#f4212e" />
                  <Text style={[styles.menuItemText, { color: "#f4212e" }]}>通報する</Text>
                </TouchableOpacity>
                {isAdmin ? (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={handleDeletePost}>
                      <Ionicons name="trash-outline" size={20} color="#f4212e" />
                      <Text style={[styles.menuItemText, { color: "#f4212e" }]}>投稿を削除（管理者）</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0", backgroundColor: "#fff",
  },
  repostHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 56, paddingTop: 8,
  },
  repostHeaderText: { color: "#8e8e93", fontSize: 13, fontWeight: "600" },
  container: {
    flexDirection: "row", padding: 12,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#1d9bf0", justifyContent: "center",
    alignItems: "center", marginRight: 10, overflow: "hidden",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  content: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  moreBtn: { padding: 4 },
  displayName: { color: "#14171a", fontWeight: "bold", fontSize: 15, marginRight: 4 },
  username: { color: "#8e8e93", fontSize: 14 },
  dot: { color: "#8e8e93", marginHorizontal: 4, fontSize: 14 },
  time: { color: "#8e8e93", fontSize: 14 },
  body: { color: "#14171a", fontSize: 15, lineHeight: 21, marginBottom: 8 },

  // 複数画像グリッド表示
  imagesGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 8, borderRadius: 12, overflow: "hidden",
  },
  imageGridItem: {
    overflow: "hidden",
  },
  imageGridSingle: {
    width: "100%", aspectRatio: 16 / 9,
  },
  imageGridHalf: {
    width: "49.75%", aspectRatio: 1,
  },
  imageGridQuarter: {
    width: "49.75%", aspectRatio: 1,
  },
  gridImage: {
    width: "100%", height: "100%", backgroundColor: "#f5f5f5",
  },

  // 動画表示
  videoContainer: {
    width: "100%", aspectRatio: 16 / 9, marginBottom: 8,
    borderRadius: 12, overflow: "hidden", backgroundColor: "#000",
  },
  video: {
    width: "100%", height: "100%",
  },

  fileAttachment: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  fileName: { flex: 1, color: "#14171a", fontSize: 14 },
  locationTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  locationText: { color: "#1d9bf0", fontSize: 13 },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  reactionBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f5f5f5", borderRadius: 14,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#e0e0e0",
  },
  reactionBadgeActive: { borderColor: "#1d9bf0", backgroundColor: "rgba(29,155,240,0.08)" },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { color: "#8e8e93", fontSize: 12 },
  reactionCountActive: { color: "#1d9bf0" },
  actions: { flexDirection: "row", justifyContent: "space-between", maxWidth: 320 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { color: "#8e8e93", fontSize: 13 },

  // 引用カードスタイル
  quoteCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  quoteAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  quoteAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1d9bf0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  quoteAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  quoteDisplayName: {
    color: "#14171a",
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 4,
  },
  quoteUsername: {
    color: "#8e8e93",
    fontSize: 12,
  },
  quoteDot: {
    color: "#8e8e93",
    marginHorizontal: 3,
    fontSize: 12,
  },
  quoteTime: {
    color: "#8e8e93",
    fontSize: 12,
  },
  quoteBody: {
    color: "#14171a",
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  quoteImagesContainer: {
    flexDirection: "row",
    gap: 4,
    position: "relative",
  },
  quoteImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  quoteImageSmall: {
    width: "49%",
  },
  quoteMoreOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "49%",
    height: 80,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quoteMoreText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  quoteVideoContainer: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  quoteVideo: {
    width: "100%",
    height: "100%",
  },

  // リポストメニュースタイル
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 260,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    color: "#14171a",
    fontSize: 16,
    fontWeight: "500",
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
  },
});

export default React.memo(PostCard);
