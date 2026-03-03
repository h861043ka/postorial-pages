// Supabase API層
import { supabase } from "./supabase";
import { Platform } from "react-native";
import { File as ExpoFile } from "expo-file-system";
import { decode } from "base64-arraybuffer";

const SUPABASE_URL = "https://olzjjfmtpykgxmgyumji.supabase.co";

// ============ メディアアップロード ============

// URIからアップロード用データを取得
async function uriToUploadData(uri: string): Promise<ArrayBuffer | Blob> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return await res.blob();
  }
  // Native: Expo SDK 54 新File APIでbase64読み取り → ArrayBuffer変換
  const file = new ExpoFile(uri);
  const base64 = await file.base64();
  return decode(base64);
}

export async function uploadImage(uri: string, userId: string): Promise<string> {
  const data = await uriToUploadData(uri);
  // Web: Blobのtype使用、Native: URIの拡張子から判定
  let mime = "image/jpeg";
  if (data instanceof Blob && data.type?.startsWith("image/")) {
    mime = data.type;
  } else {
    const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "";
    if (ext === "png") mime = "image/png";
  }
  const ext = mime.includes("png") ? "png" : "jpg";
  // 重複を避けるためランダム文字列を追加
  const random = Math.random().toString(36).substring(2, 15);
  const fileName = `${userId}/${Date.now()}_${random}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(fileName, data, {
      contentType: mime,
    });

  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${fileName}`;
}

