"""Helpers for retrieving secrets in multiple runtime environments."""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def load_secret(env_var: str, credential_target: Optional[str] = None) -> Optional[str]:
    """Return a secret from environment variables or Windows Credential Manager.

    Parameters
    ----------
    env_var:
        Name of the environment variable to read.
    credential_target:
        Optional identifier stored in the Windows Credential Manager. If the
        environment variable is empty and the host is Windows, we attempt to
        pull the credential from the manager.

    Returns
    -------
    Optional[str]
        The secret if it could be resolved, otherwise ``None``.
    """
    value = os.getenv(env_var)
    if value:
        return value

    if credential_target and os.name == "nt":  # pragma: no cover - only on Windows
        try:
            import win32cred  # type: ignore

            credential = win32cred.CredRead(
                credential_target, win32cred.CRED_TYPE_GENERIC
            )
            secret = credential.get("CredentialBlob") or b""
            try:
                return secret.decode("utf-16-le")
            except Exception:  # pragma: no cover - best effort decode fallback
                return secret.decode("utf-8", errors="ignore")
        except ImportError:
            logger.warning(
                "Windows credential target '%s' requested but pywin32 is not installed.",
                credential_target,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error(
                "Failed to load credential '%s' from Windows Credential Manager: %s",
                credential_target,
                exc,
            )
    return value


__all__ = ["load_secret"]
