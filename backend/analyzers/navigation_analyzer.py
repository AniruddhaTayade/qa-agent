from typing import Dict, Any
from .abstract_analyzer import AbstractTestGenerator


class NavigationTestGenerator(AbstractTestGenerator):
    def get_category(self) -> str:
        return "navigation"

    def get_context_hint(self) -> str:
        return (
            "Focus on navigation tests: internal link validity, external link presence, "
            "navigation menu functionality, page routing correctness, "
            "back-button behavior, and anchor link scrolling."
        )

    def get_relevant_data(self) -> Dict[str, Any]:
        return {
            "links": self.page_structure.get("links"),
            "title": self.page_structure.get("title"),
            "headings": self.page_structure.get("headings"),
        }