export async function uploadFile(uri: string, name: string, userId: string): Promise<string> {
  const fileName = `${userId}/files/${Date.now()}_${name}`;
  const data = await uriToUploadData(uri);

  const { error } = await supabase.storage
    .from("media")
    .upload(fileName, data, {
      contentType: data instanceof Blob ? (data.type || "application/octet-stream") : "application/octet-stream",
    });

  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${fileName}`;
}

// 動画アップロード
export async function uploadVideo(uri: string, userId: string): Promise<string> {
  const data = await uriToUploadData(uri);
  // 動画のMIMEタイプを判定
  let mime = "video/mp4";
  if (data instanceof Blob && data.type?.startsWith("video/")) {
    mime = data.type;
  } else {
    const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "";
    if (ext === "mov") mime = "video/quicktime";
    else if (ext === "avi") mime = "video/x-msvideo";
    else if (ext === "webm") mime = "video/webm";
  }
  const ext = mime.includes("quicktime") ? "mov" : (mime.includes("webm") ? "webm" : "mp4");
  // 重複を避けるためランダム文字列を追加
  const random = Math.random().toString(36).substring(2, 15);
  const fileName = `${userId}/videos/${Date.now()}_${random}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(fileName, data, {
      contentType: mime,
    });

  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${fileName}`;
}

// ============ 投稿 ============

const POST_SELECT = `
  *,
  user:profiles!posts_user_id_fkey(*),
  liked:likes!left(user_id),
  reposted:reposts!left(user_id),
  post_reactions:reactions(emoji, user_id),
  bookmarked:bookmarks!left(user_id)
`;

// タイムライン取得（新しい順・リポスト含む・ブロック&ミュートユーザー除外）
export async function fetchTimeline(limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();

  // ブロック&ミュートしたユーザーのIDを取得
  const blockedIds = user ? await getBlockedUserIds() : [];
  const mutedIds = user ? await getMutedUserIds() : [];

  // 通常の投稿を取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (postsError) throw postsError;

  // リポストを取得（リポストしたユーザー情報 + 元投稿）
  const { data: reposts, error: repostsError } = await supabase
    .from("reposts")
    .select(`
      id,
      created_at,
      user_id,
      repost_user:profiles!reposts_user_id_fkey(id, username, display_name, avatar_url),
      post:posts!reposts_post_id_fkey(${POST_SELECT})
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (repostsError) throw repostsError;

  // 通常の投稿をマッピング
  const normalPosts = (posts || []).map((post: any) => ({
    ...enrichPost(post, user?.id),
    _sortDate: post.created_at,
  }));

  // リポストをマッピング（元投稿にリポスト情報を付与）
  const repostPosts = (reposts || [])
    .filter((r: any) => r.post && r.post.reply_to === null)
    .map((r: any) => ({
      ...enrichPost(r.post, user?.id),
      repostUser: {
        id: r.repost_user?.id || r.user_id,
        displayName: r.repost_user?.display_name || "",
        username: r.repost_user?.username || "",
        avatar: r.repost_user?.avatar_url || "",
      },
      repostedAt: r.created_at,
      _sortDate: r.created_at,
    }));

  // マージして日時順にソート、重複排除、ブロック&ミュートユーザー除外
  const blockedSet = new Set(blockedIds);
  const mutedSet = new Set(mutedIds);
  const seen = new Set<string>();
  const merged = [...normalPosts, ...repostPosts]
    .sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
    .filter((post) => {
      // ブロック&ミュートしたユーザーの投稿を除外
      if (blockedSet.has(post.user_id) || mutedSet.has(post.user_id)) return false;
      if (post.repostUser && (blockedSet.has(post.repostUser.id) || mutedSet.has(post.repostUser.id))) return false;
      // リポストは「リポストID_投稿ID」でユニーク判定
      const key = post.repostUser ? `repost_${post.repostUser.id}_${post.id}` : post.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return attachQuotePosts(merged);
}

// フォロー中のユーザーの投稿のみ取得
export async function fetchFollowingTimeline(limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // フォロー中のユーザーIDを取得
  const { data: followingData } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (followingData || []).map((f: any) => f.following_id);

  // 自分もフォロー中に含める
  followingIds.push(user.id);

  if (followingIds.length === 0) return [];

  // ブロック&ミュートしたユーザーのIDを取得
  const blockedIds = await getBlockedUserIds();
  const mutedIds = await getMutedUserIds();

  // フォロー中のユーザーの投稿を取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("reply_to", null)
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (postsError) throw postsError;

  // フォロー中のユーザーのリポストを取得
  const { data: reposts, error: repostsError } = await supabase
    .from("reposts")
    .select(`
      id,
      created_at,
      user_id,
      repost_user:profiles!reposts_user_id_fkey(id, username, display_name, avatar_url),
      post:posts!reposts_post_id_fkey(${POST_SELECT})
    `)
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (repostsError) throw repostsError;

  // 通常の投稿をマッピング
  const normalPosts = (posts || []).map((post: any) => ({
    ...enrichPost(post, user?.id),
    _sortDate: post.created_at,
  }));

  // リポストをマッピング
  const repostPosts = (reposts || [])
    .filter((r: any) => r.post && r.post.reply_to === null)
    .map((r: any) => ({
      ...enrichPost(r.post, user?.id),
      repostUser: {
        id: r.repost_user?.id || r.user_id,
        displayName: r.repost_user?.display_name || "",
        username: r.repost_user?.username || "",
        avatar: r.repost_user?.avatar_url || "",
      },
      repostedAt: r.created_at,
      _sortDate: r.created_at,
    }));

  // マージして日時順にソート、重複排除、ブロック&ミュートユーザー除外
  const blockedSet = new Set(blockedIds);
  const mutedSet = new Set(mutedIds);
  const seen = new Set<string>();
  const merged = [...normalPosts, ...repostPosts]
    .sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
    .filter((post) => {
      // ブロック&ミュートしたユーザーの投稿を除外
      if (blockedSet.has(post.user_id) || mutedSet.has(post.user_id)) return false;
      if (post.repostUser && (blockedSet.has(post.repostUser.id) || mutedSet.has(post.repostUser.id))) return false;
      // リポストは「リポストID_投稿ID」でユニーク判定
      const key = post.repostUser ? `repost_${post.repostUser.id}_${post.id}` : post.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return attachQuotePosts(merged);
}

function enrichPost(post: any, currentUserId?: string) {
  // リアクション集計
  const reactionMap: Record<string, { count: number; isReacted: boolean }> = {};
  (post.post_reactions || []).forEach((r: any) => {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, isReacted: false };
    reactionMap[r.emoji].count++;
    if (r.user_id === currentUserId) reactionMap[r.emoji].isReacted = true;
  });
  const reactions = Object.entries(reactionMap).map(([emoji, data]) => ({
    emoji, ...data,
  }));

  return {
    ...post,
    isLiked: post.liked?.some((l: any) => l.user_id === currentUserId) || false,
    isReposted: post.reposted?.some((r: any) => r.user_id === currentUserId) || false,
    isBookmarked: post.bookmarked?.some((b: any) => b.user_id === currentUserId) || false,
    reactions,
  };
}

// 引用リポスト情報を一括取得して投稿に付与する
async function attachQuotePosts(posts: any[]): Promise<any[]> {
  const quoteIds = posts
    .filter((p) => p.quote_post_id)
    .map((p) => p.quote_post_id);
  if (quoteIds.length === 0) return posts;

  const uniqueIds = [...new Set(quoteIds)];
  const { data: quotePosts } = await supabase
    .from("posts")
    .select("id, content, image_url, images, created_at, user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
    .in("id", uniqueIds);

  const quoteMap: Record<string, any> = {};
  (quotePosts || []).forEach((qp: any) => {
    quoteMap[qp.id] = {
      id: qp.id,
      content: qp.content,
      user: {
        id: qp.user?.id || "",
        displayName: qp.user?.display_name || "",
        username: qp.user?.username || "",
        avatar: qp.user?.avatar_url || "",
      },
      imageUrl: qp.image_url || "",
      images: qp.images || [],
      createdAt: qp.created_at,
    };
  });

  return posts.map((p) => ({
    ...p,
    quotePost: p.quote_post_id ? quoteMap[p.quote_post_id] || undefined : undefined,
  }));
}

// 投稿作成
export async function createPost(params: {
  content: string;
  replyTo?: string;
  quotePostId?: string;
  imageUrl?: string; // 後方互換性のため残す
  images?: string[]; // 複数画像対応
  videoUrl?: string; // 動画URL
  videoThumbnail?: string; // 動画サムネイル
  fileUrl?: string;
  fileName?: string;
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  // images配列があればそれを使用、なければimageUrlを配列化
  const imagesToSave = params.images || (params.imageUrl ? [params.imageUrl] : []);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: params.content,
      reply_to: params.replyTo || null,
      quote_post_id: params.quotePostId || null,
      image_url: params.imageUrl || "", // 後方互換性のため残す
      images: imagesToSave,
      video_url: params.videoUrl || null,
      video_thumbnail: params.videoThumbnail || null,
      file_url: params.fileUrl || "",
      file_name: params.fileName || "",
      location_lat: params.locationLat || null,
      location_lng: params.locationLng || null,
      location_name: params.locationName || "",
    })
    .select(`*, user:profiles!posts_user_id_fkey(*)`)
    .single();

  if (error) throw error;
  return data;
}

// 投稿削除（自分の投稿 - CASCADEで関連データも削除）
export async function deletePost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("投稿の削除に失敗しました");
}

// ============ いいね ============

export async function toggleLike(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    if (post && post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id, from_user_id: user.id, type: "like", post_id: postId,
      });
    }
    return true;
  }
}

