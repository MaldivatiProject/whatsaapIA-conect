# HUT-[HU_ID]-INFRA-[SECUENCIA]: Integración con [Nombre Servicio Externo]

> **Tipo:** `INFRA` — External Integration  
> **HU Origen:** [HU-XXX](../../05-deliverables/hus/[modulo]/HU-XXX-*.md)  
> **Servicio Externo:** [Stripe | SendGrid | DIAN | S3 | Firebase | etc.]  
> **Patrón:** [Cliente HTTP | SDK | Webhook | Event-Driven]  
> **Versión API Externa:** [v1 | 2023-10-16 | etc.]

---

## 🎯 Historia Técnica

**Como** Desarrollador Backend,  
**Quiero** integrar con [Servicio Externo] para [capacidad específica],  
**Para** habilitar la funcionalidad de [referencia a HU de negocio].

---

## 💼 Valor Técnico

**Propósito de la integración:**
- [Describe qué capacidad externa aporta: pagos, emails, storage, etc.]
- [Qué funcionalidad de negocio habilita]
- [Por qué no se implementa internamente]

**Beneficios:**
- ✅ [Ej: Delegamos complejidad PCI-DSS a proveedor certificado]
- ✅ [Ej: SLA 99.9% del proveedor]
- ✅ [Ej: Escalabilidad automática sin gestión infraestructura]

**Trade-offs:**
- ⚠️ [Ej: Dependencia externa (riesgo disponibilidad)]
- ⚠️ [Ej: Costos variables por uso]
- ⚠️ [Ej: Vendor lock-in]

---

## 📋 Especificación del Servicio Externo

### Información del Proveedor

**Nombre:** [Nombre del servicio]  
**Documentación:** [URL oficial]  
**Dashboard:** [URL console/admin]  
**Status Page:** [URL status page]  
**SLA:** [99.9% uptime | 99.95% | etc.]  
**Pricing:** [Modelo de costos: pay-per-use, flat fee, tiers]

**Soporte:**
- **Email:** [email soporte]
- **Chat:** [Sí|No]
- **Teléfono:** [Emergencias 24/7|No]
- **Tiempo respuesta:** [24h | 4h | 1h]

### Credenciales y Autenticación

**Método de autenticación:** `[API Key | OAuth 2.0 | JWT | AWS IAM | mTLS]`

**Credenciales requeridas:**
```yaml
Producción:
  api_key: ${SERVICIO_API_KEY_PROD}
  api_secret: ${SERVICIO_API_SECRET_PROD}
  account_id: ${SERVICIO_ACCOUNT_ID_PROD}

Staging:
  api_key: ${SERVICIO_API_KEY_STAGE}
  api_secret: ${SERVICIO_API_SECRET_STAGE}
  account_id: ${SERVICIO_ACCOUNT_ID_STAGE}

Development:
  api_key: ${SERVICIO_API_KEY_DEV}
  api_secret: ${SERVICIO_API_SECRET_DEV}
  account_id: ${SERVICIO_ACCOUNT_ID_DEV}
```

**Gestión de secrets:**
- **Storage:** AWS Secrets Manager / HashiCorp Vault / Environment Variables
- **Rotación:** [Automática cada 90 días | Manual | No aplica]
- **Acceso:** [Solo roles específicos con IAM]

**Headers de autenticación:**
```http
Authorization: Bearer {API_KEY}
# O según proveedor:
X-API-Key: {API_KEY}
Authorization: Basic {base64(account_id:api_secret)}
```

### Rate Limits del Proveedor

| Endpoint | Límite | Ventana | Acción si excedido |
|----------|--------|---------|---------------------|
| POST /recurso | 100 req/s | 1 segundo | 429 + Retry-After |
| GET /recurso/{id} | 1000 req/s | 1 segundo | 429 + Retry-After |
| POST /batch | 10 req/min | 1 minuto | 429 + Retry-After |

**Estrategia de mitigación:**
- ✅ Rate limiting local (Redis) para prevenir exceder límites
- ✅ Backoff exponencial en reintentos
- ✅ Circuit breaker para proteger sistema

