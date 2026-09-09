import Anthropic from '@anthropic-ai/sdk';
import { env, isAnthropicConfigured } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { Job } from './job.model.js';
import { ServiceProviderInventoryItem } from './serviceProviderInventoryItem.model.js';
import { ServiceProviderBlog } from './serviceProviderBlog.model.js';

const MODEL = 'claude-opus-5';

/**
 * Grounding context for the assistant.
 *
 * The assistant is only useful if it answers from this service provider's actual
 * state — their stock, their current job. Without it the model can only guess,
 * which is how the previous hardcoded version came to quote stock levels and a
 * named customer's warranty date that were never real.
 */
async function buildContext(serviceProviderId) {
  const [activeJob, inventory, blogs] = await Promise.all([
    Job.findOne({ serviceProvider: serviceProviderId, activeStep: { $nin: ['idle', 'completed'] } })
      .populate({ path: 'serviceRequest', select: 'category description model warranty' }),
    ServiceProviderInventoryItem.find({ serviceProvider: serviceProviderId }).select('name sku qty price'),
    ServiceProviderBlog.find().select('title category body').limit(20),
  ]);

  const lines = [];

  if (activeJob) {
    const sr = activeJob.serviceRequest;
    lines.push(
      '## The serviceProvider\'s current job',
      `- Type: ${activeJob.type}`,
      `- Appliance category: ${sr?.category || 'unknown'}`,
      `- Model: ${sr?.model || 'not recorded'}`,
      `- Reported issue: ${sr?.description || 'not recorded'}`,
      `- Warranty status: ${sr?.warranty || 'unknown'}`,
      `- Current step: ${activeJob.activeStep}`,
    );
  } else {
    lines.push('## The serviceProvider\'s current job', '- No job is currently in progress.');
  }

  lines.push('', '## Parts in this serviceProvider\'s own van stock');
  if (inventory.length === 0) {
    lines.push('- Their stock is empty.');
  } else {
    for (const item of inventory) {
      lines.push(`- ${item.name} (SKU ${item.sku || 'n/a'}): ${item.qty ?? 0} in stock, ₹${item.price || 0}`);
    }
  }

  if (blogs.length) {
    lines.push('', '## Published technical guidance (the only reference material you have)');
    for (const b of blogs) {
      lines.push(`### ${b.title}${b.category ? ` (${b.category})` : ''}`, b.body || '');
    }
  }

  return lines.join('\n');
}

const SYSTEM_RULES = `You are the in-app assistant for a Nigam Care field service serviceProvider who is on site, often mid-repair.

Ground every factual claim in the context below. It is the only information you have about this serviceProvider.
- Never invent stock levels, part prices, SKUs, customer names, warranty dates, or job details. If the context does not contain it, say you do not have it and tell them where in the app to look (Inventory for stock, the job detail for warranty, Technical Support for anything else).
- General repair and safety knowledge is fine to answer from your own expertise. Facts about *this* serviceProvider, *this* job, or *this* stock must come from the context.
- Safety first: if a step carries an electrical, refrigerant, or working-at-height risk, say so before the procedure.

Keep responses focused and brief — they are read on a phone, one-handed, often in poor light. Lead with the answer. Two or three short sentences is usually right; use a short numbered list for a procedure. Skip preamble and pleasantries.`;

/**
 * Answers a service provider's question.
 *
 * Adaptive thinking is on for diagnostic reasoning. A safety-classifier refusal
 * comes back as a normal 200 with stop_reason 'refusal', so that is checked
 * before reading content; server-side fallbacks re-serve a declined request on
 * another model within the same call.
 */
export async function askAssistant(serviceProviderId, { messages }) {
  if (!isAnthropicConfigured) {
    throw new ApiError(503, 'The assistant is not configured on this server.');
  }

  const client = new Anthropic({ apiKey: env.anthropic.apiKey });
  const context = await buildContext(serviceProviderId);

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2048,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: context },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  if (response.stop_reason === 'refusal') {
    throw new ApiError(422, 'The assistant could not answer that. Please contact Technical Support.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { reply: text || 'No answer was produced. Please try rephrasing.', model: response.model };
}
