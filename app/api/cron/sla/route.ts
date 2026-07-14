import { NextResponse } from "next/server";
import { SlaService } from "@/lib/services/sla.service";

export const POST = async () => {
    try {
        await SlaService.checkOverdueTickets();
        return NextResponse.json({ success: true, message: "SLA checks updated successfully." }, { status: 200 });
    } catch (error: unknown) {
        console.error("Cron SLA check error:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
};
