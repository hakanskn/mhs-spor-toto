import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">MHS Spor Toto Tahmin Uygulaması</h1>
        
        <div className="flex flex-col gap-6 items-center">
          <p className="text-center text-lg">
            Türkiye Süper Ligi maçlarını tahmin et, arkadaşlarınla yarış!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            <Link 
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
            >
              Admin Girişi
            </Link>
            
            <Link 
              href="/sonuclar"
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium py-3 px-6 rounded-lg text-center transition-colors"
            >
              Sonuçları Görüntüle
            </Link>
            
            <Link 
              href="/liderlik"
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
            >
              🏆 Liderlik Tablosu
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} MHS Spor Toto Tahmin Uygulaması</p>
      </footer>
    </div>
  );
}
