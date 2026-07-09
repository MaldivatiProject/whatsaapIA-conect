FROM python:3.12-slim-bookworm AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip install --prefix=/install .

FROM python:3.12-slim-bookworm AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/usr/local/bin:$PATH

RUN addgroup --system app && adduser --system --ingroup app app
WORKDIR /app
COPY --from=builder /install /usr/local
COPY contracts ./contracts
USER app
EXPOSE 8000
CMD ["whatsaap-api"]

