# 📘 API NFC - Q-Tap Software

Documentación de las rutas disponibles para el sistema de fidelización mediante etiquetas NFC + landing interactiva.

---

## 🔐 Autenticación por API Key

**Todas las rutas protegidas requieren un header:**

```
x-api-key: q-tap-fidelizacion-prueba
```

---

## 🔁 Rutas para escaneo físico (ESP32)

### POST `/saveUID`

📍 **Registra una etiqueta NFC escaneada desde ESP32 + RC522.**

**Headers**:  
`x-api-key: q-tap-fidelizacion-prueba`  
`Content-Type: application/json`

**Body ejemplo**:

```json
{
  "uid": "041BA9216F6180",
  "url": "https://unit.link/q-tap-software"
}
```

**Respuesta:**

```json
{
  "success": true,
  "uid": "041BA9216F6180"
}
```

---

## 🌐 Rutas de interacción web (landing, clics, vistas)

### POST `/events/batch`

📍 **Registra múltiples eventos generados por un usuario en el landing web.**

**Body ejemplo:**

```json
{
  "events": [
    {
      "id": "evt-001",
      "eventType": "pageView",
      "timestamp": "2025-05-14T12:20:00.000Z",
      "sessionId": "sess-1234",
      "readerId": "web-landing",
      "uid": "041BA9216F6180",
      "page": "/landing",
      "metadata": { "platform": "web" }
    },
    {
      "id": "evt-002",
      "eventType": "buttonClick",
      "timestamp": "2025-05-14T12:21:00.000Z",
      "sessionId": "sess-1234",
      "readerId": "web-landing",
      "uid": "041BA9216F6180",
      "page": "/landing",
      "buttonId": "registerBtn",
      "metadata": { "label": "Registrarme", "platform": "web" }
    }
  ]
}
```

**Respuesta:**

```json
{ "success": true, "count": 2 }
```

---

## 📊 Estadísticas globales

### GET `/stats/summary`

📍 **Devuelve resumen global de interacciones físicas y web.**

**Respuesta:**

```json
{
  "totalTags": 10,
  "totalTokens": 48,
  "totalClicks": 77,
  "topTokens": [
    { "uid": "UID001", "token": 10 }
  ],
  "topClicks": [
    { "uid": "UID003", "totalClicks": 18 }
  ]
}
```

---

## 👤 Estadísticas por usuario (UID)

### GET `/stats_uids/:uid`

📍 **Devuelve datos físicos (ESP32) del usuario con ese UID.**

**Respuesta:**

```json
{
  "uid": "041BA9216F6180",
  "token": 10,
  "firstSeen": "2025-05-13T17:30:00Z",
  "lastSeen": "2025-05-14T10:20:00Z",
  "urlAccedida": "https://unit.link/q-tap-software",
  "historial": [ ... ]
}
```

### GET `/stats_web/:uid`

📍 **Devuelve datos digitales (landing/clics) del usuario con ese UID.**

**Respuesta:**

```json
{
  "uid": "041BA9216F6180",
  "pageViews": 6,
  "totalClicks": 3,
  "platform": "web",
  "lastPage": "/landing",
  "lastSeen": "2025-05-14T10:35:00Z",
  "history": [ ... ]
}
```
## 👥 Gestión de Clientes (Dueños de Tags)

### POST `/clientes`
Registra un nuevo cliente (dueño de etiqueta NFC).

**Headers**:  
`x-api-key: q-tap-fidelizacion-prueba`  
`Content-Type: application/json`

**Body ejemplo**:
```json
{
  "uid": "041BA9216F6180",
  "nombre": "Juan Pérez",
  "telefono": "+573001112233",
  "email": "juan@mail.com"
}

---

## 📎 Notas adicionales

- Los `UID` son únicos por etiqueta NFC.
- Todos los eventos quedan también almacenados en `nfc_events/{id}` para trazabilidad.
- Las estadísticas pueden combinarse en `/usuario/:uid` (próximo endpoint).
- Se recomienda consumir estas rutas desde frontend Angular/React o apps móviles mediante HTTPS.