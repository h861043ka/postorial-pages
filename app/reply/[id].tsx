// 返信作成画面（写真・ファイル・位置情報・スタンプ対応）
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, Image, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../../contexts/AuthContext";
import { createPost, uploadImage, uploadFile, getPost } from "../../lib/api";
import EmojiPicker from "../../components/EmojiPicker";
import LocationPicker from "../../components/LocationPicker";

const MAX_LENGTH = 280;

export default function ReplyScreen() {
  const { id: replyToId } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [parentPost, setParentPost] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState<number>(16 / 9);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const { user } = useAuth();
  const remaining = MAX_LENGTH - content.length;
  const initials = user?.displayName?.slice(0, 1).toUpperCase() || "?";

  useEffect(() => {
    if (replyToId) {
      getPost(replyToId).then(setParentPost).catch(() => {});
    }
  }, [replyToId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("権限エラー", "写真へのアクセスを許可してください"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setImageUri(result.assets[0].uri); setFileUri(null); setFileName(null); }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) { setFileUri(result.assets[0].uri); setFileName(result.assets[0].name); setImageUri(null); }
    } catch {}
  };

  const hasContent = content.trim().length > 0 || !!imageUri || !!fileUri;

  const handlePost = async () => {
    if (!hasContent || posting || !user) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      let fileUrl: string | undefined;
      if (imageUri) imageUrl = await uploadImage(imageUri, user.id);
      if (fileUri && fileName) fileUrl = await uploadFile(fileUri, fileName, user.id);

      await createPost({
        content: content.trim(),
        replyTo: replyToId,
        imageUrl, fileUrl,
        fileName: fileName || undefined,
        locationLat: location?.lat,
        locationLng: location?.lng,
        locationName: location?.name,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("エラー", e.message || "返信に失敗しました");
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={{ flex: 1 }}>
          {/* 元の投稿を表示 */}
          {parentPost ? (
            <View style={styles.parentPost}>
              <View style={styles.parentLine} />
              <View style={styles.parentContent}>
                <View style={styles.parentHeader}>
                  <Text style={styles.parentName}>{parentPost.user?.display_name || ""}</Text>
                  <Text style={styles.parentUsername}> @{parentPost.user?.username || ""}</Text>
                </View>
                <Text style={styles.parentText} numberOfLines={3}>{parentPost.content}</Text>
                <Text style={styles.replyingTo}>
                  返信先: <Text style={{ color: "#1d9bf0" }}>@{parentPost.user?.username || ""}</Text>
                </Text>
              </View>
            </View>
          ) : null}

          {/* 返信入力 */}
          <View style={styles.compose}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="返信を入力..."
              placeholderTextColor="#8e8e93"
              multiline
              maxLength={MAX_LENGTH}
              value={content}
              onChangeText={setContent}
              autoFocus
            />
          </View>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: imageUri }}
                style={[styles.previewImage, { aspectRatio: imageAspect }]}
                resizeMode="cover"
                onLoad={(e: any) => {
                  const src = e.nativeEvent.source ?? e.nativeEvent.target;
                  const w = src?.width ?? src?.naturalWidth;
                  const h = src?.height ?? src?.naturalHeight;
                  if (w && h) setImageAspect(w / h);
                }}
              />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setImageUri(null)}>
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {fileUri && fileName ? (
            <View style={styles.filePreview}>
              <Ionicons name="document-outline" size={24} color="#1d9bf0" />
              <Text style={styles.filePreviewName} numberOfLines={1}>{fileName}</Text>
              <TouchableOpacity onPress={() => { setFileUri(null); setFileName(null); }}>
                <Ionicons name="close-circle" size={22} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          ) : null}

          {location ? (
            <View style={styles.locationPreview}>
              <TouchableOpacity style={styles.locationPreviewContent} onPress={() => setShowLocationPicker(true)}>
                <Ionicons name="location" size={16} color="#1d9bf0" />
                <Text style={styles.locationPreviewText}>{location.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLocation(null)}>
                <Ionicons name="close-circle" size={18} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color="#1d9bf0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={pickFile}>
              <Ionicons name="attach-outline" size={22} color="#1d9bf0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEmoji(true)}>
              <Ionicons name="happy-outline" size={22} color="#1d9bf0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowLocationPicker(true)}>
              <Ionicons name={location ? "location" : "location-outline"} size={22} color={location ? "#00ba7c" : "#1d9bf0"} />
            </TouchableOpacity>
          </View>
          <View style={styles.footerRight}>
            <Text style={[styles.counter, remaining < 20 && { color: "#ffd400" }, remaining < 0 && { color: "#f4212e" }]}>{remaining}</Text>
            <TouchableOpacity
              style={[styles.replyBtn, (!hasContent || posting) && styles.replyBtnDisabled]}
              onPress={handlePost}
              disabled={!hasContent || posting}
            >
              <Text style={styles.replyBtnText}>{posting ? "送信中..." : "返信する"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker visible={showEmoji} onClose={() => setShowEmoji(false)} onSelect={(emoji) => setContent((prev) => prev + emoji)} />

      <LocationPicker
        visible={showLocationPicker}
        initialLocation={location}
        onSelect={setLocation}
        onClose={() => setShowLocationPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  parentPost: { flexDirection: "row", padding: 16, paddingBottom: 8 },
  parentLine: { width: 2, backgroundColor: "#e0e0e0", marginLeft: 22, marginRight: 20, minHeight: 40 },
  parentContent: { flex: 1 },
  parentHeader: { flexDirection: "row", marginBottom: 4 },
  parentName: { color: "#14171a", fontWeight: "bold", fontSize: 15 },
  parentUsername: { color: "#8e8e93", fontSize: 14 },
  parentText: { color: "#8e8e93", fontSize: 15, lineHeight: 21, marginBottom: 6 },
  replyingTo: { color: "#8e8e93", fontSize: 13 },
  compose: { flexDirection: "row", padding: 16, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1d9bf0", justifyContent: "center",
    alignItems: "center", marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  input: { flex: 1, color: "#14171a", fontSize: 18, textAlignVertical: "top", lineHeight: 24, minHeight: 80 },
  previewContainer: { marginHorizontal: 16, marginBottom: 12, position: "relative" },
  previewImage: { width: "100%", borderRadius: 12 },
  removeBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14 },
  filePreview: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  filePreviewName: { flex: 1, color: "#14171a", fontSize: 14 },
  locationPreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  locationPreviewContent: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locationPreviewText: { flex: 1, color: "#1d9bf0", fontSize: 14 },
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: "#e0e0e0",
  },
  footerIcons: { flexDirection: "row", gap: 14 },
  iconBtn: { padding: 4 },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  counter: { color: "#8e8e93", fontSize: 14 },
  replyBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  replyBtnDisabled: { opacity: 0.5 },
  replyBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
