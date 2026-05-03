import { Corridor } from "@/components/Corridor";
import { Office } from "@/components/Office";
import { Cabinet } from "@/components/Cabinet";

export default function OfficePage() {
  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr 380px" }}>
      <Corridor />
      <Office />
      <Cabinet />
    </div>
  );
}
