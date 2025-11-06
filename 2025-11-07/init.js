autowatch = 1;
inlet = 1;
outlet = 1;

include("./header.js");

const logger = new Logger("init");
let initialized = false;

const liveApi = new LiveAPI(() => {
  logger.info("LiveAPI callback invoked");

  if (!initialized) {
    initialized = true;
    logger.info("Initialization complete");

    liveApi.property = "tracks";
    logger.info("Setting property to tracks");

    return;
  }

  logger.info("Detected change in live_set tracks");
}, "live_set tracks");
