autowatch = 1;
inlet = 1;
outlet = 1;

include("./header.js");

const logger = new Logger("init");
let liveApi = null;

function callback() {
  logger.info("LiveAPI callback invoked");
  logger.info(`path`, liveApi.path);
}

function bang() {
  logger.info("init bang received");
  liveApi = new LiveAPI(callback, "live_set");
}
