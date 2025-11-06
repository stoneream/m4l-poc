/*
  LiveAPIのコールバックはクラスのインスタンスが生成されたタイミングと設定したプロパティが変化したタイミングで呼ばれる。
  この「インスタンスが生成されたタイミング」でコールバックが呼ばれることを回避したい。
  プロパティの状態を保持し、コールバックが呼ばれた際に比較を行う。
  比較の結果、状態に変化があった場合のみハンドラを呼び出す仕組みを実現している。

  LiveAPIのインスタンスの存在チェックを行い、初期化フラグを用意する方法も考えられる。
  JavaScriptのAPI自体はあくまでMaxへのブリッジのため、初期化の完了自体が保証されていない可能性がある。
  （詳しい記述を見つけられなかったため断言することはできない。）
  */
class LiveObjectObserver {
  #handler = null;
  #api = null;
  #previousState = null;
  #logger = new Logger("LiveObjectObserver");

  constructor(path, property, handler) {
    this.#api = new LiveAPI(() => this.#callback(), path);
    this.#api.property = property;
    this.#handler = handler;

    // 初期状態を保存
    if (property) {
      this.#previousState = this.#api.getstring(property);
    }
  }

  #callback() {
    if (!this.#handler) {
      return;
    }

    /*
      コールバックはLiveAPIのインスタンスが生成された瞬間に呼ばれる。
      初期状態の代入よりも先に呼ばれる場合に処理をスキップする。
      */
    if (this.#previousState == null || this.#previousState === undefined) {
      return;
    }

    const currentState = this.#api.getstring(this.#api.property);

    // 状態に変化がない場合はスキップする
    if (this.#previousState === currentState) {
      return;
    }

    const diff = this.#diff(this.#previousState, currentState);

    // 状態を更新
    this.#previousState = currentState;

    const logProperty = {
      path: this.#api.path,
      property: this.#api.property,
      addedIds: diff.addedIds,
      removedIds: diff.removedIds,
    };

    this.#logger.info("detected state change", logProperty);

    this.#handler(diff);
  }

  #diff(previousState, currentState) {
    const prevIds =
      previousState.trim() === ""
        ? []
        : previousState
            .split(" ")
            .filter((part) => part !== "id" && part.trim() !== "");
    const currIds =
      currentState.trim() === ""
        ? []
        : currentState
            .split(" ")
            .filter((part) => part !== "id" && part.trim() !== "");

    const prevSet = new Set(prevIds);
    const currSet = new Set(currIds);

    const addedIds = [...currSet].filter((id) => !prevSet.has(id));
    const removedIds = [...prevSet].filter((id) => !currSet.has(id));

    const diff = new Diff(addedIds, removedIds);

    return diff;
  }

  get api() {
    return this.#api;
  }
}
