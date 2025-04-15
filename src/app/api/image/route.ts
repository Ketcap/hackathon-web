import { NextResponse, type NextRequest } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_API_KEY,
});

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, string>;
  const { prompt, model, aspect_ratio, style, image_size, token } = body;
  if (token !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const result = await fal.run(model, {
    input: {
      prompt,
      aspect_ratio,
      style,
      image_size,
    },
  });

  return NextResponse.json({
    imageUrl: result.data.images[0].url,
  });
}
