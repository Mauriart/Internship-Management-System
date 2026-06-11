import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChecklistPanel } from "@/features/gradebook/components/ChecklistPanel";
import { EvaluationPreview } from "@/features/gradebook/components/EvaluationPreview";
import { GradebookTable } from "@/features/gradebook/components/GradebookTable";
import { StageHeader } from "@/features/gradebook/components/StageHeader";
import {
  buildSavePayload,
  clampScore,
  createGradebookFromSupabase,
  createInitialGradebook,
} from "@/features/gradebook/utils/gradebook";
import { supabase } from "@/lib/supabase";

const emptyStudentForm = {
  fullName: "",
  email: "",
  studentCode: "",
  groupId: "",
  guardianName: "",
  guardianEmail: "",
  guardianPhone: "",
};

const emptyTeacherForm = {
  authUserId: "",
  fullName: "",
  email: "",
  groupId: "",
};

const emptyGroupForm = {
  code: "",
  label: "",
  schoolYear: "11",
  specialtyId: "",
  maxStudents: "18",
  teacherId: "",
};

export default function App() {
  const [useMock, setUseMock] = useState(false);
  const [session, setSession] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [adminGroups, setAdminGroups] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [adminMessage, setAdminMessage] = useState("");
  const [gradebook, setGradebook] = useState(createInitialGradebook);
  const [evaluationIds, setEvaluationIds] = useState({});
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedRealData, setHasLoadedRealData] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Sin cambios pendientes.");

  const allChecklistDone = gradebook.checklist.every((item) => item.done);

  const savePayload = useMemo(() => buildSavePayload(gradebook), [gradebook]);
  const selectedRow = gradebook.rows[selectedRowIndex];

  useEffect(() => {
    if (!supabase) {
      setIsAuthReady(true);
      return;
    }

    setSession(null);
    setIsAuthReady(true);

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError("");
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (useMock) {
      setGradebook(createInitialGradebook());
      setEvaluationIds({});
      setCurrentProfile(null);
      setAdminGroups([]);
      setHasLoadedRealData(false);
      setSelectedRowIndex(0);
      setIsLoading(false);
      setLoadError("");
      setSaveMessage("Usando datos mock locales.");
      return;
    }

    if (!session) {
      setIsLoading(false);
      setLoadError("");
      setEvaluationIds({});
      setCurrentProfile(null);
      setAdminGroups([]);
      setHasLoadedRealData(false);
      return;
    }

    let ignore = false;

    async function loadGradebook() {
      if (!supabase) {
        setLoadError("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.");
        return;
      }

      setIsLoading(true);
      setHasLoadedRealData(false);
      setLoadError("");

      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userResult?.user) {
        throw new Error("Debes iniciar sesion para consultar grupos y evaluaciones.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", userResult.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("Tu usuario Auth no tiene perfil en public.profiles.");
      }

      if (profile.role === "orientadora") {
        const [{ data: groups, error: groupsError }, { data: specialtiesData, error: specialtiesError }] =
          await Promise.all([
            supabase
              .from("student_groups")
              .select("id, code, label, school_year, specialty_id, specialties(name), students(id, student_code, full_name, email), group_teachers(profiles(id, full_name, email))")
              .order("code", { ascending: true }),
            supabase.from("specialties").select("id, name").order("name", { ascending: true }),
          ]);

        if (groupsError) throw groupsError;
        if (specialtiesError) throw specialtiesError;

        if (!ignore) {
          setCurrentProfile(profile);
          setAdminGroups(groups ?? []);
          setSpecialties(specialtiesData ?? []);
          setStudentForm((current) => ({
            ...current,
            groupId: current.groupId || groups?.[0]?.id || "",
          }));
          setTeacherForm((current) => ({
            ...current,
            groupId: current.groupId || groups?.[0]?.id || "",
          }));
          setGroupForm((current) => ({
            ...current,
            specialtyId: current.specialtyId || specialtiesData?.[0]?.id || "",
          }));
          setHasLoadedRealData(true);
          setSaveMessage("Vista admin cargada desde Supabase.");
        }
        return;
      }

      const { data: groups, error: groupsError } = await supabase
        .from("student_groups")
        .select("id, code, label, school_year, specialty_id, specialties(name)")
        .order("code", { ascending: true });

      if (groupsError) throw groupsError;
      if (!groups?.length) {
        throw new Error("No se encontraron grupos disponibles para el usuario actual.");
      }

      const selectedGroup = groups[0];

      const [{ data: students, error: studentsError }, { data: skills, error: skillsError }, { data: stage, error: stageError }] =
        await Promise.all([
          supabase
            .from("students")
            .select("id, student_code, full_name, email, group_id")
            .eq("group_id", selectedGroup.id)
            .order("full_name", { ascending: true }),
          supabase
            .from("skills")
            .select("id, label, skill_type, specialty_id, sort_order")
            .eq("is_active", true)
            .or(`specialty_id.is.null,specialty_id.eq.${selectedGroup.specialty_id}`)
            .order("sort_order", { ascending: true }),
          supabase
            .from("stages")
            .select("id, name, starts_on, ends_on, is_open")
            .eq("is_open", true)
            .order("starts_on", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (studentsError) throw studentsError;
      if (skillsError) throw skillsError;
      if (stageError) throw stageError;
      if (!stage) throw new Error("No hay una etapa abierta configurada.");

      const studentIds = (students ?? []).map((student) => student.id);
      let evaluations = [];

      if (studentIds.length > 0) {
        const { data: existingEvaluations, error: evaluationsError } = await supabase
          .from("evaluations")
          .select("id, student_id, stage_id")
          .eq("stage_id", stage.id)
          .in("student_id", studentIds);

        if (evaluationsError) throw evaluationsError;

        evaluations = existingEvaluations ?? [];
        const existingStudentIds = new Set(evaluations.map((evaluation) => evaluation.student_id));
        const missingEvaluations = (students ?? [])
          .filter((student) => !existingStudentIds.has(student.id))
          .map((student) => ({
            student_id: student.id,
            stage_id: stage.id,
            evaluator_profile_id: userResult.user.id,
            group_id: selectedGroup.id,
          }));

        if (missingEvaluations.length > 0) {
          const { data: insertedEvaluations, error: insertError } = await supabase
            .from("evaluations")
            .insert(missingEvaluations)
            .select("id, student_id, stage_id");

          if (insertError) throw insertError;

          evaluations = [...evaluations, ...(insertedEvaluations ?? [])];
        }
      }

      if (!ignore) {
        setCurrentProfile(profile);
        setAdminGroups(groups ?? []);
        setGradebook(
          createGradebookFromSupabase({
            group: selectedGroup,
            stage,
            skills: skills ?? [],
            students: students ?? [],
          }),
        );
        setEvaluationIds(
          Object.fromEntries(
            evaluations.map((evaluation) => [evaluation.student_id, evaluation.id]),
          ),
        );
        setDirtyRows(new Set());
        setSelectedRowIndex(0);
        setStudentForm((current) => ({
          ...current,
          groupId: current.groupId || selectedGroup.id,
        }));
        setSaveMessage(
          `Datos reales cargados. ${evaluations.length} evaluaciones listas; scores aun no se guardan.`,
        );
        setHasLoadedRealData(true);
      }
    }

    loadGradebook()
      .catch((error) => {
        if (!ignore) {
          setLoadError(error.message || "No se pudieron cargar datos desde Supabase.");
          setHasLoadedRealData(false);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isAuthReady, session, useMock]);

  function markDirty(rowIndex) {
    setDirtyRows((previous) => new Set(previous).add(rowIndex));
  }

  function clearDirty(rowIndex) {
    setDirtyRows((previous) => {
      const nextDirtyRows = new Set(previous);
      nextDirtyRows.delete(rowIndex);
      return nextDirtyRows;
    });
  }

  async function updateScore(rowIndex, skillId, value) {
    const nextScore = clampScore(value);
    const currentRow = gradebook.rows[rowIndex];
    const previousScore = currentRow?.scores[skillId];
    const studentId = currentRow?.student.id;
    const evaluationId = evaluationIds[studentId];

    function restorePreviousScore() {
      setGradebook((current) => {
        const nextRows = [...current.rows];
        nextRows[rowIndex] = {
          ...nextRows[rowIndex],
          scores: {
            ...nextRows[rowIndex].scores,
            [skillId]: previousScore,
          },
        };

        return { ...current, rows: nextRows };
      });
    }

    setGradebook((current) => {
      const nextRows = [...current.rows];
      nextRows[rowIndex] = {
        ...nextRows[rowIndex],
        scores: {
          ...nextRows[rowIndex].scores,
          [skillId]: nextScore,
        },
      };

      return { ...current, rows: nextRows };
    });
    markDirty(rowIndex);

    if (useMock) {
      setSaveMessage("Puntaje actualizado solo en mocks locales.");
      return;
    }

    if (!supabase || !evaluationId) {
      restorePreviousScore();
      clearDirty(rowIndex);
      setSaveMessage("No se pudo guardar el puntaje: falta la evaluacion vinculada.");
      return;
    }

    const { error } = await supabase
      .from("evaluation_scores")
      .upsert(
        {
          evaluation_id: evaluationId,
          skill_id: skillId,
          score: nextScore,
        },
        { onConflict: "evaluation_id,skill_id" },
      );

    if (error) {
      restorePreviousScore();
      clearDirty(rowIndex);
      setSaveMessage(`No se pudo guardar el puntaje: ${error.message}`);
      return;
    }

    clearDirty(rowIndex);
    setSaveMessage("Puntaje guardado en Supabase.");
  }

  function updateObservation(rowIndex, value) {
    setGradebook((current) => {
      const nextRows = [...current.rows];
      nextRows[rowIndex] = {
        ...nextRows[rowIndex],
        observations: value,
      };

      return { ...current, rows: nextRows };
    });
    markDirty(rowIndex);
  }

  function toggleChecklist(index) {
    setGradebook((current) => {
      const nextChecklist = [...current.checklist];
      nextChecklist[index] = {
        ...nextChecklist[index],
        done: !nextChecklist[index].done,
      };
      return { ...current, checklist: nextChecklist };
    });
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setUseMock(false);
    setHasLoadedRealData(false);
    setIsSigningIn(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setAuthError(error.message);
    }

    setIsSigningIn(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setGradebook(createInitialGradebook());
    setEvaluationIds({});
    setCurrentProfile(null);
    setAdminGroups([]);
    setSpecialties([]);
    setHasLoadedRealData(false);
    setDirtyRows(new Set());
    setSelectedRowIndex(0);
    setSaveMessage("Sin cambios pendientes.");
  }

  async function reloadCurrentSessionData() {
    setHasLoadedRealData(false);
    setSession((current) => (current ? { ...current } : current));
  }

  async function handleRegisterTeacher(event) {
    event.preventDefault();
    setAdminMessage("");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: teacherForm.authUserId,
      full_name: teacherForm.fullName,
      email: teacherForm.email,
      role: "profesor",
      is_active: true,
    });

    if (profileError) {
      setAdminMessage(`No se pudo registrar el profesor: ${profileError.message}`);
      return;
    }

    const { error: assignmentError } = await supabase.from("group_teachers").insert({
      group_id: teacherForm.groupId,
      teacher_profile_id: teacherForm.authUserId,
      is_primary: true,
    });

    if (assignmentError) {
      setAdminMessage(`Profesor creado, pero fallo la asignacion: ${assignmentError.message}`);
      return;
    }

    setTeacherForm({ ...emptyTeacherForm, groupId: teacherForm.groupId });
    setAdminMessage("Profesor registrado y asignado al grupo.");
    await reloadCurrentSessionData();
  }

  async function handleRegisterStudent(event) {
    event.preventDefault();
    setAdminMessage("");

    const selectedGroup = adminGroups.find((group) => group.id === studentForm.groupId);
    const specialtyId = selectedGroup?.specialty_id || gradebook.group.specialtyId;

    if (!specialtyId) {
      setAdminMessage("No se pudo determinar la especialidad del grupo.");
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        student_code: studentForm.studentCode,
        full_name: studentForm.fullName,
        email: studentForm.email,
        specialty_id: specialtyId,
        group_id: studentForm.groupId || gradebook.group.id,
      })
      .select("id")
      .single();

    if (studentError) {
      setAdminMessage(`No se pudo registrar el estudiante: ${studentError.message}`);
      return;
    }

    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .upsert(
        {
          full_name: studentForm.guardianName,
          email: studentForm.guardianEmail,
          phone: studentForm.guardianPhone || null,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    if (guardianError) {
      setAdminMessage(`Estudiante creado, pero fallo el encargado: ${guardianError.message}`);
      return;
    }

    const { error: linkError } = await supabase.from("student_guardians").insert({
      student_id: student.id,
      guardian_id: guardian.id,
      relationship: "Encargado",
      is_primary: true,
    });

    if (linkError) {
      setAdminMessage(`Estudiante y encargado creados, pero fallo el enlace: ${linkError.message}`);
      return;
    }

    setStudentForm({ ...emptyStudentForm, groupId: studentForm.groupId });
    setAdminMessage("Estudiante registrado correctamente.");
    await reloadCurrentSessionData();
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    setAdminMessage("");

    const { data: group, error: groupError } = await supabase
      .from("student_groups")
      .insert({
        code: groupForm.code,
        label: groupForm.label,
        school_year: Number(groupForm.schoolYear),
        specialty_id: groupForm.specialtyId,
        max_students: Number(groupForm.maxStudents),
      })
      .select("id")
      .single();

    if (groupError) {
      setAdminMessage(`No se pudo crear el grupo: ${groupError.message}`);
      return;
    }

    if (groupForm.teacherId) {
      const { error: assignmentError } = await supabase.from("group_teachers").insert({
        group_id: group.id,
        teacher_profile_id: groupForm.teacherId,
        is_primary: true,
      });

      if (assignmentError) {
        setAdminMessage(`Grupo creado, pero fallo la asignacion: ${assignmentError.message}`);
        return;
      }
    }

    setGroupForm({ ...emptyGroupForm, specialtyId: groupForm.specialtyId });
    setAdminMessage("Grupo creado correctamente.");
    await reloadCurrentSessionData();
  }

  async function handleDeleteStudent(studentId) {
    setAdminMessage("");

    const { error } = await supabase.from("students").delete().eq("id", studentId);

    if (error) {
      setAdminMessage(`No se pudo eliminar el estudiante: ${error.message}`);
      return;
    }

    setAdminMessage("Estudiante eliminado.");
    await reloadCurrentSessionData();
  }

  async function handleSave() {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.info("Bulk payload ready for Supabase upsert", savePayload);
    setDirtyRows(new Set());
    setSaveMessage(
      `Se preparo un lote de ${savePayload.length} evaluaciones para upsert en Supabase.`,
    );
    setIsSaving(false);
  }

  async function handleFinalize() {
    if (!allChecklistDone) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setGradebook((current) => ({
      ...current,
      stage: {
        ...current.stage,
        isLocked: true,
      },
    }));
    setDirtyRows(new Set());
    setSaveMessage(
      "Etapa cerrada. A partir de aqui la UI queda en solo lectura y se puede disparar el correo automatico.",
    );
    setIsSaving(false);
  }

  if (!isAuthReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Autenticacion
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">Revisando sesion...</h1>
        </section>
      </main>
    );
  }

  if (!session && !useMock) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-4 py-6">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Supabase Auth
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">Iniciar sesion</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="text-sm font-semibold" htmlFor="auth-email">
                Correo
              </label>
              <Input
                id="auth-email"
                type="email"
                value={authEmail}
                autoComplete="email"
                onChange={(event) => setAuthEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="auth-password">
                Contrasena
              </label>
              <Input
                id="auth-password"
                type="password"
                value={authPassword}
                autoComplete="current-password"
                onChange={(event) => setAuthPassword(event.target.value)}
                required
              />
            </div>
            {authError ? <p className="text-sm font-semibold text-destructive">{authError}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSigningIn}>
                {isSigningIn ? "Entrando..." : "Entrar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setUseMock(true)}>
                Usar mocks locales
              </Button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (!loadError && session && !useMock && (isLoading || !hasLoadedRealData)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cargando
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">Leyendo datos desde Supabase...</h1>
        </section>
      </main>
    );
  }

  if (loadError && !useMock) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-destructive">
            Error de lectura
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">No se pudieron cargar datos reales.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" variant="outline" onClick={() => setUseMock(true)}>
            Usar mocks locales
          </Button>
        </section>
      </main>
    );
  }

  if (currentProfile?.role === "orientadora" && !useMock) {
    return (
      <AdminView
        groups={adminGroups}
        profile={currentProfile}
        studentForm={studentForm}
        teacherForm={teacherForm}
        groupForm={groupForm}
        specialties={specialties}
        message={adminMessage}
        onStudentFormChange={setStudentForm}
        onTeacherFormChange={setTeacherForm}
        onGroupFormChange={setGroupForm}
        onRegisterStudent={handleRegisterStudent}
        onRegisterTeacher={handleRegisterTeacher}
        onCreateGroup={handleCreateGroup}
        onDeleteStudent={handleDeleteStudent}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
      <StageHeader
        group={gradebook.group}
        stage={gradebook.stage}
        dirtyCount={dirtyRows.size}
        allChecklistDone={allChecklistDone}
        onSave={handleSave}
        onFinalize={handleFinalize}
        disabled={gradebook.stage.isLocked}
        isSaving={isSaving}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <GradebookTable
          skills={gradebook.skills}
          rows={gradebook.rows}
          disabled={gradebook.stage.isLocked}
          selectedRowIndex={selectedRowIndex}
          onSelectRow={setSelectedRowIndex}
          onScoreChange={updateScore}
          onObservationChange={updateObservation}
        />
        <div className="space-y-6">
          <ChecklistPanel
            items={gradebook.checklist}
            disabled={gradebook.stage.isLocked}
            onToggle={toggleChecklist}
          />

          {selectedRow ? (
            <EvaluationPreview
              group={gradebook.group}
              stage={gradebook.stage}
              row={selectedRow}
              skills={gradebook.skills}
              disabled={gradebook.stage.isLocked}
            />
          ) : (
            <section className="surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Sin estudiantes
              </p>
              <h2 className="mt-1 text-lg font-bold">
                El grupo seleccionado no tiene estudiantes registrados.
              </h2>
            </section>
          )}

          <section className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Estado de integracion
            </p>
            <div className="mt-3 space-y-3">
              <Badge>{saveMessage}</Badge>
              <Badge tone="muted">
                {Object.keys(evaluationIds).length} evaluaciones vinculadas
              </Badge>
              {session?.user?.email ? <Badge tone="muted">{session.user.email}</Badge> : null}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              El payload masivo sigue disponible para conectar el `upsert` con Supabase cuando quieras.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(savePayload, null, 2))}
            >
              Copiar payload JSON
            </Button>
            {!useMock ? (
              <Button variant="ghost" size="sm" className="mt-4 ml-2" onClick={handleSignOut}>
                Cerrar sesion
              </Button>
            ) : null}
          </section>

          {!useMock ? (
            <RegisterStudentPanel
              groups={adminGroups}
              studentForm={{
                ...studentForm,
                groupId: studentForm.groupId || gradebook.group.id,
              }}
              message={adminMessage}
              onStudentFormChange={setStudentForm}
              onRegisterStudent={handleRegisterStudent}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function RegisterStudentPanel({
  groups,
  studentForm,
  message,
  onStudentFormChange,
  onRegisterStudent,
}) {
  return (
    <section className="surface p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Registro de alumno
      </p>
      <h2 className="mt-1 text-lg font-bold">Agregar estudiante al grupo</h2>
      <form className="mt-4 grid gap-3" onSubmit={onRegisterStudent}>
        <InputField label="Nombre" value={studentForm.fullName} onChange={(fullName) => onStudentFormChange((current) => ({ ...current, fullName }))} />
        <InputField label="Correo" type="email" value={studentForm.email} onChange={(email) => onStudentFormChange((current) => ({ ...current, email }))} />
        <InputField label="Codigo" value={studentForm.studentCode} onChange={(studentCode) => onStudentFormChange((current) => ({ ...current, studentCode }))} />
        <SelectField
          label="Grupo"
          value={studentForm.groupId}
          options={groups.map((group) => ({ value: group.id, label: group.label }))}
          onChange={(groupId) => onStudentFormChange((current) => ({ ...current, groupId }))}
        />
        <InputField label="Encargado" value={studentForm.guardianName} onChange={(guardianName) => onStudentFormChange((current) => ({ ...current, guardianName }))} />
        <InputField label="Correo encargado" type="email" value={studentForm.guardianEmail} onChange={(guardianEmail) => onStudentFormChange((current) => ({ ...current, guardianEmail }))} />
        <InputField label="Telefono encargado" value={studentForm.guardianPhone} onChange={(guardianPhone) => onStudentFormChange((current) => ({ ...current, guardianPhone }))} required={false} />
        {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
        <Button type="submit">Registrar alumno</Button>
      </form>
    </section>
  );
}

function AdminView({
  groups,
profile,
  studentForm,
  teacherForm,
  groupForm,
  specialties,
  message,
  onStudentFormChange,
  onTeacherFormChange,
  onGroupFormChange,
  onRegisterStudent,
  onRegisterTeacher,
  onCreateGroup,
  onDeleteStudent,
  onSignOut,
}) {
  const teacherOptions = groups
    .flatMap((group) => group.group_teachers ?? [])
    .map((assignment) => assignment.profiles)
    .filter(Boolean);
  const uniqueTeacherOptions = Array.from(
    new Map(teacherOptions.map((teacher) => [teacher.id, teacher])).values(),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-8">
      <section className="surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Vista admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Grupos y registros</h1>
            <p className="mt-2 text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <Button variant="outline" onClick={onSignOut}>Cerrar sesion</Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="surface overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-bold">Todos los grupos</h2>
          </div>
          <div className="divide-y">
            {groups.map((group) => (
              <div key={group.id} className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{group.label}</h3>
                  <Badge tone="muted">{group.specialties?.name}</Badge>
                  <Badge>{group.students?.length ?? 0} estudiantes</Badge>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {(group.students ?? []).map((student) => (
                    <div key={student.id} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                          <p className="text-xs text-muted-foreground">{student.student_code}</p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteStudent(student.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Nuevo grupo
            </p>
            <h2 className="mt-1 text-lg font-bold">Crear grupo</h2>
            <form className="mt-4 grid gap-3" onSubmit={onCreateGroup}>
              <InputField label="Codigo" value={groupForm.code} onChange={(code) => onGroupFormChange((current) => ({ ...current, code }))} />
              <InputField label="Nombre" value={groupForm.label} onChange={(label) => onGroupFormChange((current) => ({ ...current, label }))} />
              <SelectField
                label="Nivel"
                value={groupForm.schoolYear}
                options={[
                  { value: "11", label: "11" },
                  { value: "12", label: "12" },
                ]}
                onChange={(schoolYear) => onGroupFormChange((current) => ({ ...current, schoolYear }))}
              />
              <SelectField
                label="Especialidad"
                value={groupForm.specialtyId}
                options={specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }))}
                onChange={(specialtyId) => onGroupFormChange((current) => ({ ...current, specialtyId }))}
              />
              <InputField label="Maximo estudiantes" type="number" value={groupForm.maxStudents} onChange={(maxStudents) => onGroupFormChange((current) => ({ ...current, maxStudents }))} />
              <SelectField
                label="Profesor"
                value={groupForm.teacherId}
                required={false}
                options={uniqueTeacherOptions.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))}
                onChange={(teacherId) => onGroupFormChange((current) => ({ ...current, teacherId }))}
              />
              <Button type="submit">Crear grupo</Button>
            </form>
          </section>

          <section className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Registro de profesor
            </p>
            <h2 className="mt-1 text-lg font-bold">Asignar profesor a grupo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea primero el usuario en Supabase Auth y pega aqui su UUID.
            </p>
            <form className="mt-4 grid gap-3" onSubmit={onRegisterTeacher}>
              <InputField label="UUID Auth" value={teacherForm.authUserId} onChange={(authUserId) => onTeacherFormChange((current) => ({ ...current, authUserId }))} />
              <InputField label="Nombre" value={teacherForm.fullName} onChange={(fullName) => onTeacherFormChange((current) => ({ ...current, fullName }))} />
              <InputField label="Correo" type="email" value={teacherForm.email} onChange={(email) => onTeacherFormChange((current) => ({ ...current, email }))} />
              <SelectField
                label="Grupo"
                value={teacherForm.groupId}
                options={groups.map((group) => ({ value: group.id, label: group.label }))}
                onChange={(groupId) => onTeacherFormChange((current) => ({ ...current, groupId }))}
              />
              <Button type="submit">Registrar profesor</Button>
            </form>
          </section>

          <RegisterStudentPanel
            groups={groups}
            studentForm={studentForm}
            message={message}
            onStudentFormChange={onStudentFormChange}
            onRegisterStudent={onRegisterStudent}
          />
        </div>
      </div>
    </main>
  );
}

function InputField({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, required = true }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <select
        value={value}
        required={required}
        className="flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled={required}>Seleccione una opcion</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
