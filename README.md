# Murat Tınkır Parfüm Kataloğu

Mobil öncelikli, kırık beyaz ve nötr tonlarda parfüm katalog başlangıç projesi.

## Önemli URL kuralı
Netlify'da her seferinde **aynı mevcut siteye** deploy yapın. Yeni site oluşturmayın ve Netlify site adını değiştirmeyin. Böylece `https://SITE-ADI.netlify.app` adresi aynı kalır. ZIP'in güncellenmesi URL'yi değiştirmez; yeni bir Netlify sitesi açılması değiştirebilir.

## 1. Supabase kurulumu
1. Supabase'de yeni bir proje oluşturun.
2. SQL Editor bölümünde `supabase/schema.sql` dosyasının tamamını çalıştırın.
3. Project Settings > API bölümünden Project URL ve `anon` / publishable key değerini alın.
4. Proje klasöründe `.env.example` dosyasını `.env` olarak kopyalayın ve iki değeri girin. `service_role` anahtarını kesinlikle kullanmayın ve paylaşmayın.

## 2. İlk yönetici hesabı
1. Supabase > Authentication > Users bölümünden yalnızca sizin kullanacağınız bir kullanıcı oluşturun.
2. Kullanıcının UUID değerini kopyalayın.
3. SQL Editor'de şu sorguyu kendi UUID'nizle çalıştırın:
   `insert into public.admin_users(user_id) values ('AUTH_USER_UUID');`
4. Sitedeki Yönetici Girişi alanından e-posta ve şifreyle giriş yapın.

Kayıt olma ekranı özellikle yoktur. Yönetici yetkisi veritabanında kontrol edilir; yalnızca arayüzü gizlemekle yetinilmez.

## 3. Yerelde çalıştırma
Node.js 20 veya üzeri gerekir.

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

Çıktı `dist` klasörüne alınır.

## 4. Netlify yayını
- Netlify'da tek bir site oluşturun.
- Build command: `npm run build`
- Publish directory: `dist`
- Site settings > Environment variables bölümüne:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  değerlerini ekleyin.
- Aynı siteye deploy edin. İleride ZIP güncellerken yeni site açmak yerine mevcut sitenin deploy'unu güncelleyin.

## Mevcut kapsam
- İki sütunlu mobil katalog
- Ürün arama, kategori filtresi ve sıralama
- Yönetici girişi
- Ürün ekleme, düzenleme, silme
- Kategori ekleme ve silme
- Logo yükleme/kaldırma
- Site adı, alt başlık, renkler ve fiyat görünürlüğü ayarları
- Supabase Storage görsel yükleme
- Netlify SPA yönlendirmesi

## Sonraki geliştirme adımları
Ürün detay sayfası, alt kategoriler, toplu ürün işlemleri, gelişmiş tasarım seçenekleri, ürün sıralama yönetimi ve yedek dışa/içe aktarma ayrıca eklenebilir. Bu ilk paket, gerçek Supabase proje bilgileri bağlanmadan canlı veri okuyamaz.
