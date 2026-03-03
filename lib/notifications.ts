// プッシュ通知ヘルパー
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { savePushToken } from "./api";

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// プッシュトークンを取得
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1d9bf0",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("プッシュ通知の許可が得られませんでした");
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: "4d3147d2-b0e3-466b-8ce2-9de0f8a63990", // app.jsonのEASプロジェクトIDと同じ
      })).data;

      // トークンをサーバーに保存
      if (token) {
        await savePushToken(token);
      }
    } catch (error) {
      console.error("プッシュトークンの取得に失敗しました:", error);
    }
  } else {
    console.log("実機でのみプッシュ通知を使用できます");
  }

  return token;
}

// 通知タップ時のハンドラを設定
export function setupNotificationResponseListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification);
  });
}

// 通知受信時のハンドラを設定
export function setupNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}
