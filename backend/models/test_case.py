from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class TestStatus(str, Enum):
    queued = "queued"
    running = "running"
    passed = "passed"
    failed = "failed"


class TestCategory(str, Enum):
    ui = "ui"
    form = "form"
    navigation = "navigation"
    api = "api"


class TestCase(BaseModel):
    id: str
    category: TestCategory
    title: str
    description: str
    steps: List[str]
    expectedResult: str
    playwrightCode: str
    status: TestStatus = TestStatus.queued
    error: Optional[str] = None
    duration: float = 0.0


class ScanSummary(BaseModel):
    total: int
    passed: int
    failed: int
