# ==============================================================================
# Agastya Classical Homeopathy EHR - FastAPI Backend Dockerfile
# Production-ready Python 3.11 container with on-prem local persistence
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files to disk and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Ensure data directories exist
RUN mkdir -p /app/data/supabase_fallback

EXPOSE 8000

# Health check using Python stdlib urllib
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
    CMD python3 -c "import urllib.request; sys_exit = 0 if urllib.request.urlopen('http://localhost:8000/api/v1/health').getcode() == 200 else 1; exit(sys_exit)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
