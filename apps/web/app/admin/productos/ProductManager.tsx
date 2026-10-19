'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';

type Variant = { size: string; color: string; stock: number; sku: string | null };
type Product = {
  id: string; code: string; name: string; description: string | null;
  category: string; subcategory: string | null; brand: string | null;
  retail_price: string; wholesale_price: string; image_url: string | null;
  active: boolean; variants: Variant[];
};
type FormState = {
  code: string; name: string; description: string; category: string;
  subcategory: string; brand: string; retail_price: string;
  wholesale_price: string; image_url: string; active: boolean;
};
const field: CSSProperties = { padding: 10, border: '1px solid #cbbfc4', borderRadius: 9, width: '100%', background: '#fff', color: '#33252b' };
const initial: FormState = { code: '', name: '', description: '', category: 'Conjuntos', subcategory: '', brand: '', retail_price: '', wholesale_price: '', image_url: '', active: true };
const emptyVariant = (): Variant => ({ size: '', color: '', stock: 0, sku: null });
const labels: Record<Exclude<keyof FormState, 'description' | 'image_url' | 'active'>, string> = {
  code: 'Código', name: 'Nombre', category: 'Categoría', subcategory: 'Subcategoría',
  brand: 'Marca', retail_price: 'Precio minorista', wholesale_price: 'Precio mayorista'
};
const variantLabels = { size: 'Talle', color: 'Color', stock: 'Stock', sku: 'SKU (opcional)' };

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(initial);
  const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLElement>(null);

  async function load() {
    try {
      const r = await fetch('/api/admin/products', { cache: 'no-store' });
      const b = await r.json();
      if (!r.ok) throw new Error(typeof b.error === 'string' ? b.error : 'No se pudo cargar');
      setProducts(b.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos');
    }
  }
  useEffect(() => { void load(); }, []);

  function reset() {
    setEditingId(null);
    setForm(initial);
    setVariants([emptyVariant()]);
    setError('');
  }
  function edit(product: Product) {
    setEditingId(product.id);
    setForm({
      code: product.code, name: product.name, description: product.description || '',
      category: product.category, subcategory: product.subcategory || '', brand: product.brand || '',
      retail_price: String(product.retail_price), wholesale_price: String(product.wholesale_price),
      image_url: product.image_url || '', active: product.active
    });
    setVariants(product.variants.map(v => ({ ...v })));
    setError('');
    setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (variants.some(v => !v.size.trim() || !v.color.trim())) throw new Error('Completá talle y color de cada variante');
      const keys = variants.map(v => `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`);
      if (new Set(keys).size !== keys.length) throw new Error('Hay variantes con talle y color repetidos');
      const payload = {
        ...form,
        image_url: form.image_url.trim() || null,
        retail_price: Number(form.retail_price), wholesale_price: Number(form.wholesale_price),
        variants: variants.map(v => ({ ...v, size: v.size.trim(), color: v.color.trim(), sku: v.sku?.trim() || null }))
      };
      const editing = Boolean(editingId);
      const r = await fetch(editing ? `/api/admin/products/${editingId}` : '/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const b = await r.json();
      if (!r.ok) throw new Error(typeof b.error === 'string' ? b.error : 'No se pudo guardar el producto');
      reset();
      setSuccess(`Producto ${payload.code} ${editing ? 'actualizado' : 'creado'} correctamente`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setBusy(false); }
  }
  async function removeProduct(product: Product) {
    if (busy || !product.active) return;
    const confirmed = window.confirm(
      `¿Querés eliminar «${product.name}» (${product.code}) del catálogo?\n\nNo se borrará de PostgreSQL: quedará inactivo y podrás reactivarlo desde Editar.`
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE'
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`El servidor devolvió una respuesta inesperada (${response.status}). Revisá que exista la ruta DELETE.`);
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'No se pudo eliminar el producto');
      }
      if (editingId === product.id) reset();
      await load();
      setSuccess(`Producto ${product.code} eliminado del catálogo. Podés reactivarlo desde Editar.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar el producto');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }
  const shown = products.filter(p => `${p.name} ${p.code}`.toLowerCase().includes(q.toLowerCase()));

  return <main style={{ maxWidth: 1150, margin: '0 auto', padding: '32px 20px', color: '#33252b' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div><Link href="/catalogo">← Ver tienda</Link><h1 style={{ fontSize: 32, marginTop: 12 }}>Administrar productos</h1><p>Inventario y catálogo en PostgreSQL</p></div>
      <button type="button" onClick={logout} style={{ ...field, width: 'auto' }}>Cerrar sesión</button>
    </header>
    <section ref={formRef} style={{ marginTop: 28, background: '#fff8fa', border: '1px solid #eadce1', borderRadius: 18, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>{editingId ? `Editar producto: ${form.code}` : 'Nuevo producto'}</h2>
        {editingId && <button type="button" disabled={busy} onClick={reset}>Cancelar edición</button>}
      </div>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {(Object.keys(labels) as Array<keyof typeof labels>).map(k => <label key={k} style={{ display: 'grid', gap: 6 }}>
            <span>{labels[k]}</span>
            <input style={field} required={['code', 'name', 'category', 'retail_price', 'wholesale_price'].includes(k)}
              type={k.includes('price') ? 'number' : 'text'} min={k.includes('price') ? 0 : undefined}
              step={k.includes('price') ? '0.01' : undefined} value={form[k]}
              onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
          </label>)}
        </div>
        <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>Descripción
          <textarea style={field} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </label>
        <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>URL de imagen (opcional)
          <input style={field} value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
          Producto activo (visible en el catálogo)
        </label>
        <h3 style={{ margin: '20px 0 10px' }}>Variantes (talle, color y stock)</h3>
        <p style={{ fontSize: 13, marginBottom: 12 }}>Si quitás una variante existente al editar, se conservará en la base de datos con stock 0.</p>
        {variants.map((v, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 10 }}>
          {(Object.keys(variantLabels) as Array<keyof Variant>).map(k => <label key={k} style={{ display: 'grid', gap: 4 }}>
            <span>{variantLabels[k]}</span>
            <input style={field} type={k === 'stock' ? 'number' : 'text'} min={k === 'stock' ? 0 : undefined}
              required={k === 'size' || k === 'color'} value={v[k] ?? ''}
              onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, [k]: k === 'stock' ? Number(e.target.value) : e.target.value } : x))} />
          </label>)}
          <button type="button" disabled={busy} onClick={() => setVariants(p => p.filter((_, j) => j !== i))}>Quitar variante</button>
        </div>)}
        <button type="button" disabled={busy} onClick={() => setVariants(p => [...p, emptyVariant()])}>+ Agregar variante</button>
        <div style={{ marginTop: 20 }}>
          <button disabled={busy} type="submit" style={{ background: '#632e42', color: 'white', borderRadius: 10, padding: '12px 22px' }}>
            {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </section>
    {error && <p role="alert" style={{ color: '#a12626', marginTop: 12 }}>{error}</p>}
    {success && <p role="status" style={{ color: '#276b45', marginTop: 12 }}>{success}</p>}
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 22 }}>Productos cargados ({products.length})</h2>
      <input style={{ ...field, maxWidth: 420, margin: '12px 0' }} placeholder="Buscar nombre o código" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead><tr>{['Código', 'Nombre', 'Categoría', 'Minorista', 'Mayorista', 'Stock', 'Estado', 'Acción'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid #ddd' }}>{h}</th>)}</tr></thead>
        <tbody>{shown.map(p => <tr key={p.id}>
          <td style={{ padding: 12 }}>{p.code}</td><td style={{ padding: 12 }}>{p.name}</td><td style={{ padding: 12 }}>{p.category}</td>
          <td style={{ padding: 12 }}>${Number(p.retail_price).toLocaleString('es-AR')}</td>
          <td style={{ padding: 12 }}>${Number(p.wholesale_price).toLocaleString('es-AR')}</td>
          <td style={{ padding: 12 }}>{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
          <td style={{ padding: 12 }}>{p.active ? 'Activo' : 'Inactivo'}</td>
          <td style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" disabled={busy} onClick={() => edit(p)}>Editar</button>
              {p.active && <button type="button" disabled={busy} onClick={() => void removeProduct(p)}
                style={{ color: '#a12626', border: '1px solid #a12626', padding: '6px 10px', borderRadius: 8, background: '#fff' }}>
                Eliminar
              </button>}
            </div>
          </td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}
