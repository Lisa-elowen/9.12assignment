"use client";

import { useEffect, useState } from "react";
import { Home } from "@/components/Home";
import { Setup } from "@/components/Setup";
import { Interview } from "@/components/Interview";
import { Report } from "@/components/Report";
import { Mode, Persona, Scenario, Session, Turn } from "@/lib/types";
import { computeReport } from "@/lib/analysis";
import { loadSessions, saveSession } from "@/lib/store";

type Step = "home" | "setup" | "interview" | "report";

export default function Page() {
  const [step, setStep] = useState<Step>("home");
  const [scenario, setScenario] = useState<Scenario>("intern");
  const [mode, setMode] = useState<Mode>("pressure");
  const [persona, setPersona] = useState<Persona>("pro");
  const [resume, setResume] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const refreshSessions = () => setSessions(loadSessions());

  const start = (s: Scenario, m: Mode, p: Persona, r: string) => {
    setScenario(s);
    setMode(m);
    setPersona(p);
    setResume(r);
    setSession(null);
    setStep("interview");
  };

  const finish = (turns: Turn[], usedAI: boolean) => {
    const report = computeReport(turns);
    const s: Session = {
      id: String(Date.now()),
      at: Date.now(),
      scenario,
      mode,
      persona,
      resume,
      turns,
      report,
      usedAI,
    };
    saveSession(s);
    setSession(s);
    refreshSessions();
    setStep("report");
  };

  const viewSession = (s: Session) => {
    setScenario(s.scenario);
    setMode(s.mode);
    setSession(s);
    setStep("report");
  };

  if (step === "home") {
    return (
      <Home
        sessions={sessions}
        onStart={() => setStep("setup")}
        onViewSession={viewSession}
      />
    );
  }

  if (step === "setup") {
    return <Setup onStart={start} onBack={() => setStep("home")} />;
  }

  if (step === "interview") {
    return (
      <Interview
        scenario={scenario}
        mode={mode}
        persona={persona}
        resume={resume}
        onFinish={finish}
        onQuit={() => setStep("home")}
      />
    );
  }

  if (session) {
    return (
      <Report
        scenario={session.scenario}
        mode={session.mode}
        turns={session.turns}
        report={session.report}
        usedAI={session.usedAI}
        onRestart={() => setStep("setup")}
        onHome={() => {
          setStep("home");
          refreshSessions();
        }}
      />
    );
  }

  return null;
}
