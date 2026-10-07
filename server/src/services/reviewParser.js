import { z } from 'zod';

const commentSchema = z.object({
  type: z.literal('comment'),
  line: z.number().int().min(1),
  endLine: z.number().int().min(1),
  severity: z.enum(['bug', 'security', 'performance', 'style']),
  category: z.string().min(1),
  message: z.string().min(1),
  suggestedFix: z.string().default(''),
});

const summarySchema = z.object({
  type: z.literal('summary'),
  summary: z.string().min(1),
});

const lineSchema = z.discriminatedUnion('type', [commentSchema, summarySchema]);

export function createParser() {
  let buffer = '';

  function* parseLine(raw) {
    let trimmed = raw.trim();
    if (!trimmed) return;

    trimmed = trimmed.replace(/^```[a-z]*$/i, '').replace(/^```$/i, '');
    trimmed = trimmed.trim();
    if (!trimmed) return;

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return;
    }

    const result = lineSchema.safeParse(parsed);
    if (result.success) {
      yield result.data;
    }
  }

  function* feed(chunk) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      yield* parseLine(line);
    }
  }

  function* flush() {
    if (buffer.trim()) {
      yield* parseLine(buffer);
      buffer = '';
    }
  }

  return { feed, flush };
}
