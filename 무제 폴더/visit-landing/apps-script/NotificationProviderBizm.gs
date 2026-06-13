/**
 * NotificationProviderBizm.gs
 *
 * BizM 알림 Provider (향후 구현).
 * NotificationService 레지스트리에만 등록.
 */

var BizmNotificationProvider_ = {
  id: 'bizm',

  /**
   * @param {NotificationPayload} notification
   * @returns {{ messageId: string }}
   */
  send: function (notification) {
    throw createAppError_(
      'NOT_IMPLEMENTED',
      'BizM Provider는 아직 구현되지 않았습니다. NOTIFICATION_PROVIDER=solapi 를 사용하세요.'
    );
  }
};
