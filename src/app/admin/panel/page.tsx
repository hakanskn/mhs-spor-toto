'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { Match, Week } from '@/lib/supabase';
import { weekService, matchService } from '@/lib/supabase-service';
import { userService, predictionService, userScoreService } from '@/lib/supabase-service';

type Notification = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('fixtures');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadWeeks();
  }, []);

  // Bildirimleri otomatik olarak temizle
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => prev.filter(notification => now - notification.timestamp < 5000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const loadWeeks = async () => {
    try {
      setLoading(true);
      const data = await weekService.getAllWeeks();
      setWeeks(data);
      if (data && data.length > 0) {
        setCurrentWeek(data[0]);
        loadMatchesForWeek(data[0].id);
      }
    } catch (err) {
      console.error('Haftalar yüklenirken hata oluştu:', err);
      addNotification('error', 'Haftalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesForWeek = async (weekId: string) => {
    try {
      setLoading(true);
      const data = await matchService.getMatchesByWeek(weekId);
      // Maçları saate göre sırala
      const sortedMatches = (data || []).sort((a, b) => 
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
      setMatches(sortedMatches);
    } catch (err) {
      console.error('Maçlar yüklenirken hata oluştu:', err);
      addNotification('error', 'Maçlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (weekId: string) => {
    const selected = weeks.find(week => week.id === weekId);
    if (selected) {
      setCurrentWeek(selected);
      loadMatchesForWeek(weekId);
    }
  };

  const handleUpdateMatchResult = async (matchId: string, result: 1 | 0 | 2 | null) => {
    try {
      const success = await matchService.updateMatchResult(matchId, result);
      if (success) {
        // Sadece güncellenen maçı bul ve güncelle
        setMatches(prevMatches => 
          prevMatches.map(match => 
            match.id === matchId 
              ? { ...match, official_result: result }
              : match
          )
        );
        addNotification('success', 'Sonuç başarıyla güncellendi!');
      } else {
        throw new Error('Sonuç güncellenemedi');
      }
    } catch (err) {
      console.error('Sonuç güncellenirken hata oluştu:', err);
      addNotification('error', 'Sonuç güncellenirken bir hata oluştu.');
    }
  };

  const handleUpdateMatchScore = async (matchId: string, score: string) => {
    try {
      const success = await matchService.updateMatchScore(matchId, score);
      if (success) {
        // Sadece güncellenen maçı bul ve güncelle
        setMatches(prevMatches => 
          prevMatches.map(match => 
            match.id === matchId 
              ? { ...match, match_score: score }
              : match
          )
        );
        addNotification('success', 'Maç skoru başarıyla güncellendi!');
      } else {
        throw new Error('Maç skoru güncellenemedi');
      }
    } catch (err) {
      console.error('Maç skoru güncellenirken hata oluştu:', err);
      addNotification('error', 'Maç skoru güncellenirken bir hata oluştu.');
    }
  };

  const closeWeek = async () => {
    if (!currentWeek) return;
    
    try {
      setLoading(true);
      
      // Önce hafta durumunu kapat
      const success = await weekService.updateWeekStatus(currentWeek.id, 'closed');
      if (!success) {
        throw new Error('Hafta kapatılamadı');
      }
      
      // Kullanıcı skorlarını hesapla ve kaydet
      const users = await userService.getAllUsers();
      const activeUsers = users.filter(user => user.is_active);
      
      for (const user of activeUsers) {
        // Kullanıcının bu hafta için tahminlerini getir
        const predictions = await predictionService.getUserPredictions(user.id, currentWeek.id);
        
        // Maçları getir
        const matches = await matchService.getMatchesByWeek(currentWeek.id);
        
        let correctPredictions = 0;
        let totalPredictions = 0;
        
        // Her maç için tahmin kontrolü yap
        for (const match of matches) {
          if (match.official_result !== null) {
            const userPrediction = predictions.find(p => p.match_id === match.id);
            if (userPrediction && userPrediction.predicted_result !== null) {
              totalPredictions++;
              if (userPrediction.predicted_result === match.official_result) {
                correctPredictions++;
              }
            }
          }
        }
        
        // Skoru hesapla (doğru tahmin sayısı)
        const score = correctPredictions;
        
        // user_scores tablosuna kaydet
        await userScoreService.updateUserScore(user.id, currentWeek.id, {
          correct_predictions: correctPredictions,
          total_predictions: totalPredictions,
          score: score
        });
      }
      
      loadWeeks(); // Haftaları yeniden yükle
      addNotification('success', 'Hafta başarıyla kapatıldı ve skorlar hesaplandı!');
    } catch (err) {
      console.error('Hafta kapatılırken hata oluştu:', err);
      addNotification('error', 'Hafta kapatılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const openWeek = async () => {
    if (!currentWeek) return;
    
    try {
      setLoading(true);
      const success = await weekService.updateWeekStatus(currentWeek.id, 'open_for_predictions');
      if (success) {
        loadWeeks(); // Haftaları yeniden yükle
        addNotification('success', 'Hafta başarıyla açıldı!');
      } else {
        throw new Error('Hafta açılamadı');
      }
    } catch (err) {
      console.error('Hafta açılırken hata oluştu:', err);
      addNotification('error', 'Hafta açılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getResultText = (result: 1 | 0 | 2 | null) => {
    if (result === null) return 'Girilmedi';
    if (result === 1) return 'Ev Sahibi';
    if (result === 0) return 'Beraberlik';
    return 'Deplasman';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getNotificationIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success': return <FaCheck className="text-green-500" />;
      case 'error': return <FaTimes className="text-red-500" />;
      case 'info': return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const getNotificationStyles = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-300';
      case 'error': return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-300';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300';
    }
  };

  return (
    <div className="min-h-screen p-8 relative">
      {/* Bildirimler */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${getNotificationStyles(notification.type)}`}
            style={{
              animation: 'slideInRight 0.3s ease-out',
              maxWidth: '400px'
            }}
          >
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Paneli</h1>
          <div className="flex gap-4">
            <Link href="/liderlik" className="text-yellow-600 hover:underline">
              🏆 Liderlik Tablosu
            </Link>
            <Link href="/admin/panel/kullanicilar" className="text-blue-600 hover:underline">
              Kullanıcı Yönetimi
            </Link>
            <Link href="/admin/panel/haftalar" className="text-green-600 hover:underline">
              📅 Hafta Yönetimi
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 ${activeTab === 'fixtures' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('fixtures')}
            >
              Maç Programı & Sonuçlar
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'predictions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('predictions')}
            >
              Tahminler
            </button>
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="weekSelect" className="block text-sm font-medium mb-2">
            Hafta Seçin
          </label>
          <select
            id="weekSelect"
            value={currentWeek?.id || ''}
            onChange={(e) => handleWeekChange(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {weeks.map((week) => (
              <option key={week.id} value={week.id}>
                Hafta {week.week_number} ({week.status === 'closed' ? 'Kapalı' : week.status === 'open_for_predictions' ? 'Açık' : 'Beklemede'})
              </option>
            ))}
          </select>
        </div>
        {activeTab === 'fixtures' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Maç Programı & Sonuçlar</h2>
            {loading ? (
              <div className="text-center py-4">Yükleniyor...</div>
            ) : matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left">Tarih</th>
                      <th className="px-4 py-2 text-left">Ev Sahibi</th>
                      <th className="px-4 py-2 text-left">Deplasman</th>
                      <th className="px-4 py-2 text-left">Resmi Sonuç</th>
                      <th className="px-4 py-2 text-left">Maç Sonucu</th>
                      <th className="px-4 py-2 text-left">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match.id} className="border-t">
                        <td className="px-4 py-2">{formatDate(match.match_date)}</td>
                        <td className="px-4 py-2">{match.home_team_name}</td>
                        <td className="px-4 py-2">{match.away_team_name}</td>
                        <td className="px-4 py-2">{getResultText(match.official_result)}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            placeholder="örn: 2-1"
                            value={match.match_score || ''}
                            onChange={(e) => handleUpdateMatchScore(match.id, e.target.value)}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateMatchResult(match.id, 1)}
                              className="bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded text-sm"
                            >
                              Ev Sahibi
                            </button>
                            <button
                              onClick={() => handleUpdateMatchResult(match.id, 0)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm"
                            >
                              Berabere
                            </button>
                            <button
                              onClick={() => handleUpdateMatchResult(match.id, 2)}
                              className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm"
                            >
                              Deplasman
                            </button>
                            <button
                              onClick={() => handleUpdateMatchResult(match.id, null)}
                              className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-sm"
                            >
                              Sıfırla
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6">
                  <button
                    onClick={currentWeek?.status === 'closed' ? openWeek : closeWeek}
                    className={`font-medium py-2 px-4 rounded-md transition-colors ${
                      currentWeek?.status === 'closed'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={loading}
                  >
                    {currentWeek?.status === 'closed' ? 'Haftayı Aç' : 'Haftayı Kapat ve Sonuçları Yayınla'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">Bu hafta için maç bulunamadı.</div>
            )}
          </div>
        )}

        {activeTab === 'predictions' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Tahminler</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Kullanıcıların tahminlerini görüntülemek için aşağıdaki butona tıklayın.
            </p>
            <Link 
              href="/admin/panel/tahminler" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors inline-block"
            >
              Kullanıcı Tahminlerini Görüntüle
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}