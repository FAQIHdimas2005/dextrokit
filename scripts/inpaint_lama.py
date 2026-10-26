import sys
import os
import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

def cluster_regions(mask_np, orig_w, orig_h, grid_size=64):
    mask_small = Image.fromarray(mask_np.astype(np.uint8)).resize((grid_size, grid_size), Image.Resampling.NEAREST)
    arr = np.array(mask_small) > 0
    visited = np.zeros_like(arr, dtype=bool)
    regions = []

    for r in range(grid_size):
        for c in range(grid_size):
            if arr[r, c] and not visited[r, c]:
                queue = [(r, c)]
                visited[r, c] = True
                pts = []
                while queue:
                    curr_r, curr_c = queue.pop(0)
                    pts.append((curr_r, curr_c))
                    for dr, dc in [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (-1,1), (1,-1), (1,1)]:
                        nr, nc = curr_r + dr, curr_c + dc
                        if 0 <= nr < grid_size and 0 <= nc < grid_size:
                            if arr[nr, nc] and not visited[nr, nc]:
                                visited[nr, nc] = True
                                queue.append((nr, nc))
                
                scale_x = orig_w / grid_size
                scale_y = orig_h / grid_size
                pts_np = np.array(pts)
                min_y = max(0, int(np.min(pts_np[:, 0]) * scale_y))
                max_y = min(orig_h, int((np.max(pts_np[:, 0]) + 1) * scale_y))
                min_x = max(0, int(np.min(pts_np[:, 1]) * scale_x))
                max_x = min(orig_w, int((np.max(pts_np[:, 1]) + 1) * scale_x))
                regions.append((min_x, min_y, max_x, max_y))

    return regions

def inpaint_patch(session, img_crop, mask_crop):
    """Inpaints an arbitrary-sized square patch using LaMa (512x512) and Lanczos upscaling."""
    crop_w, crop_h = img_crop.size

    img_512 = img_crop.resize((512, 512), Image.Resampling.BILINEAR)
    mask_512 = mask_crop.resize((512, 512), Image.Resampling.NEAREST)

    img_t = np.transpose(np.array(img_512).astype(np.float32) / 255.0, (2, 0, 1))[None, ...]
    mask_t = (np.array(mask_512) > 128).astype(np.float32)[None, None, ...]

    out = session.run(["output"], {"image": img_t, "mask": mask_t})[0][0]
    out_hwc = np.clip(np.transpose(out, (1, 2, 0)), 0, 255).astype(np.uint8)

    inpaint_full = Image.fromarray(out_hwc).resize((crop_w, crop_h), Image.Resampling.LANCZOS)
    return inpaint_full

