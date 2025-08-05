import axios from 'axios';

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_HOST = 'api-football-v1.p.rapidapi.com';

const apiFootball = axios.create({
  baseURL: `https://${API_HOST}/v3`,
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': API_HOST
  }
});

export const fetchTurkishSuperLeagueFixtures = async (date: string) => {
  try {
    // Türkiye Süper Ligi ID: 203
    const response = await apiFootball.get('/fixtures', {
      params: {
        league: 203,
        season: getCurrentSeason(),
        from: date,
        to: date
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
};

// Mevcut sezonu hesapla (Ağustos-Mayıs arası)
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript'te aylar 0'dan başlar
  
  // Ağustos-Aralık arası ise, sezon yıl/yıl+1 formatında
  // Ocak-Temmuz arası ise, sezon yıl-1/yıl formatında
  return month >= 8 ? year : year - 1;
};