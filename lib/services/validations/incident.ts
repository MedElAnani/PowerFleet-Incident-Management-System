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

export const createInternalNoteSchema = z.object({
    title: z.string().min(1, "Title is required"),
    body: z.string().min(1, "Body is required"),
    priority: z.enum(["Low", "Medium", "High", "Critical"]),
    visibility: z.enum(["Public", "Private"]),
    isPinned: z.boolean().optional(),
})

export const createIncidentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    type: z.enum(["GPS Device", "Vehicle", "Driver", "Client Complaint", "Accident", "Fuel", "Mission", "Maintenance", "Payment", "System Bug", "Other"]),
    address: z.string().min(1, "Address is required"),
    vehicleId: z.number().int().positive(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
})

export const createCommentSchema = z.object({
    body: z.string().min(1, "Comment body is required"),
    visibility: z.enum(["Public", "Private"]),
})

export type GetIncidentsFilters = z.infer<typeof getIncidentsFilterSchema>;
export type CreateInternalNoteInput = z.infer<typeof createInternalNoteSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;