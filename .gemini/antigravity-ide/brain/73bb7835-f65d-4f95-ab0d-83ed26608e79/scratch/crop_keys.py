from PIL import Image

img_path = r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\media__1784741692255.png"
img = Image.open(img_path)
width, height = img.size
print("Size:", width, height)

# Crop the area containing Access Key ID and Secret Access Key
# The keys are in the center-right part of the screen
# Let's crop from 20% to 90% width, and 45% to 75% height
crop_box = (int(width * 0.25), int(height * 0.45), int(width * 0.85), int(height * 0.75))
cropped = img.crop(crop_box)
cropped.save(r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\scratch\cropped_keys.png")
print("Cropped saved.")
