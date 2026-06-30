# =============================================================================
# KUBERNETES POD SECURITY POLICIES
# OPA/Rego Policies for FinDevSecOps Pipeline
# Version: 1.0.0
# =============================================================================

package kubernetes.security

import future.keywords.in
import future.keywords.contains
import future.keywords.if

# =============================================================================
# METADATA
# =============================================================================
# title: Kubernetes Pod Security Policies
# description: Security policies for Kubernetes pods following best practices
# related_resources:
#   - Pod, Deployment, StatefulSet, DaemonSet, Job, CronJob
# severity_levels:
#   - CRITICAL: Must fix before deployment
#   - HIGH: Should fix before production
#   - MEDIUM: Should fix within sprint
#   - LOW: Nice to have

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Get all containers (regular + init + ephemeral)
all_containers[container] {
    container := input.spec.containers[_]
}

all_containers[container] {
    container := input.spec.initContainers[_]
}

all_containers[container] {
    container := input.spec.ephemeralContainers[_]
}

# Check if resource is a workload type
is_workload {
    input.kind in ["Pod", "Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob", "ReplicaSet"]
}

# Get pod spec (handles both Pod and workload controllers)
pod_spec = spec {
    input.kind == "Pod"
    spec := input.spec
}

pod_spec = spec {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet"]
    spec := input.spec.template.spec
}

pod_spec = spec {
    input.kind in ["Job", "CronJob"]
    spec := input.spec.jobTemplate.spec.template.spec
}

# =============================================================================
# CRITICAL SECURITY POLICIES
# =============================================================================

# SEC-001: Deny containers running as root
deny contains msg if {
    is_workload
    container := all_containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf(
        "CRITICAL [SEC-001]: Container '%s' must not run as root (runAsUser: 0). Set runAsUser to non-zero value.",
        [container.name]
    )
}

# SEC-002: Deny containers without explicit runAsNonRoot
deny contains msg if {
    is_workload
    container := all_containers[_]
    not container.securityContext.runAsNonRoot
    not pod_spec.securityContext.runAsNonRoot
    msg := sprintf(
        "CRITICAL [SEC-002]: Container '%s' must have runAsNonRoot: true in securityContext.",
        [container.name]
    )
}

# SEC-003: Deny privileged containers
deny contains msg if {
    is_workload
    container := all_containers[_]
    container.securityContext.privileged == true
    msg := sprintf(
        "CRITICAL [SEC-003]: Container '%s' must not run in privileged mode. Remove 'privileged: true'.",
        [container.name]
    )
}

# SEC-004: Deny containers with privilege escalation
deny contains msg if {
    is_workload
    container := all_containers[_]
    container.securityContext.allowPrivilegeEscalation == true
    msg := sprintf(
        "CRITICAL [SEC-004]: Container '%s' must not allow privilege escalation. Set allowPrivilegeEscalation: false.",
        [container.name]
    )
}

# SEC-005: Deny containers without allowPrivilegeEscalation explicitly set
warn contains msg if {
    is_workload
    container := all_containers[_]
    not has_key(container.securityContext, "allowPrivilegeEscalation")
    msg := sprintf(
        "HIGH [SEC-005]: Container '%s' should explicitly set allowPrivilegeEscalation: false.",
        [container.name]
    )
}

# =============================================================================
# HIGH SEVERITY POLICIES
# =============================================================================

# SEC-010: Deny containers with writable root filesystem
deny contains msg if {
    is_workload
    container := all_containers[_]
    not container.securityContext.readOnlyRootFilesystem == true
    msg := sprintf(
        "HIGH [SEC-010]: Container '%s' must have readOnlyRootFilesystem: true.",
        [container.name]
    )
}

# SEC-011: Deny containers with dangerous capabilities
dangerous_capabilities := [
    "ALL",
    "SYS_ADMIN",
    "NET_ADMIN", 
    "SYS_PTRACE",
    "SYS_MODULE",
    "DAC_OVERRIDE",
    "SETUID",
    "SETGID"
]

deny contains msg if {
    is_workload
    container := all_containers[_]
    cap := container.securityContext.capabilities.add[_]
    cap in dangerous_capabilities
    msg := sprintf(
        "HIGH [SEC-011]: Container '%s' must not add dangerous capability '%s'.",
        [container.name, cap]
    )
}

