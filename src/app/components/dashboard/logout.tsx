import { Button } from "@nextui-org/button";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function Logout() {
  const router = useRouter();
  const buttonStyles =
    "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="flex gap-4 items-center">
        <Button
          color="success"
          variant="ghost"
          className={`${buttonStyles} text-base font-medium`}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
