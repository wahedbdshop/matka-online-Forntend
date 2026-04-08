"use client";
import { UsersTable } from "@/components/admin/UsersTable";

export default function EmailUnverifiedPage() {
  return (
    <UsersTable
      queryKey="admin-users-email-unverified"
      title="Email Unverified"
      extraParams={{ emailVerified: false }}
      showEmailVerify={true} //
    />
  );
}