---

## 🔌 Endpoints de la Integración

### 1. [Operación Principal] — Ej: Procesar Pago

**Endpoint externo:**
```http
POST https://api.servicio.com/v1/recurso
```

**Request Headers:**
```http
Authorization: Bearer {API_KEY}
Content-Type: application/json
Idempotency-Key: {UUID} (para operaciones críticas)
X-Request-ID: {UUID} (trazabilidad)
```

**Request Body:**
```json
{
  "campo1": "valor",
  "campo2": 12345,
  "metadata": {
    "internal_id": "uuid-interno",
    "source": "MITOGA_PLATFORM",
    "environment": "production"
  }
}
```

**JSON Schema Request:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["campo1", "campo2"],
  "properties": {
    "campo1": { "type": "string", "minLength": 1 },
    "campo2": { "type": "integer", "minimum": 1 },
    "metadata": {
      "type": "object",
      "properties": {
        "internal_id": { "type": "string", "format": "uuid" },
        "source": { "type": "string" },
        "environment": { "type": "string", "enum": ["production", "staging", "development"] }
      }
    }
  }
}
```

**Response Exitoso (200/201):**
```json
{
  "id": "ext_12345abc",
  "status": "SUCCESS",
  "created_at": "2025-11-08T10:30:00Z",
  "datos": {
    "campo_resultado": "valor"
  },
  "metadata": {
    "internal_id": "uuid-interno"
  }
}
```

**Códigos HTTP del proveedor:**
| Código | Significado | Acción |
|--------|-------------|--------|
| 200/201 | Éxito | Procesar respuesta, actualizar DB |
| 400 | Validación fallida | Loggear, retornar error a cliente |
| 401 | Auth inválida | Verificar credenciales, alertar |
| 403 | Sin permisos | Revisar permisos cuenta, alertar |
| 404 | Recurso no existe | Validar ID, retornar error |
| 409 | Conflicto (duplicado) | Verificar idempotencia |
| 429 | Rate limit | Aplicar backoff, reintentar |
| 500/502/503 | Error servidor | Circuit breaker, fallback |
| 504 | Timeout | Reintentar con backoff |

### 2. [Operación Secundaria] — Ej: Consultar Estado

**Endpoint externo:**
```http
GET https://api.servicio.com/v1/recurso/{id}
```

**Response:**
```json
{
  "id": "ext_12345abc",
  "status": "COMPLETED",
  "updated_at": "2025-11-08T10:35:00Z"
}
```

### 3. [Webhooks] — Si el proveedor envía notificaciones

**URL de recepción:**
```http
POST https://api.mitoga.com/webhooks/servicio/eventos
```

**Payload del webhook:**
```json
{
  "id": "evt_12345",
  "type": "recurso.updated",
  "created": 1699440600,
  "data": {
    "object": {
      "id": "ext_12345abc",
      "status": "COMPLETED"
    }
  }
}
```

**Validación de webhook:**
- ✅ Verificar firma (HMAC-SHA256 con secret)
- ✅ Validar timestamp (rechazar >5 minutos antigüedad)
- ✅ Idempotencia (no procesar evento duplicado)

---

## 🏗️ Arquitectura de la Integración

### Patrón de Diseño

**Patrón aplicado:** `[Adapter | Facade | Anti-Corruption Layer]`

```
┌─────────────────────────────────────┐
│   Capa Aplicación (Use Case)       │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Puerto (Interface)                │
│   ServicioExternoPort.java          │
│   - procesarOperacion()             │
│   - consultarEstado()               │
└──────────────┬──────────────────────┘
               │ implements
               ▼
┌─────────────────────────────────────┐
│   Adaptador (Implementación)        │
│   ServicioExternoAdapter.java       │
│   - HttpClient (RestTemplate/Feign) │
│   - Retry logic                     │
│   - Circuit breaker                 │
│   - Error mapping                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   API Externa                       │
│   https://api.servicio.com          │
└─────────────────────────────────────┘
```

### Interfaz (Puerto)

```java
/**
 * Puerto para integración con [Servicio Externo].
 * Define el contrato independiente de la implementación.
 */
