import { AppShell } from "@/components/layout/AppShell";
import { Office } from "@/components/Office";
import { Cabinet } from "@/components/Cabinet";

export default function OfficePage() {
  return (
    <AppShell rightPanel={<Cabinet />}>
      <Office />
    </AppShell>
  );
}
