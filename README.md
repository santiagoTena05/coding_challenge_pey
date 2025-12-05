# Notes with Sentiments - Aplicación Web

Aplicación web para publicar y leer notas con sentimientos, construida con React, Next.js, AWS AppSync, y DynamoDB con infraestructura como código usando CloudFormation/CDK.

## Descripción

Esta aplicación permite a los usuarios:
- Crear notas con texto libre y selección de sentimiento (feliz, triste, neutral, enojado)
- Visualizar notas existentes ordenadas por fecha de creación
- Filtrar notas por sentimiento con paginación optimizada
- Persistencia de datos en AWS DynamoDB con sistema de fallback a localStorage

## Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + Next  │    │   AWS AppSync    │    │   DynamoDB      │
│   Frontend      │◄──►│   GraphQL API    │◄──►│   Database      │
│   (Tailwind)    │    │                  │    │   + GSI Index   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                         ┌──────▼─────────┐    ┌─────────▼─────────┐
                         │  CloudFormation │    │  SentimentIndex   │
                         │  Infrastructure │    │  GSI for Query    │
                         │  as Code        │    │  Performance      │
                         └────────────────┘     └───────────────────┘
```

### Stack Tecnológico

- **Frontend**: React 18 + Next.js 14 + TypeScript + Tailwind CSS
- **API**: AWS AppSync (GraphQL)
- **Base de Datos**: AWS DynamoDB con Global Secondary Index
- **Infraestructura**: CloudFormation (generado desde CDK)
- **Hosting**: AWS Amplify
- **Autenticación**: API Key (AWS AppSync)
- **IDs**: ULID para ordenamiento cronológico

## Estructura del Proyecto

```
.
├── README.md              # Este archivo
├── website/               # Frontend Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── NoteForm.tsx      # Formulario para crear notas
│   │   │   │   ├── NoteCard.tsx      # Tarjeta individual de nota
│   │   │   │   ├── NotesList.tsx     # Lista con paginación
│   │   │   │   └── SentimentFilter.tsx # Filtros por sentimiento
│   │   │   ├── lib/
│   │   │   │   └── graphql/
│   │   │   │       └── operations.ts  # Queries y mutations GraphQL
│   │   │   ├── types/
│   │   │   │   └── note.ts           # Definiciones TypeScript
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # Página principal
│   │   └── aws-exports.ts            # Configuración AWS AppSync
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/               # Infraestructura como código
│   ├── lib/
│   │   ├── backend-stack.ts          # Stack principal CDK
│   │   ├── schema.graphql            # Schema GraphQL
│   │   └── resolvers/                # Resolvers JavaScript
│   │       ├── createNote.js
│   │       └── getNotes.js
│   ├── notes-stack.yaml              # CloudFormation template
│   ├── package.json
│   ├── cdk.json
│   └── tsconfig.json
└── analytics.ipynb       # Análisis de datos con Python
```

## Características Implementadas

### Funcionalidades Principales

1. **Creación de Notas**
   - Formulario con textarea para texto libre
   - Selector visual de sentimientos
   - Validación de campos requeridos
   - Generación automática de IDs únicos (ULID)

2. **Visualización de Notas**
   - Lista ordenada por fecha de creación (más recientes primero)
   - Tarjetas con diseño responsive
   - Indicadores visuales por sentimiento
   - Formato de fecha legible
   - Paginación tradicional con botones Anterior/Siguiente

3. **Filtrado por Sentimiento Optimizado**
   - Filtros que consultan directamente el backend mediante Global Secondary Index
   - Query operations eficientes en lugar de Scan operations
   - Cada filtro ejecuta una nueva consulta que devuelve 10 notas del sentimiento seleccionado
   - Paginación independiente por cada filtro
   - Opción "Todas" para ver sin filtros

4. **Persistencia Híbrida**
   - Almacenamiento principal en AWS DynamoDB
   - Fallback automático a localStorage
   - Sincronización entre ambos sistemas

5. **Infraestructura como Código**
   - Stack completo definido en CloudFormation/CDK
   - Despliegue automatizado de recursos AWS
   - Configuración reproducible y versionada

### Esquema GraphQL

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

### Resolvers de AppSync

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

### UI/UX

- **Design System**: Tailwind CSS con paleta de colores semántica
- **Responsive**: Adaptable a móvil, tablet y desktop
- **Accesibilidad**: Contraste adecuado, labels semánticos
- **Estados**: Loading, error, y empty states
- **Paleta de Sentimientos**:
  - Feliz: Verde/Amarillo
  - Triste: Azul
  - Neutral: Gris
  - Enojado: Rojo

## Instalación y Desarrollo

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

3. **Desplegar Infraestructura AWS**
   ```bash
   cd backend
   npm install
   npm run deploy
   ```
   - Esto desplegará el stack de CloudFormation con todos los recursos AWS
   - Al completarse, obtendrás los valores de salida (endpoint, API key, etc.)

4. **Configurar Variables de Entorno**
   - Actualizar `website/.env.local` con los valores del stack desplegado
   - Copiar endpoint GraphQL y API key desde las salidas de CloudFormation

5. **Ejecutar en desarrollo**
   ```bash
   cd website
   npm run dev
   ```

6. **Abrir en navegador**
   ```
   http://localhost:3000
   ```

### Scripts Disponibles

**Frontend (website/)**
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linting con ESLint
npm run type-check   # Verificación TypeScript
```

