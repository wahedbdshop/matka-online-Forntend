import { UsersTable } from "@/components/admin/UsersTable";
export default function AllUsersPage() {
  return (
    <UsersTable
      queryKey="admin-users-all"
      title="All Users"
      showWallet={true}
      showBan={true}
    />
  );
}
