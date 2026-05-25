
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'tony4prophet',
    expiresInSeconds: 60 * 60, // 1 hour
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'tony4prophet_refresh',
    expiresInDays: 30,
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
  },
  resetToken: {
    expiresInMs: 60 * 60 * 1000, // 1 hour
  },
};

