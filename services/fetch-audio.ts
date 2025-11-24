"use server";

import fs from "fs";
import path from "path";
import { AudioFile } from "@/lib/types/type";

export async function FetchAudio(): Promise<AudioFile[]> {
  try {
    const samplesDir = path.join(process.cwd(), "public", "samples");

    if (!fs.existsSync(samplesDir)) {
      console.error("Samples directory not found");
      return [];
    }

    const files = fs.readdirSync(samplesDir);

    const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"];
    const audioFiles: AudioFile[] = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return audioExtensions.includes(ext);
      })
      .map((file, index) => ({
        id: (index + 1).toString(),
        name: file,
        location: `/samples/${encodeURIComponent(file)}`,
      }));

    return audioFiles;
  } catch (error) {
    console.error("Error reading audio files:", error);
    return [];
  }
}
