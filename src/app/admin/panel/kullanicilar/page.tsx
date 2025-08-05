'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaEdit, FaCheck, FaTimes, FaTrash, FaCopy, FaUserPlus, FaUsers, FaEye, FaEyeSlash } from 'react-icons/fa';
import { User } from '@/lib/supabase';
import { userService } from '@/lib/supabase-service';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', unique_access_key: '' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Kullanıcılar yüklenirken hata oluştu:', err);
      setError('Kullanıcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.unique_access_key.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const user = await userService.createUser(newUser.name, newUser.unique_access_key);
      
      if (user) {
        await loadUsers();
        setNewUser({ name: '', unique_access_key: '' });
        setShowNewUserForm(false);
        setSuccess('Kullanıcı başarıyla eklendi!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Kullanıcı oluşturulamadı');
      }
    } catch (err) {
      console.error('Kullanıcı eklenirken hata oluştu:', err);
      setError('Kullanıcı eklenirken bir hata oluştu. Erişim anahtarı benzersiz olmalıdır.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (userId: string, updates: { name?: string; unique_access_key?: string }) => {
    try {
      setSubmitting(true);
      setError('');
      
      const updatedUser = await userService.updateUser(userId, updates);
      
      if (updatedUser) {
        await loadUsers();
        setEditingUser(null);
        setSuccess('Kullanıcı başarıyla güncellendi!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Kullanıcı güncellenemedi');
      }
    } catch (err) {
      console.error('Kullanıcı güncellenirken hata oluştu:', err);
      setError('Kullanıcı güncellenirken bir hata oluştu. Erişim anahtarı benzersiz olmalıdır.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const success = await userService.updateUser(userId, { is_active: false });
      
      if (success) {
        await loadUsers();
        setSuccess('Kullanıcı başarıyla silindi!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Kullanıcı silinemedi');
      }
    } catch (err) {
      console.error('Kullanıcı silinirken hata oluştu:', err);
      setError('Kullanıcı silinirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${type} panoya kopyalandı!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Panoya kopyalanamadı.');
    }
  };

  const generateAccessKey = () => {
    const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setNewUser(prev => ({ ...prev, unique_access_key: key }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <FaUsers className="text-blue-600 dark:text-blue-400 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
                <p className="text-gray-600 dark:text-gray-300">Arkadaşlarınızı yönetin ve tahmin linklerini paylaşın</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowNewUserForm(!showNewUserForm)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaUserPlus />
                <span className="hidden sm:inline">Yeni Kullanıcı</span>
                <span className="sm:hidden">Ekle</span>
              </button>
              <Link 
                href="/admin/panel"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaEye />
                <span className="hidden sm:inline">Admin Paneli</span>
                <span className="sm:hidden">Panel</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <FaTimes className="text-red-500" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <FaCheck className="text-green-500" />
            {success}
          </div>
        )}

        {/* New User Form */}
        {showNewUserForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Kullanıcı adını girin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Erişim Anahtarı
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUser.unique_access_key}
                      onChange={(e) => setNewUser(prev => ({ ...prev, unique_access_key: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Benzersiz anahtar"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateAccessKey}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FaUserPlus />
                  {submitting ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kullanıcılar ({users.filter(u => u.is_active).length} aktif)
            </h2>
          </div>
          
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <FaUsers className="text-6xl mx-auto" />
              </div>
              <p className="text-gray-600 dark:text-gray-300">Henüz kullanıcı bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Erişim Anahtarı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tahmin Linki
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className={`${!user.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <input
                            type="text"
                            defaultValue={user.name}
                            onBlur={(e) => handleEditSubmit(user.id, { name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                              <FaUsers className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <input
                            type="text"
                            defaultValue={user.unique_access_key}
                            onBlur={(e) => handleEditSubmit(user.id, { unique_access_key: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {user.unique_access_key}
                            </code>
                            <button
                              onClick={() => copyToClipboard(user.unique_access_key, 'Erişim anahtarı')}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Kopyala"
                            >
                              <FaCopy />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                            /tahmin/{user.unique_access_key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/tahmin/${user.unique_access_key}`, 'Tahmin linki')}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Linki kopyala"
                          >
                            <FaCopy />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {user.is_active ? (
                            <>
                              <FaEye className="mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <FaEyeSlash className="mr-1" />
                              Pasif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {editingUser === user.id ? (
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Kaydet"
                            >
                              <FaCheck />
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingUser(user.id)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Düzenle"
                            >
                              <FaEdit />
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={submitting}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Sil"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}