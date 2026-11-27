import { z } from 'zod';
import { linkField } from './homeTile.validation.js';
import { CUSTOM_SECTION_KINDS } from './homeSection.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const title = z.string().trim().min(1, 'Give the section a heading').max(60, 'Keep the heading under 60 characters');

export const createSectionSchema = z.object({
  kind: z.enum(CUSTOM_SECTION_KINDS),
  title,
  seeAllLink: linkField.optional(),
  isActive: z.boolean().optional(),
});

export const updateSectionSchema = z
  .object({ title: title.optional(), isActive: z.boolean().optional(), seeAllLink: linkField.optional() })
  .strict();

export const reorderSectionsSchema = z.object({ ids: z.array(objectId).min(1).max(100) });

export const sectionIdParamSchema = z.object({ id: objectId });
