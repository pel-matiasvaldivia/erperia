# ── Stage 1: Build dependencies in a virtualenv ──────────────────────────────
FROM python:3.11-slim AS builder

# Install build-time deps only (not needed at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create isolated virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Lean runtime image ───────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Only runtime postgres lib needed (not the -dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built virtualenv from builder (no build tools in final image)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy application
COPY app ./app

# Copy and configure entrypoint (runs DB migrations on startup)
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Create uploads directory and ensure correct permissions
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads && chmod -R 777 /app/uploads

USER appuser

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