// ============ リアクション（スタンプ） ============

export async function toggleReaction(postId: string, emoji: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("reactions").insert({
      user_id: user.id, post_id: postId, emoji,
    });
    return true;
  }
}

// ============ リポスト ============

export async function toggleRepost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: existing } = await supabase
    .from("reposts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existing) {
    await supabase.from("reposts").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("reposts").insert({ user_id: user.id, post_id: postId });
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    if (post && post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id, from_user_id: user.id, type: "repost", post_id: postId,
      });
    }
    return true;
  }
}

// ============ フォロー ============

export async function toggleFollow(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("follows").insert({
      follower_id: user.id, following_id: targetUserId,
    });
    await supabase.from("notifications").insert({
      user_id: targetUserId, from_user_id: user.id, type: "follow",
    });
    return true;
  }
}

// ============ プロフィール ============

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(updates: { display_name?: string; bio?: string; avatar_url?: string; cover_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ユーザーの投稿一覧
export async function getUserPosts(userId: string, limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .is("reply_to", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const posts = (data || []).map((post: any) => enrichPost(post, user?.id));
  return attachQuotePosts(posts);
}

// ユーザーがリポストした投稿一覧
export async function getUserReposts(userId: string, limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("reposts")
    .select(`
      id,
      created_at,
      post:posts!reposts_post_id_fkey(${POST_SELECT})
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const posts = (data || [])
    .filter((r: any) => r.post)
    .map((r: any) => ({
      ...enrichPost(r.post, user?.id),
      repostedAt: r.created_at,
    }));
  return attachQuotePosts(posts);
}

// ============ 通知 ============

export async function fetchNotifications(limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("notifications")
    .select(`*, from_user:profiles!notifications_from_user_id_fkey(*)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
}

// ============ トレンドハッシュタグ ============

export async function getTrendingHashtags(limit = 10): Promise<{ tag: string; count: number }[]> {
  // 直近72時間の投稿からハッシュタグを集計
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select("content")
    .gte("created_at", since)
    .not("content", "is", null);

  if (error || !data) return [];

  const tagCounts: Record<string, number> = {};
  const tagRegex = /#[^\s#]+/g;
  for (const post of data) {
    const matches = post.content.match(tagRegex);
    if (matches) {
      for (const tag of matches) {
        const normalized = tag.toLowerCase();
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      }
    }
  }

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

// ============ 検索 ============

export async function searchPosts(query: string, limit = 20) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return [];
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const posts = (data || []).map((post: any) => enrichPost(post, user?.id));
  return attachQuotePosts(posts);
}

// 投稿詳細を取得
export async function getPost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .single();

  if (error) throw error;
  const enriched = enrichPost(data, user?.id);
  // 引用リポスト情報を付与
  const [withQuote] = await attachQuotePosts([enriched]);
  return withQuote;
}

// 投稿の返信一覧を取得
export async function getReplies(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("reply_to", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const posts = (data || []).map((post: any) => enrichPost(post, user?.id));
  return attachQuotePosts(posts);
}

// ユーザー検索
export async function searchUsers(query: string, limit = 20) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============ フォロー確認・リスト ============

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();
  return !!data;
}

export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower:profiles!follows_follower_id_fkey(*)")
    .eq("following_id", userId);
  if (error) throw error;
  return (data || []).map((d: any) => d.follower);
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following:profiles!follows_following_id_fkey(*)")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data || []).map((d: any) => d.following);
}

// ============ DM（ダイレクトメッセージ） ============

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const uid1 = user.id < otherUserId ? user.id : otherUserId;
  const uid2 = user.id < otherUserId ? otherUserId : user.id;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", uid1)
    .eq("user2_id", uid2)
    .single();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user1_id: uid1, user2_id: uid2 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("conversations")
    .select("*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*)")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((c: any) => {
    const other = c.user1_id === user.id ? c.user2 : c.user1;
    return {
      id: c.id,
      otherUser: {
        id: other.id, username: other.username, displayName: other.display_name,
        avatar: other.avatar_url || "", bio: other.bio || "",
        followersCount: other.followers_count || 0, followingCount: other.following_count || 0,
        createdAt: other.created_at,
      },
      lastMessage: c.last_message || "",
      lastMessageAt: c.last_message_at,
    };
  });
}

export async function getMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId: string, content: string, imageUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content, image_url: imageUrl || "" })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("conversations")
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // 相手にDM通知を送信
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();
    if (conv) {
      const recipientId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      await supabase.from("notifications").insert({
        user_id: recipientId,
        from_user_id: user.id,
        type: "message",
        conversation_id: conversationId,
      });
    }
  } catch {}

  return data;
}

