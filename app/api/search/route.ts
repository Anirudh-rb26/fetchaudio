/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import fs from "fs/promises";
import { AudioFile } from "@/lib/types/type";
import { NextRequest, NextResponse } from "next/server";
import { cosineSearch } from "@/lib/embeddings/similarity";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const { prompt, model, topK, includeMetadata } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
        },
        { status: 400 }
      );
    }

    console.log(`\n🔍 API Request: Searching for "${prompt}"`);

    let audioFiles: AudioFile[] | undefined;

    if (includeMetadata !== false) {
      try {
        const audioDir = path.join(process.cwd(), "public", "samples");
        const files = await fs.readdir(audioDir);

        audioFiles = files
          .filter((file) => file.endsWith(".wav") || file.endsWith(".mp3"))
          .map((file, idx) => ({
            id: `audio-${idx}`,
            name: file,
            location: `/samples/${file}`,
          }));

        console.log(`📂 Loaded ${audioFiles.length} audio files from directory`);
      } catch (error) {
        console.warn("⚠️  Could not load audio files directory:", error);
      }
    }

    const results = await cosineSearch(
      prompt,
      model || "laion/larger_clap_music",
      topK || 5,
      audioFiles
    );

    console.log(`✅ Search completed: ${results.length} results found`);

    return NextResponse.json(
      {
        success: true,
        results: results,
        query: prompt,
        totalResults: results.length,
        model: model || "laion/larger_clap_music",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get("prompt");
    const model = searchParams.get("model");
    const topK = searchParams.get("topK");

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing 'prompt' query parameter",
        },
        { status: 400 }
      );
    }

    // Load audio files
    let audioFiles: AudioFile[] | undefined;
    try {
      const audioDir = path.join(process.cwd(), "public", "audio");
      const files = await fs.readdir(audioDir);

      audioFiles = files
        .filter((file) => file.endsWith(".wav") || file.endsWith(".mp3"))
        .map((file, idx) => ({
          id: `audio-${idx}`,
          name: file,
          location: `/samples/${file}`,
          duration: undefined,
        }));
    } catch (error) {
      console.warn("⚠️  Could not load audio files directory");
    }

    const results = await cosineSearch(
      prompt,
      model || "laion/larger_clap_music",
      topK ? parseInt(topK) : 5,
      audioFiles
    );

    return NextResponse.json(
      {
        success: true,
        results: results,
        query: prompt,
        totalResults: results.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
