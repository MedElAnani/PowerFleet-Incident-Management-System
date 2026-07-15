import { z } from "zod"

export const getIncidentsFilterSchema = z.object({
    search: z.string().optional(),
    type: z.string().transform(val => val?.split(",")).optional(),
    priority: z.string().transform(val => val?.split(",")).optional(),
    status: z.string().transform(val => val?.split(",")).optional(),
    vehicleId: z.coerce.number().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),

    assignedToId: z.coerce.number().optional(),
    slaStatus: z.string().transform(val => val?.split(",")).optional(),
    clientId: z.coerce.number().optional(),
})

export type GetIncidentsFilters = z.infer<typeof getIncidentsFilterSchema>;