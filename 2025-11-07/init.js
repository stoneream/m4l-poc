autowatch = 1;
inlet = 1;
outlet = 1;

include("./header.js");
const logger = new Logger("init");

let liveApi = null;
let initialized = false;
let detectedPropertySet = false;

function callback() {
  logger.info("LiveAPI callback invoked");

  if (!initialized) {
    initialized = true;
    liveApi.property = "tracks";

    logger.info("Initialization complete & Property set to tracks");
    return;
  }

  if (!detectedPropertySet) {
    detectedPropertySet = true;
    logger.info("Detected property set to tracks");

    return;
  }

  if (initialized && detectedPropertySet) {
    logger.info("tracks changed");
  }
}

function bang() {
  liveApi = new LiveAPI(callback, "live_set");
}
