from PIL import Image

img_path = r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\media__1784741692255.png"
img = Image.open(img_path)
width, height = img.size

# Let's crop from y: 0.65 to 0.71, x: 0.08 to 0.85
crop_box = (int(width * 0.08), int(height * 0.65), int(width * 0.85), int(height * 0.71))
cropped = img.crop(crop_box)
cropped_large = cropped.resize((cropped.width * 4, cropped.height * 4), Image.Resampling.LANCZOS)
cropped_large.save(r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\scratch\secret_text_zoom2.png")
print("Saved.")