export async function markMessagesRead(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("read", false);
}

// ============ 通報（Report） ============

export async function reportPost(postId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId,
    reason,
  });
  if (error) throw error;
}

// ============ ブロック ============

export async function toggleBlock(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId)
    .single();

  if (existing) {
    await supabase.from("blocks").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    return true;
  }
}

export async function isBlocked(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId)
    .single();
  return !!data;
}

export async function getBlockedUserIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);
  return (data || []).map((b: any) => b.blocked_id);
}

// ============ アカウント削除 ============

export async function deleteAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  // 投稿・いいね・リポスト・リアクション・フォロー・通知・DM関連を削除
  await supabase.from("reactions").delete().eq("user_id", user.id);
  await supabase.from("likes").delete().eq("user_id", user.id);
  await supabase.from("reposts").delete().eq("user_id", user.id);
  await supabase.from("notifications").delete().eq("user_id", user.id);
  await supabase.from("notifications").delete().eq("from_user_id", user.id);
  await supabase.from("follows").delete().eq("follower_id", user.id);
  await supabase.from("follows").delete().eq("following_id", user.id);
  await supabase.from("reports").delete().eq("reporter_id", user.id);
  await supabase.from("blocks").delete().eq("blocker_id", user.id);
  await supabase.from("blocks").delete().eq("blocked_id", user.id);

  // メッセージ・会話を削除
  const { data: convos } = await supabase
    .from("conversations")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
  if (convos) {
    for (const c of convos) {
      await supabase.from("messages").delete().eq("conversation_id", c.id);
      await supabase.from("conversations").delete().eq("id", c.id);
    }
  }

  // 投稿を削除（返信→本体の順）
  await supabase.from("posts").delete().eq("user_id", user.id);

  // プロフィールを削除
  await supabase.from("profiles").delete().eq("id", user.id);

  // Supabase Authユーザーを完全削除（Edge Function経由）
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.functions.invoke("delete-user", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
  } catch {
    // Edge Function失敗時もサインアウトは実行する
  }
  await supabase.auth.signOut();
}

