import { getEnvVar } from '../../utils/env.ts';

const GRADIENT_API_URL = 'https://api.gradient.ai';
const GRADIENT_API_KEY = getEnvVar('GRADIENT_API_KEY');
const DEFAULT_MODEL_ID = getEnvVar('GRADIENT_MODEL_ID');

interface GradientResponse {
  output: string;
  [key: string]: unknown;
}

export async function gradientInference(prompt: string, modelId = DEFAULT_MODEL_ID) {
  if (!GRADIENT_API_KEY) {
    throw new Error('Missing GRADIENT_API_KEY');
  }
  if (!modelId) {
    throw new Error('Missing Gradient model id');
  }

  const res = await fetch(`${GRADIENT_API_URL}/v1/inference/${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GRADIENT_API_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gradient API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GradientResponse;
  return data;
}
