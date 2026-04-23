from typing import Dict, Any
from .abstract_analyzer import AbstractTestGenerator


class APITestGenerator(AbstractTestGenerator):
    def get_category(self) -> str:
        return "api"

    def get_context_hint(self) -> str:
        return (
            "Focus on API-related tests detectable from the page: "
            "network request patterns, script-loaded endpoints, "
            "fetch/XHR behavior, API response rendering, "
            "and dynamic content loading."
        )

    def get_relevant_data(self) -> Dict[str, Any]:
        return {
            "scripts": self.page_structure.get("scripts"),
            "forms": self.page_structure.get("forms"),
            "title": self.page_structure.get("title"),
            "links": self.page_structure.get("links"),
        }
