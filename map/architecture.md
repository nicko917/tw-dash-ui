# Arquitectura

## Flujo principal

[MAP DOM]
   ↓
[Parser]
   ↓
[Classifier]
   ↓
[UI Overlay]

---

## Módulos

### core/
- map.ts → acceso al mapa
- parser.ts → extrae datos
- classifier.ts → decide OFF/DEF

### ui/
- overlay.ts → render visual
- panel.ts → interfaz usuario

### data/
- storage.ts → persistencia
- schema.ts → estructura datos

### services/
- reports.ts → análisis reports
- players.ts → info jugadores

---

## Principios
- desacoplamiento total
- funciones puras en lógica
- UI separada de lógica