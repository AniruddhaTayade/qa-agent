from typing import Dict, Any
from .abstract_analyzer import AbstractTestGenerator


class UITestGenerator(AbstractTestGenerator):
    def get_category(self) -> str:
        return "ui"

    def get_context_hint(self) -> str:
        return (
            "Focus on UI tests: page title presence, heading hierarchy, "
            "button visibility and interactability, layout integrity, "
            "image alt text, and general visual structure."
        )

    def get_relevant_data(self) -> Dict[str, Any]:
        return {
            "title": self.page_structure.get("title"),
            "meta_description": self.page_structure.get("meta_description"),
            "headings": self.page_structure.get("headings"),
            "buttons": self.page_structure.get("buttons"),
        }
