FROM python:3.12-slim-bookworm AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY pyproject.toml README.md ./
COPY whatsaap_backend ./whatsaap_backend
RUN python -m pip install --prefix=/install .

FROM python:3.12-slim-bookworm AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/usr/local/bin:$PATH

# chromium + chromium-driver: headless browser for RUN_SCRIPT actions that
# use Selenium (uploaded script's own choice, e.g. `from selenium import
# webdriver`). Chrome's multi-process tree (renderer/GPU/zygote/crashpad)
# needs a real zombie-reaping init as container PID 1 — see `init: true` on
# this service in docker-compose.yml, not something baked in here.
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends chromium chromium-driver \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system app && adduser --system --ingroup app app
WORKDIR /app
COPY --from=builder /install /usr/local
COPY contracts ./contracts
USER app
EXPOSE 8000
CMD ["whatsaap-api"]

