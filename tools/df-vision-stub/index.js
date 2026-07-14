// Stub for appclaw's `df-vision` (unpublished on npm). appclaw imports the
// default export and destructures vision helpers (StarkVisionClient,
// detectSimpleAction, …) at module load — a plain object is safe to destructure,
// and the helpers are only *called* in vision mode, which DOM-based YAML flows
// never enter. Each helper is a Proxy trap that throws only if actually invoked,
// so a flow that unexpectedly needs vision fails loudly instead of silently.
const visionUnavailable = () => {
  throw new Error(
    'df-vision (appclaw vision mode) is stubbed out — this build runs DOM-based YAML flows only.'
  );
};

export default new Proxy({}, { get: () => visionUnavailable });
