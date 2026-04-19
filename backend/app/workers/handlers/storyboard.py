"""Storyboard-level AI handlers."""

from __future__ import annotations

from app.workers.handlers.base import progress
from app.workers.registry import TaskContext, handler


@handler("np_photography_plan")
async def photography_plan(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "photography_plan stub"}


@handler("np_regenerate_storyboard_text")
async def regenerate_storyboard_text(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "regenerate_storyboard_text stub"}


@handler("np_regenerate_storyboard_group")
async def regenerate_storyboard_group(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "regenerate_storyboard_group stub"}


@handler("np_analyze_shot_variants")
async def analyze_shot_variants(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "analyze_shot_variants stub"}
