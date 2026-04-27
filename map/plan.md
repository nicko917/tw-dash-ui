# Tribal Wars OFF/DEF Marker - Plan

## 🎯 Objetivo
Desarrollar un userscript modular que permita:
- Marcar pueblos en el mapa como OFF o DEF
- Visualizarlo con colores/iconos
- Permitir gestión manual y futura automatización

---

## 🧱 Fases

### Fase 1 - Base funcional
- Detectar pueblos en el mapa
- Renderizar overlay visual
- Configuración manual (JSON)

### Fase 2 - Persistencia
- Guardar etiquetas OFF/DEF
- Uso de localStorage
- Panel de control básico

### Fase 3 - Clasificación inteligente
- Analizar reports
- Detectar tropas ofensivas/defensivas
- Clasificar automáticamente

### Fase 4 - UI avanzada
- Panel flotante
- Filtros (ver solo OFF / DEF)
- Edición rápida

### Fase 5 - Optimización
- Performance en mapas grandes
- Observer para cambios dinámicos
- Modularización final

---

## ⚙️ Stack
- TypeScript
- Userscript (Tampermonkey)
- DOM API
- LocalStorage

---

## 📦 Entregables
- userscript funcional
- sistema modular escalable
- documentación completa

---

## ⚠️ Restricciones
- No automatizar acciones del juego
- Solo visualización e interpretación