public interface ServicioExternoPort {
    
    /**
     * Procesa una operación en el servicio externo.
     * 
     * @param request DTO con datos de la operación
     * @return Response del servicio externo mapeado a dominio
     * @throws ServicioExternoException si la operación falla
     */
    ServicioExternoResponse procesarOperacion(ServicioExternoRequest request);
    
    /**
     * Consulta el estado de una operación previamente procesada.
     * 
     * @param externalId ID del recurso en el servicio externo
     * @return Estado actual del recurso
     * @throws RecursoNoEncontradoException si el ID no existe
     */
    Optional<EstadoRecurso> consultarEstado(String externalId);
    
    /**
     * Webhook handler para eventos del servicio externo.
     * 
     * @param payload Payload del webhook
     * @param signature Firma del webhook para validación
     * @throws WebhookInvalidoException si la firma no es válida
     */
    void procesarWebhook(String payload, String signature);
}
```

### Implementación (Adaptador)

```java
@Service
@Slf4j
public class ServicioExternoAdapter implements ServicioExternoPort {
    
    private final RestTemplate restTemplate;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    
    @Value("${servicio.externo.api.url}")
    private String apiUrl;
    
    @Value("${servicio.externo.api.key}")
    private String apiKey;
    
    @Override
    @CircuitBreaker(name = "servicioExterno", fallbackMethod = "fallbackProcesarOperacion")
    @Retry(name = "servicioExterno")
    public ServicioExternoResponse procesarOperacion(ServicioExternoRequest request) {
        log.info("Procesando operación en servicio externo: {}", request.getInternalId());
        
        try {
            // Construir request HTTP
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");
            headers.set("Idempotency-Key", UUID.randomUUID().toString());
            
            // Mapear de dominio a DTO externo
            ExternalRequestDTO externalRequest = mapearAExterno(request);
            
            HttpEntity<ExternalRequestDTO> entity = new HttpEntity<>(externalRequest, headers);
            
            // Ejecutar llamada
            ResponseEntity<ExternalResponseDTO> response = restTemplate.exchange(
                apiUrl + "/v1/recurso",
                HttpMethod.POST,
                entity,
                ExternalResponseDTO.class
            );
            
            // Mapear respuesta a dominio
            ServicioExternoResponse domainResponse = mapearADominio(response.getBody());
            
            log.info("Operación exitosa. External ID: {}", domainResponse.getExternalId());
            return domainResponse;
            
        } catch (HttpClientErrorException e) {
            log.error("Error del cliente HTTP: {}", e.getMessage());
            throw new ServicioExternoException("Error en servicio externo", e);
        } catch (HttpServerErrorException e) {
            log.error("Error del servidor externo: {}", e.getMessage());
            throw new ServicioExternoException("Servicio externo no disponible", e);
        } catch (ResourceAccessException e) {
            log.error("Timeout o error de conectividad: {}", e.getMessage());
            throw new ServicioExternoException("No se pudo conectar al servicio externo", e);
        }
    }
    
    /**
     * Fallback cuando el servicio externo falla.
     */
    private ServicioExternoResponse fallbackProcesarOperacion(
        ServicioExternoRequest request, 
        Exception ex
    ) {
        log.warn("Circuit breaker activado. Ejecutando fallback para: {}", 
                 request.getInternalId(), ex);
        
        // Estrategia de fallback (ej: cola para procesamiento diferido)
        encolarParaProcesoDiferido(request);
        
        return ServicioExternoResponse.builder()
            .status("PENDING")
            .mensaje("Operación en cola. Se procesará cuando el servicio esté disponible.")
            .build();
    }
    
