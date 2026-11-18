import React, { useEffect, useMemo, useState } from 'react';
import { Images, Loader2, Sparkles } from 'lucide-react';
import { Modal, ModalSection } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { UserAvatar } from '../common/UserAvatar.js';
import {
  PRESET_AVATAR_CATEGORIES,
  PRESET_AVATARS,
  type PresetAvatar,
  type PresetAvatarCategory,
} from '../../data/presetAvatars.js';
import { AvatarCategoryTabs } from './AvatarCategoryTabs.js';
import { AvatarGrid } from './AvatarGrid.js';

interface AvatarPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userName?: string;
  onSavePreset: (preset: PresetAvatar) => Promise<void>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  open,
  onClose,
  currentAvatarUrl,
  userName = '',
  onSavePreset,
}) => {
  const [activeCategory, setActiveCategory] = useState<PresetAvatarCategory>('Tất cả');
  const [selectedPreset, setSelectedPreset] = useState<PresetAvatar | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPreset = useMemo(
    () => PRESET_AVATARS.find((item) => item.url === currentAvatarUrl) || null,
    [currentAvatarUrl]
  );

  // Reset trạng thái mỗi khi mở modal
  useEffect(() => {
    if (open) {
      setSelectedPreset(currentPreset);
      setActiveCategory('Tất cả');
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [open, currentPreset]);

  const categoryCounts = useMemo(() => {
    const map: Partial<Record<PresetAvatarCategory, number>> = {
      'Tất cả': PRESET_AVATARS.length,
    };
    for (const item of PRESET_AVATARS) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, []);

  const filteredAvatars = useMemo(() => {
    if (activeCategory === 'Tất cả') return PRESET_AVATARS;
    return PRESET_AVATARS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const previewAvatarUrl = selectedPreset?.url || currentAvatarUrl || '';
  const hasNewSelection = Boolean(selectedPreset && selectedPreset.url !== currentAvatarUrl);

  const handleSave = async () => {
    if (!selectedPreset || !hasNewSelection || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSavePreset(selectedPreset);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể lưu ảnh đại diện.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Thư viện ảnh đại diện"
      subtitle="Chọn nhanh một ảnh đại diện có sẵn theo phong cách của bạn"
      icon={<Images className="w-5 h-5 text-traffic-green" />}
      size="xl"
      bodyClassName="p-5 sm:p-6 space-y-4 !overflow-hidden flex flex-col"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-mute hidden sm:inline">
            {hasNewSelection && selectedPreset
              ? `Đã chọn: ${selectedPreset.name}`
              : 'Chọn một ảnh mới để áp dụng'}
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasNewSelection || isSaving}
              icon={
                isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )
              }
            >
              {isSaving ? 'Đang lưu...' : 'Lưu ảnh đại diện'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Preview Banner */}
      <ModalSection index={0}>
        <div className="p-3.5 rounded-2xl bg-surface-soft/70 dark:bg-surface-dark-soft/70 border border-hairline dark:border-hairline-dark flex items-center gap-4">
          <UserAvatar
            name={userName}
            avatarUrl={previewAvatarUrl}
            size="xl"
            className="ring-2 ring-traffic-green/60 shadow-sm"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink dark:text-white truncate">
                {selectedPreset?.name || 'Ảnh đại diện hiện tại'}
              </span>
              {selectedPreset && (
                <span className="text-[10px] px-2 py-0.5 rounded-pill bg-black/5 dark:bg-white/10 text-mute font-medium">
                  {selectedPreset.category}
                </span>
              )}
              {hasNewSelection ? (
                <span className="text-[10px] px-2 py-0.5 rounded-pill bg-traffic-green/15 text-traffic-green font-semibold">
                  Xem trước mới
                </span>
              ) : (
                currentAvatarUrl && (
                  <span className="text-[10px] px-2 py-0.5 rounded-pill bg-neutral-200/80 dark:bg-neutral-800 text-mute font-medium">
                    Đang dùng
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-mute">
              Bấm vào bất kỳ ảnh nào bên dưới để xem trước, sau đó nhấn &quot;Lưu ảnh đại diện&quot;.
            </p>
          </div>
        </div>
      </ModalSection>

      {/* Category Filter Tabs */}
      <ModalSection index={1}>
        <AvatarCategoryTabs
          categories={PRESET_AVATAR_CATEGORIES}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          counts={categoryCounts}
        />
      </ModalSection>

      {/* Error feedback if API fails */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
          {errorMsg}
        </div>
      )}

      {/* Avatar Grid (chiều cao cố định, ẩn thanh cuộn sáng để đồng bộ giao diện tối giản) */}
      <ModalSection index={2}>
        <div className="h-[300px] sm:h-[320px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AvatarGrid
            avatars={filteredAvatars}
            selectedId={selectedPreset?.id || null}
            currentAvatarUrl={currentAvatarUrl}
            onSelect={(preset) => {
              setErrorMsg(null);
              setSelectedPreset(preset);
            }}
          />
        </div>
      </ModalSection>
    </Modal>
  );
};
