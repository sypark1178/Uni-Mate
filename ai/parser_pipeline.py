from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class ParsedChunk:
    source_path: str
    page_number: int | None
    markdown: str
    table_markdown: str
    metadata: dict[str, str]


def build_llamaparse_job(pdf_path: str) -> dict[str, object]:
    path = Path(pdf_path)
    return {
        "loader": "LlamaParse",
        "input_path": str(path),
        "extract_tables": True,
        "output_format": "markdown",
        "target": "pinecone_chunks",
    }


def to_pinecone_chunk(page_number: int | None, markdown: str, table_markdown: str) -> ParsedChunk:
    return ParsedChunk(
        source_path="guideline.pdf",
        page_number=page_number,
        markdown=markdown,
        table_markdown=table_markdown,
        metadata={
            "has_numeric_evidence": "true" if any(char.isdigit() for char in markdown + table_markdown) else "false"
        },
    )
