class Logger {
  constructor(name) {
    this.name = name;
  }

  lnPost(obj) {
    if (obj) {
      post(obj + "\n");
    }
  }

  /**
   * key=value の形式で引数をフォーマットする
   *
   */
  formatKeyValue(...args) {
    return args.map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        return Object.entries(arg)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ");
      } else {
        return String(arg);
      }
    });
  }

  /**
   * ログメッセージをフォーマットする
   */
  format(level, message, ...args) {
    const timestamp = new Date().toISOString();

    const formattedArgs = () => {
      if (args && args.length > 0) {
        // [key1=value1, key2=value2, ...] の形式で引数をフォーマット
        return " [" + this.formatKeyValue(...args).join(", ") + "]";
      } else {
        return "";
      }
    };

    return `${timestamp} [${level}] ${
      this.name
    }: ${message} ${formattedArgs()}`;
  }

  info(message, ...args) {
    this.lnPost(this.format("INFO", message, ...args));
  }

  warn(message, ...args) {
    this.lnPost(this.format("WARN", message, ...args));
  }

  error(message, ...args) {
    this.lnPost(this.format("ERROR", message, ...args));
  }
}
