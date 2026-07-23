from PIL import Image

img_path = r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\media__1784741692255.png"
img = Image.open(img_path)
width, height = img.size

# Let's crop the entire Secret Access Key input box
# It is located between y: 0.65 and 0.85, and x: 0.08 and 0.92
crop_box = (int(width * 0.08), int(height * 0.65), int(width * 0.92), int(height * 0.85))
cropped = img.crop(crop_box)
# Resize it 3x larger with nearest neighbor to keep pixels sharp
cropped_large = cropped.resize((cropped.width * 3, cropped.height * 3), Image.Resampling.NEAREST)
cropped_large.save(r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\scratch\secret_box_full.png")
print("Saved.")
