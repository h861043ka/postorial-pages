// プライバシーポリシー画面
import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.updated}>最終更新日: 2026年2月17日</Text>

      <Text style={styles.heading}>1. はじめに</Text>
      <Text style={styles.body}>
        Postorial（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
        本プライバシーポリシーは、本アプリが収集する情報、その利用方法、およびユーザーの権利について説明します。
      </Text>

      <Text style={styles.heading}>2. 収集する情報</Text>
      <Text style={styles.body}>
        本アプリは以下の情報を収集します：{"\n\n"}
        <Text style={styles.bold}>アカウント情報：</Text>メールアドレス、表示名、ユーザー名、パスワード（暗号化して保存）{"\n\n"}
        <Text style={styles.bold}>プロフィール情報：</Text>自己紹介文、プロフィール画像、カバー画像{"\n\n"}
        <Text style={styles.bold}>投稿データ：</Text>テキスト、画像、ファイル、位置情報（ユーザーが許可した場合のみ）{"\n\n"}
        <Text style={styles.bold}>利用データ：</Text>いいね、リポスト、フォロー、リアクション、ダイレクトメッセージなどのアクティビティ{"\n\n"}
        <Text style={styles.bold}>端末情報：</Text>デバイスの種類、OS、アプリのバージョン
      </Text>

      <Text style={styles.heading}>3. 情報の利用目的</Text>
      <Text style={styles.body}>
        収集した情報は以下の目的で利用します：{"\n\n"}
        ・アカウントの作成と管理{"\n"}
        ・SNS機能（投稿、いいね、フォロー等）の提供{"\n"}
        ・通知の送信{"\n"}
        ・サービスの改善{"\n"}
        ・不正利用の防止
      </Text>

      <Text style={styles.heading}>4. 情報の共有</Text>
      <Text style={styles.body}>
        本アプリは、ユーザーの個人情報を第三者に販売することはありません。
        以下の場合を除き、情報を共有しません：{"\n\n"}
        ・ユーザーが公開設定にした投稿やプロフィール情報{"\n"}
        ・法令に基づく開示要求があった場合{"\n"}
        ・サービス運営に必要な業務委託先（Supabase等のインフラプロバイダー）{"\n"}
        ・位置情報の検索にOpenStreetMap（Nominatim API）を使用します
      </Text>

      <Text style={styles.heading}>5. データの保存と削除</Text>
      <Text style={styles.body}>
        ユーザーのデータは、アカウントが有効な間保存されます。
        アップロードされた画像・ファイルはアカウント削除時に合わせて削除されます。
        位置情報は投稿に紐づけて保存され、投稿の削除と共に削除されます。{"\n\n"}
        アカウント削除をリクエストした場合、認証情報を含む全てのデータは即座に完全に削除されます。
        設定画面の「アカウント削除」からいつでも削除可能です。
      </Text>

      <Text style={styles.heading}>6. セキュリティ</Text>
      <Text style={styles.body}>
        本アプリは、業界標準のセキュリティ対策を講じています：{"\n\n"}
        ・通信の暗号化（HTTPS/TLS）{"\n"}
        ・パスワードのハッシュ化{"\n"}
        ・行レベルセキュリティ（RLS）によるデータアクセス制御
      </Text>

      <Text style={styles.heading}>7. ユーザーの権利</Text>
      <Text style={styles.body}>
        ユーザーは以下の権利を有します：{"\n\n"}
        ・個人情報へのアクセスと修正{"\n"}
        ・アカウントとデータの削除{"\n"}
        ・位置情報の許可・取消{"\n"}
        ・通知の許可・取消
      </Text>

      <Text style={styles.heading}>8. お問い合わせ</Text>
      <Text style={styles.body}>
        プライバシーに関するお問い合わせは、アプリ内の設定画面からご連絡ください。
      </Text>

      <Text style={styles.footer}>
        本ポリシーは予告なく変更される場合があります。変更があった場合はアプリ内で通知いたします。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 60 },
  updated: { color: "#8e8e93", fontSize: 13, marginBottom: 20 },
  heading: { color: "#14171a", fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 8 },
  body: { color: "#333", fontSize: 15, lineHeight: 24 },
  bold: { fontWeight: "bold", color: "#14171a" },
  footer: { color: "#8e8e93", fontSize: 13, marginTop: 30, lineHeight: 20, textAlign: "center" },
});
