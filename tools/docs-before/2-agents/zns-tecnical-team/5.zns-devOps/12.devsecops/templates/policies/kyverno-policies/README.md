# Políticas Kyverno para FinDevSecOps

Este directorio contiene políticas Kyverno para Kubernetes.

## 📁 Estructura

```
kyverno-policies/
├── README.md
├── security/
│   ├── disallow-privileged.yaml
│   ├── require-ro-rootfs.yaml
│   └── require-seccomp.yaml
├── finops/
│   ├── require-resource-limits.yaml
│   ├── require-cost-labels.yaml
│   └── limit-replicas.yaml
└── best-practices/
    ├── require-probes.yaml
    └── disallow-latest-tag.yaml
```

## 🚀 Instalación

```bash
# Instalar Kyverno
kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.11.0/install.yaml

# Verificar instalación
kubectl get pods -n kyverno

# Aplicar políticas
kubectl apply -f security/
kubectl apply -f finops/
kubectl apply -f best-practices/
```

## 📊 Monitoreo

```bash
# Ver políticas
kubectl get cpol

# Ver policy reports
kubectl get policyreport -A

# Ver violaciones
kubectl get policyreport -A -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .results[?(@.result=="fail")]}{.message}{"\n"}{end}{end}'
```

## 📖 Referencias
- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno Policies](https://kyverno.io/policies/)
