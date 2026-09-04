import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StaffManager } from "@/components/settings/staff-manager";
import { listAllStaff } from "@/lib/queries/users";
import { CURRENCY_SYMBOL, BUSINESS_HOURS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const staff = await listAllStaff();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Business info and staff accounts.</p>
      </div>

      <Card>
        <CardHeader title="Business Info" />
        <CardBody className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">Center name</p>
            <p className="text-foreground font-medium mt-0.5">GameZone Gaming Center</p>
          </div>
          <div>
            <p className="text-xs text-muted">Currency</p>
            <p className="text-foreground font-medium mt-0.5">Indian Rupee ({CURRENCY_SYMBOL})</p>
          </div>
          <div>
            <p className="text-xs text-muted">Business hours</p>
            <p className="text-foreground font-medium mt-0.5">
              {BUSINESS_HOURS.openHour}:00 — {BUSINESS_HOURS.closeHour === 24 ? "12:00 AM" : `${BUSINESS_HOURS.closeHour}:00`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Timezone</p>
            <p className="text-foreground font-medium mt-0.5">Asia/Kolkata (IST)</p>
          </div>
        </CardBody>
        <p className="px-5 pb-5 text-xs text-muted-2">
          Games, stations and pricing are managed from their own pages in the sidebar.
        </p>
      </Card>

      <StaffManager staff={staff} />
    </div>
  );
}
