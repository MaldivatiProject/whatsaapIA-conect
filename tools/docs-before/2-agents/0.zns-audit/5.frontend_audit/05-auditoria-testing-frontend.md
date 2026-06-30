# Prompt: Auditoría de Testing Frontend

---

## 🎯 Objetivo

Evaluar la cobertura, calidad y efectividad de los tests (unit, integration, e2e) para garantizar la confiabilidad del código frontend.

---

## 📋 Métricas de Testing

### 1. Code Coverage
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### 2. Tipos de Tests
- **Unit Tests**: Componentes aislados
- **Integration Tests**: Interacción entre componentes
- **E2E Tests**: Flujos críticos de usuario

### 3. Test Quality
- Tests no flaky (0% flakiness)
- Assertions relevantes
- Mock adecuado de dependencias
- Tiempo de ejecución <30s para unit tests

---

## 🔍 Herramientas

```bash
# Jest coverage
npm test -- --coverage --watchAll=false

# React Testing Library
npm install @testing-library/react @testing-library/jest-dom

# Cypress E2E
npm install cypress
npx cypress open

# Playwright
npm install @playwright/test
npx playwright test
```

---

## 📊 Hallazgos Comunes

### 🔴 H-FE-T-C-001: Coverage <60%

```bash
# Ejecutar coverage
npm test -- --coverage

# Resultado
Statements: 45% (meta: 80%)
Branches: 38% (meta: 75%)
Functions: 52% (meta: 80%)
Lines: 47% (meta: 80%)
```

**Impacto**: Alto riesgo de bugs en producción  
**Esfuerzo**: 40h (escribir tests faltantes)  
**Prioridad**: 🔴 1

---

### 🟠 H-FE-T-H-001: Sin E2E Tests

```javascript
// ❌ No hay tests E2E para flujos críticos

// ✅ Cypress E2E
describe('Checkout Flow', () => {
  it('should complete purchase', () => {
    cy.visit('/products');
    cy.get('[data-testid="product-1"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('[data-testid="checkout"]').click();
    cy.get('[name="cardNumber"]').type('4242424242424242');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/success');
  });
});
```

**Esfuerzo**: 16h  
**Prioridad**: 🟠 2

---

### 🟡 H-FE-T-M-001: Tests Flaky

```javascript
// ❌ Test flaky (falla aleatoriamente)
it('should load data', async () => {
  render(<UserList />);
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

// ✅ Fix: Mock API
it('should load data', async () => {
  const users = [{ id: 1, name: 'John' }];
  jest.spyOn(api, 'getUsers').mockResolvedValue(users);
  
  render(<UserList />);
  expect(await screen.findByText('John')).toBeInTheDocument();
});
```

**Esfuerzo**: 4h  
**Prioridad**: 🟡 3

---

## 📋 Template de Informe

```markdown
# Auditoría de Testing - [PROYECTO]

## 📊 Cobertura Actual

**Score**: XX/10 puntos

| Métrica | Actual | Meta | Estado |
|---------|--------|------|--------|
| Statements | XX% | 80% | 🟢/🟡/🔴 |
| Branches | XX% | 75% | 🟢/🟡/🔴 |
| Functions | XX% | 80% | 🟢/🟡/🔴 |
| Lines | XX% | 80% | 🟢/🟡/🔴 |

## 📋 Inventario de Tests

- **Unit tests**: XX archivos
- **Integration tests**: XX archivos
- **E2E tests**: XX escenarios
- **Total tests**: XXX
- **Tests flaky**: X (meta: 0)

## 🎯 Prioridades

### Crítico
1. Aumentar coverage a 80% (40h)
2. Escribir E2E para checkout (8h)
3. Fix 5 tests flaky (4h)

### Medio
4. Tests de integración para forms (12h)
5. Visual regression tests (Storybook) (8h)

## 🛠️ Roadmap

### Sprint 1-2 (2 semanas)
- [ ] Unit tests para componentes críticos (16h)
- [ ] E2E para flujos principales (16h)
- [ ] Fix tests flaky (4h)

### Sprint 3-4 (2 semanas)
- [ ] Integration tests (12h)
- [ ] Aumentar coverage a 80% (12h)
- [ ] CI/CD con coverage gates (4h)

---
*Meta: 8/10 puntos (80% coverage)*
```

---

**Versión**: 1.0
