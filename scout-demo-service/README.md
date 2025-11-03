# Docker Scout demo service

A repository containing an application and Dockerfile to demonstrate the use of Docker Scout to analyze and remediate CVEs in a container image.

Read the [Docker Scout Quickstart](https://docs.docker.com/scout/quickstart) for a full walkthrough. You can build and run the image for local testing with the following commands:

```shell
docker build -t scout-demo:v1 scout-demo-service
docker run --rm -p 3000:3000 scout-demo:v1
```

To publish the image directly from the Dynamic Capital monorepo, use the root-level Dockerfile:

```shell
docker build --push -t dynamiccapital/scout-demo:v1 .
```

The application consists of a basic ExpressJS server and uses an intentionally old version of Express and Alpine base image.
