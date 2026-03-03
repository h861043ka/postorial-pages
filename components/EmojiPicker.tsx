// スタンプ（絵文字）ピッカー
import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from "react-native";

const EMOJI_CATEGORIES = [
  {
    title: "スマイル",
    emojis: ["😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😤", "😭", "🤔", "😱", "🫣"],
  },
  {
    title: "ハート",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💗", "💕", "💞"],
  },
  {
    title: "ハンド",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🫶", "💪", "🙏", "👋", "✋"],
  },
  {
    title: "アニマル",
    emojis: ["🐦‍⬛", "🐱", "🐶", "🦊", "🐻", "🐼", "🐰", "🐸", "🦁", "🐮", "🐷", "🐵"],
  },
  {
    title: "フード",
    emojis: ["🍕", "🍔", "🍟", "🌮", "🍣", "🍜", "🍰", "🍩", "🍺", "☕", "🧋", "🍷"],
  },
  {
    title: "その他",
    emojis: ["🔥", "⭐", "✨", "🎉", "🎊", "💯", "💀", "👀", "🚀", "🌈", "⚡", "🏆"],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>スタンプを選択</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {EMOJI_CATEGORIES.map((cat) => (
              <View key={cat.title}>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <View style={styles.emojiGrid}>
                  {cat.emojis.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiBtn}
                      onPress={() => { onSelect(emoji); onClose(); }}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 30, maxHeight: "60%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#8e8e93",
    alignSelf: "center", marginTop: 10, marginBottom: 12,
  },
  title: {
    color: "#14171a", fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center",
  },
  categoryTitle: {
    color: "#8e8e93", fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: "row", flexWrap: "wrap",
  },
  emojiBtn: {
    width: "16.66%", aspectRatio: 1, justifyContent: "center", alignItems: "center",
  },
  emoji: { fontSize: 28 },
});
