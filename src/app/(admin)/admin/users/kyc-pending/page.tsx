import { UsersTable } from "@/components/admin/UsersTable";
export default function KycPendingPage() {
  return (
    <UsersTable
      queryKey="admin-users-kyc-pending"
      title="KYC Pending"
      extraParams={{ kycStatus: "PENDING" }}
    />
  );
}
