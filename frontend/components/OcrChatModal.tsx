import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OCRRecordLite {
  id: number;
  extracted_text: string;
  timestamp: string;
  page_number?: number;
}

interface FileGroupLite {
  filename: string;
  first_timestamp?: string;
  records?: OCRRecordLite[];
}

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

export function OcrChatModal(props: {
  isOpen: boolean;
  onClose: () => void;
  fileGroup: FileGroupLite | null;
  backendUrl: string;
}) {
  const { isOpen, onClose, fileGroup, backendUrl } = props;
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const initialAssistantMessage = useMemo<ChatMessage>(
    () => ({
      role: 'assistant',
      content:
        '안녕하세요. 이 파일의 OCR 텍스트를 기반으로 질문에 답변해드릴게요. 궁금한 내용을 입력해주세요.',
    }),
    []
  );

  const hasRecords = !!fileGroup?.records && fileGroup.records.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setInput('');
    setMessages([initialAssistantMessage]);
    // 모달이 열리면 입력 포커스
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen, initialAssistantMessage]);

  useEffect(() => {
    if (!isOpen) return;
    // 메시지 추가 시 스크롤 하단 유지
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async () => {
    if (!fileGroup) return;
    if (!hasRecords) {
      setError('이 파일에 OCR 기록이 없습니다.');
      return;
    }
    const question = input.trim();
    if (!question) return;
    if (!token) {
      setError('대화하려면 로그인이 필요합니다.');
      return;
    }

    setIsSending(true);
    setError(null);

    // UI에 즉시 반영
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    try {
      // 초기 안내 메시지는 백엔드 히스토리에 포함하지 않음
      const historyForBackend = messages
        .slice(1)
        .filter((m) => m.role === 'user' || m.role === 'assistant');

      const response = await fetch(`${backendUrl}/chat/ocr-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          filename: fileGroup.filename,
          first_timestamp: fileGroup.first_timestamp ?? null,
          question,
          messages: historyForBackend,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `서버 오류 (${response.status})`);
      }

      const data = await response.json();
      const answer = (data?.answer as string) || '(응답이 비어있습니다)';
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setError(`대화 요청에 실패했습니다: ${msg}`);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했어요. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [backendUrl, fileGroup, hasRecords, input, messages, token]);

  if (!isOpen || !fileGroup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <div className="font-semibold text-gray-900">대화하기</div>
            <div className="text-sm text-gray-500 truncate max-w-[48ch]" title={fileGroup.filename}>
              {fileGroup.filename}
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 text-gray-600"
            title="닫기 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {!hasRecords && (
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              이 파일에 OCR 기록이 없습니다. (records가 비어있음)
            </div>
          )}
          {error && (
            <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <div
            ref={scrollRef}
            className="mt-4 h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          >
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  답변 생성 중...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-4 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending) sendMessage();
                }
              }}
              placeholder="예: 이 문서의 총액은 얼마야?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !input.trim()}
              className="inline-flex items-center justify-center px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="전송 (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500" />
        </div>
      </div>
    </div>
  );
}


