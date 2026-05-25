import { Router } from 'express';

const router = Router();

router.get('/health', async (req, res) => {
  const startedAt = process.env.SERVER_STARTED_AT;

  // Best-effort env validation for health checks.
  // Health should never hang: keep checks lightweight.
  const required = process.env.NODE_ENV === 'production' ? ['DATABASE_URL', 'JWT_SECRET'] : [];
  const missing = required.filter((k) => !process.env[k]);

  res.status(200).json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    startedAt: startedAt ? new Date(Number(startedAt)).toISOString() : undefined,
    checks: {
      missingEnv: missing.length ? missing : undefined,
    },
  });
});

export default router;

