import { useEffect, useMemo, useState } from "react";
import {
  Search, SlidersHorizontal, ArrowDownUp, House, Grid2X2, ShieldCheck, X,
  Plus, Pencil, Trash2, LogOut, Package, Layers, Palette, Upload,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { isConfigured, supabase } from "./supabase";

const defaultSettings = {
  site_name: "MURAT TINKIR", subtitle: "PARFÜM KOLEKSİYONU",
  background: "#F4F2ED", surface: "#FFFFFF", text: "#242321",
  muted: "#77736D", accent: "#B7B0A3", logo_url: "",
  show_prices: true, whatsapp: ""
};

const money = (value) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", maximumFractionDigits: 0
}).format(Number(value || 0));

function emptyProduct() {
  return {
    name: "", brand: "", category_id: "", description: "", notes: "",
    price: "", image_url: "", gender: "Unisex", concentration: "EDP",
    published: true
  };
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [sort, setSort] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [screen, setScreen] = useState("home");
  const [categoryName, setCategoryName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadPublicData();
    if (!isConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) checkAdmin(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) checkAdmin(next.user.id);
      else { setIsAdmin(false); setAdminOpen(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadPublicData() {
    if (!isConfigured) { setLoading(false); return; }
    try {
      const [{ data: p, error: pe }, { data: c, error: ce }, { data: s, error: se }] =
        await Promise.all([
          supabase.from("products").select("*, categories(name)")
            .eq("published", true).order("created_at", { ascending: false }),
          supabase.from("categories").select("*").order("name"),
          supabase.from("site_settings").select("key,value")
        ]);
      if (pe) throw pe;
      if (ce) throw ce;
      if (se) throw se;
      setProducts(p || []);
      setCategories(c || []);
      if (s?.length) {
        const merged = { ...defaultSettings };
        s.forEach(({ key, value }) => { if (key in merged) merged[key] = value; });
        setSettings(merged);
      }
    } catch (error) {
      setNotice("Veriler yüklenemedi: " + error.message);
    } finally { setLoading(false); }
  }

  async function checkAdmin(userId) {
    const { data, error } = await supabase.from("admin_users")
      .select("user_id").eq("user_id", userId).maybeSingle();
    setIsAdmin(!error && Boolean(data));
  }

  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => {
      const text = `${p.name || ""} ${p.brand || ""} ${p.description || ""}`;
      const matchesSearch = text.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"));
      const matchesCategory = category === "Tümü" ||
        p.categories?.name === category || p.brand === category;
      return matchesSearch && matchesCategory;
    });
    if (sort === "price-asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return list;
  }, [products, search, category, sort]);

  function goHome() {
    setScreen("home"); setCategory("Tümü"); setSearch(""); setFilterOpen(false);
    setSelectedProduct(null); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goCategories() {
    setScreen("categories"); setSelectedProduct(null); setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCategory(name) {
    setCategory(name); setSearch(""); setScreen("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProduct(p) {
    setSelectedProduct(p); setScreen("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email"), password: form.get("password")
    });
    setNotice(error ? error.message : "Giriş kontrol ediliyor...");
  }

  async function logout() {
    await supabase.auth.signOut(); setAdminOpen(false);
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!isAdmin) { setNotice("Bu işlem için yönetici yetkisi gerekiyor."); return; }
    const payload = {
      name: productForm.name.trim(), brand: productForm.brand.trim(),
      category_id: productForm.category_id || null, description: productForm.description,
      notes: productForm.notes, price: productForm.price === "" ? null : Number(productForm.price),
      image_url: productForm.image_url, gender: productForm.gender,
      concentration: productForm.concentration, published: productForm.published
    };
    const result = editing
      ? await supabase.from("products").update(payload).eq("id", editing)
      : await supabase.from("products").insert(payload);
    if (result.error) { setNotice(result.error.message); return; }
    setNotice(editing ? "Ürün güncellendi." : "Yeni ürün eklendi.");
    setEditing(null); setProductForm(emptyProduct()); await loadPublicData();
  }

  function editProduct(p) {
    setEditing(p.id);
    setProductForm({
      name: p.name || "", brand: p.brand || "", category_id: p.category_id || "",
      description: p.description || "", notes: p.notes || "", price: p.price ?? "",
      image_url: p.image_url || "", gender: p.gender || "Unisex",
      concentration: p.concentration || "EDP", published: p.published ?? true
    });
    setSelectedProduct(null); setScreen("home"); setTab("products"); setAdminOpen(true);
  }

  async function deleteProduct(id) {
    if (!isAdmin || !confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setNotice("Ürün silindi."); setSelectedProduct(null); setScreen("home");
    await loadPublicData();
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (!isAdmin || !categoryName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: categoryName.trim() });
    setNotice(error ? error.message : "Kategori oluşturuldu.");
    if (!error) { setCategoryName(""); await loadPublicData(); }
  }

  async function deleteCategory(id) {
    if (!isAdmin || !confirm("Kategoriyi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    setNotice(error ? error.message : "Kategori silindi.");
    if (!error) { setCategory("Tümü"); await loadPublicData(); }
  }

  async function saveSettings(e) {
    e.preventDefault(); if (!isAdmin) return;
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setNotice(error ? error.message : "Site ayarları kaydedildi.");
    if (!error) await loadPublicData();
  }

  async function uploadImage(file, target) {
    if (!file || !isAdmin) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("catalog-media").upload(path, file, { upsert: false });
    if (error) { setNotice(error.message); return; }
    const { data } = supabase.storage.from("catalog-media").getPublicUrl(path);
    if (target === "logo") setSettings(v => ({ ...v, logo_url: data.publicUrl }));
    else setProductForm(v => ({ ...v, image_url: data.publicUrl }));
    setNotice("Görsel yüklendi.");
  }

  const cssVars = {
    "--page": settings.background, "--surface": settings.surface,
    "--ink": settings.text, "--muted": settings.muted, "--accent": settings.accent
  };

  return (
    <div className="app" style={cssVars}>
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={goHome}>
          {settings.logo_url ? <img className="logo" src={settings.logo_url} alt="Logo"/> : <strong>{settings.site_name}</strong>}
          <span>{settings.subtitle}</span>
        </button>
        <button className="admin-link" onClick={() => setAdminOpen(true)} type="button" aria-label="Yönetici girişi">
          <ShieldCheck size={19}/><span>Yönetici Girişi</span>
        </button>
      </header>

      <main>
        {screen === "detail" && selectedProduct ? (
          <section className="detail-page">
            <button className="back-link" type="button" onClick={() => {
              setScreen("home"); setSelectedProduct(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}><ChevronLeft size={18}/> Kataloğa dön</button>
            <div className="detail-layout">
              <div className="detail-image-wrap">
                {selectedProduct.image_url
                  ? <img src={selectedProduct.image_url} alt={`${selectedProduct.brand} ${selectedProduct.name}`}/>
                  : <div className="image-placeholder">Ürün görseli</div>}
              </div>
              <div className="detail-copy">
                <div className="detail-brand">{selectedProduct.brand}</div>
                <h1>{selectedProduct.name}</h1>
                {settings.show_prices && selectedProduct.price != null &&
                  <div className="detail-price">{money(selectedProduct.price)}</div>}
                {selectedProduct.description && <p className="detail-description">{selectedProduct.description}</p>}
                <div className="detail-specs">
                  {selectedProduct.notes && <div><span>Koku notaları</span><p>{selectedProduct.notes}</p></div>}
                  <div><span>Cinsiyet</span><p>{selectedProduct.gender || "Unisex"}</p></div>
                  <div><span>Konsantrasyon</span><p>{selectedProduct.concentration || "EDP"}</p></div>
                </div>
                {isAdmin && <div className="detail-admin-actions">
                  <button type="button" onClick={() => editProduct(selectedProduct)}><Pencil size={16}/> Düzenle</button>
                  <button type="button" onClick={() => deleteProduct(selectedProduct.id)}><Trash2 size={16}/> Sil</button>
                </div>}
              </div>
            </div>
          </section>
        ) : screen === "categories" ? (
          <section className="categories-page">
            <div className="page-heading"><span>KOLEKSİYON</span><h1>Kategoriler</h1><p>Keşfetmek istediğiniz koleksiyonu seçin.</p></div>
            <div className="category-list">
              {categories.map(c => <button key={c.id} type="button" className="category-row" onClick={() => openCategory(c.name)}>
                <span>{c.name}</span><ChevronRight size={19}/>
              </button>)}
              {!categories.length && <p className="empty">Henüz kategori eklenmemiş.</p>}
            </div>
          </section>
        ) : (
          <>
            <section className="toolbar">
              <label className="search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Parfüm veya marka ara"/></label>
              <div className="toolbar-actions">
                <button type="button" onClick={() => setSort(sort === "price-asc" ? "price-desc" : sort === "price-desc" ? "newest" : "price-asc")}><ArrowDownUp size={17}/> Sırala</button>
                <button type="button" onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={17}/> Filtrele</button>
              </div>
            </section>
            {filterOpen && <section className="filter-panel">
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Tümü">Tüm kategoriler</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">En yeni</option><option value="name">İsme göre</option>
                <option value="price-asc">Fiyat: artan</option><option value="price-desc">Fiyat: azalan</option>
              </select>
            </section>}
            {category !== "Tümü" && <div className="active-category">
              <button type="button" onClick={() => setCategory("Tümü")}><ChevronLeft size={16}/> Tüm ürünler</button><span>{category}</span>
            </div>}
            {loading ? <div className="empty">Katalog yükleniyor...</div>
              : !isConfigured ? <div className="empty"><h2>Parfüm koleksiyonu</h2><p>Supabase bağlantısı yapılandırılmalıdır.</p></div>
              : visibleProducts.length ? <section className="product-grid">
                {visibleProducts.map(p => <article className="product-card" key={p.id}>
                  <button className="product-open" type="button" onClick={() => openProduct(p)}>
                    <div className="product-image">{p.image_url ? <img src={p.image_url} alt={`${p.brand} ${p.name}`} loading="lazy"/> : <div className="image-placeholder">Ürün görseli</div>}</div>
                    <div className="product-info"><div className="product-brand">{p.brand}</div><div className="product-name">{p.name}</div>
                      {settings.show_prices && p.price != null && <div className="product-price">{money(p.price)}</div>}
                    </div>
                  </button>
                  {isAdmin && <div className="product-admin-actions">
                    <button type="button" onClick={() => editProduct(p)}><Pencil size={16}/> Düzenle</button>
                    <button type="button" onClick={() => deleteProduct(p.id)}><Trash2 size={16}/> Sil</button>
                  </div>}
                </article>)}
              </section> : <div className="empty"><h2>Henüz ürün bulunamadı</h2><p>Farklı bir kategori veya arama deneyin.</p></div>}
          </>
        )}
      </main>

      <footer className="bottom-nav">
        <button className={screen === "home" ? "active" : ""} type="button" onClick={goHome}><House/><span>Ana Sayfa</span></button>
        <button className={screen === "categories" ? "active" : ""} type="button" onClick={goCategories}><Grid2X2/><span>Kategoriler</span></button>
      </footer>

      {adminOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAdminOpen(false); }}>
        <section className="admin-modal">
          <button className="close-button" onClick={() => setAdminOpen(false)} type="button"><X/></button>
          {!session ? <div className="login-box">
            <h2>Yönetici Girişi</h2><p>Yönetim paneline erişmek için giriş yapın.</p>
            {!isConfigured ? <div className="notice">Önce Supabase bağlantısı yapılandırılmalıdır.</div> :
              <form onSubmit={login} className="stack">
                <input name="email" type="email" placeholder="E-posta" required/>
                <input name="password" type="password" placeholder="Şifre" required/>
                <button className="primary">Giriş Yap</button>
              </form>}
            {notice && <p className="notice">{notice}</p>}
          </div> : !isAdmin ? <div className="login-box">
            <h2>Yetki kontrolü</h2><p>Bu hesap yönetici olarak tanımlanmamış.</p>
            <button onClick={logout} className="secondary" type="button">Çıkış Yap</button>
          </div> : <div className="admin-layout">
            <aside className="admin-sidebar">
              <h2>Yönetim</h2>
              <button className={tab === "products" ? "chosen" : ""} onClick={() => setTab("products")} type="button"><Package/> Ürünler</button>
              <button className={tab === "categories" ? "chosen" : ""} onClick={() => setTab("categories")} type="button"><Layers/> Kategoriler</button>
              <button className={tab === "design" ? "chosen" : ""} onClick={() => setTab("design")} type="button"><Palette/> Tasarım</button>
              <button className="logout" onClick={logout} type="button"><LogOut/> Çıkış</button>
            </aside>
            <div className="admin-content">
              {tab === "products" && <section>
                <div className="admin-heading"><div><h2>Ürün Yönetimi</h2><p>Ürün ekleyin, düzenleyin veya kaldırın.</p></div>
                  <button className="primary small" type="button" onClick={() => {setEditing(null);setProductForm(emptyProduct());}}><Plus size={16}/> Yeni ürün</button>
                </div>
                <form className="admin-form" onSubmit={saveProduct}>
                  <input placeholder="Ürün adı" value={productForm.name} onChange={e => setProductForm(v => ({...v,name:e.target.value}))} required/>
                  <input placeholder="Marka" value={productForm.brand} onChange={e => setProductForm(v => ({...v,brand:e.target.value}))}/>
                  <select value={productForm.category_id} onChange={e => setProductForm(v => ({...v,category_id:e.target.value}))}>
                    <option value="">Kategori seçin</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
                  </select>
                  <input type="number" min="0" step="1" placeholder="Fiyat (TL)" value={productForm.price} onChange={e => setProductForm(v => ({...v,price:e.target.value}))}/>
                  <input placeholder="Ürün görseli URL" value={productForm.image_url} onChange={e => setProductForm(v => ({...v,image_url:e.target.value}))}/>
                  <label className="upload"><Upload size={16}/> Görsel yükle<input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0],"product")}/></label>
                  <input placeholder="Koku notaları" value={productForm.notes} onChange={e => setProductForm(v => ({...v,notes:e.target.value}))}/>
                  <textarea placeholder="Ürün açıklaması" value={productForm.description} onChange={e => setProductForm(v => ({...v,description:e.target.value}))}/>
                  <div className="form-row">
                    <select value={productForm.gender} onChange={e => setProductForm(v => ({...v,gender:e.target.value}))}><option>Unisex</option><option>Erkek</option><option>Kadın</option></select>
                    <select value={productForm.concentration} onChange={e => setProductForm(v => ({...v,concentration:e.target.value}))}><option>EDT</option><option>EDP</option><option>Parfum</option><option>Extrait</option></select>
                  </div>
                  <label className="check"><input type="checkbox" checked={productForm.published} onChange={e => setProductForm(v => ({...v,published:e.target.checked}))}/> Yayında</label>
                  <button className="primary">{editing ? "Değişiklikleri Kaydet" : "Ürünü Ekle"}</button>
                  {editing && <button type="button" className="secondary" onClick={() => {setEditing(null);setProductForm(emptyProduct());}}>Düzenlemeyi iptal et</button>}
                </form>
                <div className="admin-list">{products.map(p => <div className="admin-row" key={p.id}>
                  <div><b>{p.brand} — {p.name}</b><small>{p.price ? money(p.price) : "Fiyat belirtilmedi"}</small></div>
                  <button type="button" onClick={() => editProduct(p)} aria-label="Ürünü düzenle"><Pencil/></button>
                  <button type="button" onClick={() => deleteProduct(p.id)} aria-label="Ürünü sil"><Trash2/></button>
                </div>)}</div>
              </section>}
              {tab === "categories" && <section>
                <h2>Kategori Yönetimi</h2><p>Marka veya koleksiyon kategorileri oluşturun.</p>
                <form className="inline-form" onSubmit={saveCategory}>
                  <input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Yeni kategori adı"/>
                  <button className="primary"><Plus/> Ekle</button>
                </form>
                {categories.map(c => <div className="admin-row" key={c.id}><b>{c.name}</b><button type="button" onClick={() => deleteCategory(c.id)}><Trash2/></button></div>)}
              </section>}
              {tab === "design" && <section>
                <h2>Site ve Tasarım Ayarları</h2><p>Değişiklikler kaydedildiğinde katalogda uygulanır.</p>
                <form className="admin-form" onSubmit={saveSettings}>
                  <label>Site adı<input value={settings.site_name} onChange={e => setSettings(v => ({...v,site_name:e.target.value}))}/></label>
                  <label>Alt başlık<input value={settings.subtitle} onChange={e => setSettings(v => ({...v,subtitle:e.target.value}))}/></label>
                  <label>Logo URL<input value={settings.logo_url} onChange={e => setSettings(v => ({...v,logo_url:e.target.value}))}/></label>
                  <label className="upload"><Upload/> Logo yükle<input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0],"logo")}/></label>
                  <button type="button" className="secondary" onClick={() => setSettings(v => ({...v,logo_url:""}))}>Logoyu kaldır</button>
                  <div className="color-grid">{[["Arka plan","background"],["Kart rengi","surface"],["Yazı rengi","text"],["İkincil yazı","muted"],["Vurgu","accent"]].map(([label,key]) => <label key={key}>{label}<input type="color" value={settings[key]} onChange={e => setSettings(v => ({...v,[key]:e.target.value}))}/></label>)}</div>
                  <label className="check"><input type="checkbox" checked={settings.show_prices} onChange={e => setSettings(v => ({...v,show_prices:e.target.checked}))}/> Fiyatları ziyaretçilere göster</label>
                  <label>WhatsApp numarası<input value={settings.whatsapp} onChange={e => setSettings(v => ({...v,whatsapp:e.target.value}))} placeholder="905xxxxxxxxx"/></label>
                  <button className="primary">Ayarları Kaydet</button>
                </form>
              </section>}
              {notice && <div className="notice">{notice}</div>}
            </div>
          </div>}
        </section>
      </div>}
    </div>
  );
}
