'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaTrophy, FaHome, FaCalendar, FaClock, FaUsers, FaFutbol, FaTimes, FaStar } from 'react-icons/fa';
import { Week, Match, UserScore } from '@/lib/supabase';
import { weekService, matchService, userScoreService, userService } from '@/lib/supabase-service';

type UserScoreWithName = UserScore & {
  user_name: string;
};

export default function ResultsPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userScores, setUserScores] = useState<UserScoreWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    try {
      setLoading(true);
      const data = await weekService.getAllWeeks();
      const closedWeeks = data.filter(week => week.status === 'closed');
      setWeeks(closedWeeks);
      
      if (closedWeeks.length > 0) {
        await loadWeekData(closedWeeks[0]);
      }
    } catch (err) {
      console.error('Haftalar yüklenirken hata oluştu:', err);
      setError('Haftalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async (week: Week) => {
    try {
      setSelectedWeek(week);
      
      // Maçları yükle ve saate göre sırala
      const matchesData = await matchService.getMatchesByWeek(week.id);
      const sortedMatches = matchesData.sort((a, b) => 
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
      setMatches(sortedMatches);

      // Kullanıcı skorlarını yükle
      const scoresData = await userScoreService.getWeekLeaderboard(week.id);
      const scoresWithNames = await Promise.all(
        scoresData.map(async (score) => {
          const user = await userService.getUserById(score.user_id);
          return {
            ...score,
            user_name: user?.name || 'Bilinmeyen Kullanıcı'
          };
        })
      );
      setUserScores(scoresWithNames);
    } catch (err) {
      console.error('Hafta verileri yüklenirken hata oluştu:', err);
      setError('Hafta verileri yüklenirken bir hata oluştu.');
    }
  };

  const getResultText = (result: 1 | 0 | 2 | null) => {
    switch (result) {
      case 1: return 'Ev Sahibi Kazandı';
      case 0: return 'Berabere';
      case 2: return 'Deplasman Kazandı';
      default: return 'Sonuç Girilmedi';
    }
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
      default: return <FaStar className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                <FaTrophy className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maç Sonuçları</h1>
                <p className="text-gray-600 dark:text-gray-300">Kapalı haftaların sonuçları ve liderlik tablosu</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/liderlik"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaTrophy />
                <span className="hidden sm:inline">Genel Liderlik</span>
                <span className="sm:hidden">🏆</span>
              </Link>
              <Link 
                href="/"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaHome />
                <span className="hidden sm:inline">Ana Sayfa</span>
                <span className="sm:hidden">Ana</span>
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
                onChange={(e) => {
                  const week = weeks.find(w => w.id === e.target.value);
                  if (week) loadWeekData(week);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                {weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Hafta {week.week_number} ({formatDate(week.closed_at || week.created_at)})
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
              <FaTrophy className="text-6xl mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">Henüz kapalı hafta bulunmamaktadır.</p>
          </div>
        ) : selectedWeek && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maç Sonuçları */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hafta {selectedWeek.week_number} Sonuçları
                </h2>
              </div>
              
              {matches.length > 0 ? (
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
                          Sonuç
                        </th>
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
                              {getResultText(match.official_result)}
                            </span>
                          </td>
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

            {/* Liderlik Tablosu */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hafta {selectedWeek.week_number} Liderlik Tablosu
                </h2>
              </div>
              
              {userScores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Sıra
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Kullanıcı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Doğru
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Puan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {userScores.map((score, index) => (
                        <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getRankIcon(index + 1)}
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                                <FaUsers className="text-purple-600 dark:text-purple-400 text-sm" />
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {score.user_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {score.correct_predictions} / {score.total_predictions}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {score.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <FaUsers className="text-4xl mx-auto" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">Bu hafta için skor bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}