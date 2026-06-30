# Prompt: Auditoría de Calidad de Código Frontend

---

## 🎯 Objetivo

Evaluar la calidad del código frontend mediante métricas de complejidad, duplicación, code smells, maintainability, y adherencia a best practices del framework utilizado.

---

## 📋 Métricas Clave

### 1. Complejidad Ciclomática
- **Meta**: <10 por función
- **Aceptable**: 10-15
- **Crítico**: >20

### 2. Duplicación de Código
- **Meta**: <3%
- **Aceptable**: 3-10%
- **Crítico**: >10%

### 3. Maintainability Index
- **Excelente**: 85-100
- **Bueno**: 65-84
- **Moderado**: 50-64
- **Difícil**: <50

### 4. Code Smells
- Funciones >50 líneas
- Archivos >300 líneas
- Props drilling >3 niveles
- useState >5 en un componente

---

## 🔍 Herramientas

```bash
# ESLint
npm run lint

# SonarQube/SonarCloud
sonar-scanner

# CodeClimate
codeclimate analyze

# Complexity report
npm install -g complexity-report
cr --format json src/ > complexity.json
```

---

## 📊 Hallazgos Comunes

### 🔴 H-FE-Q-C-001: Complejidad >20

```javascript
// ❌ Complejidad: 25
function processOrder(order) {
  if (order.type === 'express') {
    if (order.priority === 'high') {
      if (order.customer.vip) {
        // ... 50 líneas más con ifs anidados
      }
    }
  }
}

// ✅ Refactorizado - Complejidad: 3
const orderStrategies = {
  express: {
    high: {
      vip: processExpressHighVip,
      regular: processExpressHighRegular
    }
  }
};

function processOrder(order) {
  const strategy = orderStrategies[order.type]?.[order.priority]?.[order.tier];
  return strategy ? strategy(order) : defaultProcess(order);
}
```

**Esfuerzo**: 8h  
**Prioridad**: 🔴 1

---

### 🟠 H-FE-Q-H-001: Duplicación >10%

```javascript
// ❌ Código duplicado 3 veces
function UserCard() {
  return (
    <div className="card">
      <img src={user.avatar} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

// ProductCard, PostCard... mismo código

// ✅ Componente reutilizable
function Card({ image, title, subtitle }) {
  return (
    <div className="card">
      <img src={image} />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}
```

**Esfuerzo**: 6h  
**Prioridad**: 🟠 2

---

## 📋 Template de Informe

```markdown
# Auditoría de Calidad de Código - [PROYECTO]

## 📊 Métricas

**Score**: XX/15 puntos

| Métrica | Valor | Meta | Estado |
|---------|-------|------|--------|
| Complejidad media | XX | <10 | 🟢/🟡/🔴 |
| Duplicación | XX% | <3% | 🟢/🟡/🔴 |
| Maintainability | XX | >65 | 🟢/🟡/🔴 |
| ESLint errors | XX | 0 | 🟢/🟡/🔴 |
| Code smells | XX | <50 | 🟢/🟡/🔴 |

## 🔴 Top 5 Problemas

1. **UserService.js**: Complejidad 28 (línea 45-120)
2. **Dashboard.jsx**: 450 líneas (should be <300)
3. **15% duplicación** en componentes de Card
4. **Props drilling** 5 niveles en ProductPage
5. **12 useStates** en CheckoutForm (usar useReducer)

## 🛠️ Roadmap

### Sprint 1 (1 semana)
- [ ] Refactorizar UserService (8h)
- [ ] Split Dashboard en sub-componentes (4h)
- [ ] Fix ESLint errors (2h)

### Sprint 2-3 (2 semanas)
- [ ] Eliminar duplicación con componentes genéricos (6h)
- [ ] Implementar Context para evitar prop drilling (8h)
- [ ] Refactor de formularios complejos (6h)

---
*Score objetivo: 13/15 (87%)*
```

---

**Versión**: 1.0
