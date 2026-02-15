import { useEffect, useMemo, useState } from "react";

type UseTypewriterOptions = {
  text: string;
  typeMs?: number;
  deleteMs?: number;
  typeJitterMs?: number;
  deleteJitterMs?: number;
  spacePauseMs?: number;
  punctuationPauseMs?: number;
  pauseAfterTypeMs?: number;
  pauseAfterDeleteMs?: number;
  loop?: boolean;
  startDelayMs?: number;
};

type TypewriterPhase = "typing" | "pausingAfterType" | "deleting" | "pausingAfterDelete";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    onChange();
    // Safari support
    if ("addEventListener" in mql) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if ("removeEventListener" in mql) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return reduced;
}

function nonLinearRandom01() {
  // Bias toward smaller values, with occasional larger pauses.
  const r = Math.random();
  return r * r;
}

function randomInt(min: number, max: number) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return Math.floor(lo + (hi - lo + 1) * Math.random());
}

function randomPause(maxMs: number) {
  if (!maxMs || maxMs <= 0) return 0;
  return Math.round(nonLinearRandom01() * maxMs);
}

function isPunctuation(ch: string) {
  return ch === "." || ch === "," || ch === "!" || ch === "?" || ch === ":" || ch === ";";
}

export function useTypewriter({
  text,
  typeMs = 55,
  deleteMs = 35,
  typeJitterMs = 0,
  deleteJitterMs = 0,
  spacePauseMs = 0,
  punctuationPauseMs = 0,
  pauseAfterTypeMs = 900,
  pauseAfterDeleteMs = 450,
  loop = true,
  startDelayMs = 200,
}: UseTypewriterOptions) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [output, setOutput] = useState("");
  const [phase, setPhase] = useState<TypewriterPhase>("typing");
  const [started, setStarted] = useState(startDelayMs === 0);

  const fullText = useMemo(() => text ?? "", [text]);

  useEffect(() => {
    setOutput("");
    setPhase("typing");
    setStarted(startDelayMs === 0);
  }, [fullText, startDelayMs]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setOutput(fullText);
      return;
    }
    if (started) return;
    const t = window.setTimeout(() => setStarted(true), startDelayMs);
    return () => window.clearTimeout(t);
  }, [prefersReducedMotion, started, startDelayMs, fullText]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!started) return;

    const atFull = output.length >= fullText.length;
    const atEmpty = output.length === 0;

    const nextCharWhenTyping = fullText[output.length] ?? "";
    const charBeingDeleted = fullText[output.length - 1] ?? "";

    let delay = typeMs;
    if (phase === "typing") {
      delay = typeMs;
      delay += randomInt(-Math.floor(typeJitterMs / 2), typeJitterMs);
      if (nextCharWhenTyping === " ") delay += randomPause(spacePauseMs);
      if (isPunctuation(nextCharWhenTyping)) delay += randomPause(punctuationPauseMs);
    }
    if (phase === "deleting") {
      delay = deleteMs;
      delay += randomInt(-Math.floor(deleteJitterMs / 2), deleteJitterMs);
      if (charBeingDeleted === " ") delay += randomPause(Math.round(spacePauseMs * 0.6));
      if (isPunctuation(charBeingDeleted)) delay += randomPause(Math.round(punctuationPauseMs * 0.6));
    }
    if (phase === "pausingAfterType") delay = pauseAfterTypeMs;
    if (phase === "pausingAfterDelete") delay = pauseAfterDeleteMs;

    delay = Math.max(0, delay);

    const t = window.setTimeout(() => {
      if (phase === "typing") {
        if (atFull) {
          setPhase("pausingAfterType");
        } else {
          setOutput(fullText.slice(0, output.length + 1));
        }
        return;
      }

      if (phase === "pausingAfterType") {
        if (!loop) return;
        setPhase("deleting");
        return;
      }

      if (phase === "deleting") {
        if (atEmpty) {
          setPhase("pausingAfterDelete");
        } else {
          setOutput(fullText.slice(0, Math.max(0, output.length - 1)));
        }
        return;
      }

      // pausingAfterDelete
      setPhase("typing");
    }, delay);

    return () => window.clearTimeout(t);
  }, [
    prefersReducedMotion,
    started,
    phase,
    output,
    fullText,
    typeMs,
    deleteMs,
    typeJitterMs,
    deleteJitterMs,
    spacePauseMs,
    punctuationPauseMs,
    pauseAfterTypeMs,
    pauseAfterDeleteMs,
    loop,
  ]);

  const isIdle = prefersReducedMotion || !started || phase === "pausingAfterType" || phase === "pausingAfterDelete";
  const shouldBlinkCaret = !prefersReducedMotion && (!started || phase === "pausingAfterType");

  return { text: output, phase, isIdle, shouldBlinkCaret, prefersReducedMotion };
}

