import { UsersTable } from "@/components/admin/UsersTable";

export default function BannedUsersPage() {
  return (
    <UsersTable
      queryKey="admin-users-banned"
      title="Banned Users"
      showBan={true}
      extraParams={{ status: "BANNED" }}
    />
  );
}
