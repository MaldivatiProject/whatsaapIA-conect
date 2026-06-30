# 📦 Terraform Module Template

Este template proporciona la estructura estándar para crear módulos Terraform reutilizables.

## Estructura de Archivos

```
modules/[module-name]/
├── main.tf           # Recursos principales
├── variables.tf      # Variables de entrada
├── outputs.tf        # Valores de salida
├── versions.tf       # Versiones requeridas
├── locals.tf         # Valores locales
├── data.tf           # Data sources
├── iam.tf            # IAM (si aplica)
├── README.md         # Documentación (auto-generada)
└── examples/
    └── complete/
        ├── main.tf
        ├── outputs.tf
        └── README.md
```

## Uso del Template

1. Copiar la estructura del template
2. Renombrar `[module-name]` por el nombre del módulo
3. Editar cada archivo según la funcionalidad requerida
4. Ejecutar `terraform-docs` para generar README
5. Crear al menos un ejemplo funcional

## Archivos del Template

Ver los archivos individuales en este directorio:
- [main.tf.template](main.tf.template)
- [variables.tf.template](variables.tf.template)
- [outputs.tf.template](outputs.tf.template)
- [versions.tf.template](versions.tf.template)
- [locals.tf.template](locals.tf.template)
