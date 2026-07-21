import { z } from 'zod';

export const initiateCallSchema = z.object({
  serviceRequestId: z.string().min(1, 'serviceRequestId is required'),
});

// Twilio status callback webhook payload — only the fields we care about.
// Twilio sends more fields; we ignore anything extra via .passthrough().
export const twilioStatusCallbackSchema = z
  .object({
    CallSid: z.string(),
    CallStatus: z.string(),
    CallDuration: z.coerce.number().optional(),
    Timestamp: z.string().optional(),
  })
  .passthrough();
