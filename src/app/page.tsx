"use client";

import { Button } from "@nextui-org/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  const handleLogin = () => {
    router.push("/auth");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#f4f4f4] dark:bg-[#161616] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-16 rounded-full bg-green-500/5"
            initial={{
              x: dimensions.width * Math.random(),
              y: dimensions.height * Math.random(),
            }}
            animate={{
              x: [
                dimensions.width * Math.random(),
                dimensions.width * Math.random(),
                dimensions.width * Math.random(),
              ],
              y: [
                dimensions.height * Math.random(),
                dimensions.height * Math.random(),
                dimensions.height * Math.random(),
              ],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="text-4xl md:text-6xl font-bold"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Welcome to <span className="text-[#22c55e]">EzChange</span>!
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-foreground/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Over 200 currencies from around the world
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Button
            color="success"
            size="lg"
            className="text-lg font-semibold px-8 py-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
            onClick={handleLogin}
          >
            Get Started
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
