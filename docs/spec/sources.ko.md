# Source와 fork

이 plugin은 files sidecar로 moai data를 읽고 쓰며, 수정하지 않은 moai CLI를 실행해요. moai-adk는 바꾸지 않아요.

## 규칙

Fork는 마지막 선택이에요. Plugin 안이나 수정하지 않은 CLI를 통한 연결로 기능을 만들 수 없을 때만 fork를 해요. 각 checklist 항목은 fork가 필요 없는 이유를 적어요.

## 규칙의 위치

- moai CLI가 강제하는 규칙은 그 결과를 돌려주는 CLI 명령이 없을 때만 plugin 코드에 다시 적어요. Plugin 코드는 다시 적은 규칙마다 upstream 근거 파일을 적어요.
- moai web console에만 있는 규칙은 plugin 코드에 구현해요. 규칙마다 test를 두고, 따르는 upstream 근거 파일을 적어요.
- Plugin은 함께 작업하는 moai release를 고정해요. Checklist는 그 release를 적어요.
