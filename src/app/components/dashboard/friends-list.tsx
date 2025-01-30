"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@nextui-org/card";
import { Button } from "@nextui-org/button";
import { Avatar } from "@nextui-org/avatar";
import { Plus } from "lucide-react";
import { Spinner } from "@nextui-org/spinner";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
}

export function FriendsList() {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadFriends = async () => {
      try {
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: sentFriends, error: sentError } = await supabase
          .from("friend_requests")
          .select(
            "receiver:profiles!friend_requests_receiver_id_fkey(id, nickname, avatar_url, created_at)"
          )
          .eq("sender_id", user.id)
          .eq("status", "accepted")
          .order("created_at", { ascending: false });

        if (sentError) throw sentError;

        const { data: receivedFriends, error: receivedError } = await supabase
          .from("friend_requests")
          .select(
            "sender:profiles!friend_requests_sender_id_fkey(id, nickname, avatar_url, created_at)"
          )
          .eq("receiver_id", user.id)
          .eq("status", "accepted")
          .order("created_at", { ascending: false });

        if (receivedError) throw receivedError;

        const sentProfiles = (sentFriends || []).map((f: any) => f.receiver);
        const receivedProfiles = (receivedFriends || []).map(
          (f: any) => f.sender
        );
        const friendProfiles = [...sentProfiles, ...receivedProfiles]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 3);

        setFriends(friendProfiles);
      } catch (error) {
        console.error("Error loading friends:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load friends"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();

    const channel = supabase
      .channel("friend_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
        },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleAddFriend = () => {
    router.push("/dashboard/friends");
  };

  if (isLoading) {
    return (
      <Card className="bg-[#d4d4d4] dark:bg-[#292828]">
        <CardBody className="flex items-center justify-center min-h-[200px]">
          <Spinner label="Loading friends..." color="success" />
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
            <h2 className="text-xl font-semibold">Friends</h2>
            <Button
              isIconOnly
              color="success"
              className="rounded-2xl"
              size="sm"
              onPress={handleAddFriend}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {friends.length === 0 ? (
            <div className="text-center text-foreground/60 py-4">
              No friends yet
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex justify-between items-center p-3 bg-[#e4e4e4] dark:bg-[#3a3a3a] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={friend.avatar_url || undefined}
                      className="w-10 h-10"
                      alt={friend.nickname}
                    />
                    <div>
                      <p className="font-medium">{friend.nickname}</p>
                      <p className="text-sm text-foreground/60">
                        Joined{" "}
                        {new Date(friend.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