    // Métodos auxiliares de mapeo...
}
```

### Configuración

```yaml
# application.yml
servicio:
  externo:
    api:
      url: ${SERVICIO_EXTERNO_URL:https://api.servicio.com}
      key: ${SERVICIO_EXTERNO_API_KEY}
      secret: ${SERVICIO_EXTERNO_API_SECRET}
    timeout:
      connection: 5000  # 5 segundos
      read: 30000       # 30 segundos
    retry:
      max-attempts: 3
      wait-duration: 1s
      multiplier: 2.0   # Backoff exponencial
    circuit-breaker:
      failure-rate-threshold: 50    # 50% fallos
      wait-duration-open-state: 60s # 1 minuto abierto
      sliding-window-size: 10       # Últimas 10 llamadas
```

---

## 🔄 Manejo de Errores y Resiliencia

### Estrategias de Retry

**Configuración:**
```java
@Retry(
    name = "servicioExterno",
    maxAttempts = 3,
    waitDuration = 1000,  // 1 segundo
    retryExceptions = {
        HttpServerErrorException.class,   // 5xx
        ResourceAccessException.class,     // Timeout
        SocketTimeoutException.class
    },
    ignoreExceptions = {
        HttpClientErrorException.BadRequest.class,  // 400 no reintentar
        HttpClientErrorException.Unauthorized.class // 401 no reintentar
    }
)
```

**Backoff exponencial:**
- Intento 1: Inmediato
- Intento 2: Esperar 1s
- Intento 3: Esperar 2s (1s × 2)
- Intento 4: Esperar 4s (2s × 2)

**Jitter (aleatorio):** ±20% para evitar thundering herd

### Circuit Breaker

**Estados:**
```
CLOSED ──[50% fallos]──> OPEN ──[60s]──> HALF_OPEN ──[éxito]──> CLOSED
   ▲                                            │
   └─────────────[más fallos]──────────────────┘
```

**Configuración:**
- **Threshold:** 50% fallos en ventana de 10 llamadas
- **Open duration:** 60 segundos
- **Half-open calls:** 5 llamadas de prueba

**Métricas:**
```
circuit_breaker_state{name="servicioExterno"} = [0=CLOSED, 1=OPEN, 2=HALF_OPEN]
circuit_breaker_failures_total{name="servicioExterno"}
circuit_breaker_calls_total{name="servicioExterno", result="success|failure"}
```

### Timeout Configuration

```java
@Bean
public RestTemplate servicioExternoRestTemplate() {
    HttpComponentsClientHttpRequestFactory factory = 
        new HttpComponentsClientHttpRequestFactory();
    
    factory.setConnectTimeout(5000);        // 5 segundos para establecer conexión
    factory.setReadTimeout(30000);          // 30 segundos para leer respuesta
    factory.setConnectionRequestTimeout(2000); // 2 segundos para obtener conexión del pool
    
    return new RestTemplate(factory);
}
```

### Fallback Strategies

**1. Degradación gratuita:**
```java
// Retornar respuesta cached (si aplica)
return cacheService.obtenerUltimo(request.getId())
    .orElse(ResponseVacio.builder().mensaje("Servicio temporalmente no disponible").build());
```

**2. Procesamiento diferido:**
```java
// Encolar para procesamiento asíncrono cuando servicio se recupere
rabbitTemplate.convertAndSend(
    "servicio.externo.retry.queue",
    request
);
```

**3. Servicio alternativo:**
```java
// Intentar con proveedor secundario (si existe)
return proveedorSecundarioPort.procesarOperacion(request);
```

### Idempotencia

**Implementación:**
```java
@Service
public class IdempotenciaService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    private static final String IDEMPOTENCY_PREFIX = "idempotency:";
    private static final Duration TTL = Duration.ofHours(24);
    
    public String generarClave(ServicioExternoRequest request) {
        String data = request.getInternalId() + ":" + 
                     request.getCampo1() + ":" + 
                     request.getCampo2();
        return IDEMPOTENCY_PREFIX + DigestUtils.sha256Hex(data);
    }
    
    public Optional<ServicioExternoResponse> obtenerRespuestaCached(String clave) {
        String json = redisTemplate.opsForValue().get(clave);
        if (json != null) {
            return Optional.of(deserializar(json));
        }
        return Optional.empty();
    }
    
    public void guardarRespuesta(String clave, ServicioExternoResponse response) {
        String json = serializar(response);
        redisTemplate.opsForValue().set(clave, json, TTL);
    }
}
```

---

## 💰 Costos y Monitoreo

### Modelo de Costos

**Pricing del proveedor:**
| Operación | Costo | Volumen mensual estimado | Costo mensual |
|-----------|-------|--------------------------|---------------|
| POST /recurso | $0.10 | 10,000 | $1,000 |
| GET /recurso | $0.01 | 50,000 | $500 |
| Webhooks | Gratis | Ilimitado | $0 |
| Storage | $0.023/GB | 100 GB | $2.30 |
| **TOTAL** | — | — | **$1,502.30** |

**Alertas de costos:**
- ⚠️ Alerta si gasto mensual >$2,000
- 🚨 Bloqueo si gasto mensual >$5,000

### Métricas de Monitoreo

**APM/Observability:**
```
# Prometheus metrics
servicio_externo_calls_total{endpoint="/recurso", status="success|failure"}
servicio_externo_duration_seconds{endpoint="/recurso", quantile="0.95"}
servicio_externo_errors_total{endpoint="/recurso", error_type="timeout|5xx|4xx"}
servicio_externo_circuit_breaker_state{name="servicioExterno"}
```

**Dashboards (Grafana):**
- Requests/segundo por endpoint
- Latencia p50/p95/p99
- Error rate (%)
- Circuit breaker state timeline
- Cost acumulado del mes

**Alertas:**
- 🚨 Error rate >10% por 5 minutos → PagerDuty
- ⚠️ Latencia p95 >5 segundos por 10 minutos → Slack
- ⚠️ Circuit breaker OPEN → Slack + Email
- ℹ️ Proveedor reporta incident (status page) → Slack

---

## ✅ Criterios de Aceptación Técnicos

### Escenario 1: Llamada exitosa a servicio externo
```gherkin
Given el servicio externo está disponible y responde correctamente
When se invoca procesarOperacion() con request válido
Then la llamada HTTP se ejecuta con Authorization header correcto
  And el request incluye Idempotency-Key único
  And el response es mapeado correctamente a dominio
  And el externalId se almacena en base de datos
  And se registra métrica de éxito
  And el log incluye requestId para trazabilidad
