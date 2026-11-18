import crypto from 'crypto';
import { ASSISTANT_CONFIG } from './config.js';
import { AssistantError } from './errors.js';

export type ConfirmableActionType =
  | 'create_playlist'
  | 'add_to_playlist'
  | 'remove_from_playlist'
  | 'delete_playlist';

export interface PendingConfirmationItem {
  actionId: string;
  userId: string;
  actionType: ConfirmableActionType;
  summary: string;
  payload: Record<string, any>;
  expiresAt: number;
}

const pendingActions = new Map<string, PendingConfirmationItem>();

function cleanupExpired(now = Date.now()): void {
  for (const [id, item] of pendingActions.entries()) {
    if (now >= item.expiresAt) {
      pendingActions.delete(id);
    }
  }
}

/** Tạo actionId dùng 1 lần, hết hạn sau 5 phút và gắn chặt với userId */
export function createPendingConfirmation(params: {
  userId: string;
  actionType: ConfirmableActionType;
  summary: string;
  payload: Record<string, any>;
}): { status: 'needs_confirmation'; actionId: string; summary: string; actionType: ConfirmableActionType } {
  cleanupExpired();
  const actionId = `act_${crypto.randomUUID()}`;
  const expiresAt = Date.now() + ASSISTANT_CONFIG.confirmActionTtlMs;

  pendingActions.set(actionId, {
    actionId,
    userId: params.userId,
    actionType: params.actionType,
    summary: params.summary,
    payload: params.payload,
    expiresAt,
  });

  return {
    status: 'needs_confirmation',
    actionId,
    summary: params.summary,
    actionType: params.actionType,
  };
}

/** Lấy và hủy ngay lập tức (one-time token) hành động chờ xác nhận, kiểm tra hạn 5 phút & đúng chủ sở hữu */
export function consumePendingConfirmation(
  actionId: string,
  userId: string,
  now = Date.now()
): PendingConfirmationItem {
  const item = pendingActions.get(actionId);
  if (!item) {
    throw new AssistantError(
      'CONFIRMATION_EXPIRED',
      'Yêu cầu xác nhận không tồn tại, đã được sử dụng hoặc đã hết hạn (quá 5 phút).',
      410
    );
  }

  if (now >= item.expiresAt) {
    pendingActions.delete(actionId);
    throw new AssistantError(
      'CONFIRMATION_EXPIRED',
      'Yêu cầu xác nhận đã hết hạn sau 5 phút. Vui lòng yêu cầu lại.',
      410
    );
  }

  if (item.userId !== userId) {
    throw new AssistantError(
      'FORBIDDEN',
      'Bạn không có quyền xác nhận thao tác của người dùng khác.',
      403
    );
  }

  // Xóa ngay để đảm bảo chỉ dùng 1 lần duy nhất
  pendingActions.delete(actionId);
  return item;
}

export function clearPendingConfirmations(): void {
  pendingActions.clear();
}
