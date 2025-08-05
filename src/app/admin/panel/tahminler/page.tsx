'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaCalendar, FaUsers, FaFutbol, FaClock, FaTrophy, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { Match, Week, User } from '@/lib/supabase';
import { weekService, matchService, userService, userScoreService, predictionService } from '@/lib/supabase-service';

type UserPrediction = {
  user_id: string;
  user_name: string;
  match_id: string;
  predicted_result: 1 | 0 | 2 | null;
  is_correct: boolean;
};

export default function PredictionsPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Kullanıcılar yüklendiğinde ve hafta seçiliyse tahminleri yükle
  useEffect(() => {
    if (users.length > 0 && selectedWeek && matches.length > 0 && !loading) {
      loadUserPredictions(selectedWeek.id, matches, users);
    }
  }, [selectedWeek, users, matches, loading]); // Sadece selectedWeek değiştiğinde çalışsın

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcıları yükle
      const loadedUsers = await userService.getAllUsers();
      const activeUsers = loadedUsers.filter(user => user.is_active);
      setUsers(activeUsers);
      
      // Haftaları yükle
      const loadedWeeks = await weekService.getAllWeeks();
      setWeeks(loadedWeeks);
      
      // İlk haftayı seç (varsayılan olarak)
      if (loadedWeeks.length > 0) {
        const firstWeek = loadedWeeks[0];
        setSelectedWeek(firstWeek);
        
        // Maçları yükle
        const loadedMatches = await matchService.getMatchesByWeek(firstWeek.id);
        const sortedMatches = loadedMatches.sort((a, b) => 
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );
        setMatches(sortedMatches);
        
        // Tahminleri yükle
        await loadUserPredictions(firstWeek.id, sortedMatches, activeUsers);
      }
      
    } catch (err) {
      console.error('Veri yüklenirken hata oluştu:', err);
      setError('Veri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesByWeek = async (weekId: string) => {
    try {
      setLoading(true);
      
      // Maçları yükle ve saate göre sırala
      const loadedMatches = await matchService.getMatchesByWeek(weekId);
      const sortedMatches = loadedMatches.sort((a, b) => 
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
      setMatches(sortedMatches);

      
    } catch (err) {
      console.error('Maçlar yüklenirken hata oluştu:', err);
      setError('Maçlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPredictions = async (weekId: string, matches: Match[], usersToProcess: User[]) => {
    try {
      setPredictionsLoading(true);
      // Tüm kullanıcıların tahminlerini getir
      const predictions = await predictionService.getWeekPredictions(weekId);
      
      const userPreds: UserPrediction[] = [];
      
      // Her kullanıcı için tahminleri işle
      for (const user of usersToProcess) {
        for (const match of matches) {
          const userPrediction = predictions.find(p => p.user_id === user.id && p.match_id === match.id);
          
          // predicted_result değerini number'a dönüştür
          let predictedResult: 1 | 0 | 2 | null = null;
          if (userPrediction && userPrediction.predicted_result !== null) {
            predictedResult = Number(userPrediction.predicted_result) as 1 | 0 | 2;
          }
          
          userPreds.push({
            user_id: user.id,
            user_name: user.name,
            match_id: match.id,
            predicted_result: predictedResult,
            is_correct: userPrediction && match.official_result !== null 
              ? Number(userPrediction.predicted_result) === match.official_result 
              : false
          });
        }
      }
      
      setUserPredictions(userPreds);
    } catch (err) {
      console.error('Tahminler yüklenirken hata oluştu:', err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleWeekChange = async (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    if (week) {
      setSelectedWeek(week);
      await loadMatchesByWeek(weekId);
    }
  };

  const getPredictionText = (prediction: 1 | 0 | 2 | null): string => {
    if (prediction === null) return '-';
    if (prediction === 1) return 'Ev Sahibi (1)';
    if (prediction === 0) return 'Beraberlik (0)';
    if (prediction === 2) return 'Deplasman (2)';
    return '-';
  };

  const getPredictionColor = (prediction: 1 | 0 | 2 | null, isCorrect: boolean) => {
    if (prediction === null) return 'text-gray-500';
    if (isCorrect) return 'text-green-600 font-semibold';
    return 'text-gray-700';
  };

  const getPredictionBgColor = (prediction: 1 | 0 | 2 | null, isCorrect: boolean) => {
    if (prediction === null) return 'bg-gray-100 dark:bg-gray-700';
    if (isCorrect) return 'bg-green-100 dark:bg-green-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  const getResultColor = (result: 1 | 0 | 2 | null) => {
    switch (result) {
      case 1: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 0: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
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

  const getTimeFromDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDateFromDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <FaTrophy className="text-yellow-500" />;
      case 2: return <FaTrophy className="text-gray-400" />;
      case 3: return <FaTrophy className="text-orange-600" />;
      default: return <FaInfoCircle className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
                <FaInfoCircle className="text-indigo-600 dark:text-indigo-400 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Tahminleri</h1>
                <p className="text-gray-600 dark:text-gray-300">Tüm kullanıcıların tahminlerini görüntüleyin</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/admin/panel"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaUsers />
                <span className="hidden sm:inline">Admin Paneli</span>
                <span className="sm:hidden">Panel</span>
              </Link>
            </div>
          </div>

          {/* Hafta Seçici */}
          {weeks.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaCalendar />
                Hafta Seçin:
              </label>
              <select
                value={selectedWeek?.id || ''}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                {weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Hafta {week.week_number} ({week.status === 'closed' ? 'Kapalı' : week.status === 'open_for_predictions' ? 'Açık' : 'Beklemede'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <FaTimes className="text-red-500" />
            {error}
          </div>
        )}

        {weeks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FaCalendar className="text-6xl mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">Henüz hafta bulunmamaktadır.</p>
          </div>
        ) : selectedWeek && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hafta {selectedWeek.week_number} Kullanıcı Tahminleri
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <FaUsers className="text-indigo-500" />
                  <span>{users.length} Kullanıcı</span>
                  <FaFutbol className="text-green-500 ml-2" />
                  <span>{matches.length} Maç</span>
                </div>
              </div>
            </div>
            
            {predictionsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-xl text-gray-600 dark:text-gray-300">Tahminler yükleniyor...</p>
              </div>
            ) : matches.length > 0 && userPredictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tarih & Saat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ev Sahibi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Deplasman
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Resmi Sonuç
                      </th>
                      {users.map((user) => (
                        <th key={user.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-100 dark:bg-purple-900 p-1 rounded-full">
                              <FaUsers className="text-purple-600 dark:text-purple-400 text-xs" />
                            </div>
                            <span className="truncate max-w-20">{user.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {matches.map((match) => (
                      <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                              <FaCalendar className="text-blue-500" />
                              {getDateFromDate(match.match_date)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <FaClock className="text-green-500" />
                              {getTimeFromDate(match.match_date)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                              <FaUsers className="text-blue-600 dark:text-blue-400 text-sm" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {match.home_team_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
                              <FaUsers className="text-red-600 dark:text-red-400 text-sm" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {match.away_team_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultColor(match.official_result)}`}>
                            {match.official_result === 1 ? 'Ev Sahibi' :
                             match.official_result === 0 ? 'Beraberlik' :
                             match.official_result === 2 ? 'Deplasman' : 'Girilmedi'}
                          </span>
                        </td>
                        {users.map((user) => {
                          const userPrediction = userPredictions.find(
                            p => p.user_id === user.id && p.match_id === match.id
                          );
                          return (
                            <td key={user.id} className="px-6 py-4 whitespace-nowrap">
                              <div className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 ${getPredictionBgColor(userPrediction?.predicted_result ?? null, userPrediction?.is_correct || false)}`}>
                                <span className={`text-sm font-medium ${getPredictionColor(userPrediction?.predicted_result ?? null, userPrediction?.is_correct || false)}`}>
                                  {getPredictionText(userPrediction?.predicted_result ?? null)}
                                </span>
                                {userPrediction?.is_correct && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <FaCheck className="text-green-500 text-xs" />
                                    <span className="text-xs text-green-600 dark:text-green-400">Doğru</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <FaFutbol className="text-4xl mx-auto" />
                </div>
                <p className="text-gray-600 dark:text-gray-300">Bu hafta için maç bulunamadı.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}