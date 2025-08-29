# Config Additions (env)
Add the following to `.env.example` and support in `src/lib/config.ts`:

MODEL_TIER=realtime-small   # realtime-nano|realtime-small|realtime-med|realtime-large
STT_MODE=streaming          # streaming|batch
TTS_TIER=premium            # premium|standard
METRICS_EXPORTER=cloudwatch # or 'none'|'prometheus'
RETENTION_DAYS=180
BARGE_IN_MS=200
MAX_SILENCE_MS=6000