"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/modal";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { Input } from "@nextui-org/input";
import { supabase } from "@/lib/supabase/client";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendNickname: string;
}

interface WalletBalance {
  currency: string;
  balance: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  friendId,
  friendNickname,
}: PaymentModalProps) {
  const [availableCurrencies, setAvailableCurrencies] = useState<
    WalletBalance[]
  >([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWalletBalances = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: wallet } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!wallet) throw new Error("No wallet found");

        const { data: balances, error } = await supabase
          .from("wallet_balances")
          .select("currency, balance")
          .eq("wallet_id", wallet.id)
          .gt("balance", 0);

        if (error) throw error;
        setAvailableCurrencies(balances || []);
      } catch (error) {
        console.error("Error loading wallet balances:", error);
        setError("Failed to load wallet balances");
      }
    };

    if (isOpen) {
      loadWalletBalances();
    } else {
      setSelectedCurrency("");
      setAmount("");
      setError(null);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get sender's wallet
      const { data: senderWallet, error: senderError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (senderError) throw senderError;

      // Get receiver's wallet
      const { data: receiverWallet, error: receiverError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", friendId)
        .single();

      if (receiverError) throw receiverError;

      // Start transaction
      const { error: transactionError } = await supabase.rpc("transfer_money", {
        p_from_wallet_id: senderWallet.id,
        p_to_wallet_id: receiverWallet.id,
        p_currency: selectedCurrency,
        p_amount: parseFloat(amount),
      });

      if (transactionError) throw transactionError;

      onClose();
    } catch (error) {
      console.error("Error processing payment:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process payment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Send Money to {friendNickname}</ModalHeader>
        <ModalBody>
          <Select
            label="Currency"
            placeholder="Select currency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            selectedKeys={selectedCurrency ? [selectedCurrency] : []}
          >
            {availableCurrencies.map((balance) => (
              <SelectItem
                key={balance.currency}
                value={balance.currency}
                textValue={balance.currency}
              >
                {balance.currency} ({balance.balance})
              </SelectItem>
            ))}
          </Select>
          <Input
            type="number"
            label="Amount"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="success"
            onPress={handlePayment}
            isLoading={isLoading}
            isDisabled={!selectedCurrency || !amount || parseFloat(amount) <= 0}
          >
            Send Money
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
