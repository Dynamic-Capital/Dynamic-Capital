# Docker Assets

## Scout Demo Image

Use the helper script to build and push the `dynamiccapital/scout-demo` image. You must be logged in to Docker Hub (or the appropria
te registry) and have [`docker buildx`](https://docs.docker.com/build/install-buildx/) enabled locally.

```bash
./docker/build_and_push_scout_demo.sh [tag]
```

By default the script pushes the `v1` tag. Provide a different tag as the first argument to publish another version.
