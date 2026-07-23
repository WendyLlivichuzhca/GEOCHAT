from PIL import Image

img_path = r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\media__1784741692255.png"
img = Image.open(img_path)
width, height = img.size

# Let's crop the text inside the Secret Access Key box specifically at the end
# The box starts around x=100 (9%) and ends around x=920 (90%)
# The text is left-aligned in the box
# Let's crop from x=100 to x=600, y=440 to y=485 (which is the secret key text region)
crop_box = (int(width * 0.09), int(height * 0.72), int(width * 0.60), int(height * 0.78))
cropped = img.crop(crop_box)
cropped_large = cropped.resize((cropped.width * 5, cropped.height * 5), Image.Resampling.LANCZOS)
cropped_large.save(r"C:\Users\Wendy Llivichuzhca\.gemini\antigravity-ide\brain\73bb7835-f65d-4f95-ab0d-83ed26608e79\scratch\secret_text_zoom.png")
print("Saved.")
