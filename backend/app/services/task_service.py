from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.asset import ProjectAsset
from app.db.models.episode import Episode
from app.db.models.project import Project
from app.db.models.run import WorkflowEvent, WorkflowRun, WorkflowStep
from app.db.models.storyboard import Storyboard, StoryboardPanel
from app.db.models.task import Task, TaskEvent
from app.services.asset_workflow_service import run_asset_generate_task, run_asset_modify_task
from app.services.prompt_workflow_service import (
    run_prompt_modify_task,
    run_prompt_source_append_task,
)
from app.services.script_to_storyboard_service import run_script_to_storyboard_task
from app.services.story_to_script_service import run_story_to_script_task
from app.services.video_workflow_service import run_video_generate_task, run_video_lipsync_task
from app.services.voice_workflow_service import run_voice_generate_task

SUPPORTED_TASK_TYPE_STORY_TO_SCRIPT = "story_to_script_run"
SUPPORTED_TASK_TYPE_SCRIPT_TO_STORYBOARD = "script_to_storyboard_run"
SUPPORTED_TASK_TYPE_ASSET_GENERATE = "asset_generate_run"
SUPPORTED_TASK_TYPE_ASSET_MODIFY = "asset_modify_run"
SUPPORTED_TASK_TYPE_PROMPT_MODIFY = "prompt_modify_run"
SUPPORTED_TASK_TYPE_PROMPT_SOURCE_APPEND = "prompt_source_append_run"
SUPPORTED_TASK_TYPE_VOICE_GENERATE = "voice_generate_run"
SUPPORTED_TASK_TYPE_VIDEO_GENERATE = "video_generate_run"
SUPPORTED_TASK_TYPE_VIDEO_LIPSYNC = "video_lipsync_run"
TARGET_TYPE_EPISODE = "episode"
TARGET_TYPE_ASSET = "asset"
TARGET_TYPE_PANEL = "panel"

ACTIVE_TASK_STATUSES = {"queued", "processing", "running"}
ACTIVE_RUN_STATUSES = {"queued", "running", "canceling"}
TASK_EVENT_CREATED = "task.created"
TASK_EVENT_FAILED = "task.failed"


@dataclass(frozen=True)
class TaskDefinition:
    workflow_type: str
    target_type: str
    runner_name: str


