import { NextResponse } from "next/server";
import { SlaService } from "@/lib/services/sla.service";

export const POST = async (request: Request) => {
    const cronSecret = process.env.CRON_SLA_SECRET;

    if (!cronSecret) {
        console.error("Cron SLA route misconfiguration: CRON_SLA_SECRET is not set.");
        return NextResponse.json(
            { error: "Misconfigured cron route" },
            { status: 500 }
        );
    }

    const providedSecret = request.headers.get("x-cron-secret");

    if (providedSecret !== cronSecret) {
        console.warn("Unauthorized attempt to invoke cron SLA route.");
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        await SlaService.checkOverdueTickets();
        return NextResponse.json(
            { success: true, message: "SLA checks updated successfully." },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error("Cron SLA check error:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
};
