"""Handler registry — handlers register themselves via the @handler decorator.

A handler receives a TaskContext and is free to run arbitrary async work.
Returning a dict stores it in `tasks.result_json`; raising an exception marks
the task failed with the exception message.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from sqlalchemy.orm import Session

from app.db.models.task import Task


@dataclass
class TaskContext:
    db: Session
    task: Task
    payload: dict[str, Any]

    @property
    def user_id(self) -> str:
        return self.task.user_id

    @property
    def project_id(self) -> str:
        return self.task.project_id

    @property
    def target_id(self) -> str:
        return self.task.target_id


HandlerFn = Callable[[TaskContext], Awaitable[dict[str, Any] | None]]

_handlers: dict[str, HandlerFn] = {}


def handler(task_type: str) -> Callable[[HandlerFn], HandlerFn]:
    def wrap(fn: HandlerFn) -> HandlerFn:
        _handlers[task_type] = fn
        return fn

    return wrap


class _Registry:
    def get(self, task_type: str) -> HandlerFn | None:
        return _handlers.get(task_type)

    def list_types(self) -> list[str]:
        return sorted(_handlers.keys())


registry = _Registry()
