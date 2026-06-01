import { NextResponse } from "next/server";

/** Parse a JSON request body, returning null on malformed input (so routes can 400 cleanly). */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const unauthorized = () =>
  NextResponse.json({ error: "Not signed in" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });
