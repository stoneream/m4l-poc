include("./header.js");

inlets = 2;
outlets = 4;

let logger = new Logger("main");

const OUTLETS = {
  TRACK_MENU: 0,
  DEVICE_MENU: 1,
  PARAMETER_MENU: 2,
  DIAL_VALUE: 3,
};

let selectedTrack = null;
let selectedDevice = null;
let selectedParameter = null;

/**
 * 検索対象の名前に一致するアイテムを親API配下から探して返す
 * @param {LiveAPI} parentApi 親APIオブジェクト
 * @param {string} itemType アイテムの種類（例: "tracks", "devices", "parameters"）
 * @param {string} targetName 検索対象の名前
 * @returns
 */
function findItemByName(parentApi, itemType, targetName) {
  const itemCount = parentApi.getcount(itemType);

  // O(n)の探索となるが大量のパラメーターが存在することを想定していないため許容する
  for (let i = 0; i < itemCount; i++) {
    const itemPath = `${parentApi.path} ${itemType} ${i}`;
    const itemApi = new LiveAPI(itemPath);
    const currentName = String(itemApi.get("name")).toString();

    if (currentName === targetName) {
      return itemApi;
    }
  }
  return null;
}

/**
 * 親API配下のアイテムをメニューに追加する
 * @param {LiveAPI} parentApi 親APIオブジェクト
 * @param {string} itemType アイテムの種類（例: "tracks", "devices", "parameters"）
 * @param {number} outletIndex 出力先のアウトレットインデックス
 */
function populateMenu(parentApi, itemType, outletIndex) {
  outlet(outletIndex, "clear");

  const itemCount = parentApi.getcount(itemType);
  for (let i = 0; i < itemCount; i++) {
    const itemPath = `${parentApi.path} ${itemType} ${i}`;
    const itemApi = new LiveAPI(itemPath);
    const itemName = itemApi.get("name");
    outlet(outletIndex, "append", itemName);
  }
}

// live.thisdeviceによるbangトリガー
function bang() {
  let liveSet = new LiveAPI("live_set");

  // トラックメニューをクリア
  outlet(OUTLETS.TRACK_MENU, "clear");
  // デバイスメニューをクリア
  outlet(OUTLETS.DEVICE_MENU, "clear");
  // パラメーターメニューをクリア
  outlet(OUTLETS.PARAMETER_MENU, "clear");
  // ダイアルをクリア
  outlet(OUTLETS.DIAL_VALUE, 0.0);

  // トラックを走査しメニューに追加
  let trackCount = liveSet.getcount("tracks");
  for (let i = 0; i < trackCount; i++) {
    let trackPath = `live_set tracks ${i}`;
    let trackApi = new LiveAPI(trackPath);
    let trackName = trackApi.get("name");

    outlet(OUTLETS.TRACK_MENU, "append", trackName);
  }
}

function anything() {
  let args = arrayfromargs(arguments);

  logger.info("Received meesage", { message_name: messagename, args: args });

  // メッセージのルーティング
  switch (messagename) {
    case "select_track":
      let trackName = String(args[0]).toString();
      selectTrack(trackName);
      break;
    case "select_device":
      let deviceName = String(args[0]).toString();
      selectDevice(deviceName);
      break;
    case "select_parameter":
      let parameterName = String(args[0]).toString();
      selectParameter(parameterName);
      break;
    case "set_parameter_value":
      let parameterValue = parseFloat(args[0]);
      setParameterValue(parameterValue);
      break;
    default:
      logger.warn("Unknown message", { message: message, values: values });
  }
}

function selectTrack(trackName) {
  let liveSet = new LiveAPI("live_set");
  let foundTrack = findItemByName(liveSet, "tracks", trackName);

  // トラックが見つからなかった場合は警告を出して終了
  if (!foundTrack) {
    logger.warn("Track not found", { trackName: trackName });
    return;
  }

  // 選択されたトラックが同じ場合は何もしない
  if (selectedTrack && foundTrack.path === selectedTrack.path) {
    return;
  }

  // デバイスメニューをクリア
  selectedTrack = foundTrack;
  // 下位階層をリセット
  selectedDevice = null;
  selectedParameter = null;

  populateMenu(selectedTrack, "devices", OUTLETS.DEVICE_MENU);
}

function selectDevice(deviceName) {
  // トラックが選択されていない場合は警告を出して終了
  if (!selectedTrack) {
    logger.warn("No track selected");
    return;
  }

  let foundDevice = findItemByName(selectedTrack, "devices", deviceName);

  // デバイスが見つからなかった場合は警告を出して終了
  if (!foundDevice) {
    logger.warn("Device not found", { deviceName: deviceName });
    return;
  }

  // 選択されたデバイスが同じ場合は何もしない
  if (selectedDevice && foundDevice.path === selectedDevice.path) {
    return;
  }

  selectedDevice = foundDevice;
  // 下位階層をリセット
  selectedParameter = null;

  populateMenu(selectedDevice, "parameters", OUTLETS.PARAMETER_MENU);
}

function selectParameter(parameterName) {
  // デバイスが選択されていない場合は警告を出して終了
  if (!selectedDevice) {
    logger.warn("No device selected");
    return;
  }

  let foundParameter = findItemByName(
    selectedDevice,
    "parameters",
    parameterName
  );

  // パラメーターが見つからなかった場合は警告を出して終了
  if (!foundParameter) {
    logger.warn("Parameter not found", { parameterName: parameterName });
    return;
  }

  // 選択されたパラメーターが同じ場合は何もしない
  if (selectedParameter && selectedParameter.path === foundParameter.path) {
    return;
  }

  selectedParameter = foundParameter;

  // 選択されたパラメーターをダイアルに反映
  let parameterValue = selectedParameter.get("value");
  outlet(OUTLETS.DIAL_VALUE, parameterValue);
}

function setParameterValue(value) {
  // パラメーターが選択されていない場合は警告を出して終了
  if (!selectedParameter) {
    logger.warn("No parameter selected");
    return;
  }

  selectedParameter.set("value", value);
}
