// 利用規約画面
import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.updated}>最終更新日: 2026年2月17日</Text>

      <Text style={styles.heading}>第1条（適用）</Text>
      <Text style={styles.body}>
        本利用規約（以下「本規約」）は、Postorial（以下「本サービス」）の利用に関する条件を定めるものです。
        ユーザーは、本サービスを利用することにより、本規約に同意したものとみなします。
      </Text>

      <Text style={styles.heading}>第2条（アカウント）</Text>
      <Text style={styles.body}>
        1. ユーザーは、正確な情報を提供してアカウントを登録するものとします。{"\n"}
        2. アカウントの管理は、ユーザー自身の責任で行うものとします。{"\n"}
        3. アカウントの第三者への譲渡・貸与は禁止します。{"\n"}
        4. 13歳未満の方は本サービスを利用できません。
      </Text>

      <Text style={styles.heading}>第3条（禁止事項）</Text>
      <Text style={styles.body}>
        ユーザーは以下の行為を行ってはなりません：{"\n\n"}
        ・法令または公序良俗に反する行為{"\n"}
        ・犯罪に関連する行為{"\n"}
        ・他のユーザーへの嫌がらせ、脅迫、誹謗中傷{"\n"}
        ・わいせつ・暴力的な内容の投稿{"\n"}
        ・スパム行為や大量のボットアカウントの作成{"\n"}
        ・本サービスのサーバーへの過度な負荷をかける行為{"\n"}
        ・他のユーザーの個人情報を無断で公開する行為{"\n"}
        ・知的財産権を侵害する行為{"\n"}
        ・本サービスの運営を妨害する行為{"\n"}
        ・不正アクセスまたはその試み
      </Text>

      <Text style={styles.heading}>第4条（投稿コンテンツ）</Text>
      <Text style={styles.body}>
        1. ユーザーが投稿したコンテンツの著作権は、ユーザーに帰属します。{"\n"}
        2. ユーザーは、本サービス上に投稿したコンテンツについて、本サービスの運営に必要な範囲で利用する権利を本サービスに許諾するものとします。{"\n"}
        3. 本サービスは、禁止事項に該当する投稿を予告なく削除する権利を有します。
      </Text>

      <Text style={styles.heading}>第5条（サービスの変更・停止）</Text>
      <Text style={styles.body}>
        本サービスは、以下の場合にサービスの全部または一部を変更、中断、停止することがあります：{"\n\n"}
        ・システムのメンテナンスや更新{"\n"}
        ・天災、事故、停電等の不可抗力{"\n"}
        ・その他、運営が必要と判断した場合
      </Text>

      <Text style={styles.heading}>第6条（免責事項）</Text>
      <Text style={styles.body}>
        1. 本サービスは「現状のまま」提供されます。{"\n"}
        2. 本サービスの利用により生じた損害について、故意または重大な過失がない限り、一切の責任を負いません。{"\n"}
        3. ユーザー間のトラブルについて、本サービスは関与しません。
      </Text>

      <Text style={styles.heading}>第7条（アカウントの停止・削除）</Text>
      <Text style={styles.body}>
        本規約に違反したユーザーに対し、事前の通知なくアカウントの停止または削除を行う場合があります。
      </Text>

      <Text style={styles.heading}>第8条（規約の変更）</Text>
      <Text style={styles.body}>
        本規約は、必要に応じて変更されることがあります。
        重要な変更がある場合は、アプリ内で通知いたします。
        変更後も本サービスを利用し続けた場合、変更に同意したものとみなします。
      </Text>

      <Text style={styles.heading}>第9条（準拠法・管轄裁判所）</Text>
      <Text style={styles.body}>
        本規約の解釈は日本法に準拠し、紛争が生じた場合は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
      </Text>

      <Text style={styles.footer}>
        本規約に関するお問い合わせは、アプリ内の設定画面からご連絡ください。
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
  footer: { color: "#8e8e93", fontSize: 13, marginTop: 30, lineHeight: 20, textAlign: "center" },
});
