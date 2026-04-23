export const specialties = [
  "Desarrollo de Software",
  "Contabilidad",
  "Ejecutivo Comercial",
  "Ciberseguridad",
  "Diseno Grafico",
  "Soporte TI",
  "Electronica",
];

export const softSkills = [
  { id: "soft-communication", label: "Comunicacion asertiva" },
  { id: "soft-teamwork", label: "Trabajo en equipo" },
  { id: "soft-responsibility", label: "Responsabilidad" },
  { id: "soft-adaptability", label: "Adaptabilidad" },
];

export const cognitiveSkillsBySpecialty = {
  "Desarrollo de Software": [
    { id: "cog-logic", label: "Logica de programacion" },
    { id: "cog-debugging", label: "Resolucion de errores" },
    { id: "cog-datamodel", label: "Modelado de datos" },
  ],
  "Contabilidad": [
    { id: "cog-ledger", label: "Registro contable" },
    { id: "cog-analysis", label: "Analisis financiero" },
    { id: "cog-controls", label: "Control documental" },
  ],
  "Ejecutivo Comercial": [
    { id: "cog-sales", label: "Tecnicas de venta" },
    { id: "cog-negotiation", label: "Negociacion" },
    { id: "cog-followup", label: "Seguimiento comercial" },
  ],
  Ciberseguridad: [
    { id: "cog-risks", label: "Gestion de riesgos" },
    { id: "cog-incident", label: "Respuesta a incidentes" },
    { id: "cog-hardening", label: "Endurecimiento basico" },
  ],
  "Diseno Grafico": [
    { id: "cog-layout", label: "Composicion visual" },
    { id: "cog-brand", label: "Consistencia de marca" },
    { id: "cog-tools", label: "Dominio de herramientas" },
  ],
  "Soporte TI": [
    { id: "cog-diagnosis", label: "Diagnostico tecnico" },
    { id: "cog-service", label: "Atencion al usuario" },
    { id: "cog-documentation", label: "Documentacion tecnica" },
  ],
  Electronica: [
    { id: "cog-measurement", label: "Medicion y prueba" },
    { id: "cog-schematics", label: "Lectura de esquemas" },
    { id: "cog-safety", label: "Seguridad operativa" },
  ],
};

export const defaultStage = {
  id: "stage-2026-1",
  name: "Etapa Marzo-Abril 2026",
  startsAt: "2026-03-01",
  endsAt: "2026-04-30",
  isLocked: false,
};

export const defaultChecklist = [
  { id: "contacts", label: "Verifique correos del estudiante y del encargado", done: true },
  { id: "rubric", label: "Revise la rubrica completa antes de cerrar la etapa", done: false },
  { id: "evidence", label: "Confirme observaciones relevantes de seguimiento", done: false },
];

export const teacherGroup = {
  id: "group-11A-dev",
  name: "11A Desarrollo",
  specialty: "Desarrollo de Software",
  teacherName: "Prof. Laura Mendez",
};

export const students = [
  {
    id: "std-001",
    fullName: "Maria Fernanda Rojas",
    studentEmail: "maria@example.edu",
    guardianEmail: "encargado.maria@example.com",
  },
  {
    id: "std-002",
    fullName: "Kevin Josue Vargas",
    studentEmail: "kevin@example.edu",
    guardianEmail: "encargado.kevin@example.com",
  },
  {
    id: "std-003",
    fullName: "Daniela Cordero Ruiz",
    studentEmail: "daniela@example.edu",
    guardianEmail: "encargado.daniela@example.com",
  },
];
