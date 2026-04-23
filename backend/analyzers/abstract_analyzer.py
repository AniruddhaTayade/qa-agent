from abc import ABC, abstractmethod
from typing import Dict, Any


class AbstractTestGenerator(ABC):
    def __init__(self, page_structure: Dict[str, Any]):
        self.page_structure = page_structure

    @abstractmethod
    def get_category(self) -> str:
        pass

    @abstractmethod
    def get_context_hint(self) -> str:
        pass

    def get_relevant_data(self) -> Dict[str, Any]:
        return self.page_structure
