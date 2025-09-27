"""Tests for the legacy ``dynamic_keepers`` compatibility shims."""

from __future__ import annotations

import importlib


def test_dynamic_keepers_exports_reference_canonical_modules() -> None:
    dynamic_keepers = importlib.import_module("dynamic_keepers")

    api_module = importlib.import_module("algorithms.python.api_keeper")
    backend_module = importlib.import_module("algorithms.python.backend_keeper")
    channel_module = importlib.import_module("algorithms.python.channel_keeper")
    frontend_module = importlib.import_module("algorithms.python.frontend_keeper")
    group_module = importlib.import_module("algorithms.python.group_keeper")
    route_module = importlib.import_module("algorithms.python.route_keeper")
    time_module = importlib.import_module("algorithms.python.time_keeper")

    assert dynamic_keepers.ApiEndpoint is api_module.ApiEndpoint
    assert dynamic_keepers.DynamicAPIKeeperAlgorithm is api_module.DynamicAPIKeeperAlgorithm
    assert dynamic_keepers.ApiKeeperSyncResult is api_module.ApiKeeperSyncResult

    assert dynamic_keepers.BackendService is backend_module.BackendService
    assert (
        dynamic_keepers.DynamicBackendKeeperAlgorithm
        is backend_module.DynamicBackendKeeperAlgorithm
    )
    assert (
        dynamic_keepers.BackendKeeperSyncResult is backend_module.BackendKeeperSyncResult
    )

    assert dynamic_keepers.BroadcastChannel is channel_module.BroadcastChannel
    assert (
        dynamic_keepers.DynamicChannelKeeperAlgorithm
        is channel_module.DynamicChannelKeeperAlgorithm
    )
    assert (
        dynamic_keepers.ChannelKeeperSyncResult
        is channel_module.ChannelKeeperSyncResult
    )

    assert dynamic_keepers.FrontendSurface is frontend_module.FrontendSurface
    assert (
        dynamic_keepers.DynamicFrontendKeeperAlgorithm
        is frontend_module.DynamicFrontendKeeperAlgorithm
    )
    assert (
        dynamic_keepers.FrontendKeeperSyncResult
        is frontend_module.FrontendKeeperSyncResult
    )

    assert dynamic_keepers.CommunityGroup is group_module.CommunityGroup
    assert (
        dynamic_keepers.DynamicGroupKeeperAlgorithm
        is group_module.DynamicGroupKeeperAlgorithm
    )
    assert (
        dynamic_keepers.GroupKeeperSyncResult is group_module.GroupKeeperSyncResult
    )

    assert dynamic_keepers.Route is route_module.Route
    assert (
        dynamic_keepers.DynamicRouteKeeperAlgorithm
        is route_module.DynamicRouteKeeperAlgorithm
    )
    assert (
        dynamic_keepers.RouteKeeperSyncResult is route_module.RouteKeeperSyncResult
    )

    assert dynamic_keepers.MVT_TIMEZONE is time_module.MVT_TIMEZONE
    assert dynamic_keepers.TradingSession is time_module.TradingSession
    assert dynamic_keepers.KillZone is time_module.KillZone
    assert (
        dynamic_keepers.DynamicTimeKeeperAlgorithm
        is time_module.DynamicTimeKeeperAlgorithm
    )
    assert dynamic_keepers.TimeKeeperSyncResult is time_module.TimeKeeperSyncResult


def test_dynamic_keepers_dir_reports_all_exports() -> None:
    dynamic_keepers = importlib.import_module("dynamic_keepers")

    for symbol in (
        "ApiEndpoint",
        "BackendService",
        "BroadcastChannel",
        "FrontendSurface",
        "CommunityGroup",
        "Route",
        "MVT_TIMEZONE",
        "TradingSession",
        "KillZone",
    ):
        assert symbol in dir(dynamic_keepers)
