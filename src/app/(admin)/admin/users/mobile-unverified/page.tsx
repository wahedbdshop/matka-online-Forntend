import { UsersTable } from "@/components/admin/UsersTable";
export default function MobileUnverifiedPage() {
  return (
    <UsersTable
      queryKey="admin-users-mobile-unverified"
      title="Mobile Unverified"
      extraParams={{ phoneVerified: false }}
    />
  );
}
