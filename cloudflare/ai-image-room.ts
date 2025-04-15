import { nanoid } from "nanoid";
import { fal } from "@fal-ai/client";

import { BasicDurableObject } from "./basic";
import { ImageRun } from "./types/image-room";
import { ImageModel } from "./types/image-room";

export class ImageRoom extends BasicDurableObject {
  isRunning = false;

  availableModels = [
    {
      id: "fal-ai/flux-pro/v1.1-ultra",
      name: "Flux Pro Ultra",
      options: {
        aspect_ratio: "21:9, 16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16, 9:21",
      },
    },
    {
      id: "fal-ai/recraft-v3",
      name: "Recraft v3",
      options: {
        style:
          "any, realistic_image, digital_illustration, vector_illustration, realistic_image/b_and_w, realistic_image/hard_flash, realistic_image/hdr, realistic_image/natural_light, realistic_image/studio_portrait, realistic_image/enterprise, realistic_image/motion_blur, realistic_image/evening_light, realistic_image/faded_nostalgia, realistic_image/forest_life, realistic_image/mystic_naturalism, realistic_image/natural_tones, realistic_image/organic_calm, realistic_image/real_life_glow, realistic_image/retro_realism, realistic_image/retro_snapshot, realistic_image/urban_drama, realistic_image/village_realism, realistic_image/warm_folk, digital_illustration/pixel_art, digital_illustration/hand_drawn, digital_illustration/grain, digital_illustration/infantile_sketch, digital_illustration/2d_art_poster, digital_illustration/handmade_3d, digital_illustration/hand_drawn_outline, digital_illustration/engraving_color, digital_illustration/2d_art_poster_2, digital_illustration/antiquarian, digital_illustration/bold_fantasy, digital_illustration/child_book, digital_illustration/child_books, digital_illustration/cover, digital_illustration/crosshatch, digital_illustration/digital_engraving, digital_illustration/expressionism, digital_illustration/freehand_details, digital_illustration/grain_20, digital_illustration/graphic_intensity, digital_illustration/hard_comics, digital_illustration/long_shadow, digital_illustration/modern_folk, digital_illustration/multicolor, digital_illustration/neon_calm, digital_illustration/noir, digital_illustration/nostalgic_pastel, digital_illustration/outline_details, digital_illustration/pastel_gradient, digital_illustration/pastel_sketch, digital_illustration/pop_art, digital_illustration/pop_renaissance, digital_illustration/street_art, digital_illustration/tablet_sketch, digital_illustration/urban_glow, digital_illustration/urban_sketching, digital_illustration/vanilla_dreams, digital_illustration/young_adult_book, digital_illustration/young_adult_book_2, vector_illustration/bold_stroke, vector_illustration/chemistry, vector_illustration/colored_stencil, vector_illustration/contour_pop_art, vector_illustration/cosmics, vector_illustration/cutout, vector_illustration/depressive, vector_illustration/editorial, vector_illustration/emotional_flat, vector_illustration/infographical, vector_illustration/marker_outline, vector_illustration/mosaic, vector_illustration/naivector, vector_illustration/roundish_flat, vector_illustration/segmented_colors, vector_illustration/sharp_contrast, vector_illustration/thin, vector_illustration/vector_photo, vector_illustration/vivid_shapes, vector_illustration/engraving, vector_illustration/line_art, vector_illustration/line_circuit, vector_illustration/linocut",
        image_size:
          "square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9",
      },
    },
  ] satisfies ImageModel[];

  runs: ImageRun[] = [];

  config: Record<"model" & {}, string> = {
    model: "fal-ai/flux-pro/v1.1-ultra",
  };

  imageRouteUrl = "";
  syncSecret = "";

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.imageRouteUrl = env.IMAGE_ROUTE_URL;
    this.syncSecret = env.SYNC_SECRET;
  }

  handleJoin(event: MessageEvent, server: WebSocket) {
    server.send(
      JSON.stringify({
        type: "runs",
        runs: this.runs,
      })
    );
    server.send(
      JSON.stringify({
        type: "available-models",
        models: this.availableModels,
      })
    );
    server.send(
      JSON.stringify({
        type: "isRunning",
        isRunning: this.isRunning,
      })
    );
  }

  handleDisconnect(_: WebSocket) {
    console.log("Client disconnected");
  }

  async handleMessage(event: MessageEvent, server: WebSocket) {
    const data = JSON.parse(event.data);

    if (data.type === "config") {
      this.config = data.config;
      this.broadcast({
        type: "config",
        config: this.config,
      });
    }

    if (data.type === "message") {
      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      this.broadcast({
        type: "isRunning",
        isRunning: this.isRunning,
      });

      const run = {
        id: nanoid(6),
        modelId: this.config.model,
        parameters: {
          ...this.config,
          prompt: data.prompt,
        },
      } as Omit<ImageRun, "output">;

      this.runs.push(run);

      this.broadcast({
        type: "message",
        ...run,
      });

      try {
        const response = await fetch(this.imageRouteUrl, {
          method: "POST",
          body: JSON.stringify({
            token: this.syncSecret,
            prompt: data.prompt,
            ...this.config,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${errorText}`);
        }

        const result = (await response.json()) as Record<"imageUrl", string>;
        const outputUrl = result.imageUrl;

        this.runs[this.runs.length - 1] = {
          ...this.runs[this.runs.length - 1],
          output: outputUrl,
        };

        this.broadcast({
          type: "message",
          ...this.runs[this.runs.length - 1],
        });
      } catch (error) {
        this.broadcast({
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      } finally {
        this.isRunning = false;
        this.broadcast({
          type: "isRunning",
          isRunning: this.isRunning,
        });
      }
    }
  }
}
