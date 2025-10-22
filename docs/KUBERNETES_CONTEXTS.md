# Kubernetes Contexts

This reference captures the currently configured Kubernetes context for the
Dynamic Capital tooling and the assets required to recreate it locally.

## Current Context

- **Name:** `dynamic-cluster`
- **Status:** Reachable
- **Cluster:** `kind-dynamic-cluster`
- **Server:** `https://127.0.0.1:51505`
- **User:** `kind-dynamic-cluster`

## Workload Summary

| Resource    | Count |
| ----------- | ----: |
| Pods        |     0 |
| Deployments |     0 |

## Control Plane Pod Manifest

Save the following manifest as `dynamic-cluster-control-plane-pod.yaml` and
apply it with `kubectl create -f dynamic-cluster-control-plane-pod.yaml` to
import the control-plane pod for this context.

```yaml
# Save the output of this file and use kubectl create -f to import
# it into Kubernetes.
#
# Created with podman-5.6.1

# NOTE: If you generated this yaml from an unprivileged and rootless podman container on an SELinux
# enabled system, check the podman generate kube man page for steps to follow to ensure that your pod/container
# has the right permissions to access the volumes added.
---
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2025-10-22T01:48:56Z"
  labels:
    app: dynamic-cluster-control-plane-pod
  name: dynamic-cluster-control-plane-pod
spec:
  containers:
    - env:
        - name: KUBECONFIG
          value: /etc/kubernetes/admin.conf
        - name: TERM
          value: xterm
        - name: HOSTNAME
          value: dynamic-cluster-control-plane
      image: docker.io/kindest/node@sha256:7416a61b42b1662ca6ca89f02028ac133a309a2a30ba309614e8ec94d976dc5a
      name: dynamic-cluster-control-plane
      ports:
        - containerPort: 80
          hostPort: 9090
        - containerPort: 443
          hostPort: 9443
        - containerPort: 6443
          hostIP: 127.0.0.1
          hostPort: 51505
      securityContext:
        privileged: true
        procMount: Unmasked
      tty: true
      volumeMounts:
        - mountPath: /lib/modules
          name: lib-modules-host-0
          readOnly: true
        - mountPath: /tmp
          name: tmp-1
        - mountPath: /run
          name: tmp-2
        - mountPath: /var
          name: 94027cafdb44a93e7045438ee9d5f28ecc0aea245871384d894c7381039431ce-pvc
  hostname: dynamic-cluster-control-plane
  volumes:
    - hostPath:
        path: /lib/modules
        type: Directory
      name: lib-modules-host-0
    - emptyDir:
        medium: Memory
      name: tmp-1
    - emptyDir:
        medium: Memory
      name: tmp-2
    - name: 94027cafdb44a93e7045438ee9d5f28ecc0aea245871384d894c7381039431ce-pvc
      persistentVolumeClaim:
        claimName: 94027cafdb44a93e7045438ee9d5f28ecc0aea245871384d894c7381039431ce
```

## Maintenance Notes

- Update this document whenever the active Kubernetes context changes or new
  workloads are deployed.
- Use `kubectl config get-contexts` to list all configured contexts and
  `kubectl config use-context <name>` to switch between them.
- After applying the manifest, verify the control plane pod is running with
  `kubectl get pod dynamic-cluster-control-plane-pod`.
