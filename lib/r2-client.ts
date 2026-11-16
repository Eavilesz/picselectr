import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

// Shared R2 client. Lives outside lib/r2.ts because that file is "use server"
// and may only export async functions.
export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
export const PUBLIC_URL = process.env.R2_PUBLIC_URL!;
