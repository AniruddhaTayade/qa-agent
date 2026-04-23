from typing import Dict, Any
from .abstract_analyzer import AbstractTestGenerator


class FormTestGenerator(AbstractTestGenerator):
    def get_category(self) -> str:
        return "form"

    def get_context_hint(self) -> str:
        return (
            "Focus on form tests: input validation, required field enforcement, "
            "submit behavior with valid and invalid data, "
            "error message display, and form accessibility."
        )

    def get_relevant_data(self) -> Dict[str, Any]:
        return {
            "forms": self.page_structure.get("forms"),
            "title": self.page_structure.get("title"),
        }
