# 변경 기록

[English](CHANGELOG.md)

- M6: moai 기여 item이 agents가 version 0.1.0으로 선언한 `agents.makers` point(`extends.makers`, 필수 string `id`와 `name`의 item schema)와 맞아요. Item은 `id` `moai`, `name` `moai`, `range` `^0.1.0`(0.1.0을 포함해요)과 module을 가져요. Manifest test는 이전 range `^0.0.1`의 item에서 실패한 뒤, 10/10 통과해요.
- M3: manifest가 최상위 `mark`(`moai`)와 `icon`, 그리고 `surface` composition을 선언해요. composition은 page `ui/web.html`의 `view`이고, document region `moai-web`(`input` `native`)을 가져요. page는 그 region의 element를 가지고 script는 없어요. Manifest test의 field 목록에 `mark`, `icon`, `surface`를 더했어요. surface가 그 field를 추가하기 때문이에요. Surface test는 surface가 없을 때 실패하고, 그 뒤 plugin의 test 10개가 통과해요.
- M1: manifest가 `agents`에 대한 `dependencies`를 `^0.0.1`로 선언하고, `agents.makers`에 module `ui/makers/moai.js`로 기여 하나를 선언해요. 이 module은 M5가 써요. Range는 `agents` release가 point를 선언할 때까지 임시값이에요. manifest test는 manifest가 없을 때 실패하고, 그 뒤 5/5 통과해요.
- M1: 저장소 골격이에요. `engines.soksak`이 `^0.0.41`인 `package.json`, document와 command 검사를 위한 kit release, install, test, check, pack target을 가진 `Makefile`, lockfile, license, README 두 개, checklist를 두었어요.
- M7: 기여 range를 `^0.0.1`로 바꿔요. agents가 작업 트리에서 선언한 point `agents.makers`의 version `0.0.1`을 포함해요. M6은 이전 version으로 `^0.1.0`을 썼어요. Manifest test는 `^0.1.0`에서 실패한 뒤(Red), 10/10 통과해요(Green).
