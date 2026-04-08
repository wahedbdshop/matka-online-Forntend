import { UsersTable } from "@/components/admin/UsersTable";
export default function ActiveUsersPage() {
  return (
    <UsersTable
      queryKey="admin-users-active"
      title="Active Users"
      extraParams={{ status: "ACTIVE" }}
    />
  );
}
