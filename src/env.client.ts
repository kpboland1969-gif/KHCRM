import { z } from 'zod';

// Client-side environment variables
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
}
