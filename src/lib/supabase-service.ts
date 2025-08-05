import { supabase } from './supabase';
import type { User, Week, Match, Prediction, UserScore } from './supabase';

// User services
export const userService = {
  // Kullanıcıyı access key ile bul
  async getUserByAccessKey(accessKey: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('unique_access_key', accessKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Kullanıcı bulunamadı:', error);
      return null;
    }

    return data;
  },

  // Yeni kullanıcı oluştur
  async createUser(name: string, accessKey: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        unique_access_key: accessKey,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Kullanıcı oluşturulamadı:', error);
      return null;
    }

    return data;
  },

  // Tüm aktif kullanıcıları getir
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Kullanıcılar alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Kullanıcı güncelle
  async updateUser(userId: string, updates: { name?: string; unique_access_key?: string; is_active?: boolean }): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Kullanıcı güncellenemedi:', error);
      return null;
    }

    return data;
  },

  async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Kullanıcı bulunamadı:', error);
      return null;
    }
    return data;
  }
};

// Week services
export const weekService = {
  // Tüm haftaları getir
  async getAllWeeks(): Promise<Week[]> {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number');

    if (error) {
      console.error('Haftalar alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Belirli durumdaki haftaları getir
  async getWeeksByStatus(status: Week['status']): Promise<Week[]> {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('status', status)
      .order('week_number');

    if (error) {
      console.error('Haftalar alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Hafta oluştur
  async createWeek(weekNumber: number, year: number): Promise<Week | null> {
    const { data, error } = await supabase
      .from('weeks')
      .insert({
        week_number: weekNumber,
        year,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Hafta oluşturulamadı:', error);
      return null;
    }

    return data;
  },

  // Hafta durumunu güncelle
  async updateWeekStatus(weekId: string, status: Week['status']): Promise<boolean> {
    const updateData: any = { status };
    
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('weeks')
      .update(updateData)
      .eq('id', weekId);

    if (error) {
      console.error('Hafta durumu güncellenemedi:', error);
      return false;
    }

    return true;
  }
};

// Match services
export const matchService = {
  // Haftaya ait maçları getir
  async getMatchesByWeek(weekId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('week_id', weekId)
      .order('match_number');

    if (error) {
      console.error('Maçlar alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Maç sonucunu güncelle
  async updateMatchResult(matchId: string, result: 1 | 0 | 2 | null): Promise<boolean> {
    const { error } = await supabase
      .from('matches')
      .update({ official_result: result })
      .eq('id', matchId);

    if (error) {
      console.error('Maç sonucu güncellenemedi:', error);
      return false;
    }

    return true;
  },

  // Maç skorunu güncelle
  async updateMatchScore(matchId: string, score: string): Promise<boolean> {
    const { error } = await supabase
      .from('matches')
      .update({ match_score: score })
      .eq('id', matchId);

    if (error) {
      console.error('Maç skoru güncellenemedi:', error);
      return false;
    }

    return true;
  },

  // Maç oluştur
  async createMatch(matchData: Omit<Match, 'id' | 'created_at'>): Promise<Match | null> {
    const { data, error } = await supabase
      .from('matches')
      .insert(matchData)
      .select()
      .single();

    if (error) {
      console.error('Maç oluşturulamadı:', error);
      return null;
    }

    return data;
  }
};

// Prediction services
export const predictionService = {
  // Kullanıcının tahminlerini getir
  async getUserPredictions(userId: string, weekId?: string): Promise<Prediction[]> {
    let query = supabase
      .from('predictions')
      .select(`
        *,
        matches!inner(week_id)
      `)
      .eq('user_id', userId);

    if (weekId) {
      query = query.eq('matches.week_id', weekId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Tahminler alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Tahmin oluştur veya güncelle
  async upsertPrediction(userId: string, matchId: string, result: 1 | 0 | 2): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('predictions')
        .upsert({
          user_id: userId,
          match_id: matchId,
          predicted_result: result
        }, {
          onConflict: 'user_id,match_id'
        });

      if (error) {
        console.error('Tahmin kaydedilemedi:', error);
        console.error('Hata detayları:', {
          userId,
          matchId,
          result,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        });
        return false;
      }

      return true;
    } catch (err) {
      console.error('Tahmin kaydetme hatası:', err);
      return false;
    }
  },

  // Hafta için tüm tahminleri getir
  async getWeekPredictions(weekId: string): Promise<Prediction[]> {
    try {
      // Önce haftanın maçlarını al
      const matches = await matchService.getMatchesByWeek(weekId);
      const matchIds = matches.map((match: Match) => match.id);

      if (matchIds.length === 0) {
        return [];
      }

      // Bu maçlar için yapılan tahminleri al
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .in('match_id', matchIds);

      if (error) {
        console.error('Hafta tahminleri alınamadı:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Hafta tahminleri alınırken hata:', err);
      return [];
    }
  }
};

// UserScore services
export const userScoreService = {
  // Kullanıcının haftalık skorunu getir
  async getUserWeekScore(userId: string, weekId: string): Promise<UserScore | null> {
    const { data, error } = await supabase
      .from('user_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('week_id', weekId)
      .single();

    if (error) {
      console.error('Kullanıcı skoru alınamadı:', error);
      return null;
    }

    return data;
  },

  // Kullanıcı skorunu güncelle
  async updateUserScore(userId: string, weekId: string, scoreData: {
    correct_predictions: number;
    total_predictions: number;
    score: number;
  }): Promise<boolean> {
    const { error } = await supabase
      .from('user_scores')
      .upsert({
        user_id: userId,
        week_id: weekId,
        ...scoreData
      });

    if (error) {
      console.error('Kullanıcı skoru güncellenemedi:', error);
      return false;
    }

    return true;
  },

  // Haftalık liderlik tablosu
  async getWeekLeaderboard(weekId: string): Promise<UserScore[]> {
    const { data, error } = await supabase
      .from('user_scores')
      .select(`
        *,
        users!inner(name)
      `)
      .eq('week_id', weekId)
      .order('score', { ascending: false })
      .order('correct_predictions', { ascending: false });

    if (error) {
      console.error('Liderlik tablosu alınamadı:', error);
      return [];
    }

    return data || [];
  },

  // Genel liderlik tablosu
  async getOverallLeaderboard(): Promise<UserScore[]> {
    const { data, error } = await supabase
      .from('user_scores')
      .select(`
        *,
        users!inner(name)
      `)
      .order('score', { ascending: false })
      .order('correct_predictions', { ascending: false });

    if (error) {
      console.error('Genel liderlik tablosu alınamadı:', error);
      return [];
    }

    return data || [];
  }
}; 