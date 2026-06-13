/**
 * NotificationProviderNhn.gs
 *
 * NHN Cloud 알림 Provider (향후 구현).
 * NotificationService 레지스트리에만 등록.
 */

var NhnCloudNotificationProvider_ = {
  id: 'nhn',

  /**
   * @param {NotificationPayload} notification
   * @returns {{ messageId: string }}
   */
  send: function (notification) {
    throw createAppError_(
      'NOT_IMPLEMENTED',
      'NHN Cloud Provider는 아직 구현되지 않았습니다. NOTIFICATION_PROVIDER=solapi 를 사용하세요.'
    );
  }
};
