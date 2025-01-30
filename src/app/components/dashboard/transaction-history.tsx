"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
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
          .limit(3)
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

  const handleViewAll = () => {
    router.push("/dashboard/wallet");
  };

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading transactions..." color="success" />
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
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <Button
              color="success"
              size="sm"
              className="rounded-2xl"
              onPress={handleViewAll}
            >
              View All
            </Button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center text-foreground/60 py-4">
              No transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const isCurrentUserSender =
                  transaction.sender_id === currentUserId;
                const displayText = isCurrentUserSender
                  ? `To: ${transaction.receiver?.nickname || "Unknown"}`
                  : `From: ${transaction.sender?.nickname || "Unknown"}`;

                return (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-3 bg-[#e4e4e4] dark:bg-[#3a3a3a] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.type === "receive"
                            ? "bg-green-500/20"
                            : "bg-red-500/20"
                        }`}
                      >
                        {transaction.type === "receive" ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{displayText}</p>
                        <p className="text-sm text-foreground/60">
                          {new Date(
                            transaction.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-right">
                        {transaction.amount} {transaction.currency}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
