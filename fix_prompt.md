Please address the comments from this code review:

## Overall Comments
- There is a lot of duplicated logic for deriving `firstResponseAt`/`responseDueAt`/`resolutionDueAt` across `IncidentService` and `CommentService`; consider centralizing this in helper methods on `SlaService` to avoid drift in future changes.
- `SlaService.getSlaLimits` is typed for specific priorities but is frequently called with `as any`; tightening the typing (e.g. sharing the `priority` enum type from the schema) or adding a runtime guard would make these calls safer and clearer.
- The SLA warning thresholds for response and resolution are hard-coded in multiple `switch (priority)` blocks; capturing these in a single configuration object (similar to `LIMITS`) would make the thresholds easier to adjust and reason about.

## Individual Comments

### Comment 1
<location path="lib/services/sla.service.ts" line_range="160-164" />
<code_context>
+            }
+        }
+
+        // Write Optimization: Only update database if status has changed
+        if (incident.slaStatus !== computedStatus) {
+            await db
+                .update(incidents)
+                .set({ slaStatus: computedStatus as any })
+                .where(eq(incidents.id, incidentId));
+        }
</code_context>
<issue_to_address>
**suggestion (bug_risk):** Casting `computedStatus` to `any` when writing the enum obscures type mismatches between logic and schema.

Because `slaStatus` is typed as `slaStatusEnum` but `computedStatus` is a plain string, the `computedStatus as any` cast disables type safety. If the enum or the computed statuses change independently, the compiler won’t catch mismatches and writes can fail at runtime. Please type `computedStatus` as the enum union (or derive it from `slaStatusEnum`) and avoid `as any`, so changes to statuses must be reflected consistently in both the enum and the SLA logic.

Suggested implementation:

```typescript
                .set({ slaStatus: computedStatus })

```

To fully enforce enum-based typing and remove the need for `as any`, you should also:
1. Import or define a type that represents the `slaStatusEnum` union, for example:
   - If using a Drizzle enum: `import { slaStatusEnum } from "../db/schema";` then `type SlaStatus = (typeof slaStatusEnum.enumValues)[number];`
   - Or reuse the type of `incidents.slaStatus` if already exported from your schema.
2. Change the declaration of `computedStatus` from `string` (or implicit `string`) to that union type, e.g. `let computedStatus: SlaStatus;`.
3. Ensure all assignments to `computedStatus` use values that are members of `slaStatusEnum` (e.g. `"Breached_Both"`, `"Breached_Response"`, etc.) and are spelled exactly as in the enum; if TypeScript complains, fix the enum or the literals rather than reintroducing `as any`.
4. If `computedStatus` can be `undefined` before being computed, model that explicitly (e.g. `let computedStatus: SlaStatus | undefined;`) and narrow the type before using it in the `.set({ slaStatus: computedStatus })` call.
</issue_to_address>

### Comment 2
<location path="app/api/cron/sla/route.ts" line_range="4-13" />
<code_context>
+import { NextResponse } from "next/server";
+import { SlaService } from "@/lib/services/sla.service";
+
+export const POST = async () => {
+    try {
+        await SlaService.checkOverdueTickets();
+        return NextResponse.json({ success: true, message: "SLA checks updated successfully." }, { status: 200 });
+    } catch (error: unknown) {
+        console.error("Cron SLA check error:", error);
+        const err = error as Error;
+        return NextResponse.json(
+            { error: "Internal Server Error", details: err.message },
+            { status: 500 }
+        );
+    }
+};
</code_context>
<issue_to_address>
**🚨 suggestion (security):** Cron route uses a fixed `POST` handler; consider guarding against accidental external invocation or using a non-standard verb.

This endpoint is publicly accessible as an unauthenticated POST and can be invoked by any client to trigger SLA recalculation over all active incidents. If it’s meant only for the internal scheduler, please restrict access (e.g., auth, API key, internal network checks) or move it to a non-public verb/path appropriate for your deployment model.

Suggested implementation:

```typescript
import { NextResponse } from "next/server";
import { SlaService } from "@/lib/services/sla.service";

const CRON_SLA_SECRET = process.env.CRON_SLA_SECRET;

export const POST = async (request: Request) => {
    if (!CRON_SLA_SECRET) {
        console.error("Cron SLA route misconfiguration: CRON_SLA_SECRET is not set.");
        return NextResponse.json(
            { error: "Misconfigured cron route" },
            { status: 500 }
        );
    }

    const providedSecret = request.headers.get("x-cron-secret");

    if (providedSecret !== CRON_SLA_SECRET) {
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

```

1. Add a `CRON_SLA_SECRET` (or similar) environment variable to your deployment configuration (e.g., `.env`, hosting provider’s env settings).
2. Configure your internal scheduler (cron/queue system) to call this endpoint with the `x-cron-secret` header set to the same secret value.
3. Optionally, if you prefer a non-standard verb, you can change `export const POST` to `export const HEAD` or a different method and adjust your scheduler accordingly.
</issue_to_address>