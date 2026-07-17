import { NextResponse } from "next/server";
import { SlaService } from "@/lib/services/sla.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";

export const POST = async (req: Request) => {
    const cronSecret = process.env.CRON_SLA_SECRET;

    if (!cronSecret) {
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST cron/sla', message: "Misconfigured cron route", statusCode: 500}, req)
        return NextResponse.json(
            { error: "Misconfigured cron route" },
            { status: 500 }
        );
    }

    const providedSecret = req.headers.get("x-cron-secret");

    if (providedSecret !== cronSecret) {
        console.warn("Unauthorized attempt to invoke cron SLA route.");
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST cron/sla', message: "Unauthorized attempt to invoke cron SLA route.", statusCode: 401}, req)
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        await SlaService.checkOverdueTickets();
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST cron/sla', message: "SLA checks updated successfully.", statusCode: 200}, req)
        return NextResponse.json(
            { success: true, message: "SLA checks updated successfully." },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error("Cron SLA check error:", error);
        const err = error as Error;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST cron/sla', message: err.message, statusCode: 500}, req)
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
};
