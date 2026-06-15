# LiquidAI LFM2.5 1.2B Thinking (GGUF)

**Registry id:** `liquidai-lfm2.5-1.2b-thinking-gguf`  
**Ollama runtime id:** `hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF`

## Role intent

Test whether on-device reasoning improves prioritization and fix ordering in Lighthouse Handoff.

## Quick pull

```powershell
ollama run hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF
```

## LocAIly validation

```powershell
node scripts/validate-console.js --mode l2_ollama_memory --model hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF --url https://example.com/
```
