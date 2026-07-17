from __future__ import annotations

from pydantic import BaseModel, ValidationError, model_validator

from whatsaap_backend.presentation.api.errors import _format_validation_errors


def test_formats_a_custom_model_validator_error_without_python_repr_noise() -> None:
    class Foo(BaseModel):
        script: str

        @model_validator(mode="after")
        def check(self) -> Foo:
            raise ValueError("script must define a top-level `def handle(message):`")

    try:
        Foo(script="x")
        raise AssertionError("expected ValidationError")
    except ValidationError as error:
        message = _format_validation_errors(error.errors())

    # Never leaks pydantic's raw repr: no loc tuples, no ctx dict, no docs URL.
    assert message == "script must define a top-level `def handle(message):`"
    assert "ctx" not in message
    assert "errors.pydantic.dev" not in message


def test_includes_the_field_path_for_nested_model_errors() -> None:
    class Item(BaseModel):
        script: str

        @model_validator(mode="after")
        def check(self) -> Item:
            raise ValueError("bad script")

    class Wrapper(BaseModel):
        items: list[Item]

    try:
        Wrapper(items=[{"script": "x"}])
        raise AssertionError("expected ValidationError")
    except ValidationError as error:
        message = _format_validation_errors(error.errors())

    # The list index ("0") is dropped — it means nothing to someone editing
    # a single rule in the dashboard — but the field name is kept.
    assert message == "items: bad script"


def test_drops_the_prefix_for_actions_and_conditions() -> None:
    """The dashboard only ever shows a single "Acción"/"Condición" per rule —
    prefixing an already-complete Spanish sentence with the raw English
    field name ("actions: ...") would read as noise, not context."""

    class Item(BaseModel):
        script: str

        @model_validator(mode="after")
        def check(self) -> Item:
            raise ValueError("bad script")

    class Wrapper(BaseModel):
        actions: list[Item]

    try:
        Wrapper(actions=[{"script": "x"}])
        raise AssertionError("expected ValidationError")
    except ValidationError as error:
        message = _format_validation_errors(error.errors())

    assert message == "bad script"


def test_builtin_constraint_errors_read_naturally() -> None:
    class Strict(BaseModel):
        priority: int

    try:
        Strict.model_validate({"priority": "not-a-number"})
        raise AssertionError("expected ValidationError")
    except ValidationError as error:
        message = _format_validation_errors(error.errors())

    assert message.startswith("priority:")
    assert "loc" not in message


def test_joins_multiple_errors_with_a_semicolon() -> None:
    class Strict(BaseModel):
        a: int
        b: int

    try:
        Strict.model_validate({"a": "x", "b": "y"})
        raise AssertionError("expected ValidationError")
    except ValidationError as error:
        message = _format_validation_errors(error.errors())

    assert message.count(";") == 1
    assert "a:" in message
    assert "b:" in message


def test_empty_error_list_returns_a_generic_fallback() -> None:
    assert _format_validation_errors([]) == "Solicitud inválida"
