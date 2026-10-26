export type AudioOutputFormat = "mp3" | "wav";
export type AudioBitrate = 128 | 192 | 320;

/**
 * Hard ceiling for source media. Audio is fully decoded into RAM, so a huge
 * video can exhaust memory before any encoding starts.
 */
export const MAX_AUDIO_SOURCE_BYTES = 1024 * 1024 * 1024;
export const RECOMMENDED_AUDIO_SOURCE_BYTES = 500 * 1024 * 1024;

export interface AudioExtractionOptions {
  format: AudioOutputFormat;
  bitrate: AudioBitrate; // For MP3
}

export interface ExtractedAudioResult {
  blob: Blob;
  url: string;
  fileName: string;
  format: AudioOutputFormat;
  duration: number; // in seconds
  size: number; // in bytes
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function extractAudioFromVideoFile(
  file: File,
  options: AudioExtractionOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedAudioResult> {
  if (file.size > MAX_AUDIO_SOURCE_BYTES) {
    throw new Error(
      "This video is larger than 1 GB. Audio is decoded in browser memory, so please split or compress the file first.",
    );
  }

  if (onProgress) {
    onProgress(10, `Reading ${file.name}...`);
  }

  const arrayBuffer = await file.arrayBuffer();

  if (onProgress) {
    onProgress(25, "Decoding the video's audio track in browser memory...");
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Your browser doesn't support the Web Audio API.");
  }

  const audioCtx = new AudioContextClass();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error(err);
    throw new Error(
      "Couldn't extract audio from this video. Make sure it has an audio track and isn't corrupted.",
    );
  } finally {
    // Close context after decoding to free up browser memory
    audioCtx.close().catch(() => {});
  }

  const duration = audioBuffer.duration;
  let audioBlob: Blob;

  if (options.format === "wav") {
    if (onProgress) {
      onProgress(70, "Converting to CD-quality PCM WAV...");
    }
    audioBlob = audioBufferToWav(audioBuffer);
  } else {
    if (onProgress) {
      onProgress(40, `Encoding MP3 at ${options.bitrate} kbps...`);
    }
    audioBlob = await audioBufferToMp3(audioBuffer, options.bitrate, (percent) => {
      if (onProgress) {
        onProgress(40 + Math.round(percent * 0.55), `Encoding MP3... ${percent}%`);
      }
    });
  }

  if (onProgress) {
    onProgress(100, "Your audio is ready to download!");
  }

  const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
  const fileName = `${baseName}.${options.format}`;
  const url = URL.createObjectURL(audioBlob);

  return {
    blob: audioBlob,
    url,
    fileName,
    format: options.format,
    duration,
    size: audioBlob.size,
  };
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChan * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(0, "RIFF");
  // file length minus 8
  view.setUint32(4, 36 + dataLength, true);
  // RIFF type
  writeString(8, "WAVE");
  // format chunk identifier
  writeString(12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numOfChan, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(36, "data");
  // data chunk length
  view.setUint32(40, dataLength, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      // Convert float [-1.0, 1.0] to signed 16-bit integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view.buffer as ArrayBuffer], { type: "audio/wav" });
}

export async function audioBufferToMp3(
  buffer: AudioBuffer,
  kbps: AudioBitrate = 192,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  const leftInt16 = new Int16Array(left.length);
  const rightInt16 = new Int16Array(right.length);

  for (let i = 0; i < left.length; i++) {
    const s = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;

    if (channels > 1) {
      const sr = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sr < 0 ? sr * 0x8000 : sr * 0x7fff;
    }
  }

  const totalBlocks = Math.ceil(left.length / sampleBlockSize);

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Uint8Array;

    if (channels > 1) {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    if (onProgress && i % (sampleBlockSize * 8) === 0) {
      const blockIdx = Math.floor(i / sampleBlockSize);
      onProgress(Math.min(99, Math.round((blockIdx / totalBlocks) * 100)));
    }
  }

  const finalMp3buf = encoder.flush();
  if (finalMp3buf.length > 0) {
    mp3Data.push(finalMp3buf);
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: "audio/mp3" });
}
