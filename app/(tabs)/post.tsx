// 投稿作成画面 - フル機能版
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, Image, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import { useAuth } from "../../contexts/AuthContext";
import { createPost, uploadImage, uploadFile, uploadVideo } from "../../lib/api";
import EmojiPicker from "../../components/EmojiPicker";
import LocationPicker from "../../components/LocationPicker";

const MAX_LENGTH = 280;
const MAX_IMAGES = 4; // 最大4枚まで

export default function PostScreen() {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]); // 複数画像対応
  const [videoUri, setVideoUri] = useState<string | null>(null); // 動画URI
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    lat: number; lng: number; name: string;
  } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const { user } = useAuth();
  const remaining = MAX_LENGTH - content.length;
  const initials = user?.displayName?.slice(0, 1).toUpperCase() || "?";

  const pickImage = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert("上限に達しました", `画像は最大${MAX_IMAGES}枚まで選択できます`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "写真へのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_IMAGES - imageUris.length,
    });
    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      setImageUris(prev => [...prev, ...newUris].slice(0, MAX_IMAGES));
      setFileUri(null);
      setFileName(null);
    }
  };

  const takePhoto = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert("上限に達しました", `画像は最大${MAX_IMAGES}枚まで選択できます`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "カメラへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUris(prev => [...prev, result.assets[0].uri].slice(0, MAX_IMAGES));
      setFileUri(null);
      setFileName(null);
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "動画へのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60, // 最大60秒
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setImageUris([]);
      setFileUri(null);
      setFileName(null);
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "カメラへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setImageUris([]);
      setFileUri(null);
      setFileName(null);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setFileUri(result.assets[0].uri);
        setFileName(result.assets[0].name);
        setImageUris([]);
        setVideoUri(null);
      }
    } catch {}
  };

  const hasContent = content.trim().length > 0 || imageUris.length > 0 || !!videoUri || !!fileUri;

  const handlePost = async () => {
    if (!hasContent || posting || !user) return;
    setPosting(true);
    try {
      let images: string[] = [];
      let videoUrl: string | undefined;
      let fileUrl: string | undefined;

      // 複数画像を並列アップロード
      if (imageUris.length > 0) {
        const uploadPromises = imageUris.map(uri => uploadImage(uri, user.id));
        images = await Promise.all(uploadPromises);
      }
      // 動画アップロード
      if (videoUri) {
        videoUrl = await uploadVideo(videoUri, user.id);
      }
      if (fileUri && fileName) {
        fileUrl = await uploadFile(fileUri, fileName, user.id);
      }

      await createPost({
        content: content.trim(),
        images: images.length > 0 ? images : undefined,
        imageUrl: images[0], // 後方互換性のため1枚目を設定
        videoUrl,
        videoThumbnail: undefined, // サムネイルは未実装
        fileUrl,
        fileName: fileName || undefined,
        locationLat: location?.lat,
        locationLng: location?.lng,
        locationName: location?.name,
      });
      setContent("");
      setImageUris([]);
      setVideoUri(null);
      setFileUri(null);
      setFileName(null);
      setLocation(null);
      router.back();
    } catch (e: any) {
      console.error("投稿エラー詳細:", e);
      const errorMsg = e.message || "投稿に失敗しました";
      Alert.alert("エラー", errorMsg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postBtn, (!hasContent || posting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!hasContent || posting}
        >
          <Text style={styles.postBtnText}>{posting ? "送信中..." : "投稿する"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.compose}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="いまどうしてる？"
              placeholderTextColor="#8e8e93"
              multiline
              maxLength={MAX_LENGTH}
              value={content}
              onChangeText={setContent}
              autoFocus
            />
          </View>

          {/* 画像プレビュー - グリッド表示 */}
          {imageUris.length > 0 ? (
            <View style={styles.imagesGrid}>
              {imageUris.map((uri, index) => (
                <View key={index} style={[
                  styles.imageGridItem,
                  imageUris.length === 1 && styles.imageGridSingle,
                  imageUris.length === 2 && styles.imageGridHalf,
                  imageUris.length >= 3 && styles.imageGridQuarter,
                ]}>
                  <Image
                    source={{ uri }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {/* 動画プレビュー */}
          {videoUri ? (
            <View style={styles.videoPreview}>
              <Video
                source={{ uri: videoUri }}
                style={styles.video}
                useNativeControls
                resizeMode="contain"
                isLooping
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setVideoUri(null)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ファイルプレビュー */}
          {fileUri && fileName ? (
            <View style={styles.filePreview}>
              <Ionicons name="document-outline" size={24} color="#1d9bf0" />
              <Text style={styles.filePreviewName} numberOfLines={1}>{fileName}</Text>
              <TouchableOpacity onPress={() => { setFileUri(null); setFileName(null); }}>
                <Ionicons name="close-circle" size={22} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 位置情報プレビュー（タップで地図を再表示） */}
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
            <TouchableOpacity style={styles.iconBtn} onPress={pickImage} disabled={!!videoUri}>
              <Ionicons name="image-outline" size={22} color={videoUri ? "#c0c0c0" : "#1d9bf0"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={takePhoto} disabled={!!videoUri}>
              <Ionicons name="camera-outline" size={22} color={videoUri ? "#c0c0c0" : "#1d9bf0"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={pickVideo} disabled={imageUris.length > 0}>
              <Ionicons name="videocam-outline" size={22} color={imageUris.length > 0 ? "#c0c0c0" : "#1d9bf0"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={pickFile} disabled={!!videoUri || imageUris.length > 0}>
              <Ionicons name="attach-outline" size={22} color={(videoUri || imageUris.length > 0) ? "#c0c0c0" : "#1d9bf0"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEmoji(true)}>
              <Ionicons name="happy-outline" size={22} color="#1d9bf0" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons
                name={location ? "location" : "location-outline"}
                size={22}
                color={location ? "#00ba7c" : "#1d9bf0"}
              />
            </TouchableOpacity>
          </View>
          <Text style={[
            styles.counter,
            remaining < 20 && { color: "#ffd400" },
            remaining < 0 && { color: "#f4212e" },
          ]}>
            {remaining}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* 絵文字ピッカー */}
      <EmojiPicker
        visible={showEmoji}
        onClose={() => setShowEmoji(false)}
        onSelect={(emoji) => {
          setContent((prev) => prev + emoji);
        }}
      />

      {/* 位置情報ピッカー */}
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
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
  },
  cancel: { color: "#14171a", fontSize: 16 },
  postBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  compose: { flexDirection: "row", padding: 16, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1d9bf0", justifyContent: "center",
    alignItems: "center", marginRight: 12,
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  input: {
    flex: 1, color: "#14171a", fontSize: 18,
    textAlignVertical: "top", lineHeight: 24, minHeight: 100,
  },
  // 複数画像プレビュー - グリッド表示
  imagesGrid: {
    flexDirection: "row", flexWrap: "wrap", marginHorizontal: 16, marginBottom: 12, gap: 4,
  },
  imageGridItem: {
    position: "relative", borderRadius: 12, overflow: "hidden",
  },
  imageGridSingle: {
    width: "100%", aspectRatio: 16 / 9,
  },
  imageGridHalf: {
    width: "49.5%", aspectRatio: 1,
  },
  imageGridQuarter: {
    width: "49.5%", aspectRatio: 1,
  },
  gridImage: {
    width: "100%", height: "100%",
  },
  removeBtn: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12,
    padding: 2,
  },
  // 動画プレビュー
  videoPreview: {
    marginHorizontal: 16, marginBottom: 12, position: "relative",
    borderRadius: 12, overflow: "hidden", aspectRatio: 16 / 9,
  },
  video: {
    width: "100%", height: "100%",
  },
  // ファイルプレビュー
  filePreview: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  filePreviewName: { flex: 1, color: "#14171a", fontSize: 14 },
  // 位置情報プレビュー
  locationPreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10,
    borderWidth: 0.5, borderColor: "#e0e0e0",
  },
  locationPreviewContent: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locationPreviewText: { flex: 1, color: "#1d9bf0", fontSize: 14 },
  // フッター
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: "#e0e0e0",
  },
  footerIcons: { flexDirection: "row", gap: 16 },
  iconBtn: { padding: 4 },
  counter: { color: "#8e8e93", fontSize: 14 },
});
