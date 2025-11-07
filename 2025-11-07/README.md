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
一旦、パスをログも出力する。

https://github.com/stoneream/m4l-poc/blob/d9b1ee849a0e6c02f443422209ce0f7529f0673e/2025-11-07/init.js

```
v8: 2025-11-06T20:06:26.627Z [INFO] init: init bang received  
v8: 2025-11-06T20:06:26.628Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:06:26.628Z [INFO] init: path  [live_set] 
```

複数回、呼び出されることを確認するため単発でLiveAPIクラスをインスタンス化する。  
結果としては、状態は再現しなかった。

## 検証4

元々の課題はインスタンス化のタイミングでのコールバックを抑制するため、初期化済みフラグを持つことで回避したい、であったため複数回の呼び出しを確認する。  
loadbang -> live.thisdevice -> init.js ではなく、単発で init.js を配置する。

https://github.com/stoneream/m4l-poc/blob/91214f0beaef292ca363a4b357f4d65ccdcc52f2/2025-11-07/init.js

```
Live API is not initialized, use live.thisdevice to determine when initialization is complete
```

警告が表示された。そもそもの現象が再現しない。  

## 検証5

オブジェクトが大量にある場合に重くなる仮説を検証するためノブを大量に設置した。  
が、状態は再現しなかった。  

表示されている警告のとおり、live.thisdeviceのloadbangでinit.jsを呼び出す。
このパッチはoutletの1番にデバイスのロードが完了した際にbangを出力する。

```
v8: 2025-11-06T20:50:22.704Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.704Z [INFO] init: Initialization complete  <-- 初期化完了フラグが立った
v8: 2025-11-06T20:50:22.704Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.704Z [INFO] init: Detected change in live_set tracks  <-- トラックの変更が行われていないもかかわらず、変更が検知された
v8: 2025-11-06T20:50:22.705Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.705Z [INFO] init: Detected change in live_set tracks  <-- トラックの変更が行われていないもかかわらず、変更が検知された
v8: 2025-11-06T20:50:22.705Z [INFO] init: Setting property to tracks  <-- プロパティの再設定が行われたのは謎
v8: 2025-11-06T20:50:37.048Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:37.048Z [INFO] init: Detected change in live_set tracks  <-- こちらは手動でトラックの追加を行ったため正しい
```

同様の現象を確認できた。

## 結論

LiveAPIに渡したコールバック関数は何度も呼ばれるものとして許容する。  
どのトラックに影響があったか？はやはり追跡できない都合があるにはある。  
そのため、状態を確実に記録し差分を取ることができる仕組みを作るのが正しい。
