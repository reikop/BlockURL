# BlockURL

필터에 해당하는 URL의 네트워크 요청을 차단하는 크롬 확장 (Manifest V3).

## 동작 방식

- `declarativeNetRequest` 동적 룰을 사용합니다. MV3에서 `webRequest` 차단이 금지되었기 때문에 스토어 배포 가능한 유일한 차단 방식입니다.
- 필터는 `chrome.storage.sync`에 저장되어 같은 계정의 다른 기기와 동기화됩니다.
- 서비스워커(`background.js`)가 스토리지 변경을 감지해 동적 룰을 다시 빌드합니다.
- 툴바 배지에 **현재 탭에서 차단된 요청 수**가 표시됩니다 (전역 비활성화 시 `OFF`).
  - MV3 DNR은 차단 콜백이 없어(`onRuleMatchedDebug`는 개발 모드 전용) 비차단 `webRequest`로 `net::ERR_BLOCKED_BY_CLIENT` 이벤트를 관찰해 셉니다. 이 때문에 `webRequest` + `<all_urls>` 호스트 권한이 필요합니다.

## 필터 편집

옵션 페이지의 텍스트 편집기에서 관리합니다.

```
example.com          ← 도메인 + 모든 하위 도메인 차단
*ads*                ← URL 어디든 ads 포함 시 차단
https://foo.com/tracker*
# naver.com          ← # 접두사 = 꺼진 필터
```

- 한 줄에 패턴 하나. 저장(버튼 또는 Ctrl/Cmd+S) 시 적용.
- 잘못된 줄은 저장에서 제외되고 편집기 하단에 남아 수정할 수 있습니다.
- 팝업에서도 빠른 추가/개별 토글/현재 사이트 원클릭 차단 가능.

### 패턴 변환 규칙

| 입력 | 의미 |
|---|---|
| `example.com` | `\|\|example.com^`로 변환 — 도메인 + 하위 도메인 차단 |
| `*`, `/` 포함 | [urlFilter 문법](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#url_filter_syntax) 그대로 사용 |
| 한글 도메인 | 자동 퓨니코드 변환 |

## 제한

- 동적 룰 한도: Chrome 121+ 기준 30,000개 (block 룰은 safe 룰이라 전체 한도 사용 가능).
- `storage.sync` 항목당 8KB 제한 → 필터 수백 개 수준까지 무리 없음. 초과 필요 시 `storage.local` 전환.
- 차단된 페이지는 크롬 기본 `ERR_BLOCKED_BY_CLIENT` 화면 표시.

## 로컬 테스트

1. `chrome://extensions` → 개발자 모드 ON
2. "압축해제된 확장 프로그램을 로드합니다" → 이 폴더 선택
3. 옵션 페이지에서 필터 저장 후 해당 사이트 접속 → 차단 확인
4. 서비스워커 로그: `chrome://extensions` → BlockURL → "서비스 워커" 클릭

## 스토어 배포 절차

1. **개인정보처리방침 페이지 (GitHub Pages)** — 심사에 필요:
   - GitHub 레포 푸시 후 Settings → Pages → Source: `Deploy from a branch`, Branch: `main`, 폴더: `/docs` → Save
   - 몇 분 후 `https://<username>.github.io/<repo>/` 에서 `docs/index.html` 서빙됨
   - 이 URL을 스토어 개인정보처리방침 란에 입력
2. **개발자 계정**: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) 등록 (1회 $5)
3. **zip 패키징**:
   ```sh
   ./package.sh   # dist/blockurl-<version>.zip 생성
   ```
4. **대시보드에서 새 항목 생성** → zip 업로드
5. **스토어 등록정보**: [`STORE_LISTING.md`](STORE_LISTING.md)의 문구 복붙. 스크린샷 1280×800 최소 1장
6. **개인정보 보호 탭**: 권한 사유 3개 + 데이터 미수집 선언 — 역시 `STORE_LISTING.md` 참고
7. **심사 제출**: 보통 1~3일. `<all_urls>` 호스트 권한 때문에 심층 심사로 분류될 수 있음 — 권한 사유를 명확히 쓰면 통과에 문제 없음. 배지 카운터를 포기하면 `webRequest`/호스트 권한을 빼고 심사를 빠르게 할 수도 있음

버전 올릴 때: `manifest.json`의 `version` 수정 → `./package.sh` → 대시보드에 새 zip 업로드.

## 파일 구조

```
manifest.json        MV3 매니페스트
background.js        서비스워커 — 스토리지 → DNR 룰 동기화, 배지
lib/filters.js       필터 모델, 패턴 정규화, DNR 룰 변환, 편집기 직렬화/파싱
popup/               툴바 팝업 — 전역 토글, 현재 사이트 차단, 필터 목록
options/             옵션 페이지 — textarea 필터 편집기
_locales/ko,en/      i18n 메시지
icons/               16/32/48/128 PNG (스크립트 생성)
docs/                GitHub Pages — 개인정보처리방침
STORE_LISTING.md     스토어 등록 문구 복붙용
package.sh           스토어 업로드 zip 생성
```

## 라이선스

[MIT](LICENSE)