```

### Escenario 2: Servicio externo retorna error 400 (validación)
```gherkin
Given el request contiene datos inválidos según proveedor
When se invoca procesarOperacion()
Then la llamada HTTP retorna 400 Bad Request
  And NO se ejecuta retry (error de cliente, no reintentable)
  And se lanza ServicioExternoException con mensaje del proveedor
  And se registra métrica de error tipo "validation"
  And el log incluye detalles del error del proveedor
```

### Escenario 3: Timeout en llamada al servicio externo
```gherkin
Given el servicio externo no responde en 30 segundos
When se invoca procesarOperacion()
Then se lanza ResourceAccessException (timeout)
  And se ejecuta retry automático (máx 3 intentos con backoff)
  And después de 3 fallos, se ejecuta fallback
  And la operación se encola para procesamiento diferido
  And se registra métrica de error tipo "timeout"
  And se incrementa contador de fallos del circuit breaker
```

### Escenario 4: Circuit breaker OPEN (servicio degradado)
```gherkin
Given el circuit breaker está en estado OPEN (50% fallos recientes)
When se intenta invocar procesarOperacion()
Then la llamada NO se ejecuta (circuit breaker bloquea)
  And se ejecuta fallback inmediatamente (sin intentar)
  And la operación se encola para procesamiento diferido
  And se retorna respuesta con status "PENDING"
  And el usuario recibe mensaje "Servicio temporalmente no disponible"
```

### Escenario 5: Idempotencia (request duplicado)
```gherkin
Given una operación fue procesada exitosamente hace 10 minutos
  And la respuesta está en cache Redis con TTL 24h
When se invoca procesarOperacion() con los mismos datos
Then se genera la misma clave de idempotencia
  And se recupera la respuesta desde cache (sin llamada HTTP)
  And NO se ejecuta llamada al servicio externo
  And se retorna la respuesta cached
  And se registra métrica "idempotent_hit"
