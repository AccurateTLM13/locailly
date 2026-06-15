# LiquidAI LFM2.5 8B-A1B (GGUF)

**Registry id:** `liquidai-lfm2.5-8b-a1b-gguf`  
**Ollama runtime id:** `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF`

## Role intent

Stronger local lane for tool calling and agentic workflow steps when smaller models fail validation.

## Quick pull

```powershell
ollama run hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF
```

## LocAIly validation

```powershell
node scripts/validate-console.js --mode l2_ollama_memory --model hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF --url https://example.com/
```
