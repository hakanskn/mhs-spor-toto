'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaEdit, FaCheck, FaTimes, FaLock, FaUnlock, FaEye } from 'react-icons/fa';
import { Week, Match } from '@/lib/supabase';
import { weekService, matchService } from '@/lib/supabase-service';

type WeekWithMatches = Week & {
  matches?: Match[];
  matchCount?: number;
  resultCount?: number;
};

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<WeekWithMatches[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekWithMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    try {
      setLoading(true);
      const data = await weekService.getAllWeeks();
      
      // Her hafta için maç sayısını ve sonuç sayısını hesapla
      const weeksWithStats = await Promise.all(
        data.map(async (week) => {
          const matches = await matchService.getMatchesByWeek(week.id);
          const resultCount = matches.filter(match => match.official_result !== null).length;
          
          return {
            ...week,
            matches,
            matchCount: matches.length,
            resultCount
          };
        })
      );
      
      setWeeks(weeksWithStats);
    } catch (err) {
      console.error('Haftalar yüklenirken hata oluştu:', err);
      setError('Haftalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateWeekStatus = async (weekId: string, status: Week['status']) => {
    try {
      setSubmitting(true);
      setError('');
      
      const success = await weekService.updateWeekStatus(weekId, status);
      
      if (success) {
        // Haftaları yeniden yükle
        await loadWeeks();
        setSuccess(`Hafta başarıyla ${status === 'closed' ? 'kapatıldı' : 'açıldı'}!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Hafta durumu güncellenemedi');
      }
    } catch (err) {
      console.error('Hafta durumu güncellenirken hata oluştu:', err);
      setError('Hafta durumu güncellenirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: Week['status']) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'open_for_predictions': return 'Tahminlere Açık';
      case 'closed': return 'Kapalı';
      default: return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: Week['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'open_for_predictions': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: Week['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'open_for_predictions': return '✅';
      case 'closed': return '🔒';
      default: return '❓';
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

  const getResultText = (result: 1 | 0 | 2 | null) => {
    switch (result) {
      case 1: return '1 (Ev Sahibi Kazandı)';
      case 0: return '0 (Beraberlik)';
      case 2: return '2 (Deplasman Kazandı)';
      default: return 'Girilmedi';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-xl">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">📅 Hafta Yönetimi</h1>
          <Link href="/admin/panel" className="text-blue-600 hover:underline">
            Admin Paneline Dön
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        {/* Hafta Listesi */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Hafta Listesi</h2>
          {weeks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg">Henüz hafta bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeks.map((week) => (
                <div 
                  key={week.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedWeek?.id === week.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => setSelectedWeek(week)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">Hafta {week.week_number}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(week.status)}`}>
                      {getStatusIcon(week.status)} {getStatusText(week.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>Yıl: {week.year}</p>
                    <p>Maç Sayısı: {week.matchCount || 0}</p>
                    <p>Sonuç Girilen: {week.resultCount || 0}</p>
                    {week.closed_at && (
                      <p>Kapatılma: {formatDate(week.closed_at)}</p>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    {week.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateWeekStatus(week.id, 'open_for_predictions');
                        }}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:bg-green-400"
                      >
                        Tahminlere Aç
                      </button>
                    )}
                    
                    {week.status === 'open_for_predictions' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateWeekStatus(week.id, 'closed');
                        }}
                        disabled={submitting}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:bg-red-400"
                      >
                        Kapat
                      </button>
                    )}
                    
                    {week.status === 'closed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateWeekStatus(week.id, 'open_for_predictions');
                        }}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:bg-blue-400"
                      >
                        Tekrar Aç
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Seçili Hafta Detayları */}
        {selectedWeek && (
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Hafta {selectedWeek.week_number} - {getStatusText(selectedWeek.status)}
              </h2>
              <span className={`px-3 py-1 rounded text-sm ${getStatusColor(selectedWeek.status)}`}>
                {getStatusIcon(selectedWeek.status)} {getStatusText(selectedWeek.status)}
              </span>
            </div>
            
            {selectedWeek.matches && selectedWeek.matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Tarih</th>
                      <th className="px-4 py-3 text-left">Ev Sahibi</th>
                      <th className="px-4 py-3 text-left">Deplasman</th>
                      <th className="px-4 py-3 text-left">Sonuç</th>
                      <th className="px-4 py-3 text-left">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWeek.matches.map((match) => (
                      <tr key={match.id} className="border-t dark:border-gray-600">
                        <td className="px-4 py-3 text-sm">
                          {formatDate(match.match_date)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {match.home_team_name}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {match.away_team_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            match.official_result !== null
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }`}>
                            {getResultText(match.official_result)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            match.official_result !== null
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {match.official_result !== null ? 'Sonuç Girildi' : 'Sonuç Bekliyor'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg">Bu hafta için maç bulunamadı.</p>
              </div>
            )}
            
            {/* İstatistikler */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Toplam Maç</h3>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {selectedWeek.matchCount || 0}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Sonuç Girilen</h3>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {selectedWeek.resultCount || 0}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Bekleyen</h3>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {(selectedWeek.matchCount || 0) - (selectedWeek.resultCount || 0)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">Tamamlanma</h3>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {selectedWeek.matchCount ? Math.round(((selectedWeek.resultCount || 0) / selectedWeek.matchCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Bilgi Kutusu */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">ℹ️ Hafta Yönetimi Bilgileri:</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Beklemede:</strong> Hafta henüz aktif değil</li>
            <li>• <strong>Tahminlere Açık:</strong> Kullanıcılar tahmin yapabilir</li>
            <li>• <strong>Kapalı:</strong> Tahminler kapatıldı, sonuçlar görüntülenebilir</li>
            <li>• <strong>Kapalı haftalar tekrar açılabilir</strong> - Kullanıcılar tekrar tahmin yapabilir</li>
            <li>• <strong>Maç sonuçları:</strong> Admin panelinden girilir</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 