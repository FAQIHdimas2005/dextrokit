/**
 * Client-Side Image Inpainting Engine
 * Uses a guided boundary-diffusion algorithm (a Fast Marching / Telea-style
 * inpainting approximation). Runs entirely in browser memory — no server compute.
 */

export interface InpaintProgressCallback {
  (progress: number, status: string): void;
}

export interface InpaintImageDataLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export async function inpaintImageData(
  source: InpaintImageDataLike,
  mask: Uint8Array, // 1 = area to remove, 0 = original image
  width: number,
  height: number,
  onProgress?: InpaintProgressCallback
): Promise<InpaintImageDataLike> {
  const result: InpaintImageDataLike =
    typeof ImageData !== "undefined"
      ? new ImageData(new Uint8ClampedArray(source.data), width, height)
      : {
          data: new Uint8ClampedArray(source.data),
          width,
          height,
        };

  const data = result.data;
  const totalPixels = width * height;

  // Check whether anything was actually brushed
  let maskCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (mask[i] === 1) maskCount++;
  }

  if (maskCount === 0) {
    return result;
  }

  if (onProgress) {
    onProgress(15, "Analyzing the watermark area and surrounding texture...");
  }
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Pixel status: 0 = KNOWN (clean), 1 = BAND (edge), 2 = INSIDE (watermark center)
  const status = new Uint8Array(totalPixels);
  const band: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        // Is this pixel adjacent to a clean (KNOWN) pixel?
        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (mask[ny * width + nx] === 0) {
                isBoundary = true;
                break;
              }
            }
          }
          if (isBoundary) break;
        }

        if (isBoundary) {
          status[idx] = 1; // BAND
          band.push(idx);
        } else {
          status[idx] = 2; // INSIDE
        }
      } else {
        status[idx] = 0; // KNOWN
      }
    }
  }

  if (onProgress) {
    onProgress(35, "Filling watermark pixels with surrounding colors...");
  }
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Iterative inpainting: flow color from the outside in
  const kernelRadius = 4;
  let processedInMask = 0;

  // Run multi-pass iterations for progressive reconstruction
  let currentBand = band;
  let pass = 0;
  const maxPasses = 150;

  while (currentBand.length > 0 && pass < maxPasses) {
    pass++;
    const nextBand: number[] = [];

    for (let b = 0; b < currentBand.length; b++) {
      const idx = currentBand[b];
      const x = idx % width;
      const y = Math.floor(idx / width);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumWeight = 0;

      // Collect KNOWN neighbors within the kernel radius
      for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
        for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (status[nIdx] === 0) {
              // Distance-based Euclidean weight
              const distSq = dx * dx + dy * dy;
              const weight = 1 / (1 + Math.sqrt(distSq));

              const pIdx = nIdx * 4;
              sumR += data[pIdx] * weight;
              sumG += data[pIdx + 1] * weight;
              sumB += data[pIdx + 2] * weight;
              sumWeight += weight;
            }
          }
        }
      }

      if (sumWeight > 0) {
        const pIdx = idx * 4;
        data[pIdx] = Math.round(sumR / sumWeight);
        data[pIdx + 1] = Math.round(sumG / sumWeight);
        data[pIdx + 2] = Math.round(sumB / sumWeight);
        // Keep alpha fully opaque
        data[pIdx + 3] = 255;
        status[idx] = 0; // This pixel is now KNOWN
        processedInMask++;

        // Register INSIDE neighbors that now touch the new boundary
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (status[nIdx] === 2) {
                status[nIdx] = 1; // Promote to BAND
                nextBand.push(nIdx);
              }
            }
          }
        }
      } else {
        // No KNOWN neighbor yet — retry on the next pass
        nextBand.push(idx);
      }
    }

    currentBand = nextBand;

    if (pass % 5 === 0) {
      if (onProgress) {
        const pct = Math.min(85, 35 + Math.round((processedInMask / Math.max(1, maskCount)) * 50));
        onProgress(pct, `Smoothing the watermark area (pass ${pass})...`);
      }
      // Yield to the browser event loop to keep UI smooth and prevent freezing
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Post-processing pass: a light median/blur applied only inside the mask so
  // the repaired edges blend naturally with the untouched pixels.
  if (onProgress) {
    onProgress(90, "Blending the final texture...");
  }
  await new Promise((resolve) => setTimeout(resolve, 0));

  const smoothData = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            r += data[nIdx];
            g += data[nIdx + 1];
            b += data[nIdx + 2];
            count++;
          }
        }
        const pIdx = idx * 4;
        smoothData[pIdx] = Math.round(r / count);
        smoothData[pIdx + 1] = Math.round(g / count);
        smoothData[pIdx + 2] = Math.round(b / count);
      }
    }
  }

  result.data.set(smoothData);

  if (onProgress) {
    onProgress(100, "Watermark removed!");
  }

  return result;
}
