# 변경 기록

[English](CHANGELOG.md)

- M3: manifest가 최상위 `mark`(`moai`)와 `icon`, 그리고 `surface` composition을 선언해요. composition은 page `ui/web.html`의 `view`이고, document region `moai-web`(`input` `native`)을 가져요. page는 그 region의 element를 가지고 script는 없어요. Manifest test의 field 목록에 `mark`, `icon`, `surface`를 더했어요. surface가 그 field를 추가하기 때문이에요. Surface test는 surface가 없을 때 실패하고, 그 뒤 plugin의 test 10개가 통과해요.
- M1: manifest가 `agents`에 대한 `dependencies`를 `^0.0.1`로 선언하고, `agents.makers`에 module `ui/makers/moai.js`로 기여 하나를 선언해요. 이 module은 M5가 써요. Range는 `agents` release가 point를 선언할 때까지 임시값이에요. manifest test는 manifest가 없을 때 실패하고, 그 뒤 5/5 통과해요.
- M1: 저장소 골격이에요. `engines.soksak`이 `^0.0.41`인 `package.json`, document와 command 검사를 위한 kit release, install, test, check, pack target을 가진 `Makefile`, lockfile, license, README 두 개, checklist를 두었어요.
