# Documentación de Arquitectura y Soluciones Técnicas

Este directorio contiene las plantillas y documentos de soporte para el diseño de arquitectura y soluciones técnicas de proyectos de desarrollo de software, siguiendo el Método ZNS.

## 📁 Contenido del Directorio

### Documento Principal
- **`prompt-arquitectura-soluciones.md`**: Prompt principal para el análisis y diseño completo de arquitectura
- **`prompt-modelado-datos.md`**: Sub-tarea especializada para diseño de modelo de datos y persistencia

### Plantillas de Documentación
- **`plantilla-modulo-servicio.md`**: Template para documentar cada módulo/servicio del sistema
- **`plantilla-api-endpoint.md`**: Template para especificar endpoints de API REST
- **`plantilla-adr.md`**: Template para Architecture Decision Records (ADRs)

### Políticas y Estándares
- **`politica-diagramacion.md`**: **NUEVO** - Política oficial de diagramación (PlantUML + C4 Model obligatorio)
- **`checklist-seguridad.md`**: Checklist de seguridad por capa (red, aplicación, datos)

### Guías de Ejecución
- **`GUIA-RAPIDA-EJECUCION.md`**: Quick start de 15 minutos
- **`guia-ejecucion-prompts.md`**: Proceso completo paso a paso con ejemplos reales

## 🎯 Cómo Usar Esta Documentación

### Para Diseñar una Nueva Arquitectura:

1. **Inicio**: Leer el `prompt-arquitectura-soluciones.md` completo
2. **Recopilación**: Reunir la información requerida del proyecto (requisitos funcionales, no funcionales, restricciones)
3. **Análisis**: Seguir las fases del prompt (1-9):
   - Fase 1: Análisis de Requisitos
   - Fase 2: Diseño de Alto Nivel
   - Fase 3: Diseño Detallado
   - Fase 4: Stack Tecnológico
   - Fase 5: Infraestructura y Deployment
   - Fase 6: Seguridad y Compliance
   - Fase 7: Monitoreo y Observabilidad
   - Fase 8: Estimación de Costos
   - Fase 9: Plan de Implementación

4. **Documentación**: Usar las plantillas para documentar cada componente:
   - Un documento por módulo/servicio usando `plantilla-modulo-servicio.md`
   - Un documento por endpoint crítico usando `plantilla-api-endpoint.md`
   - Un ADR por cada decisión arquitectónica importante usando `plantilla-adr.md`

5. **Entregable**: Generar el documento final siguiendo la estructura definida en el prompt

### Para Proyectos Existentes:

1. Usar el prompt como checklist de verificación
2. Identificar gaps en la arquitectura actual
3. Documentar decisiones pasadas con ADRs (retrospectivos)
4. Crear plan de mejora

## ✅ Checklist Rápido

Antes de finalizar tu diseño arquitectónico, verifica:

### Requisitos
- [ ] Requisitos funcionales priorizados (Must/Should/Nice to have)
- [ ] Requisitos no funcionales cuantificados (SLAs, performance targets)
- [ ] Restricciones documentadas (presupuesto, tiempo, compliance)
- [ ] Supuestos identificados y validados

### Diseño
- [ ] Patrón arquitectónico seleccionado y justificado
- [ ] Diagramas C4 (Context, Container, Component)
- [ ] Stack tecnológico completo con justificación
- [ ] APIs especificadas (OpenAPI/Swagger)
- [ ] Modelo de datos diseñado (ERD/Schemas)

### Operación
- [ ] Infraestructura cloud diseñada (diagrama + IaC)
- [ ] CI/CD pipeline definido
- [ ] Estrategia de deployment (Blue-Green, Canary)
- [ ] Monitoreo y observabilidad planificado
- [ ] Plan de disaster recovery (RPO/RTO)

### Seguridad
- [ ] Autenticación y autorización diseñadas
- [ ] Seguridad por capa (red, app, datos)
- [ ] Compliance checklist completado
- [ ] Threat modeling realizado

### Viabilidad
- [ ] Costos estimados (desarrollo + operación)
- [ ] Plan de implementación por fases
- [ ] Riesgos identificados y mitigados
- [ ] Equipo definido (roles y responsabilidades)

## 🔧 Herramientas Recomendadas

### Diagramación
- **C4 Model**: [c4model.com](https://c4model.com)
- **PlantUML + C4 Model**: Diagramas como código - **RECOMENDADO**
- **Draw.io**: Refinamiento visual final y exportación
- **Structurizr DSL**: C4 Model nativo con renderizado automático
- **Mermaid**: Diagramas simples embebidos en Markdown
- **Lucidchart**: Colaboración en tiempo real (comercial)

### Modelado de Datos
- **dbdiagram.io**: ERD online
- **DrawSQL**: Diseño de schemas SQL
- **MongoDB Compass**: Modelado de documentos

### Especificación de APIs
- **Swagger Editor**: OpenAPI spec
- **Postman**: Colecciones de API
- **Stoplight**: API design platform

### Estimación
- **Cloud Pricing Calculators**:
  - AWS Calculator
  - Azure Pricing Calculator
  - GCP Pricing Calculator
- **TeamGantt**: Roadmaps y planning
- **Jira**: Planning poker, story points

## 📚 Referencias y Recursos

### Libros
- *Building Microservices* - Sam Newman
- *Designing Data-Intensive Applications* - Martin Kleppmann
- *Software Architecture: The Hard Parts* - Neal Ford et al.
- *Clean Architecture* - Robert C. Martin
- *Domain-Driven Design* - Eric Evans

### Sitios Web
- [Martin Fowler's Blog](https://martinfowler.com)
- [Microsoft Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [12factor.net](https://12factor.net) - Metodología para SaaS

### Comunidades
- r/softwarearchitecture (Reddit)
- Software Architecture Discord
- AWS Community Builders
- Google Cloud Champions

## 🤝 Contribuciones

Para mejorar estas plantillas:
1. Identifica áreas de mejora
2. Propone cambios basados en experiencia real
3. Documenta lecciones aprendidas
4. Actualiza versiones y fechas

## 📝 Notas de Versión

**Versión 1.0** (2025-11-07)
- Versión inicial del conjunto de plantillas
- Prompt principal completo con 9 fases
- 4 plantillas de documentación
- Documentos de soporte en desarrollo

---

*Documentación creada siguiendo el Método ZNS*
*Última actualización: 2025-11-07*
