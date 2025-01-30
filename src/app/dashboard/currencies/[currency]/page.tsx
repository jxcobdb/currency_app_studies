"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";
import { Sidebar } from "@/app/components/dashboard/sidebar/sidebar";
import { CurrencyRateChart } from "@/app/components/dashboard/currencies/currency-rate-chart";

interface CurrencyData {
  exchangeRate: number | null;
  lastUpdated: string | null;
}

export default function CurrencyPage() {
  const params = useParams();
  const currency = params.currency as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CurrencyData>({
    exchangeRate: null,
    lastUpdated: null,
  });

  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get latest exchange rate for this currency (using EUR as base)
        const { data: rate, error: rateError } = await supabase
          .from("exchange_rates")
          .select("rate, last_updated")
          .eq("base_currency", "EUR")
          .eq("target_currency", currency.toUpperCase())
          .single();

        if (rateError) throw rateError;

        setData({
          exchangeRate: rate?.rate || null,
          lastUpdated: rate?.last_updated || null,
        });
      } catch (error) {
        console.error("Error loading currency data:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load currency data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrencyData();

    // Subscribe to exchange rates changes
    const ratesChannel = supabase
      .channel("exchange_rates_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_rates",
          filter: `base_currency=eq.EUR,target_currency=eq.${currency.toUpperCase()}`,
        },
        () => {
          loadCurrencyData();
        }
      )
      .subscribe();

    return () => {
      ratesChannel.unsubscribe();
    };
  }, [currency]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
        <Sidebar />
        <main className="flex-grow p-4 md:p-6 ml-[80px]">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
              <CardBody className="flex items-center justify-center min-h-[300px]">
                <Spinner label="Loading currency data..." color="success" />
              </CardBody>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
        <Sidebar />
        <main className="flex-grow p-4 md:p-6 ml-[80px]">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
              <CardBody className="flex items-center justify-center min-h-[300px]">
                <div className="text-red-500">{error}</div>
              </CardBody>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
      <Sidebar />
      <main className="flex-grow p-4 md:p-6 ml-[80px]">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
            <CardBody>
              <h1 className="text-2xl font-bold text-foreground mb-6">
                {currency.toUpperCase()} Overview
              </h1>
              <div className="space-y-4">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">
                    Exchange Rate (EUR)
                  </h2>
                  <p className="text-foreground/60">
                    {data.exchangeRate !== null
                      ? `1 EUR = ${data.exchangeRate} ${currency.toUpperCase()}`
                      : "Rate not available"}
                  </p>
                  {data.lastUpdated && (
                    <p className="text-sm text-foreground/40">
                      Last updated:{" "}
                      {new Date(data.lastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="h-[400px] w-full">
                  <CurrencyRateChart currency={currency.toUpperCase()} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
