"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";
import { Toast, type ToastKind } from "./Toast";
import { asErrorMessage, authenticate, sendCode } from "@/lib/api";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { readAuth, writeAuth } from "@/lib/storage";

type Step = "send" | "verify" | "done";

export function AuthModal({
  open,
  onClose,
  onAuthChanged,
}: {
  open: boolean;
  onClose: () => void;
  onAuthChanged: () => void;
}) {
  const [step, setStep] = useState<Step>("send");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<{ open: boolean; kind: ToastKind; message: string }>({
    open: false,
    kind: "info",
    message: "",
  });

  const isAuthed = useMemo(() => !!readAuth()?.accessToken, [open]);

  useEffect(() => {
    if (!open) return;
    setStep(isAuthed ? "done" : "send");
    setCode("");
    setBusy(false);
    setCooldown(0);
  }, [open, isAuthed]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function onSendCode() {
    setBusy(true);
    try {
      const recaptchaResponse = await getRecaptchaToken("send_code");
      const res = await sendCode({ email, recaptchaResponse });
      setCooldown(res.cooldownSeconds ?? 60);
      setStep("verify");
      setToast({ open: true, kind: "success", message: "Code sent to your email. Enter it below." });
    } catch (e) {
      setToast({ open: true, kind: "error", message: asErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (!code.trim()) {
      setToast({ open: true, kind: "error", message: "Enter the code from the email." });
      return;
    }
    setBusy(true);
    try {
      const recaptchaResponse = await getRecaptchaToken("authenticate");
      const res = await authenticate({ email, code: code.trim(), recaptchaResponse });
      writeAuth(res);
      setStep("done");
      onAuthChanged();
      setToast({ open: true, kind: "success", message: "All set! You're signed in." });
    } catch (e) {
      setToast({ open: true, kind: "error", message: asErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={open} title="Sign in" onClose={onClose}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (step === "send") {
              void onSendCode();
            } else if (step === "verify") {
              void onVerify();
            }
          }}
        >
          <label className="block card p-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-[var(--ink)]">Email</span>
            </div>

            <div className="mt-2">
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="mt-2 text-xs text-[var(--muted)]">
              Enter your email and press "Send code".
            </div>
          </label>


          {step === "send" && (
            <button className="btn btn-primary w-full" type="submit" disabled={busy || cooldown > 0}>
              <ShieldCheck className="h-4 w-4" />
              {cooldown > 0 ? `Wait ${cooldown}s` : busy ? "Sending..." : "Send code"}
            </button>
          )}

          {step === "verify" && (
            <div className="space-y-3">
              <label className="block">
                <div className="text-xs text-[var(--muted)] mb-1">Code from email</div>
                <input
                  className="input"
                  placeholder="e.g. 684179"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>

              <div className="flex gap-2">
                <button className="btn w-1/2" type="button" onClick={onSendCode} disabled={busy || cooldown > 0}>
                  {cooldown > 0 ? `Retry in ${cooldown}s` : "Send again"}
                </button>
                <button className="btn btn-primary w-1/2" type="submit" disabled={busy}>
                  {busy ? "Verifying..." : "Sign in"}
                </button>
              </div>

              <div className="text-xs text-[var(--muted)]">
                If the email didn't arrive, check spam and wait a minute.
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Toast
        open={toast.open}
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </>
  );
}
