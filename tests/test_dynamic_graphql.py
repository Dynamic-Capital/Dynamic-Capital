from __future__ import annotations

import pytest

from dynamic_graphql import (
    GraphQLArgument,
    GraphQLDocument,
    GraphQLField,
    GraphQLFragment,
    GraphQLFragmentSpread,
    GraphQLOperation,
    GraphQLSelectionSet,
    GraphQLVariable,
    GraphQLVariableReference,
    build_mutation,
    build_query,
)


def test_build_query_renders_nested_selection() -> None:
    selection_set = GraphQLSelectionSet(
        (
            GraphQLField(
                name="viewer",
                selections=GraphQLSelectionSet(
                    (
                        GraphQLField(name="id"),
                        GraphQLField(
                            name="portfolio",
                            arguments=(GraphQLArgument("status", "active"),),
                            selections=GraphQLSelectionSet(
                                (
                                    GraphQLField(name="id"),
                                    GraphQLField(name="balance"),
                                )
                            ),
                        ),
                    )
                ),
            ),
        )
    )

    operation = build_query(selection_set, name="ViewerQuery")
    document = GraphQLDocument((operation,))

    assert (
        document.render()
        == """query ViewerQuery {\n  viewer {\n    id\n    portfolio(status: \"active\") {\n      id\n      balance\n    }\n  }\n}"""
    )


def test_operation_supports_variables_and_directives() -> None:
    selection_set = GraphQLSelectionSet(
        (
            GraphQLField(
                name="user",
                arguments=(
                    GraphQLArgument("id", GraphQLVariableReference("userId")),
                ),
                selections=GraphQLSelectionSet((GraphQLField(name="name"),)),
            ),
        )
    )
    variables = (GraphQLVariable(name="userId", type_="ID!"),)

    operation = GraphQLOperation(
        operation_type="query",
        name="UserLookup",
        selection_set=selection_set,
        variables=variables,
        directives=("@live",),
    )

    assert (
        operation.render()
        == """query UserLookup($userId: ID!) @live {\n  user(id: $userId) {\n    name\n  }\n}"""
    )


def test_document_combines_operations_and_fragments() -> None:
    fragment = GraphQLFragment(
        name="UserFields",
        type_condition="User",
        selection_set=GraphQLSelectionSet(
            (
                GraphQLField(name="id"),
                GraphQLField(name="name"),
            )
        ),
    )
    selection_set = GraphQLSelectionSet(
        (
            GraphQLField(
                name="updateUser",
                arguments=(
                    GraphQLArgument("id", GraphQLVariableReference("userId")),
                    GraphQLArgument("input", {"name": "Ada"}),
                ),
                selections=GraphQLSelectionSet((GraphQLFragmentSpread("UserFields"),)),
            ),
        )
    )
    mutation = build_mutation(
        selection_set,
        name="UpdateUser",
        variables=(GraphQLVariable("userId", "ID!"),),
    )
    document = GraphQLDocument((mutation,), (fragment,))

    assert (
        document.render()
        == """mutation UpdateUser($userId: ID!) {\n  updateUser(id: $userId, input: {name: \"Ada\"}) {\n    ...UserFields\n  }\n}\n\nfragment UserFields on User {\n  id\n  name\n}"""
    )


def test_invalid_identifier_raises_value_error() -> None:
    with pytest.raises(ValueError):
        GraphQLArgument("1invalid", "x")

    with pytest.raises(ValueError):
        GraphQLField(name="invalid-name")
