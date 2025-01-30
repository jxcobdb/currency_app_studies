"use client";

import React from "react";
import { Sidebar } from "../../components/dashboard/sidebar/sidebar";
import { WalletOverview } from "../../components/dashboard/wallet/wallet-overview";
import { FullCurrencyWatchlist } from "../../components/dashboard/wallet/full-currency-watchlist";
import { FullTransactionHistory } from "../../components/dashboard/wallet/full-transaction-history";
import { CurrencyDistributionChart } from "../../components/dashboard/wallet/currency-distribution-chart";
import { CurrencyExchange } from "../../components/dashboard/wallet/currency-exchange";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-20 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Wallet</h1>

          <div className="grid gap-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <WalletOverview />
              <CurrencyExchange />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <CurrencyDistributionChart />
              <FullCurrencyWatchlist />
            </div>
            <FullTransactionHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
