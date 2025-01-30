"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/dashboard/sidebar/sidebar";
import { Logout } from "../components/dashboard/logout";
import { WalletCard } from "../components/dashboard/wallet-card";
import { CurrencyWatchlist } from "../components/dashboard/currency-watchlist";
import { TransactionHistory } from "../components/dashboard/transaction-history";
import { FriendsList } from "../components/dashboard/friends-list";
import { supabase } from "@/lib/supabase/client";
import { Spinner } from "@nextui-org/spinner";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load profile"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner label="Loading dashboard..." color="success" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-foreground/60">No profile found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          <Logout />

          <div className="grid lg:grid-cols-3 gap-6">
            <WalletCard />
            <CurrencyWatchlist />
            <TransactionHistory />
            <FriendsList />
          </div>
        </div>
      </div>
    </div>
  );
}
