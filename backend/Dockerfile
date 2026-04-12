FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
RUN uv pip install --system .

COPY tests ./tests

EXPOSE 18000

CMD ["python", "-m", "app.scripts.dev", "--no-reload", "--host", "0.0.0.0", "--port", "18000"]