# SEC-012: Require dropping ALL capabilities
warn contains msg if {
    is_workload
    container := all_containers[_]
    not "ALL" in container.securityContext.capabilities.drop
    msg := sprintf(
        "HIGH [SEC-012]: Container '%s' should drop ALL capabilities and add only what's needed.",
        [container.name]
    )
}

# SEC-013: Deny hostNetwork
deny contains msg if {
    is_workload
    pod_spec.hostNetwork == true
    msg := "HIGH [SEC-013]: Pods must not use hostNetwork: true."
}

# SEC-014: Deny hostPID
deny contains msg if {
    is_workload
    pod_spec.hostPID == true
    msg := "HIGH [SEC-014]: Pods must not use hostPID: true."
}

# SEC-015: Deny hostIPC
deny contains msg if {
    is_workload
    pod_spec.hostIPC == true
    msg := "HIGH [SEC-015]: Pods must not use hostIPC: true."
}

# SEC-016: Deny hostPath volumes
deny contains msg if {
    is_workload
    volume := pod_spec.volumes[_]
    volume.hostPath
    msg := sprintf(
        "HIGH [SEC-016]: Pods must not use hostPath volumes. Found hostPath volume '%s'.",
        [volume.name]
    )
}

# =============================================================================
# MEDIUM SEVERITY POLICIES
# =============================================================================

# SEC-020: Require seccomp profile
warn contains msg if {
    is_workload
    container := all_containers[_]
    not container.securityContext.seccompProfile
    not pod_spec.securityContext.seccompProfile
    msg := sprintf(
        "MEDIUM [SEC-020]: Container '%s' should have a seccomp profile configured.",
        [container.name]
    )
}

# SEC-021: Recommend RuntimeDefault seccomp
warn contains msg if {
    is_workload
    pod_spec.securityContext.seccompProfile.type != "RuntimeDefault"
    msg := "MEDIUM [SEC-021]: Pods should use seccompProfile.type: RuntimeDefault."
}

# SEC-022: Deny latest tag
deny contains msg if {
    is_workload
    container := all_containers[_]
    endswith(container.image, ":latest")
    msg := sprintf(
        "MEDIUM [SEC-022]: Container '%s' must not use :latest tag. Use specific version.",
        [container.name]
    )
}

# SEC-023: Deny images without tag
deny contains msg if {
    is_workload
    container := all_containers[_]
    not contains(container.image, ":")
    msg := sprintf(
        "MEDIUM [SEC-023]: Container '%s' image must have an explicit tag.",
        [container.name]
    )
}

# SEC-024: Require approved registries
approved_registries := [
    "gcr.io/",
    "ghcr.io/",
    "docker.io/library/",
    "registry.k8s.io/",
    "quay.io/",
    # Add your private registry
    "your-registry.azurecr.io/",
    "your-account.dkr.ecr.region.amazonaws.com/"
]

warn contains msg if {
    is_workload
    container := all_containers[_]
    not image_from_approved_registry(container.image)
    msg := sprintf(
        "MEDIUM [SEC-024]: Container '%s' uses unapproved registry. Image: %s",
        [container.name, container.image]
    )
}

image_from_approved_registry(image) {
    some registry in approved_registries
    startswith(image, registry)
}

# =============================================================================
# LOW SEVERITY / INFORMATIONAL
# =============================================================================

# SEC-030: Recommend automountServiceAccountToken: false
warn contains msg if {
    is_workload
    not pod_spec.automountServiceAccountToken == false
    msg := "LOW [SEC-030]: Consider setting automountServiceAccountToken: false if SA token not needed."
}

# SEC-031: Recommend non-default service account
warn contains msg if {
    is_workload
    pod_spec.serviceAccountName == "default"
    msg := "LOW [SEC-031]: Pods should use a dedicated service account, not 'default'."
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

has_key(obj, key) {
    _ = obj[key]
}

# =============================================================================
# TEST DATA (for opa test)
# =============================================================================

# Example test:
# test_deny_root_user {
#     deny with input as {
#         "kind": "Pod",
#         "spec": {
#             "containers": [{
#                 "name": "test",
#                 "securityContext": {"runAsUser": 0}
#             }]
#         }
#     }
# }
