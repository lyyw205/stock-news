'use client';

import { useState } from 'react';
import { SocialPlatform } from '@/lib/social-media/types';

interface PublishButtonProps {
  selectedNewsIds: string[];
  selectedPlatforms: SocialPlatform[];
  onPublish: () => Promise<void>;
  disabled?: boolean;
}

export default function PublishButton({
  selectedNewsIds,
  selectedPlatforms,
  onPublish,
  disabled = false,
}: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  const isDisabled =
    disabled ||
    isPublishing ||
    selectedNewsIds.length === 0 ||
    selectedPlatforms.length === 0;

  const getButtonText = () => {
    if (isPublishing) {
      return '게시 중...';
    }

    if (selectedNewsIds.length === 0) {
      return '뉴스를 선택해주세요';
    }

    if (selectedPlatforms.length === 0) {
      return '플랫폼을 선택해주세요';
    }

    return `${selectedNewsIds.length}개 뉴스를 ${selectedPlatforms.length}개 플랫폼에 게시`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Summary */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">게시 요약</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>선택된 뉴스:</span>
            <span className="font-medium">{selectedNewsIds.length}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span>선택된 플랫폼:</span>
            <span className="font-medium">{selectedPlatforms.length}개</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="font-medium">총 게시물:</span>
            <span className="font-bold text-blue-600">
              {selectedNewsIds.length * selectedPlatforms.length}개
            </span>
          </div>
        </div>
      </div>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isDisabled}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold transition-all
          ${
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {isPublishing && (
          <span className="inline-block mr-2">
            <svg
              className="animate-spin h-5 w-5 inline"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}
        {getButtonText()}
      </button>

      {/* Warning */}
      {selectedNewsIds.length > 0 && selectedPlatforms.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          게시 후에는 취소할 수 없습니다. 신중히 확인해주세요.
        </div>
      )}
    </div>
  );
}
