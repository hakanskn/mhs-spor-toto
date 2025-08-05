'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { FaTrophy, FaHome, FaCalendar, FaClock, FaCheck, FaTimes, FaEye, FaEyeSlash, FaUsers, FaFutbol, FaCheckCircle } from 'react-icons/fa';
import { Match, Week, User } from '@/lib/supabase';
import { matchService, weekService, userService, predictionService } from '@/lib/supabase-service';

type ModalType = 'success' | 'error' | null;

export default function PredictionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<{[key: string]: 1 | 0 | 2}>({});
  const [openWeeks, setOpenWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalMessage, setModalMessage] = useState('');
  const [weekClosed, setWeekClosed] = useState(false);

  useEffect(() => {
    loadUserAndMatches();
  }, []);

  const showModal = (type: 'success' | 'error', message: string) => {
    setModalType(type);
    setModalMessage(message);
  };

  const hideModal = () => {
    setModalType(null);
    setModalMessage('');
  };

  const loadUserAndMatches = async () => {
    try {
      setLoading(true);
      setError('');

      // Kullanıcıyı yükle
      const userData = await userService.getUserByAccessKey(key);
      if (!userData) {
        setError('Geçersiz erişim anahtarı.');
        return;
      }
      setUser(userData);

      // Açık haftaları yükle
      const weeksData = await weekService.getWeeksByStatus('open_for_predictions');
      setOpenWeeks(weeksData);

      if (weeksData.length > 0) {
        // İlk açık haftayı seç
        const firstWeek = weeksData[0];
        setWeek(firstWeek);
        
        // Hafta kapalı mı kontrol et (aslında bu kontrol gereksiz çünkü sadece açık haftaları alıyoruz)
        setWeekClosed(false);

        // Maçları yükle ve saate göre sırala
        const matchesData = await matchService.getMatchesByWeek(firstWeek.id);
        const sortedMatches = matchesData.sort((a, b) => 
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );
        setMatches(sortedMatches);

        // Kullanıcının mevcut tahminlerini yükle
        const userPreds = await predictionService.getUserPredictions(userData.id, firstWeek.id);
        const predictionMap: {[key: string]: 1 | 0 | 2} = {};
        userPreds.forEach((p: { match_id: string; predicted_result: 1 | 0 | 2 }) => {
          predictionMap[p.match_id] = p.predicted_result;
        });
        setPredictions(predictionMap);
      }
    } catch (err) {
      console.error('Veriler yüklenirken hata oluştu:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const changeWeek = async (weekId: string) => {
    try {
      setLoading(true);
      const selectedWeek = openWeeks.find(w => w.id === weekId);
      if (!selectedWeek) return;

      setWeek(selectedWeek);
      setWeekClosed(false); // Sadece açık haftalar gösterildiği için her zaman false

      const matchesData = await matchService.getMatchesByWeek(selectedWeek.id);
      const sortedMatches = matchesData.sort((a, b) => 
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
      setMatches(sortedMatches);

      if (user) {
        const userPreds = await predictionService.getUserPredictions(user.id, selectedWeek.id);
        const predictionMap: {[key: string]: 1 | 0 | 2} = {};
        userPreds.forEach((p: { match_id: string; predicted_result: 1 | 0 | 2 }) => {
          predictionMap[p.match_id] = p.predicted_result;
        });
        setPredictions(predictionMap);
      }
    } catch (err) {
      console.error('Hafta değiştirilirken hata oluştu:', err);
      setError('Hafta değiştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionChange = (matchId: string, value: 1 | 0 | 2) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !week) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      // Tüm maçlar için tahmin yapıldığından emin ol
      const missingPredictions = matches.filter(match => predictions[match.id] === undefined);
      if (missingPredictions.length > 0) {
        setError(`Lütfen tüm maçlar için tahmin yapın. ${missingPredictions.length} maç için tahmin eksik.`);
        return;
      }
      
      // Tahminleri Supabase'e kaydet
      for (const match of matches) {
        const success = await predictionService.upsertPrediction(user.id, match.id, predictions[match.id]);
        if (!success) {
          throw new Error(`Maç ${match.home_team_name} vs ${match.away_team_name} için tahmin kaydedilemedi`);
        }
      }
      
      showModal('success', 'Tahminleriniz başarıyla kaydedildi!');
    } catch (err) {
      console.error('Tahminler kaydedilirken hata oluştu:', err);
      showModal('error', 'Tahminler kaydedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaTimes className="text-red-600 dark:text-red-400 text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Hata</h1>
            <p className="mb-6 text-gray-600 dark:text-gray-300">{error}</p>
            <Link 
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <FaHome />
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Modal Overlay */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
            <div className="p-6 text-center">
              <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
                modalType === 'success' 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : 'bg-red-100 dark:bg-red-900'
              }`}>
                {modalType === 'success' ? (
                  <FaCheckCircle className="text-green-600 dark:text-green-400 text-2xl" />
                ) : (
                  <FaTimes className="text-red-600 dark:text-red-400 text-2xl" />
                )}
              </div>
              
              <h3 className={`text-lg font-semibold mb-2 ${
                modalType === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {modalType === 'success' ? 'Başarılı!' : 'Hata!'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {modalMessage}
              </p>
              
              <button
                onClick={hideModal}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  modalType === 'success'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                <FaTrophy className="text-green-600 dark:text-green-400 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tahmin Yap</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {user?.name} - Hafta {week?.week_number}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
          {openWeeks.length > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FaCalendar />
                Hafta Seçin:
              </label>
              <select
                value={week?.id || ''}
                onChange={(e) => changeWeek(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                {openWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Hafta {week.week_number}
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

        {openWeeks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FaCalendar className="text-6xl mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">Şu anda tahmin yapılabilecek açık hafta bulunmamaktadır.</p>
          </div>
        ) : week && matches.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Hafta {week.week_number} Maçları
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <FaFutbol className="text-green-500" />
                  <span>{matches.length} Maç</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
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
                        Tahmininiz
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
                          <div className="grid grid-cols-3 gap-2">
                            {/* Ev Sahibi Kazanır */}
                            <label className={`relative cursor-pointer transition-all duration-200 ${
                              predictions[match.id] === 1 
                                ? 'ring-2 ring-green-500 ring-offset-2' 
                                : 'hover:ring-1 hover:ring-green-300'
                            } ${weekClosed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                name={`prediction-${match.id}`}
                                value="1"
                                checked={predictions[match.id] === 1}
                                onChange={() => handlePredictionChange(match.id, 1)}
                                className="sr-only"
                                disabled={weekClosed}
                              />
                              <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                predictions[match.id] === 1
                                  ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900 dark:border-green-400 dark:text-green-300'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-green-900 dark:hover:border-green-400'
                              }`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold mb-1">1</div>
                                  <div className="text-xs">Ev Sahibi</div>
                                  <div className="text-xs opacity-75">Kazanır</div>
                                </div>
                              </div>
                            </label>

                            {/* Beraberlik */}
                            <label className={`relative cursor-pointer transition-all duration-200 ${
                              predictions[match.id] === 0 
                                ? 'ring-2 ring-yellow-500 ring-offset-2' 
                                : 'hover:ring-1 hover:ring-yellow-300'
                            } ${weekClosed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                name={`prediction-${match.id}`}
                                value="0"
                                checked={predictions[match.id] === 0}
                                onChange={() => handlePredictionChange(match.id, 0)}
                                className="sr-only"
                                disabled={weekClosed}
                              />
                              <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                predictions[match.id] === 0
                                  ? 'bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-400 dark:text-yellow-300'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-yellow-900 dark:hover:border-yellow-400'
                              }`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold mb-1">0</div>
                                  <div className="text-xs">Beraberlik</div>
                                  <div className="text-xs opacity-75">Eşitlik</div>
                                </div>
                              </div>
                            </label>

                            {/* Deplasman Kazanır */}
                            <label className={`relative cursor-pointer transition-all duration-200 ${
                              predictions[match.id] === 2 
                                ? 'ring-2 ring-blue-500 ring-offset-2' 
                                : 'hover:ring-1 hover:ring-blue-300'
                            } ${weekClosed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                name={`prediction-${match.id}`}
                                value="2"
                                checked={predictions[match.id] === 2}
                                onChange={() => handlePredictionChange(match.id, 2)}
                                className="sr-only"
                                disabled={weekClosed}
                              />
                              <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                predictions[match.id] === 2
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:border-blue-400'
                              }`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold mb-1">2</div>
                                  <div className="text-xs">Deplasman</div>
                                  <div className="text-xs opacity-75">Kazanır</div>
                                </div>
                              </div>
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Button */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {matches.filter(match => predictions[match.id] !== undefined).length} / {matches.length} maç için tahmin yapıldı
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || weekClosed}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      weekClosed
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Kaydediliyor...
                      </>
                    ) : weekClosed ? (
                      <>
                        <FaEyeSlash />
                        Hafta Kapalı
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        Tahminleri Kaydet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FaFutbol className="text-6xl mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">Bu hafta için maç bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}