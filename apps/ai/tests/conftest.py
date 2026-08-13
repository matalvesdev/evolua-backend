import os

os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-internal-token-32-characters")
os.environ.setdefault("HUGGINGFACE_API_KEY", "hf_test_token")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/evolua_test")
