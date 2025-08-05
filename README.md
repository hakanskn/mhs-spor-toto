This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# MHS Spor Toto Tahmin Uygulaması

Türkiye Süper Ligi'ndeki haftalık maç sonuçlarını, "mhs" adlı adminin belirlediği bir arkadaş grubu içinde tahmin etmeye yönelik basit, eğlenceli ve hızlı bir web uygulaması.

## Özellikler

- Admin paneli ile haftalık maç programını API'den çekme
- Kullanıcılar için şifresiz, benzersiz link ile erişim
- Maç tahminleri yapma (1: Ev Sahibi Kazanır, 0: Beraberlik, 2: Deplasman Kazanır)
- Sonuçlar ve sıralama tablosu
- Kullanıcı yönetimi

## Teknolojiler

- **Frontend**: Next.js, TypeScript, TailwindCSS
- **Backend & Veritabanı**: Supabase
- **Deployment**: Vercel
- **API**: api-football

## Kurulum

1. Repoyu klonlayın:

```bash
git clone <repo-url>
cd mhs-spor-toto
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. `.env.local` dosyasını düzenleyin:

```
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API Football
API_FOOTBALL_KEY=your-api-football-key

# Admin Key (mhs için)
NEXT_PUBLIC_ADMIN_KEY=your-admin-key
```

4. Supabase'de aşağıdaki tabloları oluşturun:

- **users**: id (PK), name (Text), unique_access_key (Text, Unique)
- **weeks**: id (PK), week_number (Integer), year (Integer), status (Text)
- **matches**: id (PK), week_id (FK to weeks.id), home_team_name (Text), away_team_name (Text), match_date (Timestamp), official_result (Integer, Nullable)
- **predictions**: id (PK), match_id (FK to matches.id), user_id (FK to users.id), predicted_result (Integer), created_at (Timestamp)

5. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

6. [http://localhost:3000](http://localhost:3000) adresini tarayıcınızda açın.

## Kullanım

### Admin Olarak

1. Ana sayfadan "Admin Girişi" butonuna tıklayın
2. `.env.local` dosyasında belirlediğiniz admin anahtarını girin
3. Admin panelinde:
   - Haftalık maç programını API'den çekin
   - Maç sonuçlarını girin
   - Kullanıcı yönetimi sayfasından kullanıcı ekleyin ve erişim linklerini kopyalayın

### Kullanıcı Olarak

1. Admin tarafından size verilen benzersiz linke tıklayın
2. Maçlar için tahminlerinizi yapın (1, 0, 2)
3. "Tahminleri Kaydet" butonuna tıklayın
4. Sonuçlar açıklandıktan sonra "Sonuçları Görüntüle" sayfasından sıralamayı ve diğer kullanıcıların tahminlerini görebilirsiniz

## Deployment

Uygulamayı Vercel'e deploy etmek için:

```bash
npm run build
vercel deploy
```

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
