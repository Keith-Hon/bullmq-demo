"use strict";

var _queue = require("./queue");

const queue = (0, _queue.getQueue)();

for (let i = 0; i < 1000; i++) {
  queue.add(_queue.TASK_QUEUE, {
    color: "testing2"
  });
}

console.log("OK");