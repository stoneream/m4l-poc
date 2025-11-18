include("./header.js");

inlets = 2;
outlets = 4;

let logger = new Logger("main");

let selectedTrackPath = null;
let selectedDevicePath = null;
let selectedParameterPath = null;

// live.thisdeviceによるbangトリガー
function bang() {
  let liveSet = new LiveAPI("live_set");

  // トラックメニューをクリア
  outlet(0, "clear");
  // デバイスメニューをクリア
  outlet(1, "clear");
  // パラメーターメニューをクリア
  outlet(2, "clear");
  // ダイアルをクリア
  outlet(3, 0.0);

  // トラックを走査しメニューに追加
  let trackCount = liveSet.getcount("tracks");
  for (let i = 0; i < trackCount; i++) {
    let trackPath = `live_set tracks ${i}`;
    let trackApi = new LiveAPI(trackPath);
    let trackName = trackApi.get("name");

    outlet(0, "append", trackName);
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
  let trackCount = liveSet.getcount("tracks");

  let foundTrackPath = null;

  // トラックを走査して名前が一致するトラックを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < trackCount; i++) {
    let trackPath = `live_set tracks ${i}`;
    let trackApi = new LiveAPI(trackPath);
    let currentTrackName = String(trackApi.get("name")).toString();

    if (currentTrackName === trackName) {
      foundTrackPath = trackPath;
      break;
    }
  }

  // トラックが見つからなかった場合は警告を出して終了
  if (!foundTrackPath) {
    logger.warn("Track not found", { trackName: trackName });
    return;
  }

  // 選択されたトラックが同じ場合は何もしない
  if (foundTrackPath === selectedTrackPath) {
    return;
  }

  // デバイスメニューをクリア
  selectedTrackPath = foundTrackPath;
  outlet(1, "clear");

  // デバイスを走査しメニューに追加
  let trackToSelect = new LiveAPI(foundTrackPath);
  let deviceCount = trackToSelect.getcount("devices");
  for (let i = 0; i < deviceCount; i++) {
    let devicePath = `${foundTrackPath} devices ${i}`;
    let deviceApi = new LiveAPI(devicePath);
    let deviceName = deviceApi.get("name");

    outlet(1, "append", deviceName);
  }
}

function selectDevice(deviceName) {
  // トラックが選択されていない場合は警告を出して終了
  if (!selectedTrackPath) {
    logger.warn("No track selected");
    return;
  }

  let trackApi = new LiveAPI(selectedTrackPath);
  let deviceCount = trackApi.getcount("devices");
  let foundDevicePath = null;

  // デバイスを走査して名前が一致するデバイスを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < deviceCount; i++) {
    let devicePath = `${selectedTrackPath} devices ${i}`;
    let deviceApi = new LiveAPI(devicePath);
    let currentDeviceName = String(deviceApi.get("name")).toString();

    if (currentDeviceName === deviceName) {
      foundDevicePath = devicePath;
      break;
    }
  }

  // デバイスが見つからなかった場合は警告を出して終了
  if (!foundDevicePath) {
    logger.warn("Device not found", { deviceName: deviceName });
    return;
  }

  // 選択されたデバイスが同じ場合は何もしない
  if (foundDevicePath === selectedDevicePath) {
    return;
  }

  // パラメーターメニューをクリア
  selectedDevicePath = foundDevicePath;
  outlet(2, "clear");

  // パラメーターを走査しメニューに追加
  let deviceToSelect = new LiveAPI(foundDevicePath);
  let parameterCount = deviceToSelect.getcount("parameters");
  for (let i = 0; i < parameterCount; i++) {
    let parameterPath = `${foundDevicePath} parameters ${i}`;
    let parameterApi = new LiveAPI(parameterPath);
    let parameterName = parameterApi.get("name");
    outlet(2, "append", parameterName);
  }
}

function selectParameter(parameterName) {
  // デバイスが選択されていない場合は警告を出して終了
  if (!selectedDevicePath) {
    logger.warn("No device selected");
    return;
  }

  let deviceApi = new LiveAPI(selectedDevicePath);
  let parameterCount = deviceApi.getcount("parameters");
  let foundParameterPath = null;

  // パラメーターを走査して名前が一致するパラメーターを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < parameterCount; i++) {
    let parameterPath = `${selectedDevicePath} parameters ${i}`;
    let parameterApi = new LiveAPI(parameterPath);
    let currentParameterName = String(parameterApi.get("name")).toString();
    if (currentParameterName === parameterName) {
      foundParameterPath = parameterPath;
      break;
    }
  }

  // パラメーターが見つからなかった場合は警告を出して終了
  if (!foundParameterPath) {
    logger.warn("Parameter not found", { parameterName: parameterName });
    return;
  }

  // 選択されたパラメーターが同じ場合は何もしない
  if (foundParameterPath === selectedParameterPath) {
    return;
  }

  selectedParameterPath = foundParameterPath;

  // 選択されたパラメーターをダイアルに反映
  let parameterToSelect = new LiveAPI(foundParameterPath);
  let parameterValue = parameterToSelect.get("value");
  outlet(3, parameterValue);
}

function setParameterValue(value) {
  // パラメーターが選択されていない場合は警告を出して終了
  if (!selectedParameterPath) {
    logger.warn("No parameter selected");
    return;
  }

  let parameterApi = new LiveAPI(selectedParameterPath);
  parameterApi.set("value", value);
}
