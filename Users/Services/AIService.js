// Thin wrapper around the OpenAI Chat Completions API. We use raw fetch
// rather than the `openai` SDK to keep the dependency tree small — the
// surface area we need is one POST and a JSON response.
//
// The wrapper is shared by:
//   - AIController.priceAdvice (short "buy now or wait" recommendation)
//   - AIController.productQA (grounded Q&A on the product page)
//
// Both callers cap max_tokens themselves so this layer doesn't need to
// know which feature is calling — it just enforces the global timeout
// and surfaces clean errors.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TIMEOUT_MS = 15_000;

const callOpenAI = async ({ system, user, maxTokens = 200, temperature = 0.3 }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return { ok: false, reason: 'unconfigured', message: 'OPENAI_API_KEY is not set on the server.' };
    }

    // AbortController so a slow OpenAI call doesn't block the user's request
    // path forever. 15s is generous for gpt-4o-mini answering ~100 tokens.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                temperature,
                max_tokens: maxTokens,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.warn(`[users] OpenAI ${res.status}: ${body.slice(0, 200)}`);
            return { ok: false, reason: 'upstream', message: `OpenAI returned ${res.status}` };
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return { ok: false, reason: 'empty', message: 'OpenAI returned no content.' };
        }
        return { ok: true, content };
    } catch (err) {
        if (err.name === 'AbortError') {
            return { ok: false, reason: 'timeout', message: 'OpenAI request timed out.' };
        }
        console.error('[users] OpenAI threw:', err.message);
        return { ok: false, reason: 'error', message: err.message };
    } finally {
        clearTimeout(t);
    }
};

module.exports = { callOpenAI };
