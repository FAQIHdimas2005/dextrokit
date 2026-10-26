import sys
import os
import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

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

    # Extract mask boolean array safely:
    # A pixel is masked ONLY where actual strokes exist (luminance > 30),
    # regardless of whether the canvas background is opaque black or transparent.
    gray_np = np.array(raw_mask.convert("L"))
    mask_np = gray_np > 30

    if raw_mask.mode == "RGBA":
        r, g, b, a = raw_mask.split()
        # Also catch non-black colored strokes on transparent background
        alpha_colored = (np.array(a) > 20) & ((np.array(r) > 30) | (np.array(g) > 30) | (np.array(b) > 30))
        mask_np = mask_np | alpha_colored

    # Safety check: If mask is empty OR if user accidentally masked > 95% of image
    if not np.any(mask_np) or np.mean(mask_np) > 0.95:
        img.save(output_path, "PNG")
        return

    # Convert to pure solid 0..255 binary image
    mask_bin = Image.fromarray((mask_np.astype(np.uint8) * 255)).resize((orig_w, orig_h), Image.Resampling.NEAREST)

    # Slight dilation (3px) to ensure antialiased watermark borders are 100% encompassed
    mask_dilated = mask_bin.filter(ImageFilter.MaxFilter(size=3))

    # 2. Initialize ONNX session
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    # 3. Macro inpainting pass (512x512)
    img_512 = img.resize((512, 512), Image.Resampling.BILINEAR)
    mask_512 = mask_dilated.resize((512, 512), Image.Resampling.NEAREST)

    img_t = np.transpose(np.array(img_512).astype(np.float32) / 255.0, (2, 0, 1))[None, ...]
    mask_t = (np.array(mask_512) > 128).astype(np.float32)[None, None, ...]

    out = session.run(["output"], {"image": img_t, "mask": mask_t})[0][0]
    out_hwc = np.clip(np.transpose(out, (1, 2, 0)), 0, 255).astype(np.uint8)

    # Upscale inpaint reconstruction back to original canvas with high-fidelity Lanczos
    inpaint_full = Image.fromarray(out_hwc).resize((orig_w, orig_h), Image.Resampling.LANCZOS)

    # 4. Seamless Alpha Feathering
    # Inside the brush: alpha is strictly 1.0 (100% AI inpainting, 0% watermark!)
    # Outside the brush: alpha is strictly 0.0 (100% untouched native image)
    # Transition perimeter (2px): smoothly ramps from 1.0 to 0.0 without seams
    feather_radius = max(2, min(5, int(max(orig_w, orig_h) / 350)))
    feathered_mask = mask_dilated.filter(ImageFilter.GaussianBlur(radius=feather_radius))

    alpha = np.array(feathered_mask).astype(np.float32) / 255.0
    alpha = np.clip(alpha * 2.5, 0.0, 1.0)[..., None]

    orig_np = np.array(img).astype(np.float32)
    inpaint_np = np.array(inpaint_full).astype(np.float32)

    # Seamless composite
    final_blended = orig_np * (1.0 - alpha) + inpaint_np * alpha
    final_blended = np.clip(final_blended, 0, 255).astype(np.uint8)

    res_img = Image.fromarray(final_blended)
    res_img.save(output_path, "PNG")

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
