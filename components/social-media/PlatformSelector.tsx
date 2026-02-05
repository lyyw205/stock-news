'use client';

import { SocialPlatform } from '@/lib/social-media/types';

interface PlatformSelectorProps {
  selectedPlatforms: SocialPlatform[];
  onSelectionChange: (platforms: SocialPlatform[]) => void;
}

interface PlatformInfo {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'telegram',
    name: '텔레그램',
    icon: '✈️',
    color: 'bg-blue-500',
  },
  {
    id: 'twitter',
    name: '트위터 (X)',
    icon: '🐦',
    color: 'bg-gray-900',
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: '🧵',
    color: 'bg-purple-600',
  },
  {
    id: 'toss',
    name: '토스 주식',
    icon: '💰',
    color: 'bg-blue-600',
  },
];

export default function PlatformSelector({
  selectedPlatforms,
  onSelectionChange,
}: PlatformSelectorProps) {
  const handleToggle = (platformId: SocialPlatform) => {
    if (selectedPlatforms.includes(platformId)) {
      onSelectionChange(selectedPlatforms.filter((p) => p !== platformId));
    } else {
      onSelectionChange([...selectedPlatforms, platformId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPlatforms.length === PLATFORMS.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(PLATFORMS.map((p) => p.id));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          게시할 플랫폼
        </h2>
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {selectedPlatforms.length === PLATFORMS.length
            ? '전체 해제'
            : '전체 선택'}
        </button>
      </div>

      {/* Selection Count */}
      <div className="mb-4 text-sm text-gray-600">
        {selectedPlatforms.length}/{PLATFORMS.length} 플랫폼 선택됨
      </div>

      {/* Platform List */}
      <div className="space-y-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);

          return (
            <div
              key={platform.id}
              onClick={() => handleToggle(platform.id)}
              className={`
                p-3 rounded border cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(platform.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Icon */}
                <span className="text-2xl">{platform.icon}</span>

                {/* Name */}
                <span className="flex-1 font-medium text-gray-900">
                  {platform.name}
                </span>

                {/* Status Badge */}
                {isSelected && (
                  <span className="text-xs text-blue-600 font-semibold">
                    선택됨
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
