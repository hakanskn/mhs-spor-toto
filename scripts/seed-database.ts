import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ytuhgncyufdlfcwvmyub.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dWhnbmN5dWZkbGZjd3ZteXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTY0NTUsImV4cCI6MjA2OTk5MjQ1NX0.YRF1WAYf1Pl6WJO1lOeGZj5_8Rs4iK2N-t1oxh_cyJw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FixtureMatch {
  MatchNumber: number;
  RoundNumber: number;
  DateUtc: string;
  Location: string;
  HomeTeam: string;
  AwayTeam: string;
  Group: string | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
}

async function seedDatabase() {
  try {
    console.log('🗄️ Veritabanı seed işlemi başlıyor...');

    // Fixture verisini oku
    const fixturePath = path.join(process.cwd(), 'data', 'fixture.json');
    const fixtureData: FixtureMatch[] = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    console.log(`📊 ${fixtureData.length} maç verisi bulundu`);

    // Haftaları oluştur
    const uniqueRounds = [...new Set(fixtureData.map(match => match.RoundNumber))];
    console.log(`📅 ${uniqueRounds.length} hafta bulundu`);

    const weekIds: { [key: number]: string } = {};

    for (const roundNumber of uniqueRounds.sort((a, b) => a - b)) {
      const { data: week, error: weekError } = await supabase
        .from('weeks')
        .insert({
          week_number: roundNumber,
          year: 2025,
          status: 'open_for_predictions'
        })
        .select()
        .single();

      if (weekError) {
        console.error(`❌ Hafta ${roundNumber} oluşturulamadı:`, weekError);
        continue;
      }

      weekIds[roundNumber] = week.id;
      console.log(`✅ Hafta ${roundNumber} oluşturuldu (ID: ${week.id})`);
    }

    // Maçları oluştur
    let matchCount = 0;
    for (const fixture of fixtureData) {
      const weekId = weekIds[fixture.RoundNumber];
      if (!weekId) {
        console.error(`❌ Hafta ${fixture.RoundNumber} bulunamadı`);
        continue;
      }

      // Sonuç hesapla
      let officialResult: 1 | 0 | 2 | null = null;
      if (fixture.HomeTeamScore !== null && fixture.AwayTeamScore !== null) {
        if (fixture.HomeTeamScore > fixture.AwayTeamScore) {
          officialResult = 1;
        } else if (fixture.HomeTeamScore === fixture.AwayTeamScore) {
          officialResult = 0;
        } else {
          officialResult = 2;
        }
      }

      const { error: matchError } = await supabase
        .from('matches')
        .insert({
          week_id: weekId,
          match_number: fixture.MatchNumber,
          home_team_name: fixture.HomeTeam,
          away_team_name: fixture.AwayTeam,
          match_date: fixture.DateUtc,
          location: fixture.Location,
          official_result: officialResult
        });

      if (matchError) {
        console.error(`❌ Maç ${fixture.MatchNumber} oluşturulamadı:`, matchError);
        continue;
      }

      matchCount++;
      if (matchCount % 10 === 0) {
        console.log(`📈 ${matchCount} maç oluşturuldu...`);
      }
    }

    console.log(`✅ Toplam ${matchCount} maç oluşturuldu`);

    // Örnek kullanıcılar oluştur
    const sampleUsers = [
      { name: 'Ahmet', accessKey: 'ahmet123' },
      { name: 'Mehmet', accessKey: 'mehmet123' },
      { name: 'Ayşe', accessKey: 'ayse123' },
      { name: 'Fatma', accessKey: 'fatma123' },
      { name: 'Ali', accessKey: 'ali123' }
    ];

    for (const user of sampleUsers) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          name: user.name,
          unique_access_key: user.accessKey,
          is_active: true
        });

      if (userError) {
        console.error(`❌ Kullanıcı ${user.name} oluşturulamadı:`, userError);
      } else {
        console.log(`✅ Kullanıcı ${user.name} oluşturuldu`);
      }
    }

    console.log('🎉 Veritabanı seed işlemi tamamlandı!');

  } catch (error) {
    console.error('❌ Seed işlemi başarısız:', error);
  }
}

// Script'i çalıştır
seedDatabase(); 