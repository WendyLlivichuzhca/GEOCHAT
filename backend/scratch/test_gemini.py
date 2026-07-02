import os
import requests
from dotenv import load_dotenv
load_dotenv('../.env')
gemini_key = os.getenv('GOOGLE_API_KEY')
print('Key:', gemini_key[:10])
