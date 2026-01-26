"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import type { GardenRole } from "@prisma/client";

interface Member {
  id: string;
  role: GardenRole;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface Owner {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface GardenMemberListProps {
  gardenId: string;
  owner: Owner;
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}

export function GardenMemberList({
  gardenId,
  owner,
  members,
  canManage,
  currentUserId,
}: GardenMemberListProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleChangeRole = async (memberId: string, newRole: "VIEWER" | "ADMIN") => {
    setIsUpdating(memberId);

    try {
      const response = await fetch(`/api/gardens/${gardenId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update member role. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setIsUpdating(memberId);

    try {
      const response = await fetch(`/api/gardens/${gardenId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People who have access to this garden
            </CardDescription>
          </div>
          {canManage && <InviteMemberDialog gardenId={gardenId} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Owner */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={owner.image || ""} />
                <AvatarFallback>
                  {owner.name?.charAt(0).toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {owner.name || owner.email}
                  {owner.id === currentUserId && (
                    <span className="text-sm text-gray-500 ml-2">(you)</span>
                  )}
                </p>
                {owner.name && owner.email && (
                  <p className="text-sm text-gray-500">{owner.email}</p>
                )}
              </div>
            </div>
            <Badge>Owner</Badge>
          </div>

          {/* Members */}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user.image || ""} />
                  <AvatarFallback>
                    {member.user.name?.charAt(0).toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.user.name || member.user.email}
                    {member.user.id === currentUserId && (
                      <span className="text-sm text-gray-500 ml-2">(you)</span>
                    )}
                  </p>
                  {member.user.name && member.user.email && (
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {member.role === "ADMIN" ? "Admin" : "Viewer"}
                </Badge>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isUpdating === member.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleChangeRole(
                            member.id,
                            member.role === "ADMIN" ? "VIEWER" : "ADMIN"
                          )
                        }
                      >
                        {member.role === "ADMIN"
                          ? "Change to Viewer"
                          : "Change to Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No other members yet
              {canManage && ". Use the invite button to add people."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