def run_inpaint(image_path, mask_path, output_path, model_path=None):
    if not model_path or not os.path.exists(model_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "models", "inpainting_lama.onnx")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")

    # 1. Load image and mask
    img = Image.open(image_path).convert("RGB")
    raw_mask = Image.open(mask_path)
    orig_w, orig_h = img.size

    # Reject decompression bombs: a small PNG can declare an enormous canvas.
    MAX_PIXELS = 50_000_000
    if orig_w <= 0 or orig_h <= 0:
        raise ValueError("Image has invalid dimensions")
    if orig_w * orig_h > MAX_PIXELS:
        raise ValueError(
            f"Image is {orig_w}x{orig_h} ({orig_w * orig_h / 1_000_000:.1f} MP); "
            f"the maximum supported size is 50 MP"
        )

    # Extract mask safely:
    # A pixel is masked where actual strokes exist (luminance > 30),
    # regardless of whether the canvas background is opaque black or transparent.
    gray_np = np.array(raw_mask.convert("L"))
    mask_np = gray_np > 30

    if raw_mask.mode == "RGBA":
        r, g, b, a = raw_mask.split()
        alpha_colored = (np.array(a) > 20) & ((np.array(r) > 30) | (np.array(g) > 30) | (np.array(b) > 30))
        mask_np = mask_np | alpha_colored

    # Safety check: If mask is empty or covers > 95% of image
    total_masked_fraction = np.mean(mask_np)
    if not np.any(mask_np) or total_masked_fraction > 0.95:
        img.save(output_path, "PNG")
        return

    # Convert to pure solid 0..255 binary image at native resolution
    mask_bin = Image.fromarray((mask_np.astype(np.uint8) * 255)).resize((orig_w, orig_h), Image.Resampling.NEAREST)

    # Slight dilation (3px) to ensure antialiased watermark borders are 100% encompassed
    mask_dilated = mask_bin.filter(ImageFilter.MaxFilter(size=3))

    # 2. Initialize ONNX session
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    # 3. Detect regions for High-Res Contextual Inpainting
    regions = cluster_regions(mask_np, orig_w, orig_h)
    canvas = img.copy()

    # If watermark is localized into 1 to 3 regions on a high-res image:
    # Run High-Res Contextual Bounding-Box Inpainting (Native 1:1 scale sharpness!)
    if 1 <= len(regions) <= 3 and total_masked_fraction <= 0.35 and max(orig_w, orig_h) > 512:
        for (min_x, min_y, max_x, max_y) in regions:
            bw = max_x - min_x
            bh = max_y - min_y
            cx = (min_x + max_x) // 2
            cy = (min_y + max_y) // 2

            # Generous contextual crop (at least 512px or 1.5x bbox size)
            crop_side = max(512, int(max(bw, bh) * 1.5))
            crop_side = min(crop_side, min(orig_w, orig_h))

            x1 = max(0, min(orig_w - crop_side, cx - crop_side // 2))
            y1 = max(0, min(orig_h - crop_side, cy - crop_side // 2))
            x2 = x1 + crop_side
            y2 = y1 + crop_side

            patch_img = canvas.crop((x1, y1, x2, y2))
            patch_mask = mask_dilated.crop((x1, y1, x2, y2))

            # Inpaint the patch at high-res (often 1:1 scale if crop_side <= 512!)
            patch_inpaint = inpaint_patch(session, patch_img, patch_mask)

            # Feather boundary of patch mask
            feather_radius = max(2, min(5, int(crop_side / 300)))
            feathered_patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(radius=feather_radius))

            alpha = np.array(feathered_patch_mask).astype(np.float32) / 255.0
            alpha = np.clip(alpha * 2.5, 0.0, 1.0)[..., None]

            patch_orig_np = np.array(patch_img).astype(np.float32)
            patch_inpaint_np = np.array(patch_inpaint).astype(np.float32)

            patch_blended = patch_orig_np * (1.0 - alpha) + patch_inpaint_np * alpha
            patch_blended_img = Image.fromarray(np.clip(patch_blended, 0, 255).astype(np.uint8))

            canvas.paste(patch_blended_img, (x1, y1))

    else:
        # Global macro pass (for images with watermarks spread all across the canvas)
        inpaint_full = inpaint_patch(session, img, mask_dilated)

        feather_radius = max(2, min(5, int(max(orig_w, orig_h) / 350)))
        feathered_mask = mask_dilated.filter(ImageFilter.GaussianBlur(radius=feather_radius))

        alpha = np.array(feathered_mask).astype(np.float32) / 255.0
        alpha = np.clip(alpha * 2.5, 0.0, 1.0)[..., None]

        orig_np = np.array(img).astype(np.float32)
        inpaint_np = np.array(inpaint_full).astype(np.float32)

        final_blended = orig_np * (1.0 - alpha) + inpaint_np * alpha
        canvas = Image.fromarray(np.clip(final_blended, 0, 255).astype(np.uint8))

    canvas.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python inpaint_lama.py <input_img> <mask_img> <output_img> [model_path]")
        sys.exit(1)

    in_img = sys.argv[1]
    in_mask = sys.argv[2]
    out_img = sys.argv[3]
    m_path = sys.argv[4] if len(sys.argv) > 4 else None

    run_inpaint(in_img, in_mask, out_img, m_path)
    print("SUCCESS")