```

### Escenario 6: Webhook recibido del proveedor
```gherkin
Given el servicio externo envía un webhook con evento "recurso.updated"
When el endpoint /webhooks/servicio/eventos recibe el POST
Then se valida la firma HMAC-SHA256 del webhook
  And se verifica que el timestamp es reciente (<5 min)
  And se consulta si el evento ya fue procesado (idempotencia)
  And se procesa el evento (actualizar estado en DB)
  And se retorna 200 OK al proveedor
  And se registra métrica "webhook_processed"
```

---

## 🧪 Testing de la Integración

### 1. Test Unitario (Mock del servicio externo)

```java
@ExtendWith(MockitoExtension.class)
public class ServicioExternoAdapterTest {
    
    @Mock
    private RestTemplate restTemplate;
    
    @InjectMocks
    private ServicioExternoAdapter adapter;
    
    @Test
    public void deberia_MapearCorrectamente_CuandoRespuestaExitosa() {
        // Arrange
        ServicioExternoRequest request = crearRequestValido();
        ExternalResponseDTO externalResponse = crearResponseMock();
        
        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(ExternalResponseDTO.class)
        )).thenReturn(ResponseEntity.ok(externalResponse));
        
        // Act
        ServicioExternoResponse response = adapter.procesarOperacion(request);
        
        // Assert
        assertNotNull(response);
        assertEquals("ext_12345", response.getExternalId());
        assertEquals("SUCCESS", response.getStatus());
        
        verify(restTemplate, times(1)).exchange(anyString(), any(), any(), any());
    }
    
    @Test
    public void deberia_LanzarExcepcion_CuandoTimeout() {
        // Arrange
        when(restTemplate.exchange(any(), any(), any(), any()))
            .thenThrow(new ResourceAccessException("Timeout"));
        
        // Act & Assert
        assertThrows(ServicioExternoException.class, () -> {
            adapter.procesarOperacion(crearRequestValido());
        });
    }
}
```

### 2. Test de Integración (WireMock)

```java
@SpringBootTest
@AutoConfigureWireMock(port = 0)
public class ServicioExternoIntegrationTest {
    
    @Autowired
    private ServicioExternoPort servicioExternoPort;
    
    @Test
    public void deberia_IntegrarCorrectamente_ConServicioReal() {
        // Arrange: Mock del endpoint externo con WireMock
        stubFor(post(urlEqualTo("/v1/recurso"))
            .withHeader("Authorization", matching("Bearer .*"))
            .willReturn(aResponse()
                .withStatus(201)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"id\":\"ext_12345\",\"status\":\"SUCCESS\"}")));
        
        // Act
        ServicioExternoRequest request = crearRequestValido();
        ServicioExternoResponse response = servicioExternoPort.procesarOperacion(request);
        
        // Assert
        assertNotNull(response);
        assertEquals("ext_12345", response.getExternalId());
        
        // Verify que la llamada se hizo correctamente
        verify(postRequestedFor(urlEqualTo("/v1/recurso"))
            .withHeader("Authorization", matching("Bearer .*"))
            .withHeader("Idempotency-Key", matching(".*")));
    }
    
    @Test
    public void deberia_Reintentar_Cuando5xx() {
        // Arrange: Primera llamada falla, segunda exitosa
        stubFor(post(urlEqualTo("/v1/recurso"))
            .inScenario("retry")
            .whenScenarioStateIs(STARTED)
            .willReturn(aResponse().withStatus(503))
            .willSetStateTo("second-try"));
        
        stubFor(post(urlEqualTo("/v1/recurso"))
            .inScenario("retry")
            .whenScenarioStateIs("second-try")
            .willReturn(aResponse()
                .withStatus(201)
                .withBody("{\"id\":\"ext_12345\",\"status\":\"SUCCESS\"}")));
        
        // Act
        ServicioExternoResponse response = servicioExternoPort.procesarOperacion(crearRequestValido());
        
        // Assert
        assertNotNull(response);
        
        // Verify 2 llamadas (1 fallo + 1 retry exitoso)
        verify(exactly(2), postRequestedFor(urlEqualTo("/v1/recurso")));
    }
}
```

### 3. Test de Contrato (Pact)

```java
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "ServicioExterno", port = "8080")
public class ServicioExternoContractTest {
    
