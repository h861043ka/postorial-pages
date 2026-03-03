// 通知コンテキスト（アプリ内通知・ポーリング方式）
// Web/Native両対応のため、expo-notificationsを使わずポーリングで未読数を管理
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { fetchNotifications } from "../lib/api";

// ポーリング間隔（ミリ秒）
const POLLING_INTERVAL = 30000;

interface NotificationContextType {
  /** 未読通知の件数 */
  unreadCount: number;
  /** 手動で未読カウントを再取得する */
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 未読通知数を取得
  const refreshCount = useCallback(async () => {
    try {
      const notifications = await fetchNotifications();
      const count = notifications.filter((n: any) => n.read === false).length;
      setUnreadCount(count);
    } catch {
      // エラー時は何もしない（ログアウト中などに発生しうる）
    }
  }, []);

  // ユーザーがログインしている間のみポーリングを実行
  useEffect(() => {
    if (!user) {
      // ログアウト時は未読数をリセットしてポーリングを停止
      setUnreadCount(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 即座に1回取得
    refreshCount();

    // 30秒間隔でポーリング
    intervalRef.current = setInterval(refreshCount, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications は NotificationProvider 内で使用してください");
  return context;
}
