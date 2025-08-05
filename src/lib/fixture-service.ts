import { Match, Week } from './supabase';

// Fixture verisi (normalde bir API'den veya JSON dosyasından gelecek)
let fixtureData: any[] = [];

// Fixture verisini yükle (client-side'da çalışacak)
export async function loadFixtureData() {
  try {
    // Dinamik import kullanarak JSON dosyasını yükle
    const response = await fetch('/data/fixture.json');
    if (!response.ok) {
      throw new Error('Fixture verisi yüklenemedi');
    }
    fixtureData = await response.json();
    return fixtureData;
  } catch (error) {
    console.error('Fixture verisi yüklenemedi:', error);
    // Hata durumunda boş dizi döndür
    return [];
  }
}

// Fixture verisini getir (önce yüklenmişse kullan, yoksa yükle)
export async function getFixtureData() {
  if (fixtureData.length === 0) {
    return await loadFixtureData();
  }
  return fixtureData;
}

// Hafta numaralarını getir
export async function getWeeks() {
  try {
    const fixtures = await getFixtureData();
    
    // Benzersiz hafta numaralarını bul
    const uniqueRounds = [...new Set(fixtures.map((match: any) => match.RoundNumber))];
    
    // Week tipinde nesneler oluştur
    const weeks: Week[] = uniqueRounds.map((roundNumber: number) => ({
      id: roundNumber.toString(),
      week_number: roundNumber,
      year: 2025, // Fixture'daki tarihlerden alınabilir
      status: getWeekStatus(roundNumber.toString())
    }));
    
    return weeks.sort((a, b) => a.week_number - b.week_number);
  } catch (error) {
    console.error('Haftalar alınamadı:', error);
    return [];
  }
}

// Belirli bir haftaya ait maçları getir
export async function getMatchesByWeek(weekId: string) {
  try {
    const fixtures = await getFixtureData();
    const weekNumber = parseInt(weekId);
    
    // Hafta numarasına göre maçları filtrele
    const weekMatches = fixtures.filter((match: any) => match.RoundNumber === weekNumber);
    
    // Match tipinde nesneler oluştur
    const matches: Match[] = weekMatches.map((match: any) => ({
      id: match.MatchNumber.toString(),
      week_id: weekId,
      home_team_name: match.HomeTeam,
      away_team_name: match.AwayTeam,
      match_date: match.DateUtc,
      official_result: match.HomeTeamScore !== null ? 
        (match.HomeTeamScore > match.AwayTeamScore ? 1 : 
         match.HomeTeamScore === match.AwayTeamScore ? 0 : 2) : 
        null
    }));
    
    return matches;
  } catch (error) {
    console.error('Maçlar alınamadı:', error);
    return [];
  }
}

// Maç sonucunu güncelle (client-side'da kullanılacak)
export async function updateMatchResult(matchId: string, result: 1 | 0 | 2 | null) {
  try {
    const fixtures = await getFixtureData();
    const matchNumber = parseInt(matchId);
    
    // Maçı bul ve sonucu güncelle
    const updatedFixtures = fixtures.map((match: any) => {
      if (match.MatchNumber === matchNumber) {
        // Sonuç tipine göre skor ata (basit bir örnek)
        if (result === 1) {
          match.HomeTeamScore = 1;
          match.AwayTeamScore = 0;
        } else if (result === 0) {
          match.HomeTeamScore = 0;
          match.AwayTeamScore = 0;
        } else if (result === 2) {
          match.HomeTeamScore = 0;
          match.AwayTeamScore = 1;
        } else {
          match.HomeTeamScore = null;
          match.AwayTeamScore = null;
        }
      }
      return match;
    });
    
    // Güncellenmiş veriyi global değişkene ata
    fixtureData = updatedFixtures;
    
    // Güncellenmiş veriyi localStorage'a kaydet
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixtureData', JSON.stringify(updatedFixtures));
    }
    
    return true;
  } catch (error) {
    console.error('Maç sonucu güncellenemedi:', error);
    return false;
  }
}

// Hafta durumunu güncelle (client-side'da kullanılacak)
export function updateWeekStatus(weekId: string, status: 'pending' | 'open_for_predictions' | 'closed') {
  // Bu fonksiyon client-side'da çalışacağı için localStorage kullanıyoruz
  try {
    if (typeof window !== 'undefined') {
      // Mevcut hafta durumlarını al
      const storedWeekStatuses = localStorage.getItem('weekStatuses');
      const weekStatuses = storedWeekStatuses ? JSON.parse(storedWeekStatuses) : {};
      
      // Hafta durumunu güncelle
      weekStatuses[weekId] = status;
      
      // Güncellenmiş durumları kaydet
      localStorage.setItem('weekStatuses', JSON.stringify(weekStatuses));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Hafta durumu güncellenemedi:', error);
    return false;
  }
}

// Hafta durumunu getir (client-side'da kullanılacak)
export function getWeekStatus(weekId: string) {
  try {
    if (typeof window !== 'undefined') {
      const storedWeekStatuses = localStorage.getItem('weekStatuses');
      const weekStatuses = storedWeekStatuses ? JSON.parse(storedWeekStatuses) : {};
      
      return weekStatuses[weekId] || 'open_for_predictions';
    }
    return 'open_for_predictions';
  } catch (error) {
    console.error('Hafta durumu alınamadı:', error);
    return 'open_for_predictions';
  }
}