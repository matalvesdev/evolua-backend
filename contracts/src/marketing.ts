import { z } from 'zod';

export const MarketingGenerateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'tiktok']).default('instagram'),
  format: z.enum(['feed', 'stories', 'reels', 'carrossel']).default('feed'),
});
export type MarketingGenerateRequest = z.infer<typeof MarketingGenerateRequestSchema>;

export const MarketingGenerateResponseSchema = z.object({
  content: z.string(),
});
export type MarketingGenerateResponse = z.infer<typeof MarketingGenerateResponseSchema>;
