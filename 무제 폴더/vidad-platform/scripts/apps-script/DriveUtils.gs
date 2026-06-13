/**
 * DriveUtils.gs
 * Google Drive 이미지는 파일명 기준으로 찾아 공개 URL을 조합한다.
 */

var DRIVE_ROOT_NAME = 'VIDAD';
var DRIVE_ASSETS_FOLDER = 'assets';

/**
 * VIDAD/assets/{siteCode}/ 폴더 반환
 */
function getSiteAssetFolder_(siteCode) {
  var code = String(siteCode || '').trim();
  var rootName = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_NAME') || DRIVE_ROOT_NAME;

  var rootIter = DriveApp.getFoldersByName(rootName);
  if (!rootIter.hasNext()) {
    throw createAppError_('SITE_BUILD_ERROR', 'Drive 루트 폴더를 찾을 수 없습니다: ' + rootName);
  }
  var root = rootIter.next();

  var assetsIter = root.getFoldersByName(DRIVE_ASSETS_FOLDER);
  if (!assetsIter.hasNext()) {
    throw createAppError_('SITE_BUILD_ERROR', 'Drive assets 폴더를 찾을 수 없습니다');
  }
  var assets = assetsIter.next();

  var siteIter = assets.getFoldersByName(code);
  if (!siteIter.hasNext()) {
    throw createAppError_('SITE_BUILD_ERROR', '현장 이미지 폴더를 찾을 수 없습니다: ' + code);
  }
  return siteIter.next();
}

/**
 * 폴더 내 파일명으로 공개 URL 조합
 * @returns {string} URL 또는 빈 문자열
 */
function getPublicUrlByFileName_(folder, fileName) {
  var name = String(fileName || '').trim();
  if (!name) return '';

  var files = folder.getFilesByName(name);
  if (!files.hasNext()) return '';

  var fileId = files.next().getId();
  return 'https://drive.google.com/uc?export=view&id=' + fileId;
}

/**
 * 필수 파일 존재 여부 확인 (없으면 SITE_BUILD_ERROR)
 */
function requirePublicUrl_(folder, fileName, label) {
  var url = getPublicUrlByFileName_(folder, fileName);
  if (!url) {
    throw createAppError_(
      'SITE_BUILD_ERROR',
      (label || fileName) + ' 파일을 Drive에서 찾을 수 없습니다: ' + fileName
    );
  }
  return url;
}
