"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@nextui-org/spinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CurrencyRateChartProps {
  currency: string;
}

interface RateData {
  date: string;
  rate: number;
}

export function CurrencyRateChart({ currency }: CurrencyRateChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateData, setRateData] = useState<RateData[]>([]);

  useEffect(() => {
    const loadRateHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/exchange-rates/history?currency=${currency}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical rates");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setRateData(data);
      } catch (err) {
        console.error("Error loading rate history:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load rate history"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRateHistory();
  }, [currency]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner label="Loading exchange rate data..." color="success" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-danger">
        {error}
      </div>
    );
  }

  if (rateData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        No exchange rate data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rateData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} height={60} />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 12 }}
          width={80}
          tickFormatter={(value) => value.toFixed(4)}
        />
        <Tooltip
          formatter={(value: number) => [
            value.toFixed(4),
            `Rate (${currency}/EUR)`,
          ]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 4, fill: "#22c55e" }}
          activeDot={{ r: 6, fill: "#22c55e" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
