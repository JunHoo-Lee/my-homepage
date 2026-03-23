const Module = require("module");

if (!global.__MY_HOMEPAGE_NEXT_TELEMETRY_PATCHED__) {
  global.__MY_HOMEPAGE_NEXT_TELEMETRY_PATCHED__ = true;

  const originalLoad = Module._load;

  class TelemetryStub {
    constructor({ distDir } = {}) {
      this.distDir = distDir || ".next";
      this.anonymousId = "disabled";
      this.sessionId = "disabled";
      this.salt = "disabled";
      this.queue = new Set();
      this.isDisabled = true;
      this.conf = {
        get: () => "",
        set: () => {},
        path: "",
      };
    }

    notify() {}

    setEnabled() {
      return this.conf.path;
    }

    oneWayHash(payload) {
      return String(payload);
    }

    record(events) {
      const promise = Promise.resolve({
        isFulfilled: true,
        isRejected: false,
        value: events,
      });
      promise._events = Array.isArray(events) ? events : [events];
      promise._controller = { abort() {} };
      return promise;
    }

    flush() {
      return Promise.resolve([]);
    }

    flushDetached() {}

    submitRecord() {
      return Promise.resolve();
    }

    getProjectId() {
      return Promise.resolve("disabled");
    }
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (
      request === "next/dist/telemetry/storage" ||
      request.endsWith("/telemetry/storage")
    ) {
      return { Telemetry: TelemetryStub };
    }

    return originalLoad.call(this, request, parent, isMain);
  };
}

process.env.NEXT_TELEMETRY_DISABLED = "1";
