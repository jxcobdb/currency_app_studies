"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { useAuth } from "@/lib/supabase/auth-context";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signUp, signIn } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
        // After signup, automatically log in
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="p-6">
          <h1 className="text-2xl font-bold mb-6">
            {isSignUp ? "Sign Up" : "Log In"}
          </h1>
          {error && (
            <div className="p-4 mb-4 rounded-lg bg-red-500/20 text-red-500">
              {error}
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              classNames={{
                input: "bg-transparent",
                inputWrapper: "bg-[#e4e4e4] dark:bg-[#3a3a3a]",
              }}
            />
            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              classNames={{
                input: "bg-transparent",
                inputWrapper: "bg-[#e4e4e4] dark:bg-[#3a3a3a]",
              }}
            />
            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold bg-[#22c55e] text-white hover:bg-[#1ea952] transition-all duration-200 rounded-2xl"
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
            </Button>
          </form>
          <p className="mt-4 text-center">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <Button
              variant="light"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="ml-2 text-primary"
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </Button>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
