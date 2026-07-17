import { NextResponse } from "next/server";
import { SlaService } from "@/lib/services/sla.service";
import { withAudit } from "@/lib/utils/audit";

export const POST = async (req: Request) => {
    return withAudit(req, 'POST cron/sla', async () => {
        const cronSecret = process.env.CRON_SLA_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { error: "Misconfigured cron route" },
                { status: 500 }
            );
        }

        const providedSecret = req.headers.get("x-cron-secret");

        if (providedSecret !== cronSecret) {
            console.warn("Unauthorized attempt to invoke cron SLA route.");
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await SlaService.checkOverdueTickets();
        return NextResponse.json(
            { success: true, message: "SLA checks updated successfully." },
            { status: 200 }
        );
    });
};
