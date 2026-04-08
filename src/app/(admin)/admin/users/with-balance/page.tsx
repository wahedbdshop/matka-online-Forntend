import { UsersTable } from "@/components/admin/UsersTable";
export default function WithBalancePage() {
  return (
    <UsersTable
      queryKey="admin-users-with-balance"
      title="Users With Balance"
      showWallet={true}
      extraParams={{ hasBalance: true, orderBy: "balance", order: "desc" }}
    />
  );
}
