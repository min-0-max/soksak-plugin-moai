# 변경 기록

[English](CHANGELOG.md)

- M1: manifest가 `agents`에 대한 `dependencies`를 `^0.0.1`로 선언하고, `agents.makers`에 module `ui/makers/moai.js`로 기여 하나를 선언해요. 이 module은 M5가 써요. Range는 `agents` release가 point를 선언할 때까지 임시값이에요. manifest test는 manifest가 없을 때 실패하고, 그 뒤 5/5 통과해요.
- M1: 저장소 골격이에요. `engines.soksak`이 `^0.0.41`인 `package.json`, document와 command 검사를 위한 kit release, install, test, check, pack target을 가진 `Makefile`, lockfile, license, README 두 개, checklist를 두었어요.
