# Políticas OPA/Rego para FinDevSecOps

Este directorio contiene políticas como código utilizando Open Policy Agent (OPA) con lenguaje Rego.

## 📁 Estructura

```
opa-policies/
├── README.md
├── kubernetes/
│   ├── pod-security.rego         # Políticas de seguridad de pods
│   ├── network-policies.rego     # Validación de network policies
│   └── resource-limits.rego      # Límites de recursos
├── finops/
│   ├── cost-controls.rego        # Controles de costos
│   ├── tagging-compliance.rego   # Compliance de tags
│   └── instance-sizing.rego      # Validación de sizing
└── compliance/
    ├── cis-benchmark.rego        # CIS Kubernetes Benchmark
    └── pci-dss.rego              # Controles PCI-DSS
```

## 🚀 Uso

### Testing Local
```bash
# Evaluar política contra un input
opa eval -i input.json -d policy.rego "data.kubernetes.security.deny"

# Ejecutar tests
opa test -v *.rego
```

### Con Gatekeeper
```bash
# Instalar Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Aplicar ConstraintTemplate
kubectl apply -f constraint-templates/

# Aplicar Constraints
kubectl apply -f constraints/
```

## 📖 Referencias
- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [Rego Playground](https://play.openpolicyagent.org/)
- [Gatekeeper](https://open-policy-agent.github.io/gatekeeper/)
