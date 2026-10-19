'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './products.module.css';

type ImportProduct = {
  code: string; name: string; description: string; category: string;
  retail_price: number; wholesale_price: number; image_url: string | null;
  active: boolean; variants: Array<{size:string;color:string;stock:number;sku:string|null}>;
};
type ImportResult = { created: number; skipped: number; failed: string[] };
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
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const [importPreview, setImportPreview] = useState<ImportProduct[] | null>(null);
  const [importProgress, setImportProgress] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadImage(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Solo JPG, PNG o WebP'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('La imagen supera los 10 MB'); return; }
    setError(''); setSuccess(''); setUploading(true);
    try {
      const body = new FormData(); body.append('file', file);
      const response = await fetch('/api/admin/images', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || typeof result.path !== 'string') throw new Error(typeof result.error === 'string' ? result.error : 'No se pudo subir la imagen');
      setForm(previous => ({ ...previous, image_url: result.path }));
      setSuccess('Imagen subida correctamente. Guardá el producto para asociarla.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Error al subir la imagen'); }
    finally { setUploading(false); }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || uploading) return;
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


  async function previewExcel(file: File) {
    setError(''); setSuccess(''); setImportPreview(null); setImportResult(null);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Seleccioná un archivo .xlsx');
      if (file.size > 5 * 1024 * 1024) throw new Error('El Excel supera los 5 MB');
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false});
      const productSheet = book.Sheets['Productos'];
      const variantSheet = book.Sheets['Variantes y stock'];
      if (!productSheet || !variantSheet) throw new Error('El archivo debe contener las hojas «Productos» y «Variantes y stock».');
      const productRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(productSheet, {defval:''});
      const variantRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(variantSheet, {defval:''});
      if (!productRows.length || productRows.length > 500) throw new Error('Se admiten entre 1 y 500 productos.');
      const str = (v:unknown) => String(v ?? '').trim();
      const number = (v:unknown) => Number(v);
      const grouped = new Map<string, ImportProduct>();
      for (const [index,row] of productRows.entries()) {
        const code=str(row['Código']);
        const name=str(row['Producto']);
        const category=str(row['Categoría']);
        const price=number(row['Precio (ARS)']);
        if (!code || !name || !category || !Number.isFinite(price) || price < 0) throw new Error(`Producto en fila ${index+2}: código, nombre, categoría o precio inválidos.`);
        if (grouped.has(code.toLowerCase())) throw new Error(`Código duplicado en el Excel: ${code}`);
        const activeText=str(row['Activo']).toLowerCase();
        if (activeText && !['true','false','verdadero','falso','1','0','sí','si','no'].includes(activeText)) throw new Error(`Estado activo inválido en ${code}`);
        grouped.set(code.toLowerCase(),{
          code,name,category,description:str(row['Descripción']),
          retail_price:price,wholesale_price:price,
          image_url:str(row['URL imagen']) || null,
          active:!['false','falso','0','no'].includes(activeText),
          variants:[]
        });
      }
      const allSkus=new Set<string>();
      const variantKeys=new Map<string,Set<string>>();
      for (const [index,row] of variantRows.entries()) {
        const code=str(row['Código producto']);
        const product=grouped.get(code.toLowerCase());
        if (!product) throw new Error(`Variante en fila ${index+2}: el producto ${code} no existe en la hoja Productos.`);
        const size=str(row['Talle']),color=str(row['Color']),sku=str(row['SKU variante']);
        const stock=number(row['Stock']);
        if (!size || !color || !Number.isSafeInteger(stock) || stock<0) throw new Error(`Variante en fila ${index+2}: talle, color o stock inválidos.`);
        const key=`${size.toLowerCase()}|${color.toLowerCase()}`;
        const keys=variantKeys.get(code.toLowerCase()) ?? new Set<string>();
        if (keys.has(key)) throw new Error(`Variante repetida en ${code}: ${color}/${size}`);
        keys.add(key); variantKeys.set(code.toLowerCase(),keys);
        if (sku && allSkus.has(sku.toLowerCase())) throw new Error(`SKU repetido: ${sku}`);
        if (sku) allSkus.add(sku.toLowerCase());
        product.variants.push({size,color,stock,sku:sku||null});
      }
      if ([...grouped.values()].some(p=>p.variants.length===0)) throw new Error('Todos los productos deben tener al menos una variante.');
      setImportPreview([...grouped.values()]);
} catch (e) {
  console.error('[VALENKA] Error al leer Excel:', e);
  setError(
    e instanceof Error
      ? `${e.name}: ${e.message}`
      : `Error al leer Excel: ${String(e)}`
  );
}  }

  async function importExcel() {
    if (!importPreview || busy) return;
    setBusy(true); setError(''); setImportResult(null);
    const result:ImportResult={created:0,skipped:0,failed:[]};
    try {
      // Consultar nuevamente para evitar duplicados, incluso si la vista previa quedó abierta.
      const response=await fetch('/api/admin/products',{cache:'no-store'});
      const body=await response.json();
      if (!response.ok) throw new Error(typeof body.error==='string'?body.error:'No se pudo verificar el catálogo');
      const existing=new Set<string>((body.data||[]).map((p:Product)=>p.code.toLowerCase()));
      for (const [index,p] of importPreview.entries()) {
        setImportProgress(`${index+1} de ${importPreview.length}: ${p.name}`);
        if (existing.has(p.code.toLowerCase())) {result.skipped++;continue;}
        try {
          const r=await fetch('/api/admin/products',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({...p,subcategory:'',brand:'Valenka'})
          });
          const b=await r.json().catch(()=>({}));
          if (!r.ok) {
            if (r.status===409) {result.skipped++;continue;}
            throw new Error(typeof b.error==='string'?b.error:`Error HTTP ${r.status}`);
          }
          result.created++; existing.add(p.code.toLowerCase());
        } catch (e) {result.failed.push(`${p.code}: ${e instanceof Error?e.message:'Error desconocido'}`);}
      }
      setImportResult(result);
      setImportPreview(null);
      await load();
      setSuccess(`Importación finalizada: ${result.created} creados, ${result.skipped} omitidos, ${result.failed.length} errores.`);
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo iniciar la importación');}
    finally {setBusy(false);setImportProgress('');}
  }

  const shown = products.filter(p => `${p.name} ${p.code}`.toLowerCase().includes(q.toLowerCase()));

  return <main className={styles.products}>
    <header className={styles.pageHeader}>
      <div><h1>Productos</h1><p>Administrá el catálogo, los precios y la disponibilidad.</p></div>
      <div className={styles.importHeaderActions}>
        <span className={styles.headerCount}>{products.length} productos registrados</span>
        <input ref={importInputRef} type="file" accept=".xlsx" className={styles.importFileInput}
          aria-label="Seleccionar Excel de productos" disabled={busy}
          onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(f)void previewExcel(f);}}/>
        <button className={styles.buttonSecondary} type="button" disabled={busy}
          onClick={()=>importInputRef.current?.click()}>Importar productos desde Excel</button>
      </div>
    </header>

    {importPreview && <section className={styles.panel} aria-label="Vista previa de importación">
      <div className={styles.panelHeader}><div><h2>Vista previa del Excel</h2>
        <p>{importPreview.length} productos · {importPreview.reduce((n,p)=>n+p.variants.length,0)} variantes.
        Los códigos existentes se omitirán. El precio mayorista será igual al minorista hasta que lo edites.</p></div></div>
      <div className={styles.importPreviewList}>{importPreview.slice(0,8).map(p=>
        <p key={p.code}><strong>{p.code}</strong> · {p.name} · {p.variants.length} variantes</p>)}
        {importPreview.length>8 && <p>Y {importPreview.length-8} productos más…</p>}</div>
      <div className={styles.importButtons}>
        <button className={styles.buttonPrimary} type="button" disabled={busy} onClick={()=>void importExcel()}>
          {busy ? `Importando… ${importProgress}` : 'Confirmar importación'}</button>
        <button className={styles.buttonSecondary} type="button" disabled={busy} onClick={()=>setImportPreview(null)}>Cancelar</button>
      </div>
      <p className={styles.hint}>La creación se realiza producto por producto. Si se interrumpe, podés importar de nuevo: se omiten los códigos ya creados.</p>
    </section>}
    {importResult && importResult.failed.length>0 && <section className={styles.panel}>
      <h2>Errores de importación</h2>
      {importResult.failed.map((e,i)=><p key={i} className={styles.alertError}>{e}</p>)}
    </section>}
    <section ref={formRef} className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><h2>{editingId ? `Editar producto · ${form.code}` : 'Nuevo producto'}</h2><p>Información general y configuración del producto</p></div>
        {editingId && <button className={styles.buttonSecondary} type="button" disabled={busy || uploading} onClick={reset}>Cancelar edición</button>}
      </div>
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.formGrid}>
          {(Object.keys(labels) as Array<keyof typeof labels>).map(k => <label key={k} className={styles.field}>
            <span>{labels[k]}</span>
            <input className={styles.input} required={['code', 'name', 'category', 'retail_price', 'wholesale_price'].includes(k)}
              type={k.includes('price') ? 'number' : 'text'} min={k.includes('price') ? 0 : undefined}
              step={k.includes('price') ? '0.01' : undefined} value={form[k]}
              onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
          </label>)}
        </div>
        <label className={styles.field}><span>Descripción</span>
          <textarea className={styles.textarea} rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </label>
        <div className={styles.field}>
          <span>Imagen principal <span className={styles.optional}>(opcional)</span></span>
          <div className={styles.imageUploader}>
            {form.image_url && <img className={styles.imagePreview} src={form.image_url} alt="Vista previa del producto" />}
            <div className={styles.imageUploadControls}>
              <label className={styles.uploadButton}>
                {uploading ? 'Subiendo imagen…' : form.image_url ? 'Cambiar imagen' : 'Seleccionar imagen'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || uploading}
                  onChange={e => { const file = e.currentTarget.files?.[0]; if (file) void uploadImage(file); e.currentTarget.value = ''; }} />
              </label>
              <small>JPG, PNG o WebP · hasta 10 MB</small>
              {form.image_url && <button className={styles.buttonTextDanger} type="button" disabled={busy || uploading}
                onClick={() => setForm(previous => ({ ...previous, image_url: '' }))}>Quitar imagen</button>}
            </div>
          </div>
        </div>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
          <span>Producto activo <small>Visible en el catálogo de la tienda</small></span>
        </label>

        <div className={styles.subsectionHeader}><h3>Variantes y stock</h3><p>Combinaciones de talle, color y disponibilidad</p></div>
        <p className={styles.hint}>Al quitar una variante existente durante la edición, se conserva en la base de datos con stock 0.</p>
        <div className={styles.variantList}>
          {variants.map((v, i) => <div key={i} className={styles.variantCard}>
            <div className={styles.variantHeading}><span>Variante {i + 1}</span><button className={styles.buttonTextDanger} type="button" disabled={busy || uploading} onClick={() => setVariants(p => p.filter((_, j) => j !== i))}>Quitar variante</button></div>
            <div className={styles.variantGrid}>
              {(Object.keys(variantLabels) as Array<keyof Variant>).map(k => <label key={k} className={styles.field}>
                <span>{variantLabels[k]}</span>
                <input className={styles.input} type={k === 'stock' ? 'number' : 'text'} min={k === 'stock' ? 0 : undefined}
                  required={k === 'size' || k === 'color'} value={v[k] ?? ''}
                  onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, [k]: k === 'stock' ? Number(e.target.value) : e.target.value } : x))} />
              </label>)}
            </div>
          </div>)}
        </div>
        <button className={styles.buttonSecondary} type="button" disabled={busy || uploading} onClick={() => setVariants(p => [...p, emptyVariant()])}>+ Agregar variante</button>
        <div className={styles.formActions}>
          <button className={styles.buttonPrimary} disabled={busy || uploading} type="submit">
            {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </section>

    {error && <p role="alert" className={styles.alertError}>{error}</p>}
    {success && <p role="status" className={styles.alertSuccess}>{success}</p>}

    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><h2>Productos cargados <span className={styles.countBadge}>{products.length}</span></h2><p>Consultá y administrá los productos existentes</p></div>
        <input className={`${styles.input} ${styles.searchInput}`} aria-label="Buscar productos" placeholder="Buscar por nombre o código" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className={styles.tableScroll}><table className={styles.table}>
        <thead><tr>{['Código', 'Nombre', 'Categoría', 'Minorista', 'Mayorista', 'Stock', 'Estado', 'Acciones'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{shown.map(p => <tr key={p.id}>
          <td className={styles.codeCell}>{p.code}</td><td className={styles.nameCell}>{p.name}</td><td>{p.category}</td>
          <td className={styles.numberCell}>${Number(p.retail_price).toLocaleString('es-AR')}</td>
          <td className={styles.numberCell}>${Number(p.wholesale_price).toLocaleString('es-AR')}</td>
          <td className={styles.numberCell}>{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
          <td><span className={p.active ? styles.statusActive : styles.statusInactive}>{p.active ? 'Activo' : 'Inactivo'}</span></td>
          <td><div className={styles.rowActions}>
            <button className={styles.buttonTable} type="button" disabled={busy || uploading} onClick={() => edit(p)}>Editar</button>
            {p.active && <button className={styles.buttonTableDanger} type="button" disabled={busy || uploading} onClick={() => void removeProduct(p)}>Eliminar</button>}
          </div></td>
        </tr>)}
        {shown.length === 0 && <tr><td colSpan={8} className={styles.emptyState}>No se encontraron productos.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </main>;
}
