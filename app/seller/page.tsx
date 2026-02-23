"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { Header } from "@/components/Header";
import {
  asErrorMessage,
  cancelDraft,
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

function flattenCategories(nodes: CategoryNode[], level = 0): Array<{ id: number; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"  ".repeat(level)}${node.name}` },
    ...flattenCategories(node.children, level + 1),
  ]);
}

export default function SellerPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR">("USD");

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SellerDraft | null>(null);
  const [form, setForm] = useState<DraftFormState>({
    name: "",
    description: "",
    currency: "USD",
    price: "",
    categoryId: "",
  });

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [canceling, setCanceling] = useState(false);
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
    setReloading(true);
    try {
      const loaded = await getDraft(id);
      setDraft(loaded);
      fillForm(loaded);
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setReloading(false);
    }
  }, [fillForm]);

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

  async function onCreateDraft() {
    if (creating) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createDraft();
      setDraftId(created.draftId);
      await refreshDraft(created.draftId);
      setMessage(`Draft #${created.draftId} created`);
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function onSaveDraft() {
    if (!draftId || saving) return;
    const categoryId = Number(form.categoryId);
    if (!form.name.trim() || !form.description.trim() || !form.price.trim() || Number.isNaN(categoryId)) {
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
        price: form.price.trim(),
        categoryId,
      });
      setDraft(updated);
      fillForm(updated);
      setMessage(`Draft saved. Status: ${updated.status}`);
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
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setPublishing(false);
    }
  }

  async function onCancel() {
    if (!draftId || canceling) return;
    setCanceling(true);
    setError(null);
    setMessage(null);
    try {
      await cancelDraft(draftId);
      await refreshDraft(draftId);
      setMessage("Draft canceled");
    } catch (e) {
      setError(asErrorMessage(e));
    } finally {
      setCanceling(false);
    }
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
                    Click once to create a draft, then fill fields and publish.
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
              {draftId ? (
                <div className="badge">Draft ID: {draftId}</div>
              ) : null}
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
                    <div className="text-base font-semibold">Draft details</div>
                    <div className="text-xs text-zinc-400">
                      Status: <span className="text-zinc-200">{draft?.status ?? "unknown"}</span>
                    </div>
                  </div>
                  <button className="btn" onClick={() => refreshDraft(draftId)} disabled={reloading}>
                    {reloading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Reload
                  </button>
                </div>

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
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
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
                  <button className="btn btn-primary" onClick={onSaveDraft} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save draft
                  </button>
                  <button className="btn" onClick={onPublish} disabled={publishing}>
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Publish
                  </button>
                  <button className="btn" onClick={onCancel} disabled={canceling}>
                    {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Cancel
                  </button>
                </div>

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
                          <div className="relative h-40 w-full overflow-hidden rounded-lg">
                            <Image src={img.image} alt={`Draft image ${img.position}`} fill className="object-cover" />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs text-zinc-400">Position: {img.position}</div>
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
