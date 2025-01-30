"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";

interface WalletCurrency {
  currency: string;
  balance: number;
}

export function WalletOverview() {
  const [currencies, setCurrencies] = useState<WalletCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  const fetchWalletBalances = async (id: string) => {
    const { data: balances, error: balancesError } = await supabase
      .from("wallet_balances")
      .select("currency, balance")
      .eq("wallet_id", id)
      .order("currency");

    if (balancesError) {
      console.error("Error fetching balances:", balancesError);
      return;
    }
    setCurrencies(balances || []);
  };

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

        setWalletId(wallet.id);
        await fetchWalletBalances(wallet.id);

        const channel = supabase.channel(`wallet_balances:${wallet.id}`);

        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallet_balances",
              filter: `wallet_id=eq.${wallet.id}`,
            },
            () => {
              fetchWalletBalances(wallet.id);
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log("Subscribed to wallet balance changes");
            }
          });

        return () => {
          channel.unsubscribe();
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

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading wallet data..." color="success" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <div className="text-red-500">{error}</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
      <CardBody>
        <h2 className="text-2xl font-bold text-foreground mb-6">My Wallet</h2>
        {currencies.length === 0 ? (
          <div className="text-center text-foreground/60 py-8">
            No currencies in wallet
          </div>
        ) : (
          <div className="space-y-4">
            {currencies.map((currency) => (
              <div
                key={currency.currency}
                className="flex justify-between items-center p-4 bg-[#c4c4c4] dark:bg-[#3a3a3a] rounded-xl"
              >
                <div>
                  <div className="text-lg font-semibold">
                    {currency.currency}
                  </div>
                  <div className="text-sm text-foreground/60">Balance</div>
                </div>
                <div className="text-xl font-bold">
                  {currency.balance.toLocaleString("en-US", {
                    style: "currency",
                    currency: currency.currency,
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
