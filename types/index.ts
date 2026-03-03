// SNSアプリの型定義

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  cover?: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  isAdmin?: boolean;
}

export interface Conversation {
  id: string;
  otherUser: User;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  imageUrl?: string; // 後方互換性のため残す
  images?: string[]; // 複数画像対応
  videoUrl?: string; // 動画URL
  videoThumbnail?: string; // 動画サムネイル
  fileUrl?: string;
  fileName?: string;
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  reactions?: Reaction[];
  createdAt: string;
  repostUser?: { id: string; displayName: string; username: string; avatar: string };
  repostedAt?: string;
  quotePost?: QuotePost;
  replyTo?: string;
}

export interface QuotePost {
  id: string;
  content: string;
  user: { id: string; displayName: string; username: string; avatar: string };
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  isReacted: boolean;
}

export interface Notification {
  id: string;
  type: "like" | "follow" | "reply" | "repost";
  fromUser: User;
  postId?: string;
  createdAt: string;
  read: boolean;
}
