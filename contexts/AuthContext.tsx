// 認証コンテキスト（Supabase対応・プッシュ通知対応）
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "../types";
import { registerForPushNotificationsAsync } from "../lib/notifications";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  bannedMessage: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabaseプロフィールを内部User型に変換
function toUser(profile: any): User {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatar: profile.avatar_url || "",
    cover: profile.cover_url || "",
    bio: profile.bio || "",
    followersCount: profile.followers_count || 0,
    followingCount: profile.following_count || 0,
    createdAt: profile.created_at,
    isAdmin: profile.is_admin || false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bannedMessage, setBannedMessage] = useState("");

  // セッション監視
  useEffect(() => {
    // タイムアウト付き認証チェック
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          // BANチェック
          const { data: banned } = await supabase
            .from("banned_users")
            .select("id")
            .eq("user_id", session.user.id)
            .single();
          if (banned) {
            await supabase.auth.signOut();
            setUser(null);
            setBannedMessage("このアカウントはご利用いただけません");
            setIsLoading(false);
            return;
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile) setUser(toUser(profile));
        }
      } catch (error) {
        console.error("認証チェックエラー:", error);
        // エラーでもアプリは起動させる
      } finally {
        setIsLoading(false);
      }
    };

    // 10秒のタイムアウト
    const timeout = setTimeout(() => {
      console.warn("認証チェックがタイムアウトしました");
      setIsLoading(false);
    }, 10000);

    initAuth().finally(() => clearTimeout(timeout));

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: banned } = await supabase
            .from("banned_users")
            .select("id")
            .eq("user_id", session.user.id)
            .single();
          if (banned) {
            await supabase.auth.signOut();
            setUser(null);
            setBannedMessage("このアカウントはご利用いただけません");
            return;
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile) {
            setUser(toUser(profile));
            // プッシュ通知を登録
            registerForPushNotificationsAsync().catch(console.error);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // BANチェック
    if (data.user) {
      const { data: banned } = await supabase
        .from("banned_users")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      if (banned) {
        await supabase.auth.signOut();
        throw new Error("このアカウントはご利用いただけません");
      }
    }
  };

  const signUp = async (email: string, displayName: string, password: string) => {
    const username = email.split("@")[0];
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
      },
    });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profile) setUser(toUser(profile));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, bannedMessage, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
