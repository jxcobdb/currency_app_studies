"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../../components/dashboard/sidebar/sidebar";
import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Avatar } from "@nextui-org/avatar";
import { Search, UserPlus, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Spinner } from "@nextui-org/spinner";
import { PaymentModal } from "@/app/components/dashboard/friends/payment-modal";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender: Profile;
}

interface AcceptedFriend {
  sender: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
  receiver: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
}

interface FriendData {
  receiver?: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
  sender?: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
}

interface SentFriendData {
  receiver: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
}

interface ReceivedFriendData {
  sender: {
    id: string;
    nickname: string;
    avatar_url: string;
    created_at: string;
  };
}

export default function FriendsPage() {
  const buttonStyles =
    "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110";
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>(
    []
  );
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setCurrentUser(profile);

        const { data: requests, error: requestsError } = await supabase
          .from("friend_requests")
          .select(
            `
            *,
            sender:profiles!friend_requests_sender_id_fkey(*)
          `
          )
          .eq("receiver_id", user.id)
          .eq("status", "pending");

        if (requestsError) throw requestsError;
        setFriendRequests(requests || []);

        const { data: sentFriends, error: sentError } = await supabase
          .from("friend_requests")
          .select(
            "receiver:profiles!friend_requests_receiver_id_fkey(id, nickname, avatar_url, created_at)"
          )
          .eq("sender_id", user.id)
          .eq("status", "accepted");

        if (sentError) throw sentError;

        const { data: receivedFriends, error: receivedError } = await supabase
          .from("friend_requests")
          .select(
            "sender:profiles!friend_requests_sender_id_fkey(id, nickname, avatar_url, created_at)"
          )
          .eq("receiver_id", user.id)
          .eq("status", "accepted");

        if (receivedError) throw receivedError;

        const sentProfiles = (
          (sentFriends || []) as unknown as SentFriendData[]
        ).map((f) => f.receiver);
        const receivedProfiles = (
          (receivedFriends || []) as unknown as ReceivedFriendData[]
        ).map((f) => f.sender);

        const friendProfiles = [...sentProfiles, ...receivedProfiles];
        setFriends(friendProfiles);

        const { data: users, error: usersError } = await supabase
          .from("profiles")
          .select("*");

        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw usersError;
        }

        console.log("Raw users data:", users);
        console.log("Current user profile:", profile);
        console.log("Debug data:", {
          allUsers: users?.length || 0,
          friends: friendProfiles.length,
          friendRequests: requests?.length || 0,
          sentFriends: sentFriends?.length || 0,
          receivedFriends: receivedFriends?.length || 0,
          currentUserId: user.id,
          hasProfiles: users && users.length > 0,
          profileFields: users && users[0] ? Object.keys(users[0]) : [],
        });

        const otherUsers = users?.filter((u) => u.id !== user.id) || [];
        setAllUsers(otherUsers);

        const channel = supabase.channel("friend_requests_changes");
        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "friend_requests",
              filter: `receiver_id=eq.${user.id}`,
            },
            () => {
              loadData();
            }
          )
          .subscribe();

        const { data: pendingSentRequests, error: pendingSentError } =
          await supabase
            .from("friend_requests")
            .select("*")
            .eq("sender_id", user.id)
            .eq("status", "pending");

        if (pendingSentError) throw pendingSentError;
        setSentFriendRequests(pendingSentRequests || []);

        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error("Error loading friends data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load friends data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    try {
      if (!currentUser) return;

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: "pending",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    if (!user || !user.nickname) return false;

    const isNotFriend = !friends.some((friend) => friend.id === user.id);
    const hasNoPendingRequest = !friendRequests.some(
      (request) => request.sender_id === user.id
    );
    const hasNoSentRequest = !sentFriendRequests.some(
      (request) => request.receiver_id === user.id
    );
    const matchesSearch = searchQuery
      ? user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return (
      isNotFriend && hasNoPendingRequest && hasNoSentRequest && matchesSearch
    );
  });

  const renderFriendsList = () => {
    if (friends.length === 0) {
      return <p className="text-center text-gray-500">No friends yet</p>;
    }

    return friends.map((friend) => (
      <div
        key={friend.id}
        className="flex items-center justify-between p-4 border-b last:border-b-0"
      >
        <div className="flex items-center gap-4">
          <Avatar src={friend.avatar_url || undefined} name={friend.nickname} />
          <span>{friend.nickname}</span>
        </div>
        <Button
          color="success"
          size="sm"
          className={buttonStyles}
          onPress={() => {
            setSelectedFriend(friend);
            setIsPaymentModalOpen(true);
          }}
        >
          Pay
        </Button>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="ml-20 p-6 flex justify-center items-center h-[calc(100vh-48px)]">
          <Spinner label="Loading friends data..." color="success" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="ml-20 p-6 flex justify-center items-center h-[calc(100vh-48px)]">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f4] dark:bg-[#161616]">
      <Sidebar />
      <main className="flex-grow p-4 md:p-6 ml-[80px]">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold">Friends</h1>
            <div className="relative w-full sm:w-auto">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                startContent={<Search className="w-4 h-4 text-default-400" />}
                className="w-full sm:max-w-xs"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center p-4">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* Friend Requests Section */}
              {friendRequests.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Friend Requests</h2>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {friendRequests.map((request) => (
                      <Card
                        key={request.id}
                        className="bg-[#d4d4d4] dark:bg-[#292828]"
                      >
                        <CardBody className="flex flex-row items-center justify-between p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={request.sender.avatar_url}
                              name={request.sender.nickname}
                            />
                            <span className="font-semibold">
                              {request.sender.nickname}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              isIconOnly
                              color="success"
                              className={buttonStyles}
                              onClick={() => handleAcceptRequest(request.id)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              isIconOnly
                              color="danger"
                              className={buttonStyles}
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends Section */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Your Friends</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {friends.map((friend) => (
                    <Card
                      key={friend.id}
                      className="bg-[#d4d4d4] dark:bg-[#292828]"
                    >
                      <CardBody className="flex flex-row items-center justify-between p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={friend.avatar_url}
                            name={friend.nickname}
                          />
                          <span className="font-semibold">
                            {friend.nickname}
                          </span>
                        </div>
                        <Button
                          color="success"
                          className={buttonStyles}
                          onClick={() => {
                            setSelectedFriend(friend);
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          Pay
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Add Friend Section */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Add Friend</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {allUsers
                    .filter(
                      (user) =>
                        user.nickname
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) &&
                        !friends.some((friend) => friend.id === user.id) &&
                        !friendRequests.some(
                          (request) => request.sender.id === user.id
                        )
                    )
                    .map((user) => (
                      <Card
                        key={user.id}
                        className="bg-[#d4d4d4] dark:bg-[#292828]"
                      >
                        <CardBody className="flex flex-row items-center justify-between p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={user.avatar_url}
                              name={user.nickname}
                            />
                            <span className="font-semibold">
                              {user.nickname}
                            </span>
                          </div>
                          <Button
                            isIconOnly
                            className={buttonStyles}
                            onClick={() => handleSendFriendRequest(user.id)}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        friendId={selectedFriend?.id || ""}
        friendNickname={selectedFriend?.nickname || ""}
      />
    </div>
  );
}