TASK_DEFINITIONS: dict[str, TaskDefinition] = {
    SUPPORTED_TASK_TYPE_STORY_TO_SCRIPT: TaskDefinition(
        workflow_type="story_to_script",
        target_type=TARGET_TYPE_EPISODE,
        runner_name="run_story_to_script_task",
    ),
    SUPPORTED_TASK_TYPE_SCRIPT_TO_STORYBOARD: TaskDefinition(
        workflow_type="script_to_storyboard",
        target_type=TARGET_TYPE_EPISODE,
        runner_name="run_script_to_storyboard_task",
    ),
    SUPPORTED_TASK_TYPE_ASSET_GENERATE: TaskDefinition(
        workflow_type="asset_generate",
        target_type=TARGET_TYPE_ASSET,
        runner_name="run_asset_generate_task",
    ),
    SUPPORTED_TASK_TYPE_ASSET_MODIFY: TaskDefinition(
        workflow_type="asset_modify",
        target_type=TARGET_TYPE_ASSET,
        runner_name="run_asset_modify_task",
    ),
    SUPPORTED_TASK_TYPE_PROMPT_MODIFY: TaskDefinition(
        workflow_type="prompt_modify",
        target_type=TARGET_TYPE_PANEL,
        runner_name="run_prompt_modify_task",
    ),
    SUPPORTED_TASK_TYPE_PROMPT_SOURCE_APPEND: TaskDefinition(
        workflow_type="prompt_source_append",
        target_type=TARGET_TYPE_EPISODE,
        runner_name="run_prompt_source_append_task",
    ),
    SUPPORTED_TASK_TYPE_VOICE_GENERATE: TaskDefinition(
        workflow_type="voice_generate",
        target_type=TARGET_TYPE_EPISODE,
        runner_name="run_voice_generate_task",
    ),
    SUPPORTED_TASK_TYPE_VIDEO_GENERATE: TaskDefinition(
        workflow_type="video_generate",
        target_type=TARGET_TYPE_PANEL,
        runner_name="run_video_generate_task",
    ),
    SUPPORTED_TASK_TYPE_VIDEO_LIPSYNC: TaskDefinition(
        workflow_type="video_lipsync",
        target_type=TARGET_TYPE_PANEL,
        runner_name="run_video_lipsync_task",
    ),
}


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def list_tasks(
        self,
        user_id: str,
        project_id: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        statuses: list[str] | None = None,
        task_types: list[str] | None = None,
        limit: int = 50,
    ) -> list[Task]:
        query = self.db.query(Task).filter(Task.user_id == user_id)
        if project_id:
            query = query.filter(Task.project_id == project_id)
        if target_type:
            query = query.filter(Task.target_type == target_type)
        if target_id:
            query = query.filter(Task.target_id == target_id)
        if statuses:
            query = query.filter(Task.status.in_(statuses))
        if task_types:
            query = query.filter(Task.task_type.in_(task_types))
        return query.order_by(Task.created_at.desc()).limit(max(1, min(limit, 200))).all()

    def get_task(self, user_id: str, task_id: str) -> Task:
        task = self.db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Task not found"},
            )
        return task

    def list_task_events(self, user_id: str, task_id: str, limit: int = 500) -> list[TaskEvent]:
        task = self.get_task(user_id, task_id)
        return (
            self.db.query(TaskEvent)
            .filter(TaskEvent.task_id == task.id)
            .order_by(TaskEvent.id.asc())
            .limit(max(1, min(limit, 5000)))
            .all()
        )

    def dismiss_failed_tasks(self, user_id: str, task_ids: list[str]) -> int:
        if not task_ids:
            return 0
        dismissed = (
            self.db.query(Task)
            .filter(Task.user_id == user_id, Task.id.in_(task_ids), Task.status == "failed")
            .update({Task.status: "dismissed"}, synchronize_session=False)
        )
        self.db.commit()
        return dismissed

    @staticmethod
    def supports_task_type(task_type: str) -> bool:
        return task_type in TASK_DEFINITIONS

    @staticmethod
    def supported_task_types() -> tuple[str, ...]:
        return tuple(TASK_DEFINITIONS.keys())

    def cancel_task(self, user_id: str, task_id: str) -> tuple[Task, bool]:
        task = self.get_task(user_id, task_id)
        if task.status not in ACTIVE_TASK_STATUSES:
            return task, False

        now = datetime.now(UTC)
        task.status = "canceled"
        task.error_code = "TASK_CANCELLED"
        task.error_message = "Task cancelled by user"
        task.finished_at = now
        task.updated_at = now

        run = self.db.query(WorkflowRun).filter(WorkflowRun.task_id == task.id).first()
        if run and run.status in ACTIVE_RUN_STATUSES:
            run.status = "canceled"
            run.error_code = "RUN_CANCELED"
            run.error_message = "Run cancelled by user"
            run.updated_at = now
            running_steps = (
                self.db.query(WorkflowStep)
                .filter(
                    WorkflowStep.run_id == run.id,
                    WorkflowStep.status.in_(["queued", "pending", "running"]),
                )
                .all()
            )
            for step in running_steps:
                step.status = "canceled"
                step.finished_at = now

            self._append_run_event(
                run_id=run.id,
                project_id=run.project_id,
                user_id=run.user_id,
                event_type="run.canceled",
                payload={"message": "Run cancelled by user"},
            )

        self._append_task_event(
            task_id=task.id,
            project_id=task.project_id,
            user_id=task.user_id,
            event_type=TASK_EVENT_FAILED,
            payload={"stage": "cancelled", "message": "Task cancelled by user"},
        )

        self.db.commit()
        self.db.refresh(task)
        return task, True

    def submit_story_to_script(
        self,
        user_id: str,
        project_id: str,
        episode_id: str,
        payload_json: dict | None,
        background_tasks: BackgroundTasks,
    ) -> tuple[Task, WorkflowRun, bool]:
        return self.submit_task(
            user_id=user_id,
            project_id=project_id,
            task_type=SUPPORTED_TASK_TYPE_STORY_TO_SCRIPT,
            target_type=TARGET_TYPE_EPISODE,
            target_id=episode_id,
            episode_id=episode_id,
            payload_json=payload_json,
            background_tasks=background_tasks,
        )

    def submit_script_to_storyboard(
        self,
        user_id: str,
        project_id: str,
        episode_id: str,
        payload_json: dict | None,
        background_tasks: BackgroundTasks,
    ) -> tuple[Task, WorkflowRun, bool]:
        return self.submit_task(
            user_id=user_id,
            project_id=project_id,
            task_type=SUPPORTED_TASK_TYPE_SCRIPT_TO_STORYBOARD,
            target_type=TARGET_TYPE_EPISODE,
            target_id=episode_id,
            episode_id=episode_id,
            payload_json=payload_json,
            background_tasks=background_tasks,
        )

    def submit_task(
        self,
        user_id: str,
        project_id: str,
        task_type: str,
        target_type: str,
        target_id: str,
        episode_id: str | None,
        payload_json: dict | None,
        background_tasks: BackgroundTasks,
    ) -> tuple[Task, WorkflowRun, bool]:
        definition = self._get_task_definition(task_type)
        if target_type != definition.target_type:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": f"taskType {task_type} requires targetType={definition.target_type}"
                },
            )

        resolved_episode_id = episode_id
        if target_type == TARGET_TYPE_EPISODE and resolved_episode_id is None:
            resolved_episode_id = target_id

        self._ensure_target_access(
            user_id=user_id,
            project_id=project_id,
            target_type=target_type,
            target_id=target_id,
            episode_id=resolved_episode_id,
        )

        existing = self._find_active_target_task(
            user_id=user_id,
            target_type=target_type,
            target_id=target_id,
            task_type=task_type,
        )
        if existing:
            run = self._find_or_create_run_for_task(
                existing,
                payload_json,
                workflow_type=definition.workflow_type,
            )
            self.db.commit()
            self.db.refresh(existing)
            self.db.refresh(run)
            return existing, run, True

        task = Task(
            user_id=user_id,
            project_id=project_id,
            episode_id=resolved_episode_id,
            task_type=task_type,
            target_type=target_type,
            target_id=target_id,
            status="queued",
            progress=0,
            payload_json=payload_json or {},
        )
        self.db.add(task)
        self.db.flush()

        self._append_task_event(
            task_id=task.id,
            project_id=project_id,
            user_id=user_id,
            event_type=TASK_EVENT_CREATED,
            payload={"stage": "queued", "task_type": task.task_type},
        )

        run = WorkflowRun(
            task_id=task.id,
            user_id=user_id,
            project_id=project_id,
            episode_id=resolved_episode_id,
            workflow_type=definition.workflow_type,
            target_type=target_type,
            target_id=target_id,
            status="queued",
            input_json=payload_json or {},
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(task)
        self.db.refresh(run)

        runner = self._get_runner(definition.runner_name)
        background_tasks.add_task(runner, task.id)
        return task, run, False

    def _get_project(self, user_id: str, project_id: str) -> Project:
        project = (
            self.db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Project not found"},
            )
        return project

    def _ensure_target_access(
        self,
        user_id: str,
        project_id: str,
        target_type: str,
        target_id: str,
        episode_id: str | None,
    ) -> None:
        self._get_project(user_id, project_id)

        if target_type == TARGET_TYPE_EPISODE:
            resolved_episode_id = episode_id or target_id
            episode = (
                self.db.query(Episode)
                .filter(Episode.id == resolved_episode_id, Episode.project_id == project_id)
                .first()
            )
            if episode is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"message": "Episode not found"},
                )
            return

        if target_type == TARGET_TYPE_ASSET:
            asset = (
                self.db.query(ProjectAsset)
                .filter(ProjectAsset.id == target_id, ProjectAsset.project_id == project_id)
                .first()
            )
            if asset is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"message": "Asset not found"},
                )
            return

        if target_type == TARGET_TYPE_PANEL:
            panel = (
                self.db.query(StoryboardPanel)
                .join(Storyboard, Storyboard.id == StoryboardPanel.storyboard_id)
                .filter(StoryboardPanel.id == target_id, Storyboard.project_id == project_id)
                .first()
            )
            if panel is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"message": "Panel not found"},
                )
            return

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": f"Unsupported targetType: {target_type}"},
        )

    def _find_active_target_task(
        self,
        user_id: str,
        target_type: str,
        target_id: str,
        task_type: str,
    ) -> Task | None:
        return (
            self.db.query(Task)
            .filter(
                Task.user_id == user_id,
                Task.task_type == task_type,
                Task.target_type == target_type,
                Task.target_id == target_id,
                Task.status.in_(ACTIVE_TASK_STATUSES),
            )
            .order_by(Task.created_at.desc())
            .first()
        )

    def _get_task_definition(self, task_type: str) -> TaskDefinition:
        definition = TASK_DEFINITIONS.get(task_type)
        if definition is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": f"Unsupported taskType: {task_type}"},
            )
        return definition

    def _find_or_create_run_for_task(
        self,
        task: Task,
        payload_json: dict | None,
        *,
        workflow_type: str,
    ) -> WorkflowRun:
        run = self.db.query(WorkflowRun).filter(WorkflowRun.task_id == task.id).first()
        if run is not None:
            return run
        run = WorkflowRun(
            task_id=task.id,
            user_id=task.user_id,
            project_id=task.project_id,
            episode_id=task.episode_id,
            workflow_type=workflow_type,
            target_type=task.target_type,
            target_id=task.target_id,
            status="queued",
            input_json=payload_json or {},
        )
        self.db.add(run)
        self.db.flush()
        return run

    @staticmethod
    def _get_runner(runner_name: str):
        runner = globals().get(runner_name)
        if runner is None:
            raise RuntimeError(f"Task runner not found: {runner_name}")
        return runner

    def _append_task_event(
        self,
        task_id: str,
        project_id: str,
        user_id: str,
        event_type: str,
        payload: dict | None = None,
    ) -> None:
        self.db.add(
            TaskEvent(
                task_id=task_id,
                project_id=project_id,
                user_id=user_id,
                event_type=event_type,
                payload_json=payload or {},
            )
        )

    def _append_run_event(
        self,
        run_id: str,
        project_id: str,
        user_id: str,
        event_type: str,
        step_key: str | None = None,
        payload: dict | None = None,
    ) -> None:
        last_seq = (
            self.db.query(WorkflowEvent.seq)
            .filter(WorkflowEvent.run_id == run_id)
            .order_by(WorkflowEvent.seq.desc())
            .first()
        )
        next_seq = (last_seq[0] if last_seq else 0) + 1
        self.db.add(
            WorkflowEvent(
                run_id=run_id,
                project_id=project_id,
                user_id=user_id,
                event_type=event_type,
                step_key=step_key,
                seq=next_seq,
                payload_json=payload or {},
            )
        )
