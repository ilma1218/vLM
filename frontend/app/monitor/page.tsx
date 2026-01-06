'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface OCRRecord {
  id: number;
  extracted_text: string;
  cropped_image?: string;  // base64 encoded image
  timestamp: string;
}

export default function MonitorPage() {
  const [records, setRecords] = useState<OCRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/history`);
      if (!response.ok) {
        throw new Error('히스토리를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">OCR History</h1>
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">아직 OCR 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  {/* 왼쪽: 크롭된 이미지 */}
                  <div className="md:w-1/3 bg-gray-50 p-4 flex items-center justify-center">
                    {record.cropped_image ? (
                      <img
                        src={`data:image/png;base64,${record.cropped_image}`}
                        alt={`Cropped area ${record.id}`}
                        className="max-w-full max-h-64 object-contain rounded border border-gray-300"
                      />
                    ) : (
                      <div className="text-gray-400 text-sm">이미지 없음</div>
                    )}
                  </div>
                  
                  {/* 오른쪽: 추출된 텍스트 */}
                  <div className="md:w-2/3 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs text-gray-500">ID: {record.id}</span>
                        <span className="text-xs text-gray-500 ml-4">
                          {formatDate(record.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-md p-4 min-h-[200px]">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {record.extracted_text || '(빈 텍스트)'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

