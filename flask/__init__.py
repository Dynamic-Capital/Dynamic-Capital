"""Minimal Flask-compatible interface for testing purposes."""
from .app import Flask, FlaskClient, Request, Response, jsonify, request

__all__ = ["Flask", "FlaskClient", "Request", "Response", "jsonify", "request"]
