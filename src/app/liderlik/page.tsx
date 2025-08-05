'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserScore } from '@/lib/supabase';
import { userScoreService, userService } from '@/lib/supabase-service';

type OverallUserScore = {
  user_id: string;
  user_name: string;
  total_correct_predictions: number;
  total_predictions: number;
  total_score: number;
  average_accuracy: number;
  weeks_played: number;
};

export default function LeaderboardPage() {
  const [overallScores, setOverallScores] = useState<OverallUserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverallLeaderboard();
  }, []);

  const loadOverallLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Tüm kullanıcıları getir
      const users = await userService.getAllUsers();
      
      // Her kullanıcı için genel skor hesapla
      const overallScores: OverallUserScore[] = [];
      
      for (const user of users) {
        // Kullanıcının tüm haftalık skorlarını getir
        const userScores = await userScoreService.getOverallLeaderboard();
        const userWeekScores = userScores.filter(score => score.user_id === user.id);
        
        let totalCorrect = 0;
        let totalPredictions = 0;
        let totalScore = 0;
        let weeksPlayed = 0;
        
        userWeekScores.forEach(score => {
          totalCorrect += score.correct_predictions;
          totalPredictions += score.total_predictions;
          totalScore += score.score;
          if (score.total_predictions > 0) {
            weeksPlayed++;
          }
        });
        
        const averageAccuracy = totalPredictions > 0 
          ? (totalCorrect / totalPredictions) * 100 
          : 0;
        
        overallScores.push({
          user_id: user.id,
          user_name: user.name,
          total_correct_predictions: totalCorrect,
          total_predictions: totalPredictions,
          total_score: totalScore,
          average_accuracy: averageAccuracy,
          weeks_played: weeksPlayed
        });
      }
      
      // Genel skora göre sırala (toplam doğru tahmin, ortalama başarı oranı)
      overallScores.sort((a, b) => {
        if (b.total_correct_predictions !== a.total_correct_predictions) {
          return b.total_correct_predictions - a.total_correct_predictions;
        }
        if (b.average_accuracy !== a.average_accuracy) {
          return b.average_accuracy - a.average_accuracy;
        }
        return b.weeks_played - a.weeks_played;
      });
      
      setOverallScores(overallScores);
      
    } catch (err) {
      console.error('Liderlik tablosu yüklenirken hata oluştu:', err);
      setError('Liderlik tablosu yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300';
      case 2: return 'bg-gray-100 dark:bg-gray-700 border-gray-300';
      case 3: return 'bg-orange-100 dark:bg-orange-900 border-orange-300';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-xl">Liderlik tablosu yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🏆 Genel Liderlik Tablosu</h1>
          <div className="flex gap-4">
            <Link href="/sonuclar" className="text-blue-600 hover:underline">
              Haftalık Sonuçlar
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Ana Sayfa
            </Link>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {overallScores.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg">Henüz liderlik verisi bulunmamaktadır.</p>
            <p className="mt-2">Kullanıcılar tahmin yapmaya başladıktan sonra burada görüntülenecektir.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Toplam Katılımcı</h3>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{overallScores.length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400">En Yüksek Doğru</h3>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {Math.max(...overallScores.map(s => s.total_correct_predictions))}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">En Yüksek Başarı</h3>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  %{Math.round(Math.max(...overallScores.map(s => s.average_accuracy)))}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400">Aktif Hafta</h3>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {Math.max(...overallScores.map(s => s.weeks_played))}
                </p>
              </div>
            </div>
            
            {/* Liderlik Tablosu */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Sıra</th>
                    <th className="px-4 py-3 text-left">Kullanıcı</th>
                    <th className="px-4 py-3 text-center">Doğru Tahmin</th>
                    <th className="px-4 py-3 text-center">Toplam Tahmin</th>
                    <th className="px-4 py-3 text-center">Başarı Oranı</th>
                    <th className="px-4 py-3 text-center">Katıldığı Hafta</th>
                    <th className="px-4 py-3 text-center">Toplam Puan</th>
                  </tr>
                </thead>
                <tbody>
                  {overallScores.map((score, index) => (
                    <tr 
                      key={score.user_id} 
                      className={`border-t ${getRankClass(index + 1)} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <td className="px-4 py-3 font-bold">
                        <span className="text-lg">{getRankIcon(index + 1)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {score.user_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {score.total_correct_predictions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {score.total_predictions}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          score.average_accuracy >= 80 ? 'text-green-600 dark:text-green-400' :
                          score.average_accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          %{Math.round(score.average_accuracy)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {score.weeks_played}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className="text-blue-600 dark:text-blue-400">
                          {score.total_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Açıklama */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📊 Sıralama Kriterleri:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• <strong>1. Kriter:</strong> Toplam doğru tahmin sayısı</li>
                <li>• <strong>2. Kriter:</strong> Ortalama başarı oranı</li>
                <li>• <strong>3. Kriter:</strong> Katıldığı hafta sayısı</li>
                <li>• <strong>Başarı Oranı:</strong> %80+ Yeşil, %60-79 Sarı, %60- Kırmızı</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 