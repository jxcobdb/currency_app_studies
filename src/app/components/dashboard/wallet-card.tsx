"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Spinner } from "@nextui-org/spinner";
import { useRouter } from "next/navigation";

interface WalletCurrency {
  currency: string;
  balance: number;
  updated_at: string;
}

export function WalletCard() {
  const [currencies, setCurrencies] = useState<WalletCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (walletError) throw walletError;
        if (!wallet) throw new Error("No wallet found");

        const { data: balances, error: balancesError } = await supabase
          .from("wallet_balances")
          .select("currency, balance, updated_at")
          .eq("wallet_id", wallet.id)
          .order("updated_at", { ascending: false })
          .limit(3);

        if (balancesError) throw balancesError;
        setCurrencies(balances || []);

        const subscription = supabase
          .channel("wallet_balance_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallet_balances",
              filter: `wallet_id=eq.${wallet.id}`,
            },
            async () => {
              const { data: newBalances } = await supabase
                .from("wallet_balances")
                .select("currency, balance, updated_at")
                .eq("wallet_id", wallet.id)
                .order("updated_at", { ascending: false })
                .limit(3);

              setCurrencies(newBalances || []);
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error loading wallet data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load wallet data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, []);

  const handleViewAll = () => {
    router.push("/dashboard/wallet");
  };

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="flex items-center justify-center p-6">
          <Spinner label="Loading wallet data..." color="success" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="p-6">
          <div className="text-center">
            <p className="mb-4 text-red-500">{error}</p>
            <Button
              color="success"
              startContent={<Plus className="w-4 h-4" />}
              className="rounded-2xl"
            >
              Create Wallet
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Wallet</h2>
            <Button
              color="success"
              size="sm"
              className="rounded-2xl"
              onPress={handleViewAll}
            >
              View All
            </Button>
          </div>

          {currencies.length === 0 ? (
            <div className="text-center text-foreground/60 py-4">
              No currencies in wallet
            </div>
          ) : (
            <div className="space-y-3">
              {currencies.map((currency) => (
                <div
                  key={currency.currency}
                  className="flex justify-between items-center p-3 bg-[#e4e4e4] dark:bg-[#3a3a3a] rounded-xl"
                >
                  <div>
                    <div className="text-lg font-semibold">
                      {currency.currency}
                    </div>
                    <div className="text-sm text-foreground/60">
                      Last updated{" "}
                      {new Date(currency.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-lg font-semibold">
                    {currency.balance.toLocaleString("en-US", {
                      style: "currency",
                      currency: currency.currency,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
