#!/usr/bin/env python3
"""
Upload an .excalidraw file to excalidraw.com and print a shareable URL.

No account is required. The diagram is encrypted client-side with AES-GCM
before upload; the encryption key is embedded in the URL fragment, so the
server never sees the plaintext diagram.

Usage:
    uv run --project references python scripts/upload.py <path-to-file.excalidraw>
"""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import struct
import sys
import urllib.request
import zlib

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    print("ERROR: cryptography is not installed.", file=sys.stderr)
    print(
        "Run: uv run --project references python scripts/upload.py <path-to-file.excalidraw>",
        file=sys.stderr,
    )
    sys.exit(1)


UPLOAD_URL = "https://json.excalidraw.com/api/v2/post/"


def concat_buffers(*buffers: bytes) -> bytes:
    """Build Excalidraw's v2 concat-buffers binary format."""
    parts = [struct.pack(">I", 1)]
    for buf in buffers:
        parts.append(struct.pack(">I", len(buf)))
        parts.append(buf)
    return b"".join(parts)


def validate_excalidraw_file(file_path: Path) -> str:
    """Read and lightly validate an Excalidraw JSON file."""
    if not file_path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    content = file_path.read_text(encoding="utf-8-sig")
    try:
        doc = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"File is not valid JSON: {exc}") from exc

    if doc.get("type") != "excalidraw":
        raise ValueError("Expected an Excalidraw document with type='excalidraw'")
    if "elements" not in doc or not isinstance(doc["elements"], list):
        raise ValueError("Expected an Excalidraw document with an elements array")

    return content


def upload(excalidraw_json: str) -> str:
    """Encrypt and upload Excalidraw JSON, returning a shareable URL."""
    file_metadata = json.dumps({}).encode("utf-8")
    data_bytes = excalidraw_json.encode("utf-8")
    inner_payload = concat_buffers(file_metadata, data_bytes)
    compressed = zlib.compress(inner_payload)

    raw_key = os.urandom(16)
    iv = os.urandom(12)
    encrypted = AESGCM(raw_key).encrypt(iv, compressed, None)

    encoding_meta = json.dumps(
        {
            "version": 2,
            "compression": "pako@1",
            "encryption": "AES-GCM",
        }
    ).encode("utf-8")

    payload = concat_buffers(encoding_meta, iv, encrypted)
    req = urllib.request.Request(UPLOAD_URL, data=payload, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status != 200:
            raise RuntimeError(f"Upload failed with HTTP {resp.status}")
        result = json.loads(resp.read().decode("utf-8"))

    file_id = result.get("id")
    if not file_id:
        raise RuntimeError(f"Upload returned no file ID. Response: {result}")

    key_b64 = base64.urlsafe_b64encode(raw_key).rstrip(b"=").decode("ascii")
    return f"https://excalidraw.com/#json={file_id},{key_b64}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload an .excalidraw file")
    parser.add_argument("input", type=Path, help="Path to the .excalidraw file")
    args = parser.parse_args()

    try:
        content = validate_excalidraw_file(args.input)
        print(upload(content))
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
