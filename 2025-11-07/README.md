---
title: 2025-11-07 PoC
---

## 背景

LiveAPIに設定したコールバックが、初期化のタイミングで何度も呼ばれる現象に遭遇している。  
https://docs.cycling74.com/apiref/js/liveapi/ の説明通りであれば、インスタンス化した場合と監視対象（プロパティ）に変化があった場合にのみ呼ばれる？とのこと。  

説明どおりのことが全然起きてない。  

> a function to be called when the LiveAPI object refers to a new object in Live (if the LiveAPI object's path changes, for instance) or when an observed property changes

## live.thisdevice (補足)

https://docs.cycling74.com/reference/live.thisdevice

> live.thisdevice reports three pieces of information about your Max Device. A bang message is automatically sent from the left outlet when the Max Device is opened and completely initialized, or when the containing patcher is part of another file that is opened. Additionally, a bang will be reported every time a new preset is loaded or the device is saved (and thus reloaded within the Live application). A 1 or 0 will be sent from the middle outlet when the Device is enabled or disabled, respectively. A 1 or 0 will be sent from the right outlet when preview mode for the Device is enabled or disabled, respectively. Used within Max, live.thisdevice functions essentially like the loadbang object. The middle and right outlets are inactive in this case.

デバイスの初期化を保証できる。  
初期化されてない状態で、LiveAPIのインスタンス化を行うとエラーが起きる。  
live.thisdevice の bang を受け取って、JavaScirpt内で LiveAPI のインスタンス化を行うのがセオリー。  

## 現況の挙動の確認

一旦、初期化フラグを持つことで、初回のコールバック呼び出しをスキップできるようにした。  

https://github.com/stoneream/m4l-poc/blob/f9481f9de1c0d1e938264e39dd5bef896d3a03a3/2025-11-07/init.js

出力されたログは以下の通り。  

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
（貼り付けたリビジョンのコードはbang関数の中に居ないけど、live.thisdeviceを刺してbang関数を呼び出しても同様の現象は起きている。）

## 考察 & 検証 2

`initialized` フラグが初期状態 `false`  

「初期化完了フラグが立った」

インスタンス化されたタイミングで一発目コールバックが呼ばれる。  
`initialized` フラグを `true` にしつつ、監視対象に `track` を追加する。

「トラックの変更が行われていないもかかわらず、変更が検知された 1」

監視対象に `track` を追加したタイミングでも、おそらくコールバックが呼ばれている可能性がある。
前段 A で、`initialized` フラグが `true` になっている。  

「トラックの変更が行われていないもかかわらず、変更が検知された 2」& 「プロパティの再設定が行われたのは謎 3」

```
if (!initialized) {}
```

の条件をすり抜けて、トラック変更が行われていないにもかかわらず変更検知をしたように見える。

プロパティの再設定が行われたように見えるのは、別に再設定が行われているわけではない。  
AとBののコールバックがほぼ同時に呼ばれて、ログの出力が前後しただけ？  
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
プロパティの設定後も、とりあえず1発コールバックが呼ばれる？  
フラグを用意して検証してみる。  

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

LiveAPIのコールバックの説明が微妙に言葉不足な気がする。  

ついでにいうと、変更を検知したとしても変更前と変更後にどんな変化が起きたかまではLiveAPIでは提供されていない（多分）。  
そのため、差分を取りたいのであれば自前で変更前後の状態を保存して差分を取るロジックを書いておく必要がある。  
