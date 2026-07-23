from PIL import Image

img_path = r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\media__1784741692255.png"
img = Image.open(img_path)
width, height = img.size

# Let's crop just the end of the Secret Access Key box
# Secret key box is at around y: 73% to 77%, x: 25% to 55%
# Let's crop the tail of the secret key box
crop_box = (int(width * 0.28), int(height * 0.72), int(width * 0.44), int(height * 0.77))
cropped = img.crop(crop_box)
# Resize it 5x larger with nearest neighbor to keep pixels sharp
cropped_large = cropped.resize((cropped.width * 5, cropped.height * 5), Image.Resampling.NEAREST)
cropped_large.save(r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\scratch\secret_tail.png")
print("Saved.")
