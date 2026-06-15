# LiquidAI LFM2.5 1.2B Instruct (GGUF)

**Registry id:** `liquidai-lfm2.5-1.2b-instruct-gguf`  
**Ollama runtime id:** `hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF`

## Role intent

Primary comparison candidate against `llama3.2` for Lighthouse Handoff structured output.

## Quick pull (Ollama cache)

```powershell
ollama run hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF
ollama list
```

## LocAIly validation

```powershell
node scripts/validate-console.js --mode l2_ollama_memory --model hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF --url https://example.com/
```

## Notes

- Do not commit GGUF binaries into this repo.
- Store large model files outside the repo (for example `C:\Users\<you>\.locaily\models\` or `D:\AI\Models\LiquidAI\`).
