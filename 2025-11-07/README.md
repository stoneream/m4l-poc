---
title: 2025-11-07 PoC
---

## これは何

M4Lにおいて確実にロードが確認された後、JavaScriptを実行することができるか？を検証したい。

## 背景

https://github.com/stoneream/virtual-ext において、`reference.js`内のような実装を行った。  
確実にロードが完了したことを保証する方法が本当に存在しないか？を検証したい。

## 検証

loadbangでJS側にメッセージを送り、LiveAPIを初期化する。  
コールバックが2度呼ばれるか？を確認したい。

## 検証1

loadbangのoutletとしてinit.jsをそのまま呼び出す。

https://github.com/stoneream/m4l-poc/blob/7e8bd103f4c38c187bc4a079c5ebd301c4ac3adf/2025-11-07/init.js

```
v8: 2025-11-06T19:43:06.232Z [INFO] init: init bang received  
Live API is not initialized, use live.thisdevice to determine when initialization is complete
```

警告が出力された。

## 検証2

loadbangのinit.jsの間にdeferlowを挟む。

```
v8: 2025-11-06T19:56:09.465Z [INFO] init: init bang received  
v8liveapi: Live API is not initialized, use live.thisdevice to determine when initialization is complete
```

状況は変わらない。

## 検証3

loadbang -> live.thisdevice -> init.js

```
v8: 2025-11-06T20:01:40.702Z [INFO] init: init bang received
v8: 2025-11-06T20:01:40.703Z [INFO] init: LiveAPI callback invoked
```

警告は出力されず、コールバックが1回だけ呼び出された。
