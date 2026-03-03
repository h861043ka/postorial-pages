// プロフィール編集画面
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile, uploadImage } from "../lib/api";

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initials = displayName.slice(0, 1).toUpperCase() || "?";

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "写真へのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "写真へのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("エラー", "表示名を入力してください");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadImage(avatarUri, user.id);
      }
      if (coverUri) {
        coverUrl = await uploadImage(coverUri, user.id);
      }
      await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      });
      await refreshUser();
      Alert.alert("完了", "プロフィールを更新しました");
      router.back();
    } catch (e: any) {
      Alert.alert("エラー", e.message || "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* バナー */}
      <TouchableOpacity activeOpacity={0.8} onPress={pickCover}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.banner} />
        ) : user?.cover ? (
          <Image source={{ uri: user.cover }} style={styles.banner} />
        ) : (
          <View style={styles.banner} />
        )}
        <View style={styles.bannerCameraOverlay}>
          <Ionicons name="camera" size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* アバター */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* フォーム */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>表示名</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="表示名を入力"
            placeholderTextColor="#8e8e93"
            maxLength={50}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>自己紹介</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="自己紹介を入力"
            placeholderTextColor="#8e8e93"
            multiline
            maxLength={160}
          />
          <Text style={styles.charCount}>{bio.length}/160</Text>
        </View>
      </View>

      {/* 保存ボタン */}
      <View style={styles.saveSection}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>保存する</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  banner: { height: 120, backgroundColor: "#1d9bf0" },
  bannerCameraOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  avatarSection: { paddingHorizontal: 16, marginTop: -36 },
  avatarContainer: { position: "relative", width: 72, height: 72 },
  avatarImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "#fff" },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#1d9bf0",
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(29,155,240,0.9)", justifyContent: "center", alignItems: "center",
  },
  form: { padding: 16, marginTop: 16 },
  inputGroup: {
    marginBottom: 20, borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
  },
  label: { color: "#8e8e93", fontSize: 13, marginBottom: 6 },
  input: {
    color: "#14171a", fontSize: 16, paddingVertical: 4,
  },
  bioInput: { minHeight: 60, textAlignVertical: "top" },
  charCount: { color: "#8e8e93", fontSize: 12, textAlign: "right", marginTop: 4 },
  saveSection: { paddingHorizontal: 16, marginTop: 8 },
  saveBtn: {
    backgroundColor: "#1d9bf0", borderRadius: 24,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
