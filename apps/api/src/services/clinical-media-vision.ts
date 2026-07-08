const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen2.5-vl:7b';
const OLLAMA_VISION_TIMEOUT_MS = Number(process.env.OLLAMA_VISION_TIMEOUT_MS ?? 120000);

export type VisionExtractionResult = {
  rawText: string;
  phrases: string[];
  model: string;
};

type OllamaChatResponse = {
  message?: { content?: string };
};

function splitSymptomPhrases(text: string) {
  const chunks = text
    .split(/[\n,;•]+/)
    .map((part) => part.replace(/^[\s\-*]+/, '').trim())
    .filter((part) => part.length > 2);

  const unique = new Set<string>();
  for (const chunk of chunks) {
    unique.add(chunk);
    const words = chunk.split(/\s+/).filter((word) => word.length > 3);
    if (words.length >= 2) {
      unique.add(words.slice(0, 4).join(' '));
    }
  }

  return [...unique].slice(0, 8);
}

function buildVisionPrompt(input: {
  mediaTypeLabel: string;
  bodyRegion?: string | null;
}) {
  const region = input.bodyRegion?.trim() ? ` Body region: ${input.bodyRegion.trim()}.` : '';
  return `You are assisting a homeopathic doctor reviewing a clinical photo.
Image category: ${input.mediaTypeLabel}.${region}

Identify the primary visible physical symptoms in this image.
Use brief clinical keywords only (e.g. "red conjunctiva", "watery discharge", "papular eruption").
Return 2–6 short symptom phrases, one per line. No diagnosis, no remedy names, no extra commentary.`;
}

export async function isOllamaVisionAvailable() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { models?: Array<{ name?: string }> };
    const names = (payload.models ?? []).map((item) => item.name ?? '');
    return names.some((name) => name === OLLAMA_VISION_MODEL || name.startsWith(`${OLLAMA_VISION_MODEL}:`));
  } catch {
    return false;
  }
}

export async function extractClinicalSymptomsFromImage(input: {
  imageBase64: string;
  mediaTypeLabel: string;
  bodyRegion?: string | null;
}): Promise<VisionExtractionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_VISION_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_VISION_MODEL,
        stream: false,
        messages: [
          {
            role: 'user',
            content: buildVisionPrompt(input),
            images: [input.imageBase64]
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama vision request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const rawText = payload.message?.content?.trim() ?? '';
    if (!rawText) {
      throw new Error('Vision model returned no symptom text.');
    }

    const phrases = splitSymptomPhrases(rawText);
    return {
      rawText,
      phrases: phrases.length ? phrases : [rawText.slice(0, 120)],
      model: OLLAMA_VISION_MODEL
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function ollamaVisionConfig() {
  return {
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_VISION_MODEL
  };
}
