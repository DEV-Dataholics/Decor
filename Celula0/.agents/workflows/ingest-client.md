---
description: "Automatiza la ingesta de un nuevo cliente leyendo sus entrevistas crudas y estructurando sus dolores operativos. Uso exclusivo de la Célula 0 (CRO)."
---

# Workflow: Ingesta de Cliente (Célula 0)

Este flujo de trabajo guía al agente paso a paso para procesar entrevistas y cuestionarios de nuevos clientes sin contaminar el entorno con sesgos técnicos.

**Paso 1: Leer la trinchera comercial**
Busca y procesa todos los archivos (transcripciones, notas, PDFs o documentos de texto) que se encuentren dentro de la carpeta `raw-transcripts/` y `Context/`.

**Paso 2: Activar al extractor clerical**
Llama a la habilidad local `commercial-onboarder`. Aplica estrictamente sus prohibiciones de seguridad (Zero-Trust) para no proponer ni escribir código, bases de datos o arquitectura.

**Paso 3: Estructuración de los datos**
Extrae los "dolores operativos" (pain points) identificados en el Paso 1 de manera literal. Categorízalos basándote en los departamentos operativos mencionados (Ventas, Logística, Finanzas, Recursos Humanos, etc.).

**Paso 4: Generar la Salida Segura (Safe Output)**
Consolida toda la información extraída y escribe el resultado en el archivo `docs/0-onboarding-raw.md`.

**Paso 5: Cierre inquebrantable**
Una vez guardado el archivo `docs/0-onboarding-raw.md`, detén tu ejecución inmediatamente. Avisa al usuario que la ingesta comercial está lista para ser transferida a la Célula 1 (Auditoría/NLP).
