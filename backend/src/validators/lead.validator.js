import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = (fieldName) =>
  z.string().regex(objectIdRegex, { message: `Invalid format for ${fieldName}` });

const flexibleObjectIdSchema = (fieldName) =>
  z.preprocess((val) => {
    if (!val) return undefined;
    if (typeof val === 'object' && (val._id || val.id)) return String(val._id || val.id);
    return val;
  }, z.string().regex(objectIdRegex, { message: `Invalid format for ${fieldName}` }).nullable().optional().or(z.literal('')));

const flexibleDateSchema = z.preprocess((val) => {
  if (!val || val === '' || val === 'null' || val === 'undefined') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}, z.date().nullable().optional());

export const createLeadSchema = z.object({
  leadName: z.string({ required_error: 'Lead Name is required.' }).trim().min(1, 'Lead Name is required.'),
  companyName: z.string().trim().optional(),
  email: z.string().trim().optional().or(z.literal('')),
  phone: z.string({ required_error: 'Phone Number is required.' }).trim().min(1, 'Phone Number is required.'),
  city: z.string().trim().optional(),
  source: z.string().trim().optional(),
  interestedService: z.string().trim().optional(),
  campaignName: z.string().trim().optional(),
  leadPlatform: z.string().trim().optional(),
  assignedTo: flexibleObjectIdSchema('assignedTo'),
  status: z.string().optional().or(z.literal('')),
  priority: z.string().optional().or(z.literal('')),
  remarks: z.string().optional(),
  nextFollowUpDate: flexibleDateSchema,
  clientMeetingFixed: z.string().trim().optional().or(z.literal('')),
  admissionYesNo: z.string().trim().optional().or(z.literal('')),
  leadsReceivedDate: flexibleDateSchema,
  followUpDate1: flexibleDateSchema,
  followUpDate2: flexibleDateSchema,
  followUpDate3: flexibleDateSchema,
  followUpDate4: flexibleDateSchema,
  followUpDate5: flexibleDateSchema
}).passthrough();

export const updateLeadSchema = z.object({
  id: z.any().optional(),
  _id: z.any().optional(),
  leadName: z.string().trim().min(1, 'Lead Name cannot be empty.').optional(),
  companyName: z.string().trim().optional(),
  email: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  source: z.string().trim().optional(),
  interestedService: z.string().trim().optional(),
  campaignName: z.string().trim().optional(),
  leadPlatform: z.string().trim().optional(),
  assignedTo: flexibleObjectIdSchema('assignedTo'),
  status: z.string().optional().or(z.literal('')),
  priority: z.string().optional().or(z.literal('')),
  remarks: z.string().optional(),
  nextFollowUpDate: flexibleDateSchema,
  lostReason: z.string().optional(),
  clientMeetingFixed: z.string().trim().optional().or(z.literal('')),
  admissionYesNo: z.string().trim().optional().or(z.literal('')),
  leadsReceivedDate: flexibleDateSchema,
  followUpDate1: flexibleDateSchema,
  followUpDate2: flexibleDateSchema,
  followUpDate3: flexibleDateSchema,
  followUpDate4: flexibleDateSchema,
  followUpDate5: flexibleDateSchema
}).passthrough();

export const bulkUpdateStatusSchema = z.object({
  leadIds: z.array(objectIdSchema('leadId')).min(1, 'At least one lead ID is required.'),
  status: z.enum(['New', 'Contacted', 'Follow Up', 'Interested', 'Converted', 'Lost']),
  lostReason: z.string().optional()
});

export const addFollowUpSchema = z.object({
  leadId: objectIdSchema('leadId').optional(), // can be passed in param
  remarks: z.string().trim().min(1, 'Remarks are required.').optional(),
  nextFollowUpDate: z.string().pipe(z.coerce.date()).nullable().optional().or(z.literal('')),
  callSummary: z.string().trim().optional(),
  meetingNotes: z.string().trim().optional(),
  statusChangedTo: z.enum(['New', 'Contacted', 'Follow Up', 'Interested', 'Converted', 'Lost']).optional().or(z.literal(''))
});

export const updateStatusSchema = z.object({
  leadId: objectIdSchema('leadId').optional(),
  status: z.enum(['New', 'Contacted', 'Follow Up', 'Interested', 'Converted', 'Lost']),
  lostReason: z.string().optional()
});
