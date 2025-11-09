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

## 検証 1

https://github.com/stoneream/m4l-poc/blob/f9481f9de1c0d1e938264e39dd5bef896d3a03a3/2025-11-07/init.js

オブジェクトが大量にある場合に重くなる仮説を検証するためノブを大量に設置した。  
が、状態は再現しなかった。  

表示されている警告のとおり、live.thisdeviceのloadbangでinit.jsを呼び出す。
このパッチはoutletの1番にデバイスのロードが完了した際にbangを出力する。

```
v8: 2025-11-06T20:50:22.704Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.704Z [INFO] init: Initialization complete  <-- 初期化完了フラグが立った
v8: 2025-11-06T20:50:22.704Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.704Z [INFO] init: Detected change in live_set tracks  <-- トラックの変更が行われていないもかかわらず、変更が検知された 1
v8: 2025-11-06T20:50:22.705Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:22.705Z [INFO] init: Detected change in live_set tracks  <-- トラックの変更が行われていないもかかわらず、変更が検知された 2
v8: 2025-11-06T20:50:22.705Z [INFO] init: Setting property to tracks  <-- プロパティの再設定が行われたのは謎 3
v8: 2025-11-06T20:50:37.048Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-06T20:50:37.048Z [INFO] init: Detected change in live_set tracks  <-- こちらは手動でトラックの追加を行ったため正しい
```

同様の現象を確認できた。

## 検証 2 & 考察

`initialized` フラグが初期状態 `false`  

「初期化完了フラグが立った」

インスタンス化されたタイミングで一発目コールバックが呼ばれる。  
`initialized` フラグを `true` にしつつ、監視対象に `track` を追加する。

「トラックの変更が行われていないもかかわらず、変更が検知された 1」

監視対象に `track` を追加したタイミングでも、おそらくコールバックが呼ばれている可能性がある。
前段 A で、`initialized` フラグが `true` になっている。  
そのため...

```
if (!initialized) {}
```
の条件をすり抜けて、トラック変更が行われていないにもかかわらず変更検知をしたように見える。

プロパティの再設定が行われたように見えるのは、別に再設定が行われているわけではない。  
AとBののコールバックがほぼ同時に呼ばれて、ログの出力が前後しただけ、の可能性が高い。  
というわけで、プロパティを初期化を検知したフラグを用意してみる。 

https://github.com/stoneream/m4l-poc/blob/ecf5690ae2c773aa328eadc95b2360802a0aeaec/2025-11-07/init.js

```
v8: 2025-11-09T04:12:21.709Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:12:21.709Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:12:21.709Z [INFO] init: Detected property set to tracks  <-- プロパティの初期化のタイミングでも呼ばれるっぽい
v8: 2025-11-09T04:12:21.709Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:12:21.709Z [INFO] init: tracks changed  <-- トラック触ってないのに謎の検知
v8: 2025-11-09T04:12:21.709Z [INFO] init: Initialization complete & Property set to tracks  
```

もはやログの出力順序がわけのわからないことになってしまった...  
(そもそも、postの挙動自体が信頼できなくなってきたな...)  

とはいえ、2発も3発も tracks changed が呼ばれなくはなった。  
仮説は半分くらい正しいっぽい。  
プロパティの設定後も1発コールバックが呼ばれる？  
検証してみる。  

https://github.com/stoneream/m4l-poc/blob/b6e76a693355f09e387d9050356ae7cac503cc58/2025-11-07/init.js

```
v8: 2025-11-09T04:22:47.803Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:22:47.803Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:22:47.803Z [INFO] init: Detected property set to tracks  
v8: 2025-11-09T04:22:47.804Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:22:47.804Z [INFO] init: Detected first callback after property set  <-- 合ってたっぽい
v8: 2025-11-09T04:22:47.804Z [INFO] init: Initialization complete & Property set to tracks  

v8: 2025-11-09T04:25:46.433Z [INFO] init: LiveAPI callback invoked  
v8: 2025-11-09T04:25:46.433Z [INFO] init: Detected change in live_set tracks  <-- 手動でトラックを触った
```

合ってたっぽい。  
なにこれ...

## 結論
