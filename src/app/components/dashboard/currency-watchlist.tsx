"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Plus } from "lucide-react";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface WatchlistItem {
  id: string;
  currency_pair: string;
  created_at: string;
}

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  last_updated: string;
}

interface WatchlistItemWithRate extends WatchlistItem {
  rate?: number;
  last_updated?: string;
  base_currency?: string;
  target_currency?: string;
}

export function CurrencyWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItemWithRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: watchlistData, error: watchlistError } = await supabase
          .from("watchlist")
          .select("id, currency_pair, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (watchlistError) throw watchlistError;

        const { data: ratesData, error: ratesError } = await supabase
          .from("exchange_rates")
          .select("base_currency, target_currency, rate, last_updated");

        if (ratesError) throw ratesError;

        const watchlistWithRates = (watchlistData || []).map((item) => {
          const [base_currency, target_currency] =
            item.currency_pair.split("-");

          const rate = ratesData?.find(
            (r) =>
              r.base_currency === base_currency &&
              r.target_currency === target_currency
          );

          return {
            ...item,
            base_currency,
            target_currency,
            rate: rate?.rate,
            last_updated: rate?.last_updated,
          };
        });

        setWatchlist(watchlistWithRates);
      } catch (error) {
        console.error("Error loading watchlist:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load watchlist"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWatchlist();

    const watchlistChannel = supabase
      .channel("watchlist_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watchlist",
        },
        () => loadWatchlist()
      )
      .subscribe();

    const ratesChannel = supabase
      .channel("rates_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_rates",
        },
        () => loadWatchlist()
      )
      .subscribe();

    return () => {
      watchlistChannel.unsubscribe();
      ratesChannel.unsubscribe();
    };
  }, []);

  const handleAddCurrency = () => {
    router.push("/dashboard/currencies");
  };

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading watchlist..." color="success" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <div className="text-red-500">{error}</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Watchlist</h2>
            <Button
              isIconOnly
              color="success"
              className="rounded-2xl"
              size="sm"
              onPress={handleAddCurrency}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {watchlist.length === 0 ? (
            <div className="text-center text-foreground/60 py-4">
              No currencies in watchlist
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-[#e4e4e4] dark:bg-[#3a3a3a] rounded-xl cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/currencies/${item.currency_pair.toLowerCase()}`
                    )
                  }
                >
                  <div>
                    <p className="font-medium">
                      {item.base_currency}/{item.target_currency}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {item.rate ? item.rate.toFixed(4) : "N/A"}
                    </p>
                  </div>
                  <div className="text-sm text-foreground/60">
                    {item.last_updated
                      ? new Date(item.last_updated).toLocaleString()
                      : "N/A"}
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
