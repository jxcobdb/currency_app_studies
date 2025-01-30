"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";

interface ChartData {
  symbol: string;
  value: number;
  originalValue: number;
  eurValue: number;
}

export function CurrencyDistributionChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);

  const generateColors = (count: number) => {
    const baseColors = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8884D8",
      "#82ca9d",
      "#e57373",
      "#ba68c8",
      "#4db6ac",
      "#f06292",
      "#4dd0e1",
      "#aed581",
      "#dce775",
      "#fff176",
      "#ffb74d",
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.508) % 360;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
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

        const { data: balances, error: balancesError } = await supabase
          .from("wallet_balances")
          .select("currency, balance")
          .eq("wallet_id", wallet.id);

        if (balancesError) throw balancesError;

        const { data: rates, error: ratesError } = await supabase
          .from("exchange_rates")
          .select("base_currency, target_currency, rate")
          .eq("base_currency", "EUR");

        if (ratesError) throw ratesError;

        const chartData: ChartData[] = (balances || []).map((balance) => {
          let eurValue = balance.balance;

          if (balance.currency !== "EUR") {
            const rate = rates?.find(
              (r) => r.target_currency === balance.currency
            );
            if (rate) {
              eurValue = balance.balance / rate.rate;
            }
          }

          return {
            symbol: balance.currency,
            value: eurValue,
            originalValue: balance.balance,
            eurValue: eurValue,
          };
        });

        const totalEurValue = chartData.reduce(
          (sum, item) => sum + item.eurValue,
          0
        );

        setData(chartData);
        setTotalValue(totalEurValue);
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

    const balancesChannel = supabase
      .channel("wallet_balances_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_balances",
        },
        () => {
          loadWalletData();
        }
      )
      .subscribe();

    const ratesChannel = supabase
      .channel("exchange_rates_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_rates",
        },
        () => {
          loadWalletData();
        }
      )
      .subscribe();

    return () => {
      balancesChannel.unsubscribe();
      ratesChannel.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[300px]">
          <Spinner label="Loading wallet data..." color="success" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[300px]">
          <div className="text-red-500">{error}</div>
        </CardBody>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Currency Distribution
          </h2>
          <p className="text-foreground/60">No currencies in wallet (0%)</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
      <CardBody>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Currency Distribution
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({
                symbol,
                percent,
              }: {
                symbol: string;
                percent: number;
              }) => `${symbol} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry: ChartData, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={generateColors(data.length)[index]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                props.payload.originalValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: props.payload.symbol,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) +
                  ` (€${props.payload.eurValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})`,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-foreground">
          Total Value:{" "}
          {totalValue.toLocaleString("en-US", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </CardBody>
    </Card>
  );
}
