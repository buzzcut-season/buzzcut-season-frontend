"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import {
  asErrorMessage,
  confirmDraftImage,
  createDraft,
  deleteDraftImage,
  getCategoryTree,
  getDraft,
  presignDraftImage,
  publishDraft,
  updateDraft,
  uploadFileToPresignedUrl,
} from "@/lib/api";
import { readAuth } from "@/lib/storage";
import type { CategoryNode, SellerDraft } from "@/lib/types";

type DraftFormState = {
  name: string;
  description: string;
  currency: string;
  price: string;
  categoryId: string;
};

const EMPTY_FORM: DraftFormState = {
  name: "",
  description: "",
  currency: "USD",
  price: "",
  categoryId: "",
};

const DRAFT_FORM_STORAGE_PREFIX = "buzzcut.seller.draftForm";

function flattenCategories(nodes: CategoryNode[], level = 0): Array<{ id: number; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"  ".repeat(level)}${node.name}` },
    ...flattenCategories(node.children, level + 1),
  ]);
}

function normalizePrice(value: string): string | null {
  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

function draftFormStorageKey(draftId: number): string {
  return `${DRAFT_FORM_STORAGE_PREFIX}.${draftId}`;
}

function readDraftFormState(draftId: number): DraftFormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftFormStorageKey(draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftFormState>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.currency !== "string" ||
      typeof parsed.price !== "string" ||
      typeof parsed.categoryId !== "string"
    ) {
      return null;
    }
    return {
      name: parsed.name,
      description: parsed.description,
      currency: parsed.currency,
      price: parsed.price,
      categoryId: parsed.categoryId,
    };
  } catch {
    return null;
  }
}

function writeDraftFormState(draftId: number, form: DraftFormState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(draftFormStorageKey(draftId), JSON.stringify(form));
}

type SellerPageClientProps = {
  initialDraftId?: number | null;
};

export function SellerPageClient({ initialDraftId = null }: SellerPageClientProps) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("USD");

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<number | null>(initialDraftId);
  const [step, setStep] = useState<"details" | "images">("details");
  const [draft, setDraft] = useState<SellerDraft | null>(null);
  const [form, setForm] = useState<DraftFormState>(EMPTY_FORM);
  const [orderIdInput, setOrderIdInput] = useState("");

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  const refreshAuth = useCallback(() => {
    setIsAuthed(!!readAuth()?.accessToken);
  }, []);

  const fillForm = useCallback((nextDraft: SellerDraft) => {
    setForm({
      name: nextDraft.name ?? "",
      description: nextDraft.description ?? "",
      currency: nextDraft.currency ?? "USD",
      price: nextDraft.price ?? "",
      categoryId: nextDraft.categoryId ? String(nextDraft.categoryId) : "",
    });
  }, []);

  const refreshDraft = useCallback(async (id: number) => {
    try {
      const loaded = await getDraft(id);
      setDraft(loaded);
      const storedForm = readDraftFormState(id);
      if (storedForm) {
        setForm(storedForm);
      } else {
        fillForm(loaded);
      }
    } catch (e) {
      setError(asErrorMessage(e));
    }
  }, [fillForm]);

  useEffect(() => {
    setDraftId(initialDraftId);
    setStep("details");
    setDraft(null);
    setMessage(null);
    setError(null);
  }, [initialDraftId]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (isAuthed && authOpen) {
      setAuthOpen(false);
    }
  }, [isAuthed, authOpen]);

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await getCategoryTree();
        setCategories(res.categories ?? []);
      } catch (e) {
        setCategoriesError(asErrorMessage(e));
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!draftId) {
      setForm(EMPTY_FORM);
      return;
    }
    const storedForm = readDraftFormState(draftId);
    if (storedForm) {
      setForm(storedForm);
    }
  }, [draftId]);

  useEffect(() => {
    if (!draftId) return;
    writeDraftFormState(draftId, form);
  }, [draftId, form]);

  useEffect(() => {
    if (!isAuthed || !draftId) return;
    void refreshDraft(draftId);
  }, [isAuthed, draftId, refreshDraft]);

  useEffect(() => {
    if (!isAuthed || !draftId || step !== "images") return;
    void refreshDraft(draftId);
  }, [isAuthed, draftId, step, refreshDraft]);

  async function onCreateDraft() {
    if (creating) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createDraft();
      setDraftId(created.draftId);
      setStep("details");
      router.push(`/seller/${created.draftId}`);
      await refreshDraft(created.draftId);
      setMessage("Draft created");
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function onNext() {
    if (!draftId || saving) return;
    const categoryId = Number(form.categoryId);
    const normalizedPrice = normalizePrice(form.price);
    if (!form.name.trim() || !form.description.trim() || !normalizedPrice || Number.isNaN(categoryId)) {
      setError("Fill all fields: name, description, price, category");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateDraft(draftId, {
        name: form.name.trim(),
        description: form.description.trim(),
        currency: form.currency,
        price: normalizedPrice,
        categoryId,
      });
      setDraft(updated);
      fillForm(updated);
      setForm((prev) => ({ ...prev, price: normalizedPrice }));
      setStep("images");
      setMessage(`Details saved. Status: ${updated.status}`);
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onUploadImages(files: FileList | null) {
    if (!draftId || !files?.length || uploading) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        const presigned = await presignDraftImage(draftId, {
          fileName: file.name,
          sizeBytes: file.size,
        });
        await uploadFileToPresignedUrl(presigned.uploadUrl, file);
        await confirmDraftImage(draftId, { token: presigned.token });
      }
      await refreshDraft(draftId);
      setMessage("Images uploaded");
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function onDeleteImage(position: number) {
    if (!draftId) return;
    setError(null);
    setMessage(null);
    try {
      await deleteDraftImage(draftId, position);
      await refreshDraft(draftId);
      setMessage(`Image #${position} removed`);
    } catch (e) {
      setError(asErrorMessage(e));
    }
  }

  async function onPublish() {
    if (!draftId || publishing) return;
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await publishDraft(draftId);
      setMessage(`Published. Product ID: ${res.productId}`);
      await refreshDraft(draftId);
      router.push("/");
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setPublishing(false);
    }
  }

  function onOpenSellerOrder() {
    const orderId = Number(orderIdInput);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setError("Enter valid Order ID");
      return;
    }
    setError(null);
    router.push(`/seller/orders/${orderId}`);
  }

  return (
    <main className="min-h-screen pb-16">
      <Header
        onOpenAuth={() => setAuthOpen(true)}
        onAuthChanged={refreshAuth}
        isAuthed={isAuthed}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <section className="mx-auto max-w-4xl px-4 mt-8 space-y-4">
        <div className="text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-200 transition">Marketplace</Link> / Seller
          {draftId ? ` / ${draftId}` : ""}
        </div>

        {!isAuthed ? (
          <div className="card p-6 space-y-3">
            <div className="text-lg font-semibold">Seller Studio</div>
            <div className="text-sm text-zinc-300">Sign in with a SELLER account to create and publish products.</div>
            <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          </div>
        ) : (
          <>
            <div className="card card-accent p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Create Product Draft</div>
                  <div className="text-sm text-zinc-300">
                    Click once to create a draft. Step 1: fill details. Step 2: upload images and publish.
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={onCreateDraft}
                  disabled={creating}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creating ? "Creating..." : "Create product"}
                </button>
              </div>
            </div>

            <div className="card p-6 space-y-3">
              <div className="text-lg font-semibold">Seller Orders</div>
              <div className="text-sm text-zinc-300">
                Open order chat as seller by order ID.
              </div>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Order ID"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                />
                <button className="btn btn-primary" type="button" onClick={onOpenSellerOrder}>
                  Open order
                </button>
              </div>
            </div>

            {error ? (
              <div className="card p-4 border-red-500/25 bg-red-500/5 text-sm text-red-200">{error}</div>
            ) : null}
            {message ? (
              <div className="card p-4 border-emerald-500/25 bg-emerald-500/5 text-sm text-emerald-200">{message}</div>
            ) : null}

            {draftId ? (
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base font-semibold">
                      {step === "details" ? "Step 1 of 2: Product details" : "Step 2 of 2: Images and publish"}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Status: <span className="text-zinc-200">{draft?.status ?? "unknown"}</span>
                    </div>
                  </div>
                </div>

                {step === "details" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-zinc-300">Name</label>
                        <input
                          className="input mt-1"
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-zinc-300">Description</label>
                        <textarea
                          className="input mt-1 min-h-[90px]"
                          value={form.description}
                          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-300">Currency</label>
                        <select
                          className="input mt-1"
                          value={form.currency}
                          onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="RUB">RUB</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-300">Price</label>
                        <input
                          className="input mt-1"
                          placeholder="799.99"
                          value={form.price}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, price: e.target.value.replace(",", ".") }))
                          }
                          onBlur={() => {
                            const normalized = normalizePrice(form.price);
                            if (normalized) {
                              setForm((prev) => ({ ...prev, price: normalized }));
                            }
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-zinc-300">Category</label>
                        <select
                          className="input mt-1"
                          value={form.categoryId}
                          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                          disabled={categoriesLoading || !!categoriesError}
                        >
                          <option value="">Select category</option>
                          {categoryOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        {categoriesLoading ? <div className="text-xs text-zinc-400 mt-1">Loading categories...</div> : null}
                        {categoriesError ? <div className="text-xs text-red-300 mt-1">{categoriesError}</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-primary" onClick={onNext} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Images</div>
                      <label className="btn cursor-pointer w-fit">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {uploading ? "Uploading..." : "Upload images"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            void onUploadImages(e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      {draft?.images?.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {draft.images.map((img) => (
                            <div key={img.position} className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#0b0a10]">
                                <div
                                  className="absolute inset-0 scale-[1.15] blur-xl opacity-50"
                                  style={{
                                    backgroundImage: `url(${img.image})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    WebkitMaskImage:
                                      "radial-gradient(85% 85% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                                    maskImage:
                                      "radial-gradient(85% 85% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                                  }}
                                  aria-hidden
                                />
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    background:
                                      "radial-gradient(90% 90% at 50% 50%, rgba(11,10,16,0) 0%, rgba(11,10,16,0.55) 70%, rgba(11,10,16,0.95) 100%)",
                                  }}
                                  aria-hidden
                                />
                                <Image
                                  src={img.image}
                                  alt={`Draft image ${img.position}`}
                                  fill
                                  unoptimized
                                  className="object-contain scale-[1.01]"
                                  style={{
                                    WebkitMaskImage:
                                      "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)",
                                    maskImage:
                                      "radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)",
                                  }}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="text-xs text-zinc-400">Image</div>
                                <button className="btn px-2 py-1 text-xs" onClick={() => onDeleteImage(img.position)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-400">No images yet</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="btn" onClick={() => setStep("details")}>
                        Back
                      </button>
                      <button className="btn btn-primary" onClick={onPublish} disabled={publishing}>
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Publish
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthChanged={refreshAuth}
      />
    </main>
  );
}
