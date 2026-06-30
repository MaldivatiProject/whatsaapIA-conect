# =============================================================================
# FINOPS COST CONTROL POLICIES
# OPA/Rego Policies for Cloud Cost Governance
# Version: 1.0.0
# =============================================================================

package finops.controls

import future.keywords.in
import future.keywords.contains
import future.keywords.if

# =============================================================================
# METADATA
# =============================================================================
# title: FinOps Cost Control Policies
# description: Policies to enforce cost governance and prevent waste
# scope:
#   - Kubernetes resources (Deployments, Pods, PVCs)
#   - Cloud resources (EC2, RDS, S3, etc.)
#   - Terraform plans

# =============================================================================
# CONFIGURATION
# =============================================================================

# Required cost allocation tags
required_tags := ["team", "project", "environment", "cost-center", "owner"]

# Maximum allowed instance sizes per environment
max_instance_sizes := {
    "development": {
        "cpu": "2",
        "memory": "4Gi"
    },
    "staging": {
        "cpu": "4",
        "memory": "8Gi"
    },
    "production": {
        "cpu": "8",
        "memory": "16Gi"
    }
}

# Allowed EC2 instance types per environment
allowed_ec2_types := {
    "development": [
        "t3.micro", "t3.small", "t3.medium",
        "t4g.micro", "t4g.small", "t4g.medium"
    ],
    "staging": [
        "t3.small", "t3.medium", "t3.large",
        "t4g.small", "t4g.medium", "t4g.large",
        "m6i.large"
    ],
    "production": [
        "t3.medium", "t3.large", "t3.xlarge",
        "t4g.medium", "t4g.large", "t4g.xlarge",
        "m6i.large", "m6i.xlarge", "m6i.2xlarge",
        "r6i.large", "r6i.xlarge"
    ]
}

# Maximum PVC size per environment (in Gi)
max_pvc_size := {
    "development": 50,
    "staging": 100,
    "production": 500
}

# Cost thresholds (monthly, in USD)
cost_thresholds := {
    "development": 5000,
    "staging": 10000,
    "production": 50000
}

# =============================================================================
# KUBERNETES RESOURCE POLICIES
# =============================================================================

# FIN-001: Require resource limits
deny contains msg if {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf(
        "CRITICAL [FIN-001]: Container '%s' must have resource limits for cost tracking.",
        [container.name]
    )
}

# FIN-002: Require resource requests
deny contains msg if {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.requests
    msg := sprintf(
        "CRITICAL [FIN-002]: Container '%s' must have resource requests for capacity planning.",
        [container.name]
    )
}

# FIN-003: Enforce maximum resources per environment
deny contains msg if {
    input.kind == "Deployment"
    env := input.metadata.labels.environment
    container := input.spec.template.spec.containers[_]
    
    max_cpu := max_instance_sizes[env].cpu
    requested_cpu := container.resources.limits.cpu
    
    cpu_exceeds_limit(requested_cpu, max_cpu)
    
    msg := sprintf(
        "HIGH [FIN-003]: Container '%s' CPU limit '%s' exceeds maximum '%s' for '%s' environment.",
        [container.name, requested_cpu, max_cpu, env]
    )
}

# FIN-004: Require cost allocation labels
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
    tag := required_tags[_]
    not input.metadata.labels[tag]
    msg := sprintf(
        "CRITICAL [FIN-004]: Resource must have label '%s' for cost allocation.",
        [tag]
    )
}

# FIN-005: Validate cost-center format
deny contains msg if {
    input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
    cost_center := input.metadata.labels["cost-center"]
    not valid_cost_center(cost_center)
    msg := sprintf(
        "MEDIUM [FIN-005]: Cost center '%s' is not valid. Expected format: CC-XXXX.",
        [cost_center]
    )
}

valid_cost_center(cc) {
    regex.match(`^CC-[0-9]{4}$`, cc)
}

# FIN-006: Limit PVC size per environment
deny contains msg if {
    input.kind == "PersistentVolumeClaim"
    env := input.metadata.labels.environment
    
    storage_str := input.spec.resources.requests.storage
    storage_gi := parse_storage_gi(storage_str)
    max_storage := max_pvc_size[env]
    
    storage_gi > max_storage
    
    msg := sprintf(
        "HIGH [FIN-006]: PVC size '%s' exceeds maximum '%dGi' for '%s' environment.",
        [storage_str, max_storage, env]
    )
}

# FIN-007: Require storage class annotation
warn contains msg if {
    input.kind == "PersistentVolumeClaim"
    not input.spec.storageClassName
    msg := "MEDIUM [FIN-007]: PVC should specify storageClassName to ensure cost-appropriate storage tier."
}

# FIN-008: Recommend using gp3 over gp2 for EBS
warn contains msg if {
    input.kind == "PersistentVolumeClaim"
    input.spec.storageClassName == "gp2"
    msg := "LOW [FIN-008]: Consider using 'gp3' storage class instead of 'gp2' for better price/performance."
}

# FIN-009: Limit replicas in non-production
deny contains msg if {
    input.kind == "Deployment"
    env := input.metadata.labels.environment
    env != "production"
    replicas := input.spec.replicas
    replicas > 3
    msg := sprintf(
        "HIGH [FIN-009]: '%s' environment should have max 3 replicas, found %d.",
        [env, replicas]
    )
}

