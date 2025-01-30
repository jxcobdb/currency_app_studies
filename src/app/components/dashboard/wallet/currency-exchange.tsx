"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  last_updated: string;
}

interface WalletBalance {
  currency: string;
  balance: number;
}

interface RateCache {
  [key: string]: {
    rates: ExchangeRate[];
    timestamp: number;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;

const ratesCache: RateCache = {};

export function CurrencyExchange() {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  const isCacheValid = useCallback((baseCurrency: string) => {
    const cache = ratesCache[baseCurrency];
    if (!cache) return false;

    const now = Date.now();
    return now - cache.timestamp < CACHE_DURATION;
  }, []);

  const getRates = useCallback(
    async (baseCurrency: string) => {
      if (isCacheValid(baseCurrency)) {
        return ratesCache[baseCurrency].rates;
      }

      const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`);
      if (!response.ok) throw new Error("Failed to fetch exchange rates");

      const data = await response.json();

      ratesCache[baseCurrency] = {
        rates: data,
        timestamp: Date.now(),
      };

      return data;
    },
    [isCacheValid]
  );

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: wallet } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!wallet) throw new Error("No wallet found");

        const { data: balances, error: balancesError } = await supabase
          .from("wallet_balances")
          .select("currency, balance")
          .eq("wallet_id", wallet.id);

        if (balancesError) throw balancesError;
        setWalletBalances(balances || []);

        if (balances && balances.length > 0) {
          setFromCurrency(balances[0].currency);
        }

        const { data: allRates, error: ratesError } = await supabase
          .from("exchange_rates")
          .select("target_currency")
          .eq("base_currency", "EUR");

        if (ratesError) throw ratesError;

        const currencies = Array.from(
          new Set(allRates?.map((rate) => rate.target_currency))
        );
        setAvailableCurrencies(currencies);

        // Set initial to currency
        if (currencies.length > 0) {
          setToCurrency(currencies[0]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading wallet data:", error);
        setError("Failed to load wallet data");
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, []);

  // Load exchange rates when currencies change
  useEffect(() => {
    const loadExchangeRates = async () => {
      if (!fromCurrency) return;

      try {
        const data = await getRates(fromCurrency);
        setRates(data);

        // Calculate converted amount if we have an amount
        if (amount && toCurrency) {
          const rate =
            data.find(
              (r: ExchangeRate) =>
                r.base_currency === fromCurrency &&
                r.target_currency === toCurrency
            )?.rate || 0;
          setConvertedAmount(parseFloat(amount) * rate);
        }
      } catch (error) {
        console.error("Error loading exchange rates:", error);
        setError("Failed to load exchange rates");
      }
    };

    loadExchangeRates();
  }, [fromCurrency, toCurrency, amount, getRates]);

  const handleExchange = async () => {
    try {
      setError(null);
      if (!amount || !fromCurrency || !toCurrency) return;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      // Check if user has sufficient balance
      const currentBalance =
        walletBalances.find((b) => b.currency === fromCurrency)?.balance || 0;
      if (currentBalance < numAmount) {
        setError("Insufficient balance");
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("No wallet found");

      // Get current exchange rate (from cache if available)
      const currentRates = isCacheValid(fromCurrency)
        ? ratesCache[fromCurrency].rates
        : await getRates(fromCurrency);

      const rate = currentRates.find(
        (r: ExchangeRate) =>
          r.base_currency === fromCurrency && r.target_currency === toCurrency
      )?.rate;

      if (!rate) throw new Error("Exchange rate not found");

      const convertedAmount = numAmount * rate;

      // Start transaction
      const { error: exchangeError } = await supabase.rpc("exchange_currency", {
        user_id: user.id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: numAmount,
      });

      if (exchangeError) throw exchangeError;

      // Refresh wallet balances
      const { data: newBalances } = await supabase
        .from("wallet_balances")
        .select("currency, balance")
        .eq("wallet_id", wallet.id);

      setWalletBalances(newBalances || []);
      setAmount("");
      setConvertedAmount(null);
    } catch (error) {
      console.error("Error performing exchange:", error);
      setError("Failed to perform exchange");
    }
  };

  if (isLoading) {
    return <div>Loading exchange rates...</div>;
  }

  if (error) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="p-6">
          <div className="text-red-500">{error}</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
      <CardBody className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Currency Exchange</h2>

          <div className="space-y-4">
            <Input
              type="number"
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
              placeholder="Enter amount to exchange"
            />

            <div className="flex items-center gap-2">
              <Select
                label="From"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="flex-1"
                selectedKeys={fromCurrency ? [fromCurrency] : []}
              >
                {walletBalances.map((balance) => (
                  <SelectItem
                    key={balance.currency}
                    value={balance.currency}
                    textValue={balance.currency}
                  >
                    {balance.currency} (Balance: {balance.balance.toFixed(2)})
                  </SelectItem>
                ))}
              </Select>

              <ArrowRight className="w-5 h-5" />

              <Select
                label="To"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="flex-1"
                selectedKeys={toCurrency ? [toCurrency] : []}
              >
                {availableCurrencies
                  .filter((curr) => curr !== fromCurrency)
                  .map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
              </Select>
            </div>

            {convertedAmount !== null && (
              <div className="text-center text-foreground/60">
                {amount} {fromCurrency} = {convertedAmount.toFixed(2)}{" "}
                {toCurrency}
              </div>
            )}

            <Button
              color="success"
              className="w-full rounded-2xl"
              onClick={handleExchange}
              disabled={!amount || fromCurrency === toCurrency || isLoading}
            >
              Exchange
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
