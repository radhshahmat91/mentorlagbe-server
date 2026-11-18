import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  const token = jwt.sign(
    { sub: String(user._id), email: user.email, name: user.name, role: user.role },
    env.jwtSecret,
    { algorithm: 'HS256', expiresIn: env.jwtExpiresIn },
  );
  const { iat, exp } = jwt.decode(token);
  return { token, expiresIn: exp - iat };
}

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
