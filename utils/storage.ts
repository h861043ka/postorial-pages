// ローカルストレージ操作ユーティリティ
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
} as const;

export async function saveToken(token: string) {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function removeToken() {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

export async function saveUserData(user: object) {
  await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData(): Promise<object | null> {
  const data = await AsyncStorage.getItem(KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
}

export async function clearAll() {
  await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.USER_DATA]);
}
