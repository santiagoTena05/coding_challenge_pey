# 📝 Notes with Sentiments - Aplicación Web

Aplicación web para publicar y leer notas con sentimientos, construida con React, Next.js, AWS AppSync, y DynamoDB.

## 🎯 Descripción

Esta aplicación permite a los usuarios:
- ✅ **Crear notas** con texto libre y selección de sentimiento (feliz, triste, neutral, enojado)
- ✅ **Visualizar notas existentes** ordenadas por fecha de creación
- ✅ **Filtrar notas por sentimiento** usando botones de filtro intuitivos
- ✅ **Persistencia de datos** tanto en AWS DynamoDB como localStorage como fallback

## 🚀 Demo en Vivo

🔗 **URL de Producción:** [Próximamente en AWS Amplify]

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + Next  │    │   AWS AppSync    │    │   DynamoDB      │
│   Frontend      │◄──►│   GraphQL API    │◄──►│   Database      │
│   (Tailwind)    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Stack Tecnológico

- **Frontend**: React 18 + Next.js 14 + TypeScript + Tailwind CSS
- **API**: AWS AppSync (GraphQL)
- **Base de Datos**: AWS DynamoDB
- **Hosting**: AWS Amplify
- **Autenticación**: API Key (AWS AppSync)
- **IDs**: ULID para ordenamiento cronológico

## 📂 Estructura del Proyecto

```
.
├── CLAUDE.md              # Guía de desarrollo
├── README.md              # Este archivo
├── website/               # Frontend Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── NoteForm.tsx      # Formulario para crear notas
│   │   │   │   ├── NoteCard.tsx      # Tarjeta individual de nota
│   │   │   │   ├── NotesList.tsx     # Lista de notas con loading
│   │   │   │   └── SentimentFilter.tsx # Filtros por sentimiento
│   │   │   ├── lib/
│   │   │   │   └── graphql/
│   │   │   │       └── operations.ts  # Queries y mutations GraphQL
│   │   │   ├── types/
│   │   │   │   └── note.ts           # Definiciones TypeScript
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # Página principal
│   │   └── aws-exports.js            # Configuración AWS AppSync
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/               # (Opcional) CDK Infrastructure
└── analytics.ipynb       # (Opcional) Análisis de datos
```

## 🔧 Características Implementadas

### ✅ Funcionalidades Principales

1. **Creación de Notas**
   - Formulario con textarea para texto libre
   - Selector visual de sentimientos con emojis
   - Validación de campos requeridos
   - Generación automática de IDs únicos (ULID)

2. **Visualización de Notas**
   - Lista ordenada por fecha de creación (más recientes primero)
   - Tarjetas con diseño responsive
   - Indicadores visuales por sentimiento (colores + emojis)
   - Formato de fecha legible

3. **Filtrado por Sentimiento**
   - Botones de filtro con conteo de notas
   - Estados visuales activos/inactivos
   - Opción "Todas" para ver sin filtros

4. **Persistencia Híbrida**
   - Almacenamiento principal en AWS DynamoDB
   - Fallback automático a localStorage
   - Sincronización entre ambos sistemas

### ⚙️ Esquema GraphQL

```graphql
# Scalar types
scalar AWSDateTime

enum Sentiment {
  happy
  sad
  neutral
  angry
}

type Note {
  id: ID!
  text: String!
  sentiment: Sentiment!
  dateCreated: AWSDateTime!
}

type NoteQueryResults {
  items: [Note]
  nextToken: String
  scannedCount: Int
}

type Query {
  getNotes(sentiment: Sentiment, limit: Int, nextToken: String): NoteQueryResults
}

type Mutation {
  createNote(text: String!, sentiment: Sentiment!): Note
}

# Schema definition
schema {
  query: Query
  mutation: Mutation
}
```

### 🔧 Resolvers de AppSync

#### Resolver createNote (Mutation.createNote)

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { text, sentiment } = ctx.args;
    const id = util.autoUlid();
    const now = util.time.nowISO8601();

    return {
        operation: 'PutItem',
        key: {
            id: util.dynamodb.toDynamoDB(id)
        },
        attributeValues: {
            text: util.dynamodb.toDynamoDB(text),
            sentiment: util.dynamodb.toDynamoDB(sentiment),
            dateCreated: util.dynamodb.toDynamoDB(now)
        }
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }

    return ctx.result;
}
```

#### Resolver getNotes (Query.getNotes)

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { sentiment, limit = 10, nextToken } = ctx.args;

    // Base scan operation
    const scanRequest = {
        operation: 'Scan',
        limit: limit
    };

    // Add pagination
    if (nextToken) {
        scanRequest.nextToken = nextToken;
    }

    // Add filter for sentiment if provided
    if (sentiment) {
        scanRequest.filter = {
            expression: 'sentiment = :sentiment',
            expressionValues: {
                ':sentiment': util.dynamodb.toDynamoDB(sentiment)
            }
        };
    }

    return scanRequest;
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }

    // Convert sentiment values from uppercase to lowercase
    const items = (ctx.result.items || []).map(item => {
        if (item.sentiment) {
            item.sentiment = item.sentiment.toLowerCase();
        }
        return item;
    });

    return {
        items: items,
        nextToken: ctx.result.nextToken || null,
        scannedCount: ctx.result.scannedCount || 0
    };
}
```

