"""Handler registration — importing this package triggers @handler decorators."""

from app.workers.handlers import (  # noqa: F401
    analyze,
    character,
    downloads,
    generic,
    image,
    panels,
    storyboard,
    voice,
)