**Backend (backend/)**
```bash
npm run build        # Compilar TypeScript
npm run watch        # Compilar en modo watch
npm run test         # Ejecutar tests
npm run cdk          # Comandos CDK
npm run deploy       # Desplegar stack
npm run destroy      # Destruir stack
```

## Configuración AWS

### Recursos Desplegados

Todos los recursos se crean automáticamente al desplegar el stack de CloudFormation:

1. **AppSync API**
   - Autenticación: API Key
   - Resolvers: VTL (Velocity Template Language) para DynamoDB
   - Schema GraphQL completo

2. **DynamoDB Table**
   - Nombre: `Notes-CDK` (generado por el stack)
   - Partition Key: `id` (String)
   - Global Secondary Index: `SentimentIndex`
     - Partition Key: `sentiment`
     - Sort Key: `dateCreated`
   - Billing Mode: Pay per request

3. **IAM Roles y Políticas**
   - Rol para AppSync con permisos DynamoDB
   - Permisos para Query, Scan, PutItem en tabla e índices

## Despliegue

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

## Estado del Proyecto

### Completado

- [x] Setup de proyecto Next.js + TypeScript + Tailwind
- [x] Componentes UI para crear y mostrar notas
- [x] Integración con AWS AppSync GraphQL
- [x] Almacenamiento en DynamoDB
- [x] Filtrado por sentimiento optimizado (Global Secondary Index)
- [x] Paginación tradicional con botones Anterior/Siguiente
- [x] Sistema de fallback localStorage
- [x] UI responsive y accesible
- [x] Manejo de errores y loading states
- [x] Schema GraphQL según especificaciones
- [x] Resolvers VTL optimizados para DynamoDB
- [x] Infraestructura como código con CloudFormation/CDK
- [x] Migración completa desde configuración manual de AWS Console

### En Progreso

- [ ] Despliegue a AWS Amplify

### Por Hacer (Opcional)

- [ ] Notebook de analítica (`analytics.ipynb`)
- [ ] Tests unitarios y de integración
- [ ] Optimización de rendimiento adicional

## Decisiones Técnicas

### 1. **ULID para IDs**
Elegí ULID sobre UUID porque permite ordenamiento cronológico natural, útil para mostrar notas por fecha.

### 2. **Global Secondary Index para Filtrado**
Implementé un GSI en DynamoDB con `sentiment` como partition key y `dateCreated` como sort key. Esto permite:
- Query operations eficientes en lugar de Scan operations costosas
- Filtrado rápido por sentimiento con soporte de paginación
- Mejor rendimiento a medida que crece la base de datos

### 3. **CloudFormation/CDK para Infraestructura**
Migré de configuración manual en AWS Console a Infrastructure as Code para:
- Versionado y reproducibilidad de la infraestructura
- Facilitar revisión de código por parte de empleadores
- Despliegues automatizados y consistentes
- Mejor documentación de la arquitectura

### 4. **Paginación Tradicional vs Load More**
Cambié de un patrón "Load More" a paginación tradicional porque:
- Mejor UX para navegación de datos
- Más eficiente con DynamoDB Query operations
- Permite calcular páginas totales estimadas

### 5. **Híbrido AWS + localStorage**
Implementé un sistema de fallback que permite funcionalidad offline y mejor UX durante problemas de conectividad.

### 6. **TypeScript Estricto**
Uso TypeScript con configuración estricta para mejor DX y prevención de errores.

### 7. **Componentes Modulares**
Separé la UI en componentes reutilizables siguiendo principios de responsabilidad única.

## Solución de Problemas

### Errores Comunes

1. **"Variable 'sentiment' has an invalid value"**
   - Verificar que enum values coincidan entre frontend y backend
   - Usar lowercase en frontend, el resolver convierte automáticamente

2. **"Network error"**
   - Verificar API key en `website/.env.local`
   - Confirmar que AppSync API esté activo
   - Revisar que el endpoint sea correcto

3. **"Table doesn't exist"**
   - Asegurar que el stack de CloudFormation se haya desplegado correctamente
   - Verificar que todos los recursos estén en estado CREATE_COMPLETE

4. **"Not authorized to perform: dynamodb:Query"**
   - Verificar que el IAM role incluya permisos para índices GSI
   - Revisar que la policy tenga `"${NotesTable.Arn}/index/*"`

5. **"CDK Bootstrap required"**
   - Ejecutar `cdk bootstrap` en la región correspondiente
   - Verificar permisos IAM para CloudFormation, SSM y ECR
