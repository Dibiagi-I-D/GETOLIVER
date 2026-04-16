# 🧾 Sistema de Carga de Viáticos

Sistema completo para la carga masiva de anticipos de viáticos (ANTV) a la base de datos Softland.

## 📋 Características

- ✅ Carga masiva de viáticos para múltiples empleados
- 🔄 Obtención automática del siguiente NROFOR disponible
- 📅 Inputs de fecha intuitivos
- 🔍 Búsqueda y filtrado de empleados
- ✔️ Selección múltiple de empleados
- 💾 Inserción automática en tablas SJTPAH y SJTPAI
- 🎨 Interfaz moderna y responsive

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

### 2. Configurar variables de entorno

Edita el archivo `.env` en la raíz del proyecto con tus credenciales:

```env
DB_SERVER=ServerSQL2022
DB_DATABASE=DIBIAG
DB_USER=sa
DB_PASSWORD=Password1!
DB_PORT=1433
PORT=5000
```

### 3. Instalar dependencias del backend

```powershell
npm install
```

### 4. Instalar dependencias del frontend

```powershell
cd client
npm install
cd ..
```

## 🎮 Uso

### Opción 1: Ejecutar todo junto (Recomendado)

```powershell
npm run dev:full
```

### Opción 2: Ejecutar por separado

**Terminal 1 - Backend:**
```powershell
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
npm run client
```

## 🌐 Acceso

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 📊 Datos que se insertan automáticamente

Los siguientes campos se configuran automáticamente:

- **SJTPAH_CODFOR:** ANTV (fijo)
- **SJTPAH_NROFOR:** Autoincremental (se obtiene el último + 1)
- **SJTPAH_EMPLEG:** DIBIAG (fijo)
- **SJTPAH_IMPORT:** 80,000.00 (fijo)
- **SJTPAH_CUOTAS:** 1 (fijo)
- **SJTPAH_STATUS:** MENSUAL (fijo)
- **SJTPAH_TIPCPT:** sueldos (fijo)
- **SJTPAH_CODCPT:** ANTVIA (fijo)

## 📝 Campos a completar en el formulario

1. **Fecha de Movimiento** (SJTPAH_FCHMOV)
2. **Fecha de Inicio** (SJTPAH_FCHINI)
3. **Descripción SJTPAH** (USR_SJTPAH_TEXTOS)
4. **Descripción SJTPAI** (USR_SJTPAI_TEXTOS)
5. **Empleados** (selección múltiple de SJTPAH_NROLEG)

## 🔧 Estructura del Proyecto

```
insertar_viaticos/
├── server/
│   ├── config/
│   │   └── database.js          # Configuración de SQL Server
│   ├── controllers/
│   │   └── viaticos.controller.js  # Lógica de negocio
│   ├── routes/
│   │   └── viaticos.routes.js   # Rutas de la API
│   └── index.js                 # Servidor Express
├── client/
│   ├── src/
│   │   ├── App.jsx              # Componente principal
│   │   ├── App.css              # Estilos
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Estilos globales
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env                         # Variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ API Endpoints

### GET `/api/viaticos/ultimo-nrofor`
Obtiene el último NROFOR utilizado para ANTV

### GET `/api/viaticos/empleados`
Obtiene la lista de empleados de DIBIAG

### POST `/api/viaticos/insertar`
Inserta viáticos masivamente para múltiples empleados

**Body:**
```json
{
  "nrolegajos": ["12345", "67890"],
  "fechaMov": "2026-01-17",
  "fechaIni": "2026-01-17",
  "textoSJTPAH": "Anticipo de viáticos enero 2026",
  "textoSJTPAI": "Anticipo de viáticos enero 2026"
}
```

## ⚠️ Importante

- Asegúrate de que SQL Server esté corriendo y accesible
- Verifica que las credenciales en `.env` sean correctas
- La base de datos debe tener las tablas SJTPAH y SJTPAI
- El usuario debe tener permisos de INSERT en ambas tablas

## 🐛 Troubleshooting

### Error de conexión a SQL Server

Verifica que:
1. SQL Server esté corriendo
2. El nombre del servidor sea correcto
3. Las credenciales sean válidas
4. El puerto 1433 esté abierto

### No se cargan los empleados

Verifica que:
1. La tabla SJTPAH exista
2. Haya registros con SJTPAH_EMPLEG = 'DIBIAG'
3. El usuario tenga permisos de SELECT

## 📄 Licencia

ISC
