import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateLocalFeedback, normalizeFeedback } from "@/features/ai-feedback/utils/feedbackEngine";

export function useAiFeedback({ row, skills, stage, useMock }) {
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  const studentId = row?.student?.id;
  const stageId = stage?.id;

  useEffect(() => {
    let ignore = false;

    async function loadFeedback() {
      setFeedback(null);
      setMessage("");
      setIsFallback(false);

      if (!studentId || !stageId || useMock || !supabase) {
        setStatus("idle");
        return;
      }

      setStatus("loading");

      const { data, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .eq("student_id", studentId)
        .eq("stage_id", stageId)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        setStatus("error");
        setMessage(`No se pudo consultar retroalimentacion: ${error.message}`);
        return;
      }

      setFeedback(normalizeFeedback(data));
      setStatus("idle");
    }

    loadFeedback();

    return () => {
      ignore = true;
    };
  }, [stageId, studentId, useMock]);

  const generateFeedback = useCallback(async () => {
    if (!row || !skills.length) {
      setStatus("error");
      setMessage("No hay datos suficientes para generar retroalimentacion.");
      return;
    }

    setStatus("generating");
    setMessage("");
    setIsFallback(false);

    if (useMock || !supabase || !studentId || !stageId) {
      setFeedback(generateLocalFeedback({ row, skills }));
      setIsFallback(true);
      setMessage("Vista de demostracion generada localmente; no se guardo en Supabase.");
      setStatus("idle");
      return;
    }

    const { data, error } = await supabase.functions.invoke("ai-feedback-assistant", {
      body: { studentId, stageId },
    });

    if (error || data?.error) {
      setFeedback(generateLocalFeedback({ row, skills }));
      setIsFallback(true);
      setMessage(
        `No se pudo usar la Edge Function. Se genero una vista local: ${
          data?.error || error?.message || "funcion no disponible"
        }`,
      );
      setStatus("idle");
      return;
    }

    setFeedback(normalizeFeedback(data.feedback));
    setMessage("Retroalimentacion generada y guardada en Supabase.");
    setStatus("idle");
  }, [row, skills, stageId, studentId, useMock]);

  return {
    feedback,
    status,
    message,
    isFallback,
    generateFeedback,
  };
}
