  import jwt from "jsonwebtoken";

  const JWT_SECRET = process.env.JWT_SECRET as string;
  const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"];

  export function signToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  export function verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET);
  }