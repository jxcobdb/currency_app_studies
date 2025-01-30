"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../../components/dashboard/sidebar/sidebar";
import { Card, CardBody } from "@nextui-org/card";
import { Avatar } from "@nextui-org/avatar";
import { Badge } from "@nextui-org/badge";
import { Chip } from "@nextui-org/chip";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { CreditCard, CheckCircle2, Shield, Edit2 } from "lucide-react";
import {
  supabase,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
} from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const buttonStyles =
    "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [preferredCurrency, setPreferredCurrency] = useState("EUR");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth");
          return;
        }

        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
        setEditedName(userProfile.nickname || user.email?.split("@")[0] || "");

        // Fetch total transactions
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact" })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        setTotalTransactions(count || 0);

        // Fetch most used currency from wallet_balances
        const { data: walletData } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (walletData) {
          const { data: balances } = await supabase
            .from("wallet_balances")
            .select("currency")
            .eq("wallet_id", walletData.id)
            .order("balance", { ascending: false })
            .limit(1);

          if (balances && balances.length > 0) {
            setPreferredCurrency(balances[0].currency);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [router]);

  const handleSaveName = async () => {
    if (!profile) return;

    try {
      const updatedProfile = await updateUserProfile(profile.id, {
        nickname: editedName,
      });
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="ml-20 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-8">Loading profile...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-20 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Profile</h1>

          {/* Main Profile Card */}
          <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl mb-6">
            <CardBody className="p-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Avatar
                    name={profile.nickname || "User"}
                    classNames={{
                      base: "w-24 h-24 text-2xl bg-success/20 text-success",
                    }}
                    showFallback
                    fallback={
                      <div className="text-3xl font-semibold uppercase">
                        {(profile.nickname || "U")[0]}
                      </div>
                    }
                  />
                  <Badge
                    className="border-2 border-[#d4d4d4] dark:border-[#292828] absolute bottom-0 right-0"
                    color="success"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Badge>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-col items-center gap-1 relative w-full">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="max-w-[200px]"
                        />
                        <Button
                          color="success"
                          size="sm"
                          onClick={handleSaveName}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 relative w-full max-w-[280px]">
                        <h2 className="text-2xl font-bold text-center w-full">
                          {profile.nickname || "User"}
                        </h2>
                        <Button
                          isIconOnly
                          color="success"
                          variant="light"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Chip className="bg-green-500/20 text-green-500" size="sm">
                    Verified
                  </Chip>
                  <p className="text-foreground/60">
                    Member since{" "}
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className={`bg-[#d4d4d4] dark:bg-[#292828] hover:brightness-90 rounded-xl ${buttonStyles}`}
            >
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <CreditCard className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">
                      Total Transactions
                    </p>
                    <p className="text-xl font-bold">{totalTransactions}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
              className={`bg-[#d4d4d4] dark:bg-[#292828] hover:brightness-90 rounded-xl ${buttonStyles}`}
            >
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">
                      Preferred Currency
                    </p>
                    <p className="text-xl font-bold">{preferredCurrency}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Security Section */}
          <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl mt-6">
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold mb-4">Security Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#d4d4d4] dark:bg-[#292828] hover:brightness-90 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Email verification</span>
                  </div>
                  <Chip size="sm" className="bg-green-500/20 text-green-500">
                    Verified
                  </Chip>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
