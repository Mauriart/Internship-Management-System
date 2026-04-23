# Internship Competency Assessment System (ICAS) 🎓

## 📋 Descripción del Proyecto
[cite_start]Este sistema está diseñado para la gestión y seguimiento de evaluaciones de estudiantes en programas de pasantías técnicas (undécimo y duodécimo año)[cite: 10]. [cite_start]Su objetivo principal es la generación de **Tarjetas Digitales de Competencia** que validan si el estudiante posee las habilidades necesarias para integrarse al sector empresarial[cite: 9, 10].

[cite_start]El sistema implementa un modelo de evaluación cíclico cada dos meses, permitiendo la retroalimentación constante antes de la asignación definitiva de pasantías[cite: 10].

## 🛠️ Stack Tecnológico
- **Frontend:** React + Vite (Modularidad y rapidez).
- **Styling:** Tailwind CSS + Shadcn/UI (Interfaz densa y profesional).
- **Backend/DB:** Supabase / PostgreSQL (Arquitectura relacional y RLS).
- [cite_start]**Infraestructura:** Servidor institucional con dominio propio[cite: 33, 34].

## 🏗️ Arquitectura de Datos (Mermaid)
[cite_start]Como el sistema maneja múltiples especialidades y grupos[cite: 16], la estructura lógica se define de la siguiente manera:

```mermaid
erDiagram
    ESPECIALIDAD ||--o{ GRUPO : contiene
    GRUPO ||--o{ ESTUDIANTE : tiene
    PROFESOR ||--o{ GRUPO : administra
    ESTUDIANTE ||--o{ EVALUACION : recibe
    EVALUACION ||--o{ CALIFICACION : detalle
    HABILIDAD ||--o{ CALIFICACION : medida_por
