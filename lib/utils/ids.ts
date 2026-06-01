import { randomUUID, randomBytes } from "node:crypto";

export const uuid = (): string => randomUUID();
export const now = (): string => new Date().toISOString();

/** Hex token for shareable report links (mirrors the DB default). */
export const shareToken = (): string => randomBytes(16).toString("hex");
