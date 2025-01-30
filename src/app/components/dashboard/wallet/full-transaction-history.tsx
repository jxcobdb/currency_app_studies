"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";

interface Profile {
  nickname: string | null;
}

interface Transaction {
  id: string;
  type: "exchange" | "send" | "receive";
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  created_at: string;
  sender: Profile | null;
  receiver: Profile | null;
}

export function FullTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      setCurrentUserId(user.id);

      const { data, error: transactionError } = await supabase
        .from("transactions")
        .select(
          `
          id,
          type,
          sender_id,
          receiver_id,
          amount,
          currency,
          created_at,
          sender:profiles!sender_id(nickname),
          receiver:profiles!receiver_id(nickname)
        `
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .returns<Transaction[]>();

      if (transactionError) throw transactionError;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel("transaction_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading transactions..." color="success" />
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

  if (transactions.length === 0) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <div className="text-gray-500">No transactions found</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
      <CardBody>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">From/To</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Currency</th>
                <th className="py-3 px-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const isCurrentUserSender =
                  transaction.sender_id === currentUserId;
                const displayText = isCurrentUserSender
                  ? `To: ${transaction.receiver?.nickname || "Unknown"}`
                  : `From: ${transaction.sender?.nickname || "Unknown"}`;

                return (
                  <tr
                    key={transaction.id}
                    className="border-b border-gray-200 dark:border-gray-800"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded ${
                          transaction.type === "send"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : transaction.type === "receive"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{displayText}</td>
                    <td className="py-3 px-4">{transaction.amount}</td>
                    <td className="py-3 px-4">{transaction.currency}</td>
                    <td className="py-3 px-4">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
