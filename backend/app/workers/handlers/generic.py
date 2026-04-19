"""Generic stubs for remaining task types so they don't loop forever as
`UNREGISTERED_HANDLER`. Each succeeds immediately with a note; replace with
real logic when that feature is prioritized.

Note: download / cleanup task types are handled by `downloads.py` — keep
those out of this stub list so the real handlers win."""

from __future__ import annotations

from app.workers.handlers.base import progress
from app.workers.registry import TaskContext, handler

_STUBS = (
    "np_generate_video",
    "np_lip_sync",
    "np_copy_from_global",
    "np_episode_split",
    "np_episode_split_by_markers",
)


def _make_stub(task_type: str):
    @handler(task_type)
    async def _stub(ctx: TaskContext) -> dict:
        progress(ctx, "stub", 100, f"{task_type} not yet implemented")
        return {"note": f"{task_type} stub — implement in follow-up"}

    return _stub


for _t in _STUBS:
    _make_stub(_t)
