"use client";

import { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Wallet, BarChart4, User, Users, Settings, Coins } from "lucide-react";
import { SidebarButton } from "./sidebar-button";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const buttonStyles =
    "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110";

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-[#ffffff] dark:bg-[#000000] border-r border-content4 flex flex-col py-4 rounded-r-lg transition-all duration-300 z-50 ${
        isMobile ? "w-20" : isExpanded ? "w-64" : "w-20"
      }`}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
    >
      <div className="flex justify-center w-full">
        <Link
          href="/dashboard/wallet"
          className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 transition-colors ${
            pathname === "/dashboard/wallet"
              ? "bg-[#22c55e] dark:bg-[#292828]"
              : "hover:bg-[#22c55e] dark:hover:bg-[#292828]"
          }`}
        >
          <Wallet
            className={`w-6 h-6 ${
              pathname === "/dashboard/wallet"
                ? "text-black dark:text-white"
                : "text-black dark:text-white hover:text-black dark:hover:text-white"
            }`}
          />
        </Link>
      </div>

      <div className="flex flex-col gap-6 w-full items-center mt-6">
        <SidebarButton
          icon={BarChart4}
          label="Dashboard"
          isExpanded={isExpanded}
          isMobile={isMobile}
          onClick={() => router.push("/dashboard")}
        />
        <SidebarButton
          icon={Coins}
          label="Currencies"
          isExpanded={isExpanded}
          isMobile={isMobile}
          onClick={() => router.push("/dashboard/currencies")}
        />
        <SidebarButton
          icon={Users}
          label="Friends"
          isExpanded={isExpanded}
          isMobile={isMobile}
          onClick={() => router.push("/dashboard/friends")}
        />
        <SidebarButton
          icon={User}
          label="Profile"
          isExpanded={isExpanded}
          isMobile={isMobile}
          onClick={() => router.push("/dashboard/profile")}
        />
        <SidebarButton
          icon={Settings}
          label="Settings"
          isExpanded={isExpanded}
          isMobile={isMobile}
          onClick={() => router.push("/dashboard/settings")}
        />
      </div>
    </div>
  );
}
