"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Save, UserRound } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { ApiHttpError, asErrorMessage, getAccountMe, updateAccountMe } from "@/lib/api";
import {
  clearAccountProfile,
  readAccountProfile,
  readAuth,
  writeAccountProfile,
} from "@/lib/storage";
import type { AccountGender, AccountMe } from "@/lib/types";

type CurrencyCode = "RUB" | "USD" | "EUR";

type ProfileForm = {
  nickname: string;
  birthDate: string;
  gender: "" | AccountGender;
};

function toFormState(account: AccountMe): ProfileForm {
  return {
    nickname: account.nickname,
    birthDate: account.birthDate ?? "",
    gender: account.gender ?? "",
  };
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProfilePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(() => !!readAuth()?.accessToken);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const [profile, setProfile] = useState<AccountMe | null>(null);
  const [form, setForm] = useState<ProfileForm>({ nickname: "", birthDate: "", gender: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; kind: "success" | "error" }>({
    open: false,
    message: "",
    kind: "success",
  });

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [authOpen, isAuthed]);

  useEffect(() => {
    if (!isAuthed) {
      setLoading(false);
      setProfile(null);
      setError(null);
      clearAccountProfile();
      return;
    }

    const cached = readAccountProfile();
    if (cached) {
      setProfile(cached);
      setForm(toFormState(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setError(null);
        const account = await getAccountMe();
        if (cancelled) return;
        setProfile(account);
        setForm(toFormState(account));
        writeAccountProfile(account);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiHttpError && (err.status === 401 || err.status === 403)) {
          refreshAuth();
          return;
        }
        setError(asErrorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthed, refreshAuth]);

  const validationError = useMemo(() => {
    const nickname = form.nickname.trim();
    if (!nickname) return "Nickname is required.";
    if (nickname.length > 50) return "Nickname must be 50 characters or less.";
    if (form.birthDate && form.birthDate > getTodayIsoDate()) return "Birth date cannot be in the future.";
    return null;
  }, [form.birthDate, form.nickname]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.nickname !== profile.nickname ||
      form.birthDate !== (profile.birthDate ?? "") ||
      form.gender !== (profile.gender ?? "")
    );
  }, [form.birthDate, form.gender, form.nickname, profile]);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!profile || saving || validationError) return;

      try {
        setSaving(true);
        setError(null);
        const updated = await updateAccountMe({
          nickname: form.nickname.trim(),
          birthDate: form.birthDate || null,
          gender: form.gender || null,
        });
        setProfile(updated);
        setForm(toFormState(updated));
        writeAccountProfile(updated);
        setToast({
          open: true,
          kind: "success",
          message: "Profile updated.",
        });
      } catch (err) {
        const message = asErrorMessage(err);
        setError(message);
        setToast({
          open: true,
          kind: "error",
          message,
        });
      } finally {
        setSaving(false);
      }
    },
    [form.birthDate, form.gender, form.nickname, profile, saving, validationError],
  );

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="relative mx-auto mt-8 max-w-4xl px-4">
        <div className="pointer-events-none absolute left-[-10px] top-10 h-56 w-56 rounded-full bg-pink-500/10 blur-[110px]" />
        <div className="pointer-events-none absolute right-0 top-32 h-64 w-64 rounded-full bg-violet-500/10 blur-[120px]" />

        {!isAuthed ? (
          <section className="card p-6 text-sm text-zinc-300">
            Sign in to view and edit your profile.
          </section>
        ) : loading ? (
          <section className="card p-6">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile...
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.85fr,1.15fr]">
            <section className="card overflow-hidden p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/30 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <UserRound className="h-6 w-6 text-pink-300" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-zinc-300/70">Account</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-50">{profile?.nickname ?? "Profile"}</div>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Email</div>
                  <div className="mt-1 break-all text-zinc-100">{profile?.email ?? "Unknown"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Account ID</div>
                  <div className="mt-1 text-zinc-100">#{profile?.id ?? "?"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Public name</div>
                  <div className="mt-1 text-zinc-100">{profile?.nickname ?? "Unknown"}</div>
                </div>
              </div>
            </section>

            <section className="card overflow-hidden p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
              <div className="text-sm uppercase tracking-[0.18em] text-zinc-300/80">Edit profile</div>
              <div className="mt-2 text-sm text-zinc-400">
                Nickname is required. Birth date and gender are optional.
              </div>

              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                <div>
                  <label className="text-sm font-medium text-zinc-200" htmlFor="nickname">
                    Nickname
                  </label>
                  <input
                    id="nickname"
                    className="input mt-2"
                    value={form.nickname}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue.length <= 50) {
                        setForm((prev) => ({ ...prev, nickname: nextValue }));
                      }
                    }}
                    maxLength={50}
                    placeholder="BraveFalcon4821"
                    required
                  />
                  <div className="mt-2 text-right text-xs text-zinc-500">{form.nickname.length}/50</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-200" htmlFor="birth-date">
                    Birth date
                  </label>
                  <input
                    id="birth-date"
                    className="input mt-2"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    max={getTodayIsoDate()}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-200" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="input mt-2"
                    value={form.gender}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        gender: event.target.value as ProfileForm["gender"],
                      }))
                    }
                  >
                    <option value="">Not specified</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                {validationError ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-200">
                    {validationError}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  className="btn btn-primary w-full"
                  type="submit"
                  disabled={saving || !hasChanges || !!validationError}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save profile
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>
        )}
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthChanged={refreshAuth} />
      <Toast
        open={toast.open}
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </main>
  );
}