    @Pact(consumer = "MiTogaApp")
    public RequestResponsePact crearPactProcesarOperacion(PactDslWithProvider builder) {
        return builder
            .given("el recurso puede ser creado")
            .uponReceiving("una solicitud para crear recurso")
                .path("/v1/recurso")
                .method("POST")
                .headers("Authorization", "Bearer test_key")
                .body(new PactDslJsonBody()
                    .stringType("campo1", "valor")
                    .integerType("campo2", 12345))
            .willRespondWith()
                .status(201)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .stringType("id", "ext_12345")
                    .stringType("status", "SUCCESS"))
            .toPact();
    }
    
    @Test
    @PactTestFor(pactMethod = "crearPactProcesarOperacion")
    public void testProcesarOperacion() {
        // El test ejecutará contra el mock server de Pact
        ServicioExternoResponse response = servicioExternoPort.procesarOperacion(crearRequestValido());
        
        assertNotNull(response);
        assertEquals("ext_12345", response.getExternalId());
    }
}
```

---

## 📚 Documentación

### Runbook Operacional

**Detección de problemas:**
```bash
# Verificar estado del circuit breaker
curl -X GET http://localhost:8080/actuator/circuitbreakers

# Ver métricas Prometheus
curl -X GET http://localhost:8080/actuator/prometheus | grep servicio_externo

# Logs de errores recientes
kubectl logs -l app=mitoga-backend --since=1h | grep "ServicioExternoException"
```

**Resolución de incidentes:**

**Problema 1: Circuit breaker OPEN**
1. Verificar status page del proveedor
2. Revisar logs para identificar causa (timeout, 5xx, etc.)
3. Si proveedor OK: Revisar conectividad de red, DNS, firewall
4. Si proveedor DOWN: Esperar recuperación automática (60s)
5. Monitorear transición OPEN → HALF_OPEN → CLOSED

**Problema 2: Rate limit excedido (429)**
1. Verificar volumen de requests en últimos minutos
2. Identificar origen (endpoint, usuario, operación)
3. Revisar si es tráfico legítimo o ataque
4. Ajustar rate limiting local si necesario
5. Contactar proveedor para aumentar límites (si justificado)

**Problema 3: Costos anómalos**
1. Query a logs/métricas para identificar spike de uso
2. Identificar operación o usuario responsable
3. Revisar si es bug (retry loop infinito, etc.)
4. Aplicar rate limiting temporal si necesario
5. Investigar y corregir causa raíz

---

## 🔗 Dependencias

**Depende de:**
- [HUT-XXX-UC-01](./HUT-XXX-UC-01-*.md) — Caso de uso que consume esta integración

**Librerías necesarias:**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot2</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

---

## 📊 Estimación

**Story Points Técnicos:** `[3|5]` SP

**Desglose:**
- Implementación adaptador: 1 día
- Retry + circuit breaker: 0.5 días
- Idempotencia: 0.5 días
- Tests (unit + integration): 1 día
- Documentación: 0.5 días

---

## ✅ Definition of Done

- [ ] Interfaz (Puerto) definida
- [ ] Adaptador implementado con retry + circuit breaker
- [ ] Idempotencia configurada (Redis)
- [ ] Timeouts configurados
- [ ] Manejo de errores completo
- [ ] Tests unitarios con mocks
- [ ] Tests de integración con WireMock
- [ ] Tests de contrato (Pact) (si API crítica)
- [ ] Métricas Prometheus configuradas
- [ ] Dashboard Grafana creado
- [ ] Alertas configuradas
- [ ] Runbook documentado
- [ ] Secrets configurados en AWS Secrets Manager
- [ ] Code review aprobado

---

**Generado por:** Technical User Stories Architect v1.0  
**Tipo:** HUT-INFRA Integration Specialization