# FIN-010: Require HPA for production workloads
warn contains msg if {
    input.kind == "Deployment"
    env := input.metadata.labels.environment
    env == "production"
    not has_matching_hpa
    msg := "MEDIUM [FIN-010]: Production deployments should have an HPA for cost-efficient scaling."
}

# =============================================================================
# TERRAFORM/CLOUD RESOURCE POLICIES
# =============================================================================

# FIN-020: Validate EC2 instance types
deny contains msg if {
    input.resource_type == "aws_instance"
    env := input.values.tags.environment
    instance_type := input.values.instance_type
    
    allowed := allowed_ec2_types[env]
    not instance_type in allowed
    
    msg := sprintf(
        "HIGH [FIN-020]: EC2 instance type '%s' not allowed in '%s' environment. Allowed: %v",
        [instance_type, env, allowed]
    )
}

# FIN-021: Require tags on AWS resources
deny contains msg if {
    aws_resource(input.resource_type)
    tag := required_tags[_]
    not input.values.tags[tag]
    msg := sprintf(
        "CRITICAL [FIN-021]: AWS resource '%s' must have tag '%s' for cost allocation.",
        [input.address, tag]
    )
}

aws_resource(resource_type) {
    startswith(resource_type, "aws_")
}

# FIN-022: Require encryption for storage
deny contains msg if {
    input.resource_type == "aws_ebs_volume"
    not input.values.encrypted == true
    msg := sprintf(
        "HIGH [FIN-022]: EBS volume '%s' must be encrypted.",
        [input.address]
    )
}

# FIN-023: Require deletion protection for production databases
deny contains msg if {
    input.resource_type == "aws_db_instance"
    input.values.tags.environment == "production"
    not input.values.deletion_protection == true
    msg := sprintf(
        "CRITICAL [FIN-023]: Production RDS instance '%s' must have deletion_protection enabled.",
        [input.address]
    )
}

# FIN-024: Limit RDS instance size in non-production
deny contains msg if {
    input.resource_type == "aws_db_instance"
    input.values.tags.environment != "production"
    instance_class := input.values.instance_class
    is_large_instance(instance_class)
    msg := sprintf(
        "HIGH [FIN-024]: RDS instance class '%s' too large for non-production. Use db.t3.* or db.t4g.*",
        [instance_class]
    )
}

is_large_instance(class) {
    not startswith(class, "db.t3.")
    not startswith(class, "db.t4g.")
}

# FIN-025: Require lifecycle rules for S3 buckets
warn contains msg if {
    input.resource_type == "aws_s3_bucket"
    not has_lifecycle_rule
    msg := sprintf(
        "MEDIUM [FIN-025]: S3 bucket '%s' should have lifecycle rules to optimize storage costs.",
        [input.address]
    )
}

# FIN-026: Recommend Intelligent Tiering for S3
warn contains msg if {
    input.resource_type == "aws_s3_bucket"
    not uses_intelligent_tiering
    msg := sprintf(
        "LOW [FIN-026]: Consider using S3 Intelligent Tiering for bucket '%s'.",
        [input.address]
    )
}

# FIN-027: Validate Infracost budget
deny contains msg if {
    input.type == "infracost"
    env := input.environment
    monthly_cost := input.totalMonthlyCost
    threshold := cost_thresholds[env]
    
    monthly_cost > threshold
    
    msg := sprintf(
        "CRITICAL [FIN-027]: Estimated monthly cost $%.2f exceeds budget $%d for '%s' environment.",
        [monthly_cost, threshold, env]
    )
}

# FIN-028: Warn on cost increase
warn contains msg if {
    input.type == "infracost"
    diff_percent := input.diffPercentage
    diff_percent > 20
    msg := sprintf(
        "HIGH [FIN-028]: Cost increase of %.1f%% detected. Review changes before applying.",
        [diff_percent]
    )
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Parse storage string to Gi
parse_storage_gi(storage) = gi {
    endswith(storage, "Gi")
    gi := to_number(trim_suffix(storage, "Gi"))
}

parse_storage_gi(storage) = gi {
    endswith(storage, "Ti")
    ti := to_number(trim_suffix(storage, "Ti"))
    gi := ti * 1024
}

parse_storage_gi(storage) = gi {
    endswith(storage, "Mi")
    mi := to_number(trim_suffix(storage, "Mi"))
    gi := mi / 1024
}

# CPU comparison helper
cpu_exceeds_limit(requested, max_limit) {
    to_number(requested) > to_number(max_limit)
}

cpu_exceeds_limit(requested, max_limit) {
    endswith(requested, "m")
    req_milli := to_number(trim_suffix(requested, "m"))
    max_milli := to_number(max_limit) * 1000
    req_milli > max_milli
}

# Check for HPA (placeholder - would need actual HPA list)
has_matching_hpa {
    # In practice, this would check against a list of HPAs
    false
}

# Check lifecycle rules (placeholder)
has_lifecycle_rule {
    input.values.lifecycle_rule
}

# Check intelligent tiering (placeholder)
uses_intelligent_tiering {
    input.values.intelligent_tiering
}

# Trim suffix helper
trim_suffix(s, suffix) = result {
    result := substring(s, 0, count(s) - count(suffix))
}