### 🎨 UI/UX

- **Design System**: Tailwind CSS con paleta de colores semántica
- **Responsive**: Adaptable a móvil, tablet y desktop
- **Accesibilidad**: Contraste adecuado, labels semánticos
- **Estados**: Loading, error, y empty states
- **Paleta de Sentimientos**:
  - 😊 Feliz: Verde/Amarillo
  - 😢 Triste: Azul
  - 😐 Neutral: Gris
  - 😠 Enojado: Rojo

## 🛠️ Instalación y Desarrollo

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta de AWS con credenciales configuradas
- Git

### Setup Local

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd coding_challenge_pey
   ```

2. **Instalar dependencias**
   ```bash
   cd website
   npm install
   ```

3. **Configurar AWS**
   - Crear AppSync API en AWS Console
   - Configurar DynamoDB table
   - Actualizar `src/aws-exports.js` con tus credenciales

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en navegador**
   ```
   http://localhost:3000
   ```

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linting con ESLint
npm run type-check   # Verificación TypeScript
```

## 🗄️ Configuración AWS

### AppSync API

1. **Endpoint**: `https://6bxpuyzrzndhzj74er4nrxqfru.appsync-api.us-east-1.amazonaws.com/graphql`
2. **Región**: `us-east-1`
3. **Autenticación**: API Key
4. **Resolvers**: JavaScript para DynamoDB

### DynamoDB Table

- **Nombre**: `Notes-dev`
- **Partition Key**: `id` (String)
- **Atributos**: `text`, `sentiment`, `dateCreated`

## 🚀 Despliegue

### AWS Amplify

1. Conectar repositorio GitHub
2. Configurar build settings para Next.js
3. Configurar variables de entorno
4. Deploy automático en cada push

### Build Settings
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd website
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: website/.next
    files:
      - '**/*'
  cache:
    paths:
      - website/node_modules/**/*
```

## 📊 Estado del Proyecto

### ✅ Completado

- [x] Setup de proyecto Next.js + TypeScript + Tailwind
- [x] Componentes UI para crear y mostrar notas
- [x] Integración con AWS AppSync GraphQL
- [x] Almacenamiento en DynamoDB
- [x] Filtrado por sentimiento (backend + frontend)
- [x] Paginación completa (10 notas por página)
- [x] Sistema de fallback localStorage
- [x] UI responsive y accesible
- [x] Manejo de errores y loading states
- [x] Schema GraphQL según especificaciones
- [x] Resolvers JavaScript optimizados

### 🔄 En Progreso

- [ ] Despliegue a AWS Amplify

### 📋 Por Hacer (Opcional)

- [ ] Notebook de analítica (`analytics.ipynb`)
- [ ] Infraestructura como código con CDK
- [ ] Tests unitarios y de integración
- [ ] Optimización de rendimiento

## 🧠 Decisiones Técnicas

### 1. **ULID para IDs**
Elegí ULID sobre UUID porque permite ordenamiento cronológico natural, útil para mostrar notas por fecha.

### 2. **Híbrido AWS + localStorage**
Implementé un sistema de fallback que permite funcionalidad offline y mejor UX durante problemas de conectividad.

### 3. **TypeScript Estricto**
Uso TypeScript con configuración estricta para mejor DX y prevención de errores.

### 4. **Componentes Modulares**
Separé la UI en componentes reutilizables siguiendo principios de responsabilidad única.

### 5. **Error Boundaries**
Manejo de errores tanto a nivel de componente como de aplicación.

## 🐛 Solución de Problemas

### Errores Comunes

1. **"Variable 'sentiment' has an invalid value"**
   - Verificar que enum values coincidan entre frontend y backend
   - Usar uppercase en GraphQL schema

2. **"Network error"**
   - Verificar API key en `aws-exports.js`
   - Confirmar que AppSync API esté activo

3. **"Table doesn't exist"**
   - Verificar que DynamoDB table existe
   - Confirmar nombre de tabla en resolvers
