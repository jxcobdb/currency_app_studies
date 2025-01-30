"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "../../components/dashboard/sidebar/sidebar";
import { Input } from "@nextui-org/input";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { Search, Heart, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Currency {
  base_currency: string;
  target_currency: string;
  rate: number;
  last_updated: string;
}

export default function CurrenciesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableBaseCurrencies, setAvailableBaseCurrencies] = useState<
    string[]
  >([]);
  const buttonStyles =
    "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110";

  const loadAvailableBaseCurrencies = useCallback(async () => {
    try {
      const { data: rates, error } = await supabase
        .from("exchange_rates")
        .select("target_currency")
        .eq("base_currency", "EUR");

      if (error) throw error;

      const uniqueCurrencies = new Set(
        rates?.map((rate) => rate.target_currency) || []
      );
      uniqueCurrencies.add("EUR");
      setAvailableBaseCurrencies(Array.from(uniqueCurrencies).sort());
    } catch (error) {
      console.error("Error loading available currencies:", error);
      setError("Failed to load available currencies");
    }
  }, []);

  const loadWatchlist = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: watchlistData, error: watchlistError } = await supabase
        .from("watchlist")
        .select("currency_pair")
        .eq("user_id", user.id);

      if (watchlistError) throw watchlistError;

      setWatchlist(watchlistData?.map((item) => item.currency_pair) || []);
    } catch (error) {
      console.error("Error loading watchlist:", error);
    }
  }, []);

  const loadExchangeRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ baseCurrency }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }

      const data = await response.json();
      setCurrencies(data);
    } catch (error) {
      console.error("Error loading exchange rates:", error);
      setError("Failed to load exchange rates");
    } finally {
      setLoading(false);
    }
  }, [baseCurrency]);

  useEffect(() => {
    loadAvailableBaseCurrencies();
    loadWatchlist();
    loadExchangeRates();
  }, [loadAvailableBaseCurrencies, loadWatchlist, loadExchangeRates]);

  const toggleWatchlist = useCallback(
    async (currencyPair: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Please log in to manage your watchlist");
          return;
        }

        if (watchlist.includes(currencyPair)) {
          const { error: deleteError } = await supabase
            .from("watchlist")
            .delete()
            .eq("user_id", user.id)
            .eq("currency_pair", currencyPair);

          if (deleteError) throw deleteError;

          setWatchlist((prev) => prev.filter((pair) => pair !== currencyPair));
        } else {
          const { error: insertError } = await supabase
            .from("watchlist")
            .insert({
              user_id: user.id,
              currency_pair: currencyPair,
            });

          if (insertError) throw insertError;

          setWatchlist((prev) => [...prev, currencyPair]);
        }
      } catch (error) {
        console.error("Error updating watchlist:", error);
        setError("Failed to update watchlist");
      }
    },
    [watchlist]
  );

  const handleBaseChange = async (newBase: string) => {
    setBaseCurrency(newBase);
    await loadExchangeRates();
  };

  const handleCurrencyClick = (currency: string) => {
    router.push(`/dashboard/currencies/${currency.toLowerCase()}`);
  };

  const filteredCurrencies = currencies.filter((currency) =>
    currency.target_currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
        <Sidebar />
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            <div>Loading currency data...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
      <Sidebar />
      <main className="flex-grow p-4 md:p-6 ml-[80px]">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold">
              Currency Exchange Rates
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Select
                label="Base Currency"
                value={baseCurrency}
                onChange={(e) => handleBaseChange(e.target.value)}
                className="w-full sm:w-40"
                selectedKeys={baseCurrency ? [baseCurrency] : []}
              >
                {availableBaseCurrencies.map((currency) => (
                  <SelectItem
                    key={currency}
                    value={currency}
                    textValue={currency}
                  >
                    {currency}
                  </SelectItem>
                ))}
              </Select>
              <Button
                color="success"
                className={`${buttonStyles} w-full sm:w-auto`}
                startContent={<RefreshCw className="w-4 h-4" />}
                onClick={loadExchangeRates}
              >
                Refresh Rates
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="relative w-full sm:w-auto">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currencies..."
              startContent={<Search className="w-4 h-4 text-default-400" />}
              className="w-full sm:max-w-xs"
            />
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCurrencies.map((currency) => (
              <div
                key={currency.target_currency}
                className="cursor-pointer"
                onClick={() => handleCurrencyClick(currency.target_currency)}
              >
                <Card className="bg-[#d4d4d4] dark:bg-[#292828] transition-all duration-200 hover:scale-[1.02] hover:bg-[#e4e4e4] dark:hover:bg-[#363535] hover:shadow-lg">
                  <CardBody className="flex flex-row items-center justify-between p-3 sm:p-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">
                        {currency.target_currency}
                      </h3>
                      <p className="text-xs sm:text-sm text-foreground/60">
                        Last updated:{" "}
                        {new Date(currency.last_updated).toLocaleString()}
                      </p>
                      <p className="text-sm sm:text-base mt-1">
                        1 {baseCurrency} = {currency.rate.toFixed(4)}{" "}
                        {currency.target_currency}
                      </p>
                    </div>
                    <Button
                      isIconOnly
                      className={buttonStyles}
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(
                          `${baseCurrency}-${currency.target_currency}`
                        );
                      }}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          watchlist.includes(
                            `${baseCurrency}-${currency.target_currency}`
                          )
                            ? "fill-current text-red-500"
                            : "text-foreground/60"
                        }`}
                      />
                    </Button>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
