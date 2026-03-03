// 引用リポスト作成画面
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { createPost, getPost } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const MAX_LENGTH = 280;

// 経過時間を表示するヘルパー
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

export default function QuoteRepostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [quoteTarget, setQuoteTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // 引用先の投稿を取得
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const post = await getPost(id);
        setQuoteTarget(post);
      } catch (e) {
        Alert.alert("エラー", "投稿の取得に失敗しました");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 投稿処理
  const handlePost = async () => {
    if (!content.trim() || !id) return;
    if (content.length > MAX_LENGTH) return;
    setPosting(true);
    try {
      await createPost({ content: content.trim(), quotePostId: id });
      router.back();
    } catch (e) {
      Alert.alert("エラー", "投稿に失敗しました");
    } finally {
      setPosting(false);
    }
  };

  const remaining = MAX_LENGTH - content.length;
  const isOverLimit = remaining < 0;
  const canPost = content.trim().length > 0 && !isOverLimit && !posting;

  // ユーザーのイニシャル
  const userInitials = user?.displayName?.slice(0, 1).toUpperCase() || "?";

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d9bf0" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.postButton, !canPost && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!canPost}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>投稿する</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          {/* 入力エリア */}
          <View style={styles.inputArea}>
            {/* 自分のアバター */}
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{userInitials}</Text>
              )}
            </View>

            {/* テキスト入力 */}
            <TextInput
              style={styles.textInput}
              placeholder="コメントを追加..."
              placeholderTextColor="#8e8e93"
              multiline
              maxLength={MAX_LENGTH + 10}
              value={content}
              onChangeText={setContent}
              autoFocus
            />
          </View>

          {/* 引用先投稿のプレビューカード */}
          {quoteTarget ? (
            <View style={styles.quotePreviewWrapper}>
              <View style={styles.quoteCard}>
                <View style={styles.quoteHeader}>
                  {quoteTarget.user?.avatar ? (
                    <Image
                      source={{ uri: quoteTarget.user.avatar }}
                      style={styles.quoteAvatar}
                    />
                  ) : (
                    <View style={styles.quoteAvatarFallback}>
                      <Text style={styles.quoteAvatarInitial}>
                        {(quoteTarget.user?.displayName || "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.quoteDisplayName}>
                    {quoteTarget.user?.displayName || ""}
                  </Text>
                  <Text style={styles.quoteUsername}>
                    @{quoteTarget.user?.username || ""}
                  </Text>
                  <Text style={styles.quoteDot}>·</Text>
                  <Text style={styles.quoteTime}>
                    {quoteTarget.createdAt ? timeAgo(quoteTarget.createdAt) : ""}
                  </Text>
                </View>

                {quoteTarget.content ? (
                  <Text style={styles.quoteBody} numberOfLines={4}>
                    {quoteTarget.content}
                  </Text>
                ) : null}

                {quoteTarget.imageUrl ? (
                  <Image
                    source={{ uri: quoteTarget.imageUrl }}
                    style={styles.quoteImage}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* フッター: 文字数カウンター */}
        <View style={styles.footer}>
          <View style={styles.footerSpacer} />
          <Text
            style={[
              styles.charCount,
              remaining <= 20 && styles.charCountWarn,
              isOverLimit && styles.charCountOver,
            ]}
          >
            {remaining}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // ヘッダー
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  cancelText: {
    color: "#14171a",
    fontSize: 16,
  },
  postButton: {
    backgroundColor: "#1d9bf0",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },

  // 入力エリア
  inputArea: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1d9bf0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#14171a",
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 8,
  },

  // 引用プレビューカード
  quotePreviewWrapper: {
    paddingHorizontal: 68,
    paddingBottom: 16,
  },
  quoteCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    padding: 10,
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
  quoteAvatarInitial: {
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
  quoteImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },

  // フッター
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
  },
  footerSpacer: {
    flex: 1,
  },
  charCount: {
    color: "#8e8e93",
    fontSize: 14,
  },
  charCountWarn: {
    color: "#ff9500",
  },
  charCountOver: {
    color: "#ff3b30",
    fontWeight: "bold",
  },
});
