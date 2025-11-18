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
  let trackCount = liveSet.getcount("tracks");

  let foundTrack = null;

  // トラックを走査して名前が一致するトラックを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < trackCount; i++) {
    let trackPath = `live_set tracks ${i}`;
    let trackApi = new LiveAPI(trackPath);
    let currentTrackName = String(trackApi.get("name")).toString();

    if (currentTrackName === trackName) {
      foundTrack = trackApi;
      break;
    }
  }

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

  outlet(OUTLETS.DEVICE_MENU, "clear");

  // デバイスを走査しメニューに追加
  let deviceCount = selectedTrack.getcount("devices");
  for (let i = 0; i < deviceCount; i++) {
    let devicePath = `${foundTrack.path} devices ${i}`;
    let deviceApi = new LiveAPI(devicePath);
    let deviceName = deviceApi.get("name");

    outlet(OUTLETS.DEVICE_MENU, "append", deviceName);
  }
}

function selectDevice(deviceName) {
  // トラックが選択されていない場合は警告を出して終了
  if (!selectedTrack) {
    logger.warn("No track selected");
    return;
  }

  let deviceCount = selectedTrack.getcount("devices");
  let foundDevice = null;

  // デバイスを走査して名前が一致するデバイスを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < deviceCount; i++) {
    let devicePath = `${selectedTrack.path} devices ${i}`;
    let deviceApi = new LiveAPI(devicePath);
    let currentDeviceName = String(deviceApi.get("name")).toString();

    if (currentDeviceName === deviceName) {
      foundDevice = deviceApi;
      break;
    }
  }

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
  // パラメーターメニューをクリア
  outlet(OUTLETS.PARAMETER_MENU, "clear");

  // パラメーターを走査しメニューに追加
  let parameterCount = selectedDevice.getcount("parameters");
  for (let i = 0; i < parameterCount; i++) {
    let parameterPath = `${selectedDevice.path} parameters ${i}`;
    let parameterApi = new LiveAPI(parameterPath);
    let parameterName = parameterApi.get("name");
    outlet(OUTLETS.PARAMETER_MENU, "append", parameterName);
  }
}

function selectParameter(parameterName) {
  // デバイスが選択されていない場合は警告を出して終了
  if (!selectedDevice) {
    logger.warn("No device selected");
    return;
  }

  let parameterCount = selectedDevice.getcount("parameters");
  let foundParameter = null;

  // パラメーターを走査して名前が一致するパラメーターを探す
  // 計算量がO(n)となるが、ひとまずは許容するものとする
  for (let i = 0; i < parameterCount; i++) {
    let parameterPath = `${selectedDevice.path} parameters ${i}`;
    let parameterApi = new LiveAPI(parameterPath);
    let currentParameterName = String(parameterApi.get("name")).toString();
    if (currentParameterName === parameterName) {
      foundParameter = parameterApi;
      break;
    }
  }

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
