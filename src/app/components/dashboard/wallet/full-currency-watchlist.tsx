"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";

interface WatchlistItem {
  id: string;
  currency_pair: string;
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
}

export function FullCurrencyWatchlist() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItemWithRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get user's watchlist
        const { data: watchlistData, error: watchlistError } = await supabase
          .from("watchlist")
          .select("*")
          .eq("user_id", user.id);

        if (watchlistError) throw watchlistError;

        // Get all exchange rates
        const { data: ratesData, error: ratesError } = await supabase
          .from("exchange_rates")
          .select("*");

        if (ratesError) throw ratesError;

        // Combine watchlist with rates
        const watchlistWithRates =
          watchlistData?.map((item) => {
            const [baseCurrency, targetCurrency] =
              item.currency_pair.split("-");
            const rate = ratesData?.find(
              (r) =>
                r.base_currency === baseCurrency &&
                r.target_currency === targetCurrency
            );

            return {
              ...item,
              rate: rate?.rate,
              last_updated: rate?.last_updated,
            };
          }) || [];

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
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading watchlist..." color="success" />
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

  if (watchlist.length === 0) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Currency Watchlist
          </h2>
          <p className="text-center text-foreground/60">
            No currencies in watchlist
          </p>
        </CardBody>
      </Card>
    );
  }

  const handleCurrencyClick = (currencyPair: string) => {
    router.push(`/dashboard/currencies/${currencyPair.toLowerCase()}`);
  };

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
      <CardBody>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Currency Watchlist
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-content4">
                <th className="py-4 px-4 text-lg font-bold">PAIR</th>
                <th className="py-4 px-4 text-lg font-bold">RATE</th>
                <th className="py-4 px-4 text-lg font-bold">UPDATED</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:my-1">
              {watchlist.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleCurrencyClick(item.currency_pair)}
                  className="border-b border-content4 cursor-pointer transition-all duration-200 hover:bg-[#c4c4c4] dark:hover:bg-[#3a3a3a] rounded-lg"
                >
                  <td className="py-4 px-4 text-lg">{item.currency_pair}</td>
                  <td className="py-4 px-4 text-lg">
                    {item.rate ? item.rate.toFixed(4) : "N/A"}
                  </td>
                  <td className="py-4 px-4 text-lg text-foreground/60">
                    {item.last_updated
                      ? new Date(item.last_updated).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
