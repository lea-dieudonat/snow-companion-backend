function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  port: parseInt(optional('PORT', '3001')),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  agentModelSynthesis: optional('AGENT_MODEL_SYNTHESIS', 'claude-sonnet-4-6'),
  agentMaxTokens: parseInt(optional('AGENT_MAX_TOKENS', '1024')),
  agentMaxIterations: parseInt(optional('AGENT_MAX_ITERATIONS', '5')),
  agentTimeoutMs: parseInt(optional('AGENT_TIMEOUT_MS', '30000')),
};
