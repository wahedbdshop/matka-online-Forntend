import { UsersTable } from "@/components/admin/UsersTable";
export default function KycUnverifiedPage() {
  return (
    <UsersTable
      queryKey="admin-users-kyc-unverified"
      title="KYC Unverified"
      extraParams={{ kycStatus: "UNVERIFIED" }}
    />
  );
}
