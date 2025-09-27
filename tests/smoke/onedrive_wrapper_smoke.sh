#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-9900}"
REMOTE_NAME="onedrive-smoke-$$"
WORKDIR="$(mktemp -d)"
RC_USER="smoke-user"
RC_PASS="smoke-secret"
RC_REGION="us-east-1"
BUCKET_NAME="dynamic-ai-smoke"
OBJECT_KEY="datasets/train.csv"

cleanup() {
  set +e
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

mkdir -p "${WORKDIR}/storage"

cat <<CFG > "${WORKDIR}/rclone.conf"
[${REMOTE_NAME}]
type = local
root = ${WORKDIR}/storage
CFG

log() {
  printf '[smoke] %s\n' "$1"
}

log "starting rclone serve s3 on port ${PORT}"

rclone serve s3 "${REMOTE_NAME}:" \
  --config "${WORKDIR}/rclone.conf" \
  --addr "127.0.0.1:${PORT}" \
  --auth-key "${RC_USER},${RC_PASS}" \
  --log-level ERROR &
SERVER_PID=$!

READY=""
export PORT_CHECK="${PORT}"
for _ in $(seq 1 30); do
  if python - <<'PY'
import os
import socket
host = '127.0.0.1'
port = int(os.environ['PORT_CHECK'])
with socket.socket() as sock:
    sock.settimeout(0.5)
    try:
        sock.connect((host, port))
    except OSError:
        raise SystemExit(1)
PY
  then
    READY=1
    break
  fi
  sleep 1
done

if [[ -z "${READY}" ]]; then
  echo "rclone serve s3 did not become ready" >&2
  exit 1
fi

log "ensuring boto3 dependency is available"
python - <<'PY'
import importlib
try:
    importlib.import_module('boto3')
except ModuleNotFoundError:  # pragma: no cover - install path
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'boto3', '--quiet'])
PY

log "running boto3 smoke flow"
export SMOKE_PORT="${PORT}"
export SMOKE_USER="${RC_USER}"
export SMOKE_SECRET="${RC_PASS}"
export SMOKE_REGION="${RC_REGION}"
export SMOKE_WORKDIR="${WORKDIR}"
export SMOKE_BUCKET="${BUCKET_NAME}"
export SMOKE_KEY="${OBJECT_KEY}"
python - <<'PY'
import os
import pathlib
import boto3

endpoint = f"http://127.0.0.1:{os.environ['SMOKE_PORT']}"
user = os.environ['SMOKE_USER']
secret = os.environ['SMOKE_SECRET']
region = os.environ['SMOKE_REGION']
workdir = pathlib.Path(os.environ['SMOKE_WORKDIR'])
bucket = os.environ['SMOKE_BUCKET']
key = os.environ['SMOKE_KEY']
expected = b'dynamic ai smoke test payload'

aws = boto3.session.Session().client(
    's3',
    endpoint_url=endpoint,
    aws_access_key_id=user,
    aws_secret_access_key=secret,
    region_name=region,
)

from botocore.exceptions import ClientError

try:
    aws.create_bucket(Bucket=bucket)
except ClientError as error:
    if error.response.get('Error', {}).get('Code') not in {'BucketAlreadyOwnedByYou', 'BucketAlreadyExists'}:
        raise

aws.put_object(Bucket=bucket, Key=key, Body=expected)
download_path = workdir / 'download.csv'
aws.download_file(bucket, key, str(download_path))
actual = download_path.read_bytes()
if actual != expected:
    raise SystemExit('downloaded payload mismatch')
print('Smoke test payload verified')
PY

log "listing uploaded objects via rclone"
rclone ls "${REMOTE_NAME}:${BUCKET_NAME}" --config "${WORKDIR}/rclone.conf"

log "smoke test complete"
