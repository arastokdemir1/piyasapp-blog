/* PiyasApp Blog — geri bildirim formu, Öneri Duvarı ve sayaç.
   Yalnız fetch: Supabase PostgREST RPC (cizgifikrim-website projesi). Kütüphane yok. Anahtar "publishable" (herkese açık, istemciye gömülebilir). */
(() => {
  "use strict";

  const PROD_API = "https://iekdktdhhryqewvcrnmr.supabase.co";
  const KEY = "sb_publishable_EzSoWFjrbPiwoBsK2h33vg_hzRGDy6a";
  /* Yalnız yerel önizleme için (localhost): ?dev_api=http://localhost:8788 sahte API'yi seçer. Canlıda hiçbir etkisi yok. */
  const API = (() => {
    try {
      if (location.hostname === "localhost") {
        const q = new URLSearchParams(location.search).get("dev_api");
        if (q) localStorage.setItem("piyasapp_dev_api", q);
        return localStorage.getItem("piyasapp_dev_api") || PROD_API;
      }
    } catch (_) {}
    return PROD_API;
  })();

  const HATALAR = {
    cok_sik: "Saatte en fazla 5 geri bildirim gönderebilirsin. Biraz sonra tekrar dene.",
    mesaj_kisa: "Mesaj en az 3 karakter olmalı.",
    mesaj_uzun: "Mesaj en fazla 2000 karakter olabilir.",
    ad_uzun: "Ad en fazla 40 karakter olabilir.",
    iletisim_uzun: "İletişim alanı en fazla 120 karakter olabilir.",
    cok_baglanti: "Mesajda en fazla 3 bağlantı olabilir.",
    gecersiz_tur: "Lütfen bir tür seç.",
    gecersiz_kaynak: "Bir şeyler ters gitti. Sayfayı yenileyip tekrar dene."
  };
  const GENEL_HATA = "Gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.";
  const TUR_AD = { oneri: "Öneri", hata: "Hata", begeni: "Beğeni", diger: "Diğer" };
  const DURUM_AD = { yeni: "Alındı", okundu: "Okundu", planlandi: "Planlandı", yapildi: "Yapıldı" };

  async function rpc(ad, govde) {
    const r = await fetch(`${API}/rest/v1/rpc/${ad}`, {
      method: "POST",
      headers: { "apikey": KEY, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(govde || {})
    });
    const metin = await r.text();
    let veri = null;
    try { veri = metin ? JSON.parse(metin) : null; } catch (_) {}
    if (!r.ok) {
      const e = new Error((veri && (veri.message || veri.hint)) || `http_${r.status}`);
      e.kod = veri && veri.message; e.durum = r.status; throw e;
    }
    return veri;
  }

  const $ = (id) => document.getElementById(id);
  const yaz = (el, s) => { if (el) el.textContent = s; };
  const sayi = (n) => new Intl.NumberFormat("tr-TR").format(Number(n) || 0);
  const tarih = (iso) => { try { return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); } catch (_) { return ""; } };

  /* ---------- Üst çubuk + belirme ---------- */
  const ust = $("ustcubuk");
  if (ust) { const k = () => ust.classList.toggle("kaydi", scrollY > 8); addEventListener("scroll", k, { passive: true }); k(); }
  const az = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gozcu = "IntersectionObserver" in window ? new IntersectionObserver((g) => g.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("gorundu"); gozcu.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }) : null;
  document.querySelectorAll(".belir").forEach((el) => (az || !gozcu) ? el.classList.add("gorundu") : gozcu.observe(el));

  /* ---------- Sayaç ---------- */
  async function sayaciYukle() {
    const kartlar = document.querySelectorAll("[data-sayac]");
    const satir = $("sayacSatir");
    if (!kartlar.length && !satir) return;
    try {
      const o = await rpc("piyasapp_geri_bildirim_ozet");
      const toplam = Number(o && o.toplam) || 0, yapildi = Number(o && o.yapildi) || 0, oneri = Number(o && o.oneri) || 0;
      kartlar.forEach((k) => { const v = k.dataset.sayac; yaz(k.querySelector("b"), sayi(v === "toplam" ? toplam : v === "oneri" ? oneri : yapildi)); });
      if (satir) {
        satir.textContent = "";
        if (toplam === 0) { satir.append("İlk öneriyi sen bırak."); }
        else {
          const a = document.createElement("b"); a.textContent = sayi(toplam);
          const b = document.createElement("b"); b.textContent = sayi(yapildi);
          satir.append(a, " geri bildirim geldi, ", b, "'si yapıldı");
        }
        satir.hidden = false;
      }
    } catch (_) {
      if (satir) satir.hidden = true;
      kartlar.forEach((k) => yaz(k.querySelector("b"), "—"));
    }
  }

  /* ---------- Öneri Duvarı ---------- */
  function notKarti(n) {
    const kart = document.createElement("article"); kart.className = "not";
    const ustSatir = document.createElement("div"); ustSatir.className = "not-ust";
    const tur = document.createElement("span"); tur.className = `etiket-tur ${n.tur || ""}`; tur.textContent = TUR_AD[n.tur] || "Diğer";
    ustSatir.append(tur);
    if (DURUM_AD[n.durum]) { const r = document.createElement("span"); r.className = `rozet ${n.durum}`; r.textContent = DURUM_AD[n.durum]; ustSatir.append(r); }
    const mesaj = document.createElement("p"); mesaj.className = "not-mesaj"; mesaj.textContent = n.mesaj || "";
    const alt = document.createElement("div"); alt.className = "not-alt";
    const ad = document.createElement("span"); ad.textContent = n.ad || "Anonim";
    const t = document.createElement("time"); t.textContent = tarih(n.created_at); if (n.created_at) t.dateTime = n.created_at;
    alt.append(ad, t);
    kart.append(ustSatir, mesaj);
    if (n.yanit) {
      const y = document.createElement("div"); y.className = "not-yanit";
      const b = document.createElement("b"); b.textContent = "PiyasApp ekibi";
      const s = document.createElement("span"); s.textContent = n.yanit;
      y.append(b, s); kart.append(y);
    }
    kart.append(alt);
    return kart;
  }
  async function duvariYukle() {
    const kap = $("duvar");
    if (!kap) return;
    const limit = Number(kap.dataset.limit) || 50;
    kap.setAttribute("aria-busy", "true");
    kap.textContent = "";
    for (let i = 0; i < 2; i++) { const s = document.createElement("div"); s.className = "iskelet"; kap.append(s); }
    try {
      const liste = await rpc("piyasapp_geri_bildirim_duvari", { p_limit: limit });
      kap.textContent = "";
      const duz = (Array.isArray(liste) ? liste : []).filter((n) => n && n.durum !== "reddedildi");
      if (!duz.length) {
        const bos = document.createElement("div"); bos.className = "bos";
        const b = document.createElement("b"); b.textContent = "Henüz duvarda öneri yok.";
        const p = document.createElement("p"); p.textContent = "İlk öneriyi sen bırak. Duvarda görünmesine izin verirsen, ekibin onayından sonra burada çıkar.";
        const a = document.createElement("a"); a.className = "dugme dugme-sari"; a.href = "/geri-bildirim/"; a.textContent = "Öneri bırak";
        bos.append(b, p, a); kap.append(bos);
      } else duz.forEach((n) => kap.append(notKarti(n)));
    } catch (_) {
      kap.textContent = "";
      const bos = document.createElement("div"); bos.className = "bos";
      const b = document.createElement("b"); b.textContent = "Duvar şu an yüklenemiyor.";
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "dugme dugme-hafif"; btn.textContent = "Tekrar dene";
      btn.addEventListener("click", duvariYukle);
      bos.append(b, btn); kap.append(bos);
    } finally { kap.removeAttribute("aria-busy"); }
  }

  /* ---------- Form ---------- */
  function formuKur() {
    const f = $("gbForm");
    if (!f) return;
    const mesaj = $("gbMesaj"), sayim = $("gbSayim"), ad = $("gbAd"), adKap = $("gbAdKap"), durum = $("gbDurum"), gonder = $("gbGonder"), bal = $("gbBal");
    const MAX = 2000;
    const guncelleSayim = () => { const n = mesaj.value.length; sayim.textContent = `${sayi(n)} / ${sayi(MAX)}`; sayim.classList.toggle("asti", n > MAX); };
    mesaj.addEventListener("input", guncelleSayim); guncelleSayim();
    const kimlikDegisti = () => { const adli = f.elements.kimlik.value === "ad"; adKap.hidden = !adli; ad.required = adli; if (!adli) ad.value = ""; };
    f.querySelectorAll('input[name="kimlik"]').forEach((r) => r.addEventListener("change", kimlikDegisti)); kimlikDegisti();
    const bildir = (tip, s) => { durum.className = `durum ${tip}`; durum.textContent = s; durum.setAttribute("role", tip === "hata" ? "alert" : "status"); };

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      durum.className = "durum"; durum.textContent = "";
      const m = mesaj.value.trim();
      if (m.length < 3) { bildir("hata", HATALAR.mesaj_kisa); mesaj.focus(); return; }
      if (m.length > MAX) { bildir("hata", HATALAR.mesaj_uzun); mesaj.focus(); return; }
      const adli = f.elements.kimlik.value === "ad";
      const adDeger = adli ? ad.value.trim() : "";
      if (adli && !adDeger) { bildir("hata", "Adını yaz ya da Anonim seç."); ad.focus(); return; }
      /* Bal küpü: botlar bu alanı doldurur; sessizce başarılı gibi davran, sunucuya gitme. */
      if (bal.value) { tamam(); return; }
      gonder.disabled = true; const eski = gonder.textContent; gonder.textContent = "Gönderiliyor…";
      try {
        await rpc("piyasapp_geri_bildirim_gonder", {
          p_kaynak: "web",
          p_tur: f.elements.tur.value,
          p_mesaj: m,
          p_ad: adDeger || null,
          p_iletisim: f.elements.iletisim.value.trim() || null,
          p_yayin_izni: !!f.elements.izin.checked,
          p_surum: null,
          p_cihaz: null
        });
        tamam();
      } catch (hata) {
        bildir("hata", HATALAR[hata.kod] || GENEL_HATA);
      } finally { gonder.disabled = false; gonder.textContent = eski; }
    });
    function tamam() {
      const kart = f.closest(".form-kart");
      kart.textContent = "";
      const k = document.createElement("div"); k.className = "tesekkur"; k.setAttribute("role", "status");
      k.innerHTML = '<div class="tik" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>';
      const h = document.createElement("h2"); h.textContent = "Teşekkürler.";
      const p = document.createElement("p"); p.textContent = "Önerin bize ulaştı. Ekip hepsini okur; duvarda görünmesine izin verdiysen onaydan sonra burada çıkar.";
      const a = document.createElement("a"); a.className = "dugme dugme-sari"; a.href = "/duvar/"; a.textContent = "Öneri Duvarı'na bak";
      k.append(h, p, a); kart.append(k); k.scrollIntoView({ block: "center", behavior: az ? "auto" : "smooth" });
      sayaciYukle();
    }
  }

  sayaciYukle(); duvariYukle(); formuKur();
})();
