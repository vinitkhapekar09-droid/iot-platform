from app.config import settings
from app.utils.security import create_access_token, decode_access_token

print("SECRET_KEY:", repr(settings.secret_key))
print()

# Create a fresh test token
token = create_access_token(data={"sub": "test-user-id"})
print("Generated token:", token[:50], "...")
print()

# Decode it
result = decode_access_token(token)
print("Decoded result:", result)
