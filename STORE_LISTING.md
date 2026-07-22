# Chrome Web Store 등록 문구 (복붙용)

## 기본 정보

- **이름**: BlockURL
- **카테고리**: 도구 (Tools)
- **언어**: 한국어 (기본), English

## 짧은 설명 (ko)

필터에 해당하는 URL의 네트워크 요청을 차단합니다. 도메인 또는 와일드카드 패턴을 지원합니다.

## Short description (en)

Blocks network requests to URLs matching your filters. Supports domains and wildcard patterns.

## 자세한 설명 (ko)

BlockURL은 사용자가 지정한 필터에 해당하는 URL의 네트워크 요청을 브라우저 단에서 차단하는 확장 프로그램입니다.

주요 기능:
- 도메인 입력 시 하위 도메인까지 차단 (example.com → *.example.com 포함)
- 와일드카드 URL 패턴 지원 (*ads*, https://foo.com/tracker* 등)
- 툴바 팝업에서 현재 사이트 원클릭 차단
- 텍스트 편집기 방식의 필터 관리 — 한 줄에 하나씩, # 으로 개별 비활성화
- 전역 on/off 스위치, 툴바 배지에 현재 탭에서 차단된 요청 수 표시
- 필터는 Chrome 계정으로 기기 간 자동 동기화

개인정보를 일절 수집하지 않으며, 모든 처리는 브라우저 내부의 declarativeNetRequest API로 이루어집니다.

## Detailed description (en)

BlockURL blocks network requests to URLs matching your filters, directly inside the browser.

Features:
- Enter a domain to block it and all its subdomains (example.com → includes *.example.com)
- Wildcard URL patterns (*ads*, https://foo.com/tracker*, ...)
- One-click "block this site" from the toolbar popup
- Text-editor style filter management — one pattern per line, # to disable a line
- Global on/off switch; toolbar badge counts requests blocked on the current tab
- Filters sync across devices via your Chrome account

No data is collected. All blocking happens inside the browser via the declarativeNetRequest API.

## 개인정보 보호 탭 — 권한 사유

| 권한 | 사유 (ko) | Justification (en) |
|---|---|---|
| declarativeNetRequest | 사용자가 등록한 URL 패턴에 해당하는 네트워크 요청을 차단하기 위해 필요합니다. | Required to block network requests matching the user's URL patterns. |
| storage | 사용자의 필터 목록을 저장하고 기기 간 동기화하기 위해 필요합니다. | Stores the user's filter list and syncs it across devices. |
| activeTab | 팝업에 현재 탭의 도메인을 표시하고 원클릭 차단을 제공하기 위해 필요합니다. | Shows the current tab's domain in the popup for one-click blocking. |
| webRequest | 차단된 요청 수를 툴바 배지에 표시하기 위해 차단 실패 이벤트(ERR_BLOCKED_BY_CLIENT)를 관찰합니다. 요청을 수정하거나 내용을 읽지 않습니다. | Observes blocked-request events (ERR_BLOCKED_BY_CLIENT) to show a per-tab blocked counter on the toolbar badge. Does not modify requests or read their contents. |
| 호스트 권한 (<all_urls>) | webRequest로 모든 사이트에서 차단 이벤트를 관찰하기 위해 필요합니다. 페이지 내용에는 접근하지 않습니다. | Required for webRequest to observe blocked-request events on any site. Page content is never accessed. |

- **원격 코드 사용**: 아니요 (No remote code)
- **데이터 수집**: 없음 (선언: 사용자 데이터를 수집하거나 사용하지 않습니다)
- **개인정보처리방침 URL**: https://reikop.github.io/BlockURL/

## 스크린샷 체크리스트

- 1280×800 PNG, 최소 1장 (권장 3장)
  1. 팝업 — 필터 목록 + 현재 사이트 차단 버튼
  2. 옵션 페이지 — textarea 필터 편집기
  3. 차단된 페이지 (ERR_BLOCKED_BY_CLIENT)