// ============ 管理者機能 ============

// 管理者権限チェック（RLSでも保護されているが防御的チェック）
async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("管理者権限が必要です");
  return user;
}

// 全通報を取得（管理者用）
export async function getReports(status?: string) {
  await requireAdmin();
  let query = supabase
    .from("reports")
    .select(`
      *,
      reporter:profiles!reports_reporter_profile_fkey(id, username, display_name, avatar_url),
      post:posts!reports_post_id_fkey(id, content, image_url, user_id,
        user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// 通報ステータスを更新（管理者用）
export async function updateReportStatus(reportId: string, status: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);
  if (error) throw error;
}

// 投稿を削除（管理者用）
export async function adminDeletePost(postId: string) {
  await requireAdmin();
  // 関連データを先に削除
  await supabase.from("reactions").delete().eq("post_id", postId);
  await supabase.from("likes").delete().eq("post_id", postId);
  await supabase.from("reposts").delete().eq("post_id", postId);
  await supabase.from("reports").delete().eq("post_id", postId);
  // 返信を削除
  await supabase.from("posts").delete().eq("reply_to", postId);
  // 投稿本体を削除
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

// ユーザーのアカウントを削除する（管理者用）
export async function adminDeleteUser(userId: string) {
  await requireAdmin();
  // ユーザーの全投稿IDを取得
  const { data: userPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", userId);
  if (userPosts) {
    for (const p of userPosts) {
      await supabase.from("reactions").delete().eq("post_id", p.id);
      await supabase.from("likes").delete().eq("post_id", p.id);
      await supabase.from("reposts").delete().eq("post_id", p.id);
      await supabase.from("reports").delete().eq("post_id", p.id);
      await supabase.from("posts").delete().eq("reply_to", p.id);
    }
  }
  // ユーザーの投稿を全削除
  await supabase.from("posts").delete().eq("user_id", userId);
  // ユーザーの関連データを削除
  await supabase.from("likes").delete().eq("user_id", userId);
  await supabase.from("reposts").delete().eq("user_id", userId);
  await supabase.from("reactions").delete().eq("user_id", userId);
  await supabase.from("follows").delete().eq("follower_id", userId);
  await supabase.from("follows").delete().eq("following_id", userId);
  await supabase.from("blocks").delete().eq("blocker_id", userId);
  await supabase.from("blocks").delete().eq("blocked_id", userId);
  await supabase.from("notifications").delete().eq("user_id", userId);
  await supabase.from("notifications").delete().eq("actor_id", userId);
  await supabase.from("reports").delete().eq("reporter_id", userId);
  await supabase.from("banned_users").delete().eq("user_id", userId);
  // BANリストに追加（再登録防止）
  const admin = await requireAdmin();
  await supabase.from("banned_users").insert({
    user_id: userId,
    reason: "管理者によるアカウント削除",
    banned_by: admin.id,
  });
}

// ユーザーをBANする（管理者用）
export async function banUser(userId: string, reason: string) {
  const user = await requireAdmin();

  const { error } = await supabase.from("banned_users").insert({
    user_id: userId,
    reason,
    banned_by: user.id,
  });
  if (error) throw error;
}

// ユーザーのBANを解除する（管理者用）
export async function unbanUser(userId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("banned_users")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// BANされたユーザー一覧を取得（管理者用）
export async function getBannedUsers() {
  await requireAdmin();
  const { data, error } = await supabase
    .from("banned_users")
    .select(`
      *,
      user:profiles!banned_users_user_profile_fkey(id, username, display_name, avatar_url),
      admin:profiles!banned_users_banned_by_profile_fkey(id, username, display_name)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// 自分がBANされているか確認
export async function checkBanned(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("banned_users")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return !!data;
}

// ============ スレッド（親チェーン取得） ============

// 投稿の親チェーンを辿って取得（ルートまで）
export async function getParentChain(postId: string): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const chain: any[] = [];
  let currentId: string | null = postId;
  const maxDepth = 20;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const { data, error }: { data: any; error: any } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("id", currentId)
      .single();
    if (error || !data) break;
    const enriched = enrichPost(data, user?.id);
    chain.unshift(enriched);
    currentId = data.reply_to || null;
    depth++;
  }

  return chain;
}

