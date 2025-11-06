autowatch = 1;
inlet = 1;
outlet = 1;

include("./header.js");

const logger = new Logger("init");

function callback() {
  logger.info("LiveAPI callback invoked");
}

function bang() {
  logger.info("init bang received");

  const liveApi = new LiveAPI(callback, "live_set");
}
