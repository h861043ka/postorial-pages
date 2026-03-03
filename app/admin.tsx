// 管理画面 - 通報管理・ユーザーBAN
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import {
  getReports, updateReportStatus, adminDeletePost,
  banUser, unbanUser, getBannedUsers,
} from "../lib/api";

type Tab = "pending" | "resolved" | "banned";

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

export default function AdminScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [reports, setReports] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 管理者チェック
  if (!user?.isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="shield-outline" size={48} color="#8e8e93" />
          <Text style={styles.noAccess}>アクセス権限がありません</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const load = useCallback(async () => {
    try {
      if (tab === "banned") {
        const data = await getBannedUsers();
        setBannedUsers(data);
      } else {
        const data = await getReports(tab === "pending" ? "pending" : "resolved");
        setReports(data);
      }
    } catch (e) {
      console.error("管理データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDeletePost = (reportId: string, postId: string) => {
    Alert.alert("投稿削除", "この投稿を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除", style: "destructive",
        onPress: async () => {
          try {
            await adminDeletePost(postId);
            await updateReportStatus(reportId, "resolved");
            setReports((prev) => prev.filter((r) => r.id !== reportId));
            Alert.alert("完了", "投稿を削除しました");
          } catch (e: any) {
            Alert.alert("エラー", e.message || "削除に失敗しました");
          }
        },
      },
    ]);
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await updateReportStatus(reportId, "resolved");
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e: any) {
      Alert.alert("エラー", e.message || "更新に失敗しました");
    }
  };

  const handleBanUser = (reportId: string, userId: string, displayName: string) => {
    Alert.alert(
      "ユーザーBAN",
      `${displayName}をBANしますか？\n\nBANされたユーザーはログインできなくなります。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "BANする", style: "destructive",
          onPress: async () => {
            try {
              await banUser(userId, "通報に基づくBAN");
              await updateReportStatus(reportId, "resolved");
              setReports((prev) => prev.filter((r) => r.id !== reportId));
              Alert.alert("完了", `${displayName}をBANしました`);
            } catch (e: any) {
              Alert.alert("エラー", e.message || "BANに失敗しました");
            }
          },
        },
      ]
    );
  };

  const handleUnban = (userId: string, displayName: string) => {
    Alert.alert("BAN解除", `${displayName}のBANを解除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "解除する",
        onPress: async () => {
          try {
            await unbanUser(userId);
            setBannedUsers((prev) => prev.filter((b) => b.user_id !== userId));
            Alert.alert("完了", `${displayName}のBANを解除しました`);
          } catch (e: any) {
            Alert.alert("エラー", e.message || "解除に失敗しました");
          }
        },
      },
    ]);
  };

  const renderReport = (report: any) => {
    const post = report.post;
    const reporter = report.reporter;
    const postUser = post?.user;

    return (
      <View key={report.id} style={styles.reportCard}>
        {/* 通報情報 */}
        <View style={styles.reportHeader}>
          <View style={styles.reportBadge}>
            <Ionicons name="flag" size={12} color="#f4212e" />
            <Text style={styles.reportReason}>通報</Text>
          </View>
          <Text style={styles.reportTime}>{timeAgo(report.created_at)}</Text>
        </View>

        {/* 通報者 */}
        <View style={styles.userRow}>
          <Text style={styles.labelText}>通報者: </Text>
          {reporter?.avatar_url ? (
            <Image source={{ uri: reporter.avatar_url }} style={styles.miniAvatar} />
          ) : (
            <View style={styles.miniAvatarFallback}>
              <Text style={styles.miniAvatarText}>
                {(reporter?.display_name || "?").slice(0, 1)}
              </Text>
            </View>
          )}
          <Text style={styles.userNameText}>
            {reporter?.display_name || "不明"} @{reporter?.username || ""}
          </Text>
        </View>

        {/* 通報内容 */}
        {report.reason ? (
          <View style={styles.reportReasonBox}>
            <Text style={styles.reportReasonLabel}>通報理由:</Text>
            <Text style={styles.reportReasonContent}>{report.reason}</Text>
          </View>
        ) : null}

        {/* 投稿内容 */}
        {post ? (
          <View style={styles.postPreview}>
            <View style={styles.userRow}>
              <Text style={styles.labelText}>投稿者: </Text>
              {postUser?.avatar_url ? (
                <Image source={{ uri: postUser.avatar_url }} style={styles.miniAvatar} />
              ) : (
                <View style={styles.miniAvatarFallback}>
                  <Text style={styles.miniAvatarText}>
                    {(postUser?.display_name || "?").slice(0, 1)}
                  </Text>
                </View>
              )}
              <Text style={styles.userNameText}>
                {postUser?.display_name || "不明"} @{postUser?.username || ""}
              </Text>
            </View>
            <Text style={styles.postContent} numberOfLines={4}>
              {post.content}
            </Text>
            {post.image_url ? (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postThumb}
                resizeMode="cover"
              />
            ) : null}
          </View>
        ) : (
          <Text style={styles.deletedText}>（投稿は削除済み）</Text>
        )}

        {/* アクションボタン */}
        {tab === "pending" && post ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleDismiss(report.id)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#8e8e93" />
              <Text style={styles.dismissText}>却下</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeletePost(report.id, post.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#f4212e" />
              <Text style={styles.deleteText}>投稿削除</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.banBtn}
              onPress={() => handleBanUser(report.id, post.user_id, postUser?.display_name || "ユーザー")}
            >
              <Ionicons name="ban" size={16} color="#fff" />
              <Text style={styles.banText}>BAN</Text>
            </TouchableOpacity>
          </View>
        ) : tab === "pending" ? (
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => handleDismiss(report.id)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#8e8e93" />
            <Text style={styles.dismissText}>却下（投稿削除済み）</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderBannedUser = (ban: any) => {
    const u = ban.user;
    const admin = ban.admin;
    return (
      <View key={ban.id} style={styles.reportCard}>
        <View style={styles.userRow}>
          {u?.avatar_url ? (
            <Image source={{ uri: u.avatar_url }} style={styles.miniAvatar} />
          ) : (
            <View style={styles.miniAvatarFallback}>
              <Text style={styles.miniAvatarText}>
                {(u?.display_name || "?").slice(0, 1)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userNameText}>
              {u?.display_name || "不明"} @{u?.username || ""}
            </Text>
            <Text style={styles.banInfo}>
              理由: {ban.reason || "なし"} · BAN者: {admin?.display_name || "不明"} · {timeAgo(ban.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unbanBtn}
          onPress={() => handleUnban(ban.user_id, u?.display_name || "ユーザー")}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#00ba7c" />
          <Text style={styles.unbanText}>BAN解除</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => setTab("pending")}
        >
          <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>
            未処理
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "resolved" && styles.tabActive]}
          onPress={() => setTab("resolved")}
        >
          <Text style={[styles.tabText, tab === "resolved" && styles.tabTextActive]}>
            対応済み
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "banned" && styles.tabActive]}
          onPress={() => setTab("banned")}
        >
          <Text style={[styles.tabText, tab === "banned" && styles.tabTextActive]}>
            BANリスト
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1d9bf0" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d9bf0" />}
        >
          {tab === "banned" ? (
            bannedUsers.length === 0 ? (
              <Text style={styles.empty}>BANされたユーザーはいません</Text>
            ) : (
              bannedUsers.map(renderBannedUser)
            )
          ) : (
            reports.length === 0 ? (
              <Text style={styles.empty}>
                {tab === "pending" ? "未処理の通報はありません" : "対応済みの通報はありません"}
              </Text>
            ) : (
              reports.map(renderReport)
            )
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  noAccess: { color: "#8e8e93", fontSize: 16 },
  backBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  backBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  tabs: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1d9bf0" },
  tabText: { color: "#8e8e93", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#14171a" },
  empty: { color: "#8e8e93", textAlign: "center", marginTop: 40, fontSize: 15 },
  reportCard: {
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  reportHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  reportBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(244,33,46,0.08)", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  reportReason: { color: "#f4212e", fontSize: 13, fontWeight: "600" },
  reportTime: { color: "#8e8e93", fontSize: 12 },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8,
  },
  labelText: { color: "#8e8e93", fontSize: 13 },
  miniAvatar: { width: 20, height: 20, borderRadius: 10 },
  miniAvatarFallback: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#1d9bf0",
    justifyContent: "center", alignItems: "center",
  },
  miniAvatarText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  userNameText: { color: "#14171a", fontSize: 13, fontWeight: "600" },
  postPreview: {
    backgroundColor: "#f9f9f9", borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: "#e0e0e0", marginBottom: 10,
  },
  postContent: { color: "#14171a", fontSize: 14, lineHeight: 20, marginTop: 4 },
  postThumb: {
    width: "100%", height: 120, borderRadius: 8, marginTop: 8,
  },
  deletedText: { color: "#8e8e93", fontSize: 13, fontStyle: "italic", marginBottom: 10 },
  actionRow: { flexDirection: "row", gap: 8 },
  dismissBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dismissText: { color: "#8e8e93", fontSize: 13 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#f4212e", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  deleteText: { color: "#f4212e", fontSize: 13, fontWeight: "600" },
  banBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f4212e", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  banText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  banInfo: { color: "#8e8e93", fontSize: 12, marginTop: 2 },
  unbanBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#00ba7c", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start",
  },
  unbanText: { color: "#00ba7c", fontSize: 13, fontWeight: "600" },
  reportReasonBox: {
    backgroundColor: "#fff8f0", borderRadius: 8, padding: 10,
    borderWidth: 0.5, borderColor: "#f0d0a0", marginBottom: 10,
  },
  reportReasonLabel: { color: "#8e8e93", fontSize: 12, marginBottom: 4 },
  reportReasonContent: { color: "#14171a", fontSize: 14, lineHeight: 20 },
});