// ============ プッシュ通知 ============

// プッシュトークンを保存
export async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", user.id);
}

// ============ プロフィール固定 ============

// 投稿をプロフィールに固定
export async function pinPost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("profiles")
    .update({ pinned_post_id: postId })
    .eq("id", user.id);
  if (error) throw error;
}

// 固定を解除
export async function unpinPost() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("profiles")
    .update({ pinned_post_id: null })
    .eq("id", user.id);
  if (error) throw error;
}

// ============ 強制アップデート ============

// アプリの最低バージョンを取得
export async function getMinVersion(): Promise<string> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "min_version")
    .single();
  if (error || !data) return "1.0.0";
  return data.value;
}

// 最低バージョンを更新（管理者用）
export async function updateMinVersion(version: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("app_config")
    .update({ value: version, updated_at: new Date().toISOString() })
    .eq("key", "min_version");
  if (error) throw error;
}

// ============ ブックマーク ============

// ブックマークを追加
export async function addBookmark(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, post_id: postId });
  if (error) throw error;
}

// ブックマークを削除
export async function removeBookmark(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);
  if (error) throw error;
}

// 投稿がブックマーク済みかチェック
export async function isBookmarked(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();
  return !!data;
}

// ブックマークした投稿一覧を取得
export async function getBookmarkedPosts(limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookmarks")
    .select(`
      created_at,
      post:posts(${POST_SELECT})
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  const posts = (data || [])
    .filter((b: any) => b.post)
    .map((b: any) => enrichPost(b.post, user.id));
  return attachQuotePosts(posts);
}

// ============ ミュート ============

// ユーザーをミュート
export async function muteUser(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("muted_users")
    .insert({ user_id: user.id, muted_user_id: targetUserId });
  if (error) throw error;
}

// ユーザーのミュートを解除
export async function unmuteUser(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { error } = await supabase
    .from("muted_users")
    .delete()
    .eq("user_id", user.id)
    .eq("muted_user_id", targetUserId);
  if (error) throw error;
}

// ユーザーがミュート済みかチェック
export async function isMuted(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("muted_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("muted_user_id", targetUserId)
    .single();
  return !!data;
}

// ミュート中のユーザーIDリストを取得
export async function getMutedUserIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("muted_users")
    .select("muted_user_id")
    .eq("user_id", user.id);
  if (error) return [];
  return (data || []).map((m: any) => m.muted_user_id);
}

// ミュート中のユーザー一覧を取得（プロフィール情報付き）
export async function getMutedUsers() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("muted_users")
    .select(`
      muted_user_id,
      created_at,
      profile:profiles!muted_users_muted_user_id_fkey(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((m: any) => ({
    id: m.profile?.id || m.muted_user_id,
    username: m.profile?.username || "",
    displayName: m.profile?.display_name || "",
    avatar: m.profile?.avatar_url || "",
    bio: m.profile?.bio || "",
    mutedAt: m.created_at,
  }));
}

// ブロック中のユーザー一覧を取得（プロフィール情報付き）
export async function getBlockedUsers() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("blocks")
    .select(`
      blocked_id,
      created_at,
      profile:profiles!blocks_blocked_id_fkey(*)
    `)
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((b: any) => ({
    id: b.profile?.id || b.blocked_id,
    username: b.profile?.username || "",
    displayName: b.profile?.display_name || "",
    avatar: b.profile?.avatar_url || "",
    bio: b.profile?.bio || "",
    blockedAt: b.created_at,
  }));
}